import {createFoodWholesaleService} from './food-wholesale-service.mjs';
export function registerFoodWholesale(app,{pool,auth,asyncRoute,enabled=false,protectLegacy=enabled,ownerPhone,fixtureEnabled=false,testGrants}){
 const service=createFoodWholesaleService(pool,{fixtureEnabled});
 const gate=(_req,res,next)=>enabled===true?next():res.status(404).json({error:'NOT_FOUND'});
 const actor=req=>({sub:req.user.sub,role:req.user.role,isMainAdmin:req.user.role==='admin'&&!!ownerPhone&&req.user.phone===ownerPhone});
 const key=req=>req.headers['x-idempotency-key'];
 const handle=work=>asyncRoute(async(req,res)=>{res.set('Cache-Control','no-store');try{res.json(await work(req))}catch(e){
  const code=String(e.message||'');const status=code==='AUTH_REQUIRED'?401:/^(MAIN_ADMIN_REQUIRED|FORBIDDEN|PARTICIPANT_DENIED|ENROLLMENT_REQUIRED|FIXTURE_PAIRING_REQUIRED)$/.test(code)?403:/NOT_FOUND$/.test(code)?404:/^(REVISION_CONFLICT|IDEMPOTENCY_PAYLOAD_MISMATCH|QUOTE_CHANGED_RECONFIRM|QUOTE_EXPIRED|INSUFFICIENT_STOCK|PRODUCT_CHANGED_REQUOTE|NOT_QUOTABLE|NOT_ACCEPTABLE|NOT_RECEIVABLE|CANCELLATION_REQUIRES_REVIEW|OPEN_ACCEPTED_ORDER_PROFILE_LOCKED|ENROLLMENT_KIND_IMMUTABLE|FIXTURE_ALREADY_ACTIVE|OTHER_FACTORY_ACTIVE)$/.test(code)?409:null;
  if(status)return res.status(status).json({error:code});
  if(e.code==='23505')return res.status(409).json({error:'ENROLLMENT_OR_KEY_CONFLICT'});
  if(e.code==='23514')return res.status(409).json({error:'FOOD_POLICY_CONSTRAINT'});
  if(/^(INVALID_[A-Z_]+|[A-Z_]+_REQUIRED|AMBIENT_PACKAGED_ONLY|SUPPLIER_NOT_APPROVED|BUYER_NOT_APPROVED|MERCHANT_NOT_APPROVED|SELF_SUPPLY_DENIED|PRODUCT_NOT_READY|EXPIRES_BEFORE_DELIVERY|TOTAL_OVERFLOW)$/.test(code))return res.status(400).json({error:code});
  throw e;
 }});
 // Keep protected pilot products/orders out of the old UI and old mutation flow.
 // These adapters run only in the isolated enabled candidate; no startup queries when off.
 if(protectLegacy===true){
  app.get('/v1/merchant/wholesale/catalog',auth('merchant'),handle(async req=>{
   const r=await pool.query(`SELECT p.id product_id,p.name product_name,p.sale_unit,p.stock_quantity,p.wholesale_min_quantity,p.wholesale_price,p.wholesale_pack_size,m.id supplier_id,m.display_name supplier_name,c.name city_name,c.governorate FROM products p JOIN merchants m ON m.id=p.merchant_id LEFT JOIN cities c ON c.id=m.city_id WHERE p.wholesale_enabled AND p.is_available AND p.stock_quantity>=p.wholesale_min_quantity AND m.activity_type IN('supplier','hybrid') AND m.verification='approved' AND m.owner_user_id<>$1 AND NOT EXISTS(SELECT 1 FROM food_wholesale_profiles f WHERE f.product_id=p.id) ORDER BY m.display_name,p.name LIMIT 300`,[req.user.sub]);return {products:r.rows};
  }));
  app.get('/v1/merchant/wholesale/requests',auth('merchant'),handle(async req=>{
   const merchant=(await pool.query('SELECT id FROM merchants WHERE owner_user_id=$1 ORDER BY created_at LIMIT 1',[req.user.sub])).rows[0];if(!merchant)return {requests:[]};
   const r=await pool.query(`SELECT w.*,p.name product_name,b.display_name buyer_name,s.display_name supplier_name FROM wholesale_requests w JOIN products p ON p.id=w.product_id JOIN merchants b ON b.id=w.buyer_merchant_id JOIN merchants s ON s.id=w.supplier_merchant_id WHERE (w.buyer_merchant_id=$1 OR w.supplier_merchant_id=$1) AND NOT EXISTS(SELECT 1 FROM food_wholesale_profiles f WHERE f.product_id=w.product_id) AND NOT EXISTS(SELECT 1 FROM food_wholesale_workflows f WHERE f.request_id=w.id) ORDER BY w.created_at DESC LIMIT 100`,[merchant.id]);return {merchantId:merchant.id,requests:r.rows};
  }));
  app.use('/v1/merchant/wholesale/requests',auth('merchant'),asyncRoute(async(req,res,next)=>{
   if(!['POST','PATCH','PUT','DELETE'].includes(req.method))return next();
   const id=String(req.body?.productId||req.path.split('/')[1]||'');if(!/^[0-9a-f-]{36}$/i.test(id))return next();
   const r=req.method==='POST'&&req.path==='/'?await pool.query('SELECT 1 FROM food_wholesale_profiles WHERE product_id=$1',[id]):await pool.query(`SELECT 1 FROM wholesale_requests w WHERE w.id=$1 AND (EXISTS(SELECT 1 FROM food_wholesale_profiles f WHERE f.product_id=w.product_id) OR EXISTS(SELECT 1 FROM food_wholesale_workflows f WHERE f.request_id=w.id))`,[id]);
   if(r.rowCount)return res.status(409).json({error:'FOOD_WHOLESALE_FLOW_REQUIRED'});next();
  }));
 }
 app.put('/v1/admin/food-wholesale/enrollments/:id',gate,auth('admin'),handle(req=>service.enroll(actor(req),key(req),req.params.id,req.body)));
 app.get('/v1/admin/food-wholesale/overview',gate,auth('admin'),handle(req=>service.overview(actor(req))));
 for(const action of ['prepare','revoke'])app.post('/v1/admin/food-wholesale/fixtures/'+action,gate,(_req,res,next)=>fixtureEnabled===true?next():res.status(404).json({error:'NOT_FOUND'}),auth('admin'),handle(req=>testGrants.run(actor(req),key(req),action,req.body)));
 const root='/v1/merchant/food-wholesale';
 app.get(root+'/me',gate,auth('merchant'),handle(req=>service.me(actor(req))));
 app.get(root+'/inventory',gate,auth('merchant'),handle(req=>service.inventory(actor(req))));
 app.get(root+'/catalog',gate,auth('merchant'),handle(req=>service.catalog(actor(req))));
 app.get(root+'/requests',gate,auth('merchant'),handle(req=>service.list(actor(req))));
 app.put(root+'/products/:id/profile',gate,auth('merchant'),handle(req=>service.profile(actor(req),key(req),req.params.id,req.body)));
 app.post(root+'/requests',gate,auth('merchant'),handle(req=>service.request(actor(req),key(req),req.body)));
 for(const action of ['quote','accept','receipt','cancel'])app.post(root+'/requests/:id/'+action,gate,auth('merchant'),handle(req=>service.action(actor(req),key(req),req.params.id,action,req.body)));
}
