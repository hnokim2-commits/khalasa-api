import crypto from 'node:crypto';
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
 return value;
}
export function financialDigest(req){return crypto.createHash('sha256').update(JSON.stringify(canonical({method:req.method,path:req.path,role:req.user?.role,body:req.body}))).digest('hex');}
export function financialError(status,error){return {status,body:{error}};}
// The key claim, business mutation and recoverable response commit together.
export async function financialTransaction(pool,context,work){
 if(!context)throw Error('FINANCIAL_CONTEXT_REQUIRED');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const claim=await client.query('INSERT INTO financial_request_keys(bucket_key,operation) VALUES($1,$2) ON CONFLICT(bucket_key) DO NOTHING RETURNING bucket_key',[context.key,context.operation]);
  if(!claim.rowCount){
   const prior=await client.query('SELECT request_digest,response_status,response_body FROM financial_operation_results WHERE bucket_key=$1',[context.key]);
   await client.query('ROLLBACK');
   if(!prior.rowCount)return financialError(409,'FINANCIAL_REQUEST_ALREADY_SUBMITTED');
   if(prior.rows[0].request_digest!==context.digest)return financialError(409,'IDEMPOTENCY_PAYLOAD_MISMATCH');
   return {status:prior.rows[0].response_status,body:prior.rows[0].response_body};
  }
  const result=await work(client);
  if(result.status>=400){await client.query('ROLLBACK');return result;}
  await client.query('INSERT INTO financial_operation_results(bucket_key,request_digest,response_status,response_body) VALUES($1,$2,$3,$4::jsonb)',[context.key,context.digest,result.status,JSON.stringify(result.body)]);
  await client.query('COMMIT');return result;
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}
export function registerFinancialWrites(app,{pool,auth,asyncRoute}){
 const register=(path,roles,work)=>app.post(path,auth(...roles),asyncRoute(async(req,res)=>{
  const result=await financialTransaction(pool,{...req.financialContext,digest:financialDigest(req)},client=>work(client,req));
  res.status(result.status).json(result.body);
 }));
 register('/v1/rider/wallet/withdrawals',['rider'],async(client,req)=>{
  const amount=Number(req.body.amount);if(amount<50)return financialError(400,'MINIMUM_WITHDRAWAL_IS_50');
  const rider=await client.query('SELECT id,wallet_or_bank_reference FROM riders WHERE user_id=$1 FOR UPDATE',[req.user.sub]);
  if(!rider.rowCount)return financialError(404,'RIDER_PROFILE_NOT_FOUND');
  if(!rider.rows[0].wallet_or_bank_reference)return financialError(400,'PAYOUT_REFERENCE_REQUIRED');
  const balance=await client.query('SELECT COALESCE(sum(amount),0)::numeric balance FROM rider_wallet_entries WHERE rider_id=$1',[rider.rows[0].id]);
  if(Number(balance.rows[0].balance)<amount)return financialError(409,'INSUFFICIENT_WALLET_BALANCE');
  const withdrawal=await client.query('INSERT INTO rider_withdrawal_requests(rider_id,amount,payout_reference) VALUES($1,$2,$3) RETURNING id,amount,status,created_at',[rider.rows[0].id,amount,rider.rows[0].wallet_or_bank_reference]);
  await client.query("INSERT INTO rider_wallet_entries(rider_id,withdrawal_request_id,entry_type,amount,description) VALUES($1,$2,'withdrawal',$3,'طلب تحويل أرباح')",[rider.rows[0].id,withdrawal.rows[0].id,-amount]);
  return {status:201,body:{withdrawal:withdrawal.rows[0]}};
 });
 register('/v1/merchant/wallet/settlements',['merchant'],async(client,req)=>{
  const amount=Number(req.body.amount);if(amount<100)return financialError(400,'MINIMUM_SETTLEMENT_IS_100');
  const merchant=await client.query('SELECT id,payout_reference FROM merchants WHERE owner_user_id=$1 ORDER BY created_at LIMIT 1 FOR UPDATE',[req.user.sub]);
  if(!merchant.rowCount)return financialError(404,'MERCHANT_PROFILE_NOT_FOUND');
  if(!merchant.rows[0].payout_reference)return financialError(400,'PAYOUT_REFERENCE_REQUIRED');
  const balance=await client.query('SELECT COALESCE(sum(amount),0) balance FROM merchant_wallet_entries WHERE merchant_id=$1',[merchant.rows[0].id]);
  if(Number(balance.rows[0].balance)<amount)return financialError(409,'INSUFFICIENT_WALLET_BALANCE');
  const settlement=await client.query('INSERT INTO merchant_settlement_requests(merchant_id,amount,payout_reference) VALUES($1,$2,$3) RETURNING id,amount,status,created_at',[merchant.rows[0].id,amount,merchant.rows[0].payout_reference]);
  await client.query("INSERT INTO merchant_wallet_entries(merchant_id,settlement_request_id,entry_type,amount,description) VALUES($1,$2,'settlement',$3,'طلب تسوية مستحقات')",[merchant.rows[0].id,settlement.rows[0].id,-amount]);
  return {status:201,body:{settlement:settlement.rows[0]}};
 });
 register('/v1/admin/riders/:id/cash-remittances',['admin','accountant'],async(client,req)=>{
  const amount=Number(req.body.amount),note=String(req.body.note||'توريد نقدية المندوب').trim().slice(0,200);
  const rider=await client.query('SELECT r.id,r.user_id,r.city_id FROM riders r WHERE r.id=$1 FOR UPDATE',[req.params.id]);
  if(!rider.rowCount)return financialError(404,'RIDER_NOT_FOUND');
  const position=await client.query('SELECT GREATEST(-COALESCE(sum(amount),0),0) cash_due FROM rider_wallet_entries WHERE rider_id=$1',[req.params.id]);
  if(amount>Number(position.rows[0].cash_due))return financialError(409,'AMOUNT_EXCEEDS_CASH_DUE');
  const remittance=await client.query('INSERT INTO rider_cash_remittances(rider_id,amount,received_by,note) VALUES($1,$2,$3,$4) RETURNING id,amount,created_at',[req.params.id,amount,req.user.sub,note]);
  await client.query("INSERT INTO rider_wallet_entries(rider_id,cash_remittance_id,entry_type,amount,description) VALUES($1,$2,'cash_remittance',$3,$4)",[req.params.id,remittance.rows[0].id,amount,note]);
  await client.query("INSERT INTO admin_audit_log(actor_user_id,target_user_id,city_id,action,details) VALUES($1,$2,$3,'rider.cash_remittance',$4::jsonb)",[req.user.sub,rider.rows[0].user_id,rider.rows[0].city_id,JSON.stringify({remittanceId:remittance.rows[0].id,amount})]);
  return {status:201,body:{remittance:remittance.rows[0]}};
 });
}
