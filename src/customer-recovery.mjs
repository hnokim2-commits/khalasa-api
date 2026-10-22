import crypto from 'node:crypto';
export const normalizeRecoveryPhone=value=>String(value||'').replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-1632)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-1776)).replace(/[\s()\-\u200e\u200f\u061c]/g,'').replace(/^(?:\+20|0020)/,'0');
export function validateRecoveryReview(body){
 const status=String(body.status||''),email=String(body.email||'').trim().toLowerCase(),reference=String(body.verificationReference||'').trim();
 if(!['approved','rejected'].includes(status))return null;
 if(status==='approved'&&(body.ownershipVerified!==true||reference.length<12||reference.length>300||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))return null;
 return {status,email,reference};
}
export function registerCustomerRecovery({app,pool,auth,asyncRoute,rateLimit,secret}){
 app.post('/v1/customer/recovery-requests',rateLimit,asyncRoute(async(req,res)=>{
  const phone=normalizeRecoveryPhone(req.body.phone);
  if(!/^01\d{9}$/.test(phone))return res.status(400).json({error:'INVALID_EGYPTIAN_PHONE'});
  const hash=crypto.createHmac('sha256',secret).update(String(req.ip||'')).digest('hex');
  await pool.query(`INSERT INTO customer_account_recovery_requests(user_id,request_ip_hash) SELECT u.id,$2 FROM users u WHERE u.phone=$1 AND u.role='customer' ON CONFLICT(user_id) WHERE status='pending' DO NOTHING`,[phone,hash]);
  res.status(202).json({accepted:true,message:'إذا كان الرقم لحساب عميل مسجل، سيظهر الطلب للإدارة للتحقق من الملكية. لا يتغير الحساب قبل المراجعة.'});
 }));
 app.get('/v1/admin/account-recovery-customers',auth('admin'),asyncRoute(async(_req,res)=>{
  const rows=await pool.query(`SELECT r.id,r.status,r.created_at,u.full_name,u.phone FROM customer_account_recovery_requests r JOIN users u ON u.id=r.user_id WHERE r.status='pending' ORDER BY r.created_at LIMIT 100`);
  res.json({requests:rows.rows});
 }));
 app.patch('/v1/admin/account-recovery-customers/:id',auth('admin'),asyncRoute(async(req,res)=>{
  const review=validateRecoveryReview(req.body);
  if(!review||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id))return res.status(400).json({error:'INVALID_CUSTOMER_RECOVERY_REVIEW'});
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const found=await client.query(`SELECT r.user_id,u.role FROM customer_account_recovery_requests r JOIN users u ON u.id=r.user_id WHERE r.id=$1 AND r.status='pending' FOR UPDATE OF r,u`,[req.params.id]);
   if(!found.rowCount||found.rows[0].role!=='customer'){await client.query('ROLLBACK');return res.status(409).json({error:'RECOVERY_ALREADY_REVIEWED'});}
   const userId=found.rows[0].user_id;
   if(review.status==='approved'){
    const conflict=await client.query('SELECT id FROM users WHERE lower(email)=lower($1) AND id<>$2',[review.email,userId]);
    if(conflict.rowCount){await client.query('ROLLBACK');return res.status(409).json({error:'EMAIL_ALREADY_IN_USE'});}
    await client.query('UPDATE users SET email=$1,is_email_verified=false,session_version=session_version+1,updated_at=now() WHERE id=$2',[review.email,userId]);
    await client.query(`UPDATE auth_challenges SET consumed_at=now() WHERE phone=(SELECT phone FROM users WHERE id=$1) AND consumed_at IS NULL`,[userId]);
   }
   await client.query(`UPDATE customer_account_recovery_requests SET status=$1,verification_reference=$2,reviewed_by=$3,reviewed_at=now() WHERE id=$4`,[review.status,review.status==='approved'?review.reference:null,req.user.sub,req.params.id]);
   await client.query(`INSERT INTO admin_audit_log(actor_user_id,target_user_id,action,details) VALUES($1,$2,'customer_recovery.reviewed',$3::jsonb)`,[req.user.sub,userId,JSON.stringify({requestId:req.params.id,status:review.status,ownershipVerified:review.status==='approved'})]);
   await client.query('COMMIT');res.json({ok:true,status:review.status,requiresEmailOtp:review.status==='approved'});
  }catch(error){await client.query('ROLLBACK');if(error.code==='23505')return res.status(409).json({error:'EMAIL_ALREADY_IN_USE'});throw error;}finally{client.release();}
 }));
}
