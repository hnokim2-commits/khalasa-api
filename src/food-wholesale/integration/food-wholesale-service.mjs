import crypto from 'node:crypto';
import {validateProduct,moneyToPiastres,createRequest,quoteRequest,acceptQuote,recordReceipt,cancelRequest} from '../src/food-wholesale.mjs';
const fail=code=>{throw Error(code)};
const uuid=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const fields=(body,allowed)=>{if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!allowed.includes(k)))fail('INVALID_FIELDS')};
const digest=(operation,body)=>crypto.createHash('sha256').update(JSON.stringify(canonical({operation,body}))).digest('hex');
export function createFoodWholesaleService(pool,{clock=()=>new Date().toISOString(),fixtureEnabled=false}={}){
 const eligible="(m.verification='approved' OR "+(fixtureEnabled?'food_wholesale_is_test_grant(m.id)':'false')+")";
 async function transaction(actor,key,operation,body,work){
  if(!uuid(actor?.sub))fail('AUTH_REQUIRED');
  if(typeof key!=='string'||!/^[A-Za-z0-9_-]{16,100}$/.test(key))fail('IDEMPOTENCY_KEY_REQUIRED');
  const client=await pool.connect();
  try{await client.query('BEGIN');await client.query("SET LOCAL khalasa.food_wholesale = 'on'");
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[actor.sub+':food:'+key]);
   const hash=digest(operation,body),previous=await client.query('SELECT digest,response FROM food_wholesale_operation_results WHERE actor_user_id=$1 AND operation_key=$2',[actor.sub,key]);
   if(previous.rowCount){if(previous.rows[0].digest!==hash)fail('IDEMPOTENCY_PAYLOAD_MISMATCH');await client.query('COMMIT');return {result:previous.rows[0].response,replayed:true}}
   const result=await work(client,clock());
   await client.query('INSERT INTO food_wholesale_operation_results(actor_user_id,operation_key,digest,response) VALUES($1,$2,$3,$4::jsonb)',[actor.sub,key,hash,JSON.stringify(result)]);
   await client.query('COMMIT');return {result,replayed:false};
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}finally{client.release()}
 }
 async function member(client,id,kind){
  const r=await client.query(`SELECT m.id,m.owner_user_id,food_wholesale_is_test_grant(m.id) fixture_only FROM merchants m JOIN food_wholesale_enrollments e ON e.merchant_id=m.id WHERE m.id=$1 AND ${eligible} AND e.active AND e.kind=$2 FOR SHARE OF m,e`,[id,kind]);
  if(!r.rowCount)fail('ENROLLMENT_REQUIRED');return r.rows[0];
 }
 async function parties(client,buyerId,supplierId){
  const result={};for(const [id,kind] of [[buyerId,'buyer'],[supplierId,'supplier']].sort((a,b)=>a[0].localeCompare(b[0])))result[kind]=await member(client,id,kind);if(result.buyer.fixture_only!==result.supplier.fixture_only)fail('FIXTURE_PAIRING_REQUIRED');return result;
 }
 async function ownMember(client,actor,kind){
  if(actor.role!=='merchant')fail('FORBIDDEN');
  const r=await client.query(`SELECT m.id FROM merchants m JOIN food_wholesale_enrollments e ON e.merchant_id=m.id WHERE m.owner_user_id=$1 AND e.kind=$2 AND e.active AND ${eligible} ORDER BY m.id LIMIT 2`,[actor.sub,kind]);
  if(r.rowCount!==1)fail('ENROLLMENT_REQUIRED');return r.rows[0].id;
 }
 async function product(client,id,now,locked=true){
  if(!uuid(id))fail('INVALID_PRODUCT_ID');
  const r=await client.query(`SELECT p.*,food_wholesale_is_test_grant(p.merchant_id) fixture_only,f.batch_code,f.production_date::text,f.expiry_date::text,f.units_per_carton,f.unit_weight_grams,f.storage,f.storage_instructions FROM products p JOIN food_wholesale_profiles f ON f.product_id=p.id WHERE p.id=$1 ${locked?'FOR UPDATE OF p,f':''}`,[id]);
  if(!r.rowCount)fail('FOOD_PRODUCT_NOT_FOUND');const p=r.rows[0];
  if(p.sale_unit!=='carton'||!p.wholesale_enabled||!p.is_available||p.wholesale_pack_size!==p.units_per_carton)fail('PRODUCT_NOT_READY');
  return validateProduct({id:p.id,fixtureOnly:p.fixture_only===true,supplierId:p.merchant_id,supplierApproved:true,name:p.name,storage:p.storage,storageInstructions:p.storage_instructions,batchCode:p.batch_code,productionDate:p.production_date,expiryDate:p.expiry_date,unitsPerCarton:p.units_per_carton,unitWeightGrams:p.unit_weight_grams,minCartons:p.wholesale_min_quantity,stockCartons:p.stock_quantity,cartonPricePiastres:moneyToPiastres(String(p.wholesale_price))},now);
 }
 async function event(client,actor,action,id,snapshot){await client.query('INSERT INTO food_wholesale_events(actor_user_id,action,entity_id,snapshot) VALUES($1,$2,$3,$4::jsonb)',[actor.sub,action,id,JSON.stringify(snapshot)])}
 async function save(client,actor,action,state,oldRevision){
  const r=await client.query('UPDATE food_wholesale_workflows SET state=$1::jsonb,revision=$2,updated_at=now() WHERE request_id=$3 AND revision=$4 RETURNING request_id',[JSON.stringify(state),state.revision,state.id,oldRevision]);if(!r.rowCount)fail('REVISION_CONFLICT');
  const status={received:'fulfilled',disputed:'accepted'}[state.status]||state.status;
  await client.query(`UPDATE wholesale_requests SET status=$1,quoted_unit_price=$2,accepted_at=CASE WHEN $3::boolean THEN COALESCE(accepted_at,now()) ELSE accepted_at END,fulfilled_at=CASE WHEN $4::boolean THEN now() ELSE fulfilled_at END,updated_at=now() WHERE id=$5`,[status,state.quote?state.quote.cartonPricePiastres/100:null,!!state.acceptance,state.status==='received',state.id]);
  await event(client,actor,action,state.id,state);return state;
 }
 return {
  async me(actor){
   if(actor.role!=='merchant')fail('FORBIDDEN');
   const r=await pool.query(`SELECT m.id,m.display_name,m.verification,e.kind,e.active,food_wholesale_is_test_grant(m.id) fixture_active,EXISTS(SELECT 1 FROM food_wholesale_test_grants g WHERE g.merchant_id=m.id) fixture_only,(SELECT expires_at FROM food_wholesale_test_grants g WHERE g.merchant_id=m.id) fixture_expires_at FROM merchants m LEFT JOIN food_wholesale_enrollments e ON e.merchant_id=m.id WHERE m.owner_user_id=$1 ORDER BY m.id LIMIT 2`,[actor.sub]);
   if(r.rowCount!==1)fail('MERCHANT_PROFILE_NOT_FOUND');const m=r.rows[0];return {merchantId:m.id,displayName:m.display_name,kind:m.kind||null,active:(m.verification==='approved'||fixtureEnabled&&m.fixture_active===true)&&m.active===true,fixtureOnly:m.fixture_only===true,fixtureExpiresAt:m.fixture_expires_at};
  },
  async inventory(actor){
   const c=await pool.connect();try{const id=await ownMember(c,actor,'supplier');
    const r=await c.query(`SELECT p.id,p.name,p.sale_unit,p.stock_quantity,p.wholesale_min_quantity,p.wholesale_price,p.wholesale_pack_size,f.batch_code,f.production_date::text,f.expiry_date::text,f.units_per_carton,f.unit_weight_grams,f.storage_instructions FROM products p LEFT JOIN food_wholesale_profiles f ON f.product_id=p.id WHERE p.merchant_id=$1 AND p.sale_unit='carton' AND p.wholesale_enabled ORDER BY p.name,p.id LIMIT 100`,[id]);
    return {products:r.rows.map(p=>({id:p.id,name:p.name,stockCartons:p.stock_quantity,minCartons:p.wholesale_min_quantity,cartonPrice:p.wholesale_price,unitsPerCarton:p.wholesale_pack_size,profile:p.batch_code?{batchCode:p.batch_code,productionDate:p.production_date,expiryDate:p.expiry_date,unitsPerCarton:p.units_per_carton,unitWeightGrams:p.unit_weight_grams,storageInstructions:p.storage_instructions}:null}))};
   }finally{c.release()}
  },
  async overview(actor){
   if(actor.role!=='admin'||actor.isMainAdmin!==true)fail('MAIN_ADMIN_REQUIRED');
   const merchants=await pool.query(`SELECT m.id,m.display_name,e.kind,e.active,e.review_reference,food_wholesale_is_test_grant(m.id) fixture_only FROM merchants m LEFT JOIN food_wholesale_enrollments e ON e.merchant_id=m.id WHERE ${eligible} ORDER BY m.display_name,m.id LIMIT 200`);
   const orders=await pool.query(`SELECT f.state,b.display_name buyer_name,s.display_name supplier_name FROM food_wholesale_workflows f JOIN wholesale_requests w ON w.id=f.request_id JOIN merchants b ON b.id=w.buyer_merchant_id JOIN merchants s ON s.id=w.supplier_merchant_id ORDER BY w.created_at DESC LIMIT 100`);
   return {fixtureModeEnabled:fixtureEnabled,merchants:merchants.rows.map(m=>({merchantId:m.id,displayName:m.display_name,kind:m.kind||null,active:m.active===true,reference:m.review_reference||'',fixtureOnly:m.fixture_only===true})),requests:orders.rows.map(r=>({...r.state,buyerName:r.buyer_name,supplierName:r.supplier_name}))};
  },
  async enroll(actor,key,id,body){
   if(!uuid(id))fail('INVALID_MERCHANT_ID');fields(body,['kind','active','reference']);
   if(actor.role!=='admin'||actor.isMainAdmin!==true)fail('MAIN_ADMIN_REQUIRED');
   if(!['supplier','buyer'].includes(body.kind)||typeof body.active!=='boolean'||typeof body.reference!=='string'||!body.reference.trim()||body.reference.length>500)fail('INVALID_ENROLLMENT');
   return transaction(actor,key,'enroll:'+id,body,async(c)=>{
    const r=await c.query('SELECT id,verification FROM merchants WHERE id=$1 FOR UPDATE',[id]);if(!r.rowCount||r.rows[0].verification!=='approved')fail('MERCHANT_NOT_APPROVED');
    const prior=await c.query('SELECT kind FROM food_wholesale_enrollments WHERE merchant_id=$1',[id]);if(prior.rowCount&&prior.rows[0].kind!==body.kind)fail('ENROLLMENT_KIND_IMMUTABLE');
    await c.query(`INSERT INTO food_wholesale_enrollments(merchant_id,kind,active,review_reference,reviewed_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(merchant_id) DO UPDATE SET active=EXCLUDED.active,review_reference=EXCLUDED.review_reference,reviewed_by=EXCLUDED.reviewed_by,updated_at=now()`,[id,body.kind,body.active,body.reference.trim(),actor.sub]);
    const result={merchantId:id,kind:body.kind,active:body.active};await event(c,actor,'enroll',id,{...result,reference:body.reference.trim()});return result;
   });
  },
  async profile(actor,key,id,body){
   if(!uuid(id))fail('INVALID_PRODUCT_ID');fields(body,['batchCode','productionDate','expiryDate','unitsPerCarton','unitWeightGrams','storageInstructions']);
   return transaction(actor,key,'profile:'+id,body,async(c,now)=>{
    const supplierId=await ownMember(c,actor,'supplier');await member(c,supplierId,'supplier');
    const p=(await c.query('SELECT * FROM products WHERE id=$1 AND merchant_id=$2 FOR UPDATE',[id,supplierId])).rows[0];if(!p)fail('FOOD_PRODUCT_NOT_FOUND');
    if(p.sale_unit!=='carton'||!p.wholesale_enabled||p.wholesale_pack_size!==body.unitsPerCarton)fail('PRODUCT_NOT_READY');
    const draft={...body,id:p.id,supplierId,supplierApproved:true,name:p.name,storage:'ambient_packaged',minCartons:p.wholesale_min_quantity,stockCartons:p.stock_quantity,cartonPricePiastres:moneyToPiastres(String(p.wholesale_price))};validateProduct(draft,now);
    const pending=await c.query(`SELECT 1 FROM wholesale_requests w WHERE w.product_id=$1 AND (w.status='accepted' OR (w.status IN('requested','quoted') AND NOT EXISTS(SELECT 1 FROM food_wholesale_workflows f WHERE f.request_id=w.id))) LIMIT 1`,[id]);if(pending.rowCount)fail('OPEN_ACCEPTED_ORDER_PROFILE_LOCKED');
    await c.query(`INSERT INTO food_wholesale_profiles(product_id,batch_code,production_date,expiry_date,units_per_carton,unit_weight_grams,storage,storage_instructions) VALUES($1,$2,$3,$4,$5,$6,'ambient_packaged',$7) ON CONFLICT(product_id) DO UPDATE SET batch_code=EXCLUDED.batch_code,production_date=EXCLUDED.production_date,expiry_date=EXCLUDED.expiry_date,units_per_carton=EXCLUDED.units_per_carton,unit_weight_grams=EXCLUDED.unit_weight_grams,storage_instructions=EXCLUDED.storage_instructions,updated_at=now()`,[id,body.batchCode.trim(),body.productionDate,body.expiryDate,body.unitsPerCarton,body.unitWeightGrams,body.storageInstructions.trim()]);
    await event(c,actor,'profile',id,draft);return draft;
   });
  },
  async catalog(actor){
   const c=await pool.connect();try{const buyerId=await ownMember(c,actor,'buyer');const rows=await c.query(`SELECT p.id FROM products p JOIN food_wholesale_profiles f ON f.product_id=p.id JOIN food_wholesale_enrollments e ON e.merchant_id=p.merchant_id JOIN merchants m ON m.id=p.merchant_id WHERE e.kind='supplier' AND e.active AND ${eligible} AND f.expiry_date>CURRENT_DATE AND p.is_available AND p.wholesale_enabled AND food_wholesale_is_test_grant(p.merchant_id)=food_wholesale_is_test_grant($1::uuid) ORDER BY p.id LIMIT 100`,[buyerId]);
    const products=[];for(const row of rows.rows){try{products.push(await product(c,row.id,clock(),false))}catch(e){if(!['PRODUCT_NOT_READY','INVALID_SHELF_LIFE','INVALID_CARTON_QUANTITY','INVALID_CARTON_PRICE'].includes(e.message))throw e}}return {products};
   }finally{c.release()}
  },
  async list(actor){
   if(actor.role!=='merchant')fail('FORBIDDEN');
   const r=await pool.query(`SELECT f.state FROM food_wholesale_workflows f JOIN wholesale_requests w ON w.id=f.request_id JOIN merchants m ON m.id IN(w.buyer_merchant_id,w.supplier_merchant_id) JOIN food_wholesale_enrollments e ON e.merchant_id=m.id WHERE m.owner_user_id=$1 AND e.active AND ${eligible} ORDER BY w.created_at DESC LIMIT 100`,[actor.sub]);return {requests:r.rows.map(x=>x.state)};
  },
  async request(actor,key,body){
   fields(body,['productId','cartons']);if(!uuid(body.productId))fail('INVALID_PRODUCT_ID');
   return transaction(actor,key,'request',body,async(c,now)=>{
    const buyerId=await ownMember(c,actor,'buyer'),p=(await c.query('SELECT merchant_id FROM products WHERE id=$1',[body.productId])).rows[0];if(!p)fail('FOOD_PRODUCT_NOT_FOUND');
    await parties(c,buyerId,p.merchant_id);const item=await product(c,body.productId,now);const state=createRequest({buyer:{merchantId:buyerId,approved:true},product:item,cartons:body.cartons,now});state.fixtureOnly=item.fixtureOnly===true;
    await c.query(`INSERT INTO wholesale_requests(id,buyer_merchant_id,supplier_merchant_id,product_id,quantity,requested_unit_price,request_key) VALUES($1,$2,$3,$4,$5,$6,$7)`,[state.id,buyerId,item.supplierId,item.id,state.cartons,item.cartonPricePiastres/100,key]);
    await c.query('INSERT INTO food_wholesale_workflows(request_id,revision,state) VALUES($1,1,$2::jsonb)',[state.id,JSON.stringify(state)]);await event(c,actor,'request',state.id,state);return state;
   });
  },
  async action(actor,key,id,action,body){
   if(actor.role!=='merchant')fail('FORBIDDEN');if(!uuid(id))fail('INVALID_REQUEST_ID');
   const allowed={quote:['cartonPrice','transportPrice','deliveryAt','validUntil','expectedRevision'],accept:['quoteVersion','expectedRevision'],receipt:['receivedCartons','damagedCartons','reference','expectedRevision'],cancel:['expectedRevision']};if(!allowed[action])fail('INVALID_ACTION');fields(body,allowed[action]);
   return transaction(actor,key,action+':'+id,body,async(c,now)=>{
    const r=await c.query(`SELECT f.state FROM wholesale_requests w JOIN food_wholesale_workflows f ON f.request_id=w.id JOIN merchants b ON b.id=w.buyer_merchant_id JOIN merchants s ON s.id=w.supplier_merchant_id WHERE w.id=$1 AND (b.owner_user_id=$2 OR s.owner_user_id=$2) FOR UPDATE OF w,f`,[id,actor.sub]);if(!r.rowCount)fail('REQUEST_NOT_FOUND');const old=r.rows[0].state;
    const members=await parties(c,old.buyerId,old.supplierId),side=action==='quote'?'supplier':'buyer';if(members[side].owner_user_id!==actor.sub)fail('PARTICIPANT_DENIED');
    const params={...body,order:old,now,buyer:{merchantId:old.buyerId,approved:true},supplier:{merchantId:old.supplierId,approved:true}};
    if(['quote','accept'].includes(action))params.product=await product(c,old.productId,now);
    const next=({quote:quoteRequest,accept:acceptQuote,receipt:recordReceipt,cancel:cancelRequest}[action])(params);
    if(action==='accept'){const reserved=await c.query('UPDATE products SET stock_quantity=stock_quantity-$1,updated_at=now() WHERE id=$2 AND stock_quantity>=$1 RETURNING id',[next.cartons,next.productId]);if(!reserved.rowCount)fail('INSUFFICIENT_STOCK')}
    return save(c,actor,action,next,old.revision);
   });
  }
 };
}
