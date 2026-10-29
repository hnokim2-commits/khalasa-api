import crypto from 'node:crypto';
import {assertFoodTarget} from './food-staging-target.mjs';
export function createFoodTestGrants(pool,env){
 assertFoodTarget(env);
 if(env.FOOD_WHOLESALE_FIXTURES_ENABLED!==undefined&&!['false','true'].includes(env.FOOD_WHOLESALE_FIXTURES_ENABLED))throw Error('INVALID_FIXTURE_FLAG');
 const enabled=env.FOOD_WHOLESALE_FIXTURES_ENABLED==='true';
 const entries=[{phone:'01000000900',application:'b1eb2a56-54e0-40a8-b7c9-05ef864f1626',kind:'supplier',name:'TEST ONLY | Khalasa food factory'},{phone:'01148691145',application:'fc8c9fea-c3c6-475f-b40e-8dc6ac4492d9',kind:'buyer',name:'TEST ONLY | Khalasa food shop'}];
 async function permits(userId){if(!enabled)return false;const r=await pool.query(`SELECT 1 FROM merchants m JOIN food_wholesale_enrollments e ON e.merchant_id=m.id WHERE m.owner_user_id=$1 AND e.active AND food_wholesale_is_test_grant(m.id)`,[userId]);return r.rowCount===1}
 async function run(actor,key,action,body){
  if(!enabled)throw Error('FIXTURES_DISABLED');if(actor.role!=='admin'||actor.isMainAdmin!==true)throw Error('MAIN_ADMIN_REQUIRED');
  if(!body||Object.keys(body).some(k=>!['reference','confirmSynthetic'].includes(k))||body.confirmSynthetic!==true||typeof body.reference!=='string'||!body.reference.trim()||body.reference.length>500)throw Error('FIXTURE_EXPLICIT_CONFIRMATION_REQUIRED');
  if(typeof key!=='string'||!/^[A-Za-z0-9_-]{16,100}$/.test(key))throw Error('IDEMPOTENCY_KEY_REQUIRED');
  const digest=crypto.createHash('sha256').update(JSON.stringify({action,reference:body.reference,confirmSynthetic:true})).digest('hex'),c=await pool.connect();
  try{await c.query('BEGIN');await c.query("SELECT pg_advisory_xact_lock(hashtextextended('staging-food-test-grants',0))");
   const old=await c.query('SELECT digest,response FROM food_wholesale_operation_results WHERE actor_user_id=$1 AND operation_key=$2',[actor.sub,key]);if(old.rowCount){if(old.rows[0].digest!==digest)throw Error('IDEMPOTENCY_PAYLOAD_MISMATCH');await c.query('COMMIT');return {result:old.rows[0].response,replayed:true}}
   let result;
   if(action==='revoke'){
    await c.query('UPDATE food_wholesale_enrollments e SET active=false,updated_at=now() FROM food_wholesale_test_grants g WHERE e.merchant_id=g.merchant_id');await c.query('UPDATE food_wholesale_test_grants SET active=false');result={fixtureOnly:true,active:false,realBusinessApproved:false,documentsApproved:false};
   }else if(action==='prepare'){
    const participants=[];
    for(const entry of entries){const r=await c.query(`SELECT m.id FROM merchants m JOIN users u ON u.id=m.owner_user_id JOIN merchant_applications a ON a.phone=u.phone WHERE u.phone=$1 AND a.id=$2 AND a.status='approved' AND m.display_name=$3 AND m.verification='pending' AND u.account_status='active' AND u.archived_at IS NULL FOR UPDATE OF m`,[entry.phone,entry.application,entry.name]);if(r.rowCount!==1)throw Error('ALLOWLISTED_PENDING_TEST_ACCOUNT_REQUIRED');participants.push({...entry,id:r.rows[0].id})}
    const active=await c.query('SELECT 1 FROM food_wholesale_test_grants WHERE active AND expires_at>now() LIMIT 1');if(active.rowCount)throw Error('FIXTURE_ALREADY_ACTIVE');
    const external=await c.query(`SELECT 1 FROM food_wholesale_enrollments e WHERE e.kind='supplier' AND e.active AND e.merchant_id<>$1`,[participants[0].id]);if(external.rowCount)throw Error('OTHER_FACTORY_ACTIVE');
    for(const p of participants){await c.query(`INSERT INTO food_wholesale_test_grants(merchant_id,kind,active,created_at,expires_at,reviewed_by,reference) VALUES($1,$2,true,now(),now()+interval '24 hours',$3,$4) ON CONFLICT(merchant_id) DO UPDATE SET active=true,created_at=now(),expires_at=now()+interval '24 hours',reviewed_by=EXCLUDED.reviewed_by,reference=EXCLUDED.reference`,[p.id,p.kind,actor.sub,body.reference.trim()]);
     await c.query(`INSERT INTO food_wholesale_enrollments(merchant_id,kind,active,review_reference,reviewed_by) VALUES($1,$2,true,$3,$4) ON CONFLICT(merchant_id) DO UPDATE SET active=true,review_reference=EXCLUDED.review_reference,reviewed_by=EXCLUDED.reviewed_by,updated_at=now()`,[p.id,p.kind,'SYNTHETIC TEST GRANT - NOT LEGAL OR DOCUMENT APPROVAL: '+body.reference.trim().slice(0,400),actor.sub]);
    }
    let product=(await c.query('SELECT product_id FROM food_wholesale_test_grants WHERE merchant_id=$1',[participants[0].id])).rows[0].product_id;
    if(!product){product=(await c.query("INSERT INTO products(merchant_id,name,price,stock_quantity,sale_unit,wholesale_enabled,wholesale_min_quantity,wholesale_price,wholesale_pack_size) VALUES($1,'TEST ONLY | Synthetic rice carton',360,20,'carton',true,5,360,12) RETURNING id",[participants[0].id])).rows[0].id;await c.query('UPDATE food_wholesale_test_grants SET product_id=$1 WHERE merchant_id=$2',[product,participants[0].id])}
    const grants=await c.query('SELECT merchant_id,kind,expires_at FROM food_wholesale_test_grants ORDER BY kind');result={fixtureOnly:true,active:true,expiresWithinHours:24,realBusinessApproved:false,documentsApproved:false,productId:product,participants:grants.rows};
   }else throw Error('INVALID_ACTION');
   await c.query('INSERT INTO food_wholesale_events(actor_user_id,action,entity_id,snapshot) VALUES($1,$2,$1,$3::jsonb)',[actor.sub,'staging_fixture_'+action,JSON.stringify({...result,reference:body.reference.trim()})]);
   await c.query('INSERT INTO food_wholesale_operation_results(actor_user_id,operation_key,digest,response) VALUES($1,$2,$3,$4::jsonb)',[actor.sub,key,digest,JSON.stringify(result)]);await c.query('COMMIT');return {result,replayed:false};
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e}finally{c.release()}
 }
 return {enabled,permits,run};
}
