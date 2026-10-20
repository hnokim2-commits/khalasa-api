export async function submitAdvanceSettlement(pool,input,upload){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const values=[input.id];if(input.cityId)values.push(input.cityId);
  const advance=await client.query(`SELECT id,city_id,amount,status FROM branch_cash_advances WHERE id=$1${input.cityId?' AND city_id=$2':''} FOR UPDATE`,values);
  const fail=async(status,error)=>{await client.query('ROLLBACK');return {status,body:{error}};};
  if(!advance.rowCount)return await fail(404,'ADVANCE_NOT_FOUND_IN_CITY');
  if(!['paid','partially_settled'].includes(advance.rows[0].status))return await fail(409,'ADVANCE_NOT_READY_FOR_SETTLEMENT');
  const totals=await client.query("SELECT COALESCE(sum(spent_amount+returned_amount) FILTER(WHERE status IN ('submitted','approved')),0) total FROM branch_cash_advance_settlements WHERE advance_id=$1",[input.id]);
  const cents=value=>Math.round(Number(value)*100);
  if(cents(totals.rows[0].total)+cents(input.spent)+cents(input.returned)>cents(advance.rows[0].amount))return await fail(409,'SETTLEMENT_EXCEEDS_ADVANCE');
  const storagePath=input.file?await upload(advance.rows[0]):null;
  const row=await client.query('INSERT INTO branch_cash_advance_settlements(advance_id,spent_amount,returned_amount,description,receipt_storage_key,receipt_original_name,receipt_mime_type,receipt_file_size,submitted_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[input.id,input.spent,input.returned,input.description,storagePath,input.file?.originalName||null,input.file?.mimeType||null,input.file?.buffer.length||null,input.userId]);
  await client.query('COMMIT');return {status:201,body:{settlement:row.rows[0]}};
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}
