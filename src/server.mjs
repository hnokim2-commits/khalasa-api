import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import pg from 'pg';
const { Pool } = pg;

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const name of required) if (!process.env[name]) throw new Error(`${name} is required`);
const app = express();
app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
const port = Number(process.env.PORT || 8080);
const commissionRate = Number(process.env.PLATFORM_COMMISSION_RATE || 0.12);
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(value=>value.trim().replace(/\/$/, '')).filter(Boolean);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); callback(new Error('CORS_NOT_ALLOWED')); } }));
app.use(express.json({ limit: '1mb' }));
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cache-Control': 'no-store'
  });
  if (process.env.NODE_ENV === 'production') res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const requestWindows = new Map();
function rateLimit({ limit = 5, windowMs = 10 * 60 * 1000, key = req => req.ip }) {
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = `${req.path}:${key(req)}`;
    const bucket = requestWindows.get(bucketKey);
    if (!bucket || bucket.resetAt <= now) {
      requestWindows.set(bucketKey, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (bucket.count >= limit) {
      res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'TOO_MANY_ATTEMPTS' });
    }
    bucket.count += 1;
    next();
  };
}
const authRateLimit = rateLimit({ limit: 8, key: req => `${req.ip}:${String(req.body?.phone || '')}` });
app.use((req, res, next) => ['/v1/staff/login', '/v1/partner/login', '/v1/auth/request-otp', '/v1/auth/verify-otp'].includes(req.path) ? authRateLimit(req, res, next) : next());
const cleanupTimer = setInterval(() => { const now=Date.now(); for (const [key,bucket] of requestWindows) if (bucket.resetAt <= now) requestWindows.delete(key); }, 10 * 60 * 1000);
cleanupTimer.unref();

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const publicCode = () => `KH-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
const otpHash = otp => crypto.createHash('sha256').update(String(otp)).digest('hex');
function customerOrderView(order, deliveryOtp) { const { delivery_otp_hash: _otpHash, idempotency_key: _idempotencyKey, ...safe } = order; return deliveryOtp ? { ...safe, deliveryOtp } : safe; }
function tokenFor(user) { return jwt.sign({ sub: user.id, role: user.role, phone: user.phone }, process.env.JWT_SECRET, { expiresIn: ['admin','city_admin'].includes(user.role) ? '8h' : '7d' }); }
function auth(...roles) { return (req, res, next) => { try { const raw = req.headers.authorization?.replace(/^Bearer\s+/i, ''); if (!raw) return res.status(401).json({ error: 'AUTH_REQUIRED' }); const user = jwt.verify(raw, process.env.JWT_SECRET); if (roles.length && !roles.includes(user.role)) return res.status(403).json({ error: 'FORBIDDEN' }); req.user = user; next(); } catch { res.status(401).json({ error: 'INVALID_TOKEN' }); } }; }
const cityPermissions = ['orders.read','orders.manage','riders.read','riders.manage','partners.request'];
function normalizePermissions(value = {}) { return Object.fromEntries(cityPermissions.map(key => [key, value[key] === true])); }
function cityPermission(permission) { return asyncRoute(async (req, res, next) => {
  if (req.user.role === 'admin') { req.cityScope = null; return next(); }
  const result = await pool.query(`SELECT a.city_id,a.permissions,c.name city_name,c.governorate FROM city_admin_assignments a JOIN cities c ON c.id=a.city_id WHERE a.user_id=$1 AND a.is_active=true AND c.is_active=true`, [req.user.sub]);
  if (!result.rowCount) return res.status(403).json({ error:'CITY_ACCESS_DISABLED' });
  const assignment = result.rows[0];
  if (assignment.permissions?.[permission] !== true) return res.status(403).json({ error:'CITY_PERMISSION_REQUIRED', permission });
  req.cityScope = assignment;
  next();
}); }
function transitionAllowed(from, to) { return ({ awaiting_merchant:['preparing','cancelled'], preparing:['awaiting_rider','cancelled'], awaiting_rider:['assigned','cancelled'], assigned:['picked_up','cancelled'], picked_up:['delivered'], delivered:[], cancelled:[] })[from]?.includes(to); }
async function deliverOtp({ phone, email }, otp) {
  if(process.env.OTP_PROVIDER==='resend_email'){
    if(!process.env.RESEND_API_KEY||!process.env.OTP_EMAIL_FROM)throw new Error('OTP_PROVIDER_NOT_CONFIGURED');
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.RESEND_API_KEY}`},body:JSON.stringify({from:process.env.OTP_EMAIL_FROM,to:[email],subject:'رمز التحقق من خالصة',html:`<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>رمز التحقق من خالصة</h2><p>استخدم الرمز التالي لإكمال تسجيل الدخول:</p><p style="font-size:30px;font-weight:700;letter-spacing:6px">${otp}</p><p>تنتهي صلاحية الرمز خلال 5 دقائق. لا تشاركه مع أي شخص.</p></div>`})});
    if(!response.ok)throw new Error(`OTP_DELIVERY_FAILED_${response.status}`);
    return;
  }
  if(process.env.OTP_PROVIDER==='webhook'){
    if(!process.env.OTP_WEBHOOK_URL)throw new Error('OTP_PROVIDER_NOT_CONFIGURED');
    const response=await fetch(process.env.OTP_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OTP_WEBHOOK_SECRET||''}`},body:JSON.stringify({phone,otp,purpose:'customer_login'})});
    if(!response.ok)throw new Error(`OTP_DELIVERY_FAILED_${response.status}`);
    return;
  }
  if(process.env.OTP_PROVIDER==='meta_whatsapp'){
    const requiredMeta=['WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_TEMPLATE_NAME','WHATSAPP_GRAPH_VERSION'];
    if(requiredMeta.some(name=>!process.env[name]))throw new Error('OTP_PROVIDER_NOT_CONFIGURED');
    const destination=`20${phone.slice(1)}`;
    const response=await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`},body:JSON.stringify({messaging_product:'whatsapp',to:destination,type:'template',template:{name:process.env.WHATSAPP_TEMPLATE_NAME,language:{code:process.env.WHATSAPP_TEMPLATE_LANGUAGE||'ar'},components:[{type:'body',parameters:[{type:'text',text:otp}]},{type:'button',sub_type:'url',index:'0',parameters:[{type:'text',text:otp}]}]}})});
    if(!response.ok)throw new Error(`OTP_DELIVERY_FAILED_${response.status}`);
    return;
  }
  throw new Error('OTP_PROVIDER_NOT_CONFIGURED');
}

app.get('/health', asyncRoute(async (_req, res) => { await pool.query('SELECT 1'); res.json({ ok: true, service: 'khalasa-api' }); }));
app.get('/v1/catalog', asyncRoute(async (_req,res)=>{
  const rows=await pool.query(`SELECT p.id product_id,p.name product_name,p.price,m.id merchant_id,m.display_name merchant_name,m.category,m.minimum_order,m.city_id FROM products p JOIN merchants m ON m.id=p.merchant_id WHERE p.is_available=true AND m.is_accepting_orders=true AND m.verification='approved' ORDER BY m.display_name,p.name LIMIT 200`);
  res.json({products:rows.rows});
}));

app.post('/v1/staff/login', asyncRoute(async (req,res)=>{const phone=String(req.body.phone||''),accessCode=String(req.body.accessCode||'');if(!/^01\d{9}$/.test(phone)||accessCode.length<8)return res.status(400).json({error:'INVALID_STAFF_LOGIN'});if(phone===process.env.OWNER_PHONE&&process.env.OWNER_ACCESS_CODE){const valid=crypto.timingSafeEqual(crypto.createHash('sha256').update(accessCode).digest(),crypto.createHash('sha256').update(process.env.OWNER_ACCESS_CODE).digest());if(!valid)return res.status(401).json({error:'INVALID_STAFF_LOGIN'});const owner=await pool.query(`INSERT INTO users(role,phone,full_name,is_phone_verified) VALUES('admin',$1,'مالك خالصة',true) ON CONFLICT(phone) DO UPDATE SET role='admin',is_phone_verified=true,updated_at=now() RETURNING id,role,phone,full_name`,[phone]);const user=owner.rows[0];return res.json({token:tokenFor(user),user:{id:user.id,role:user.role,phone:user.phone,fullName:user.full_name}});}const found=await pool.query(`SELECT u.id,u.role,u.phone,u.full_name,sc.password_hash FROM users u JOIN staff_credentials sc ON sc.user_id=u.id AND sc.is_active=true WHERE u.phone=$1 AND u.role IN ('admin','city_admin')`,[phone]);if(!found.rowCount)return res.status(401).json({error:'INVALID_STAFF_LOGIN'});const user=found.rows[0];const check=await pool.query('SELECT crypt($1,$2)=$2 AS valid',[accessCode,user.password_hash]);if(!check.rows[0].valid)return res.status(401).json({error:'INVALID_STAFF_LOGIN'});res.json({token:tokenFor(user),user:{id:user.id,role:user.role,phone:user.phone,fullName:user.full_name}});}));
app.post('/v1/partner/login', asyncRoute(async(req,res)=>{const phone=String(req.body.phone||'').trim(),accessCode=String(req.body.accessCode||'');if(!/^01\d{9}$/.test(phone)||accessCode.length<8)return res.status(400).json({error:'INVALID_PARTNER_LOGIN'});const found=await pool.query(`SELECT u.id,u.role,u.phone,u.full_name,sc.password_hash FROM users u JOIN staff_credentials sc ON sc.user_id=u.id AND sc.is_active=true WHERE u.phone=$1 AND u.role IN ('merchant','rider')`,[phone]);if(!found.rowCount)return res.status(401).json({error:'INVALID_PARTNER_LOGIN'});const user=found.rows[0],check=await pool.query('SELECT crypt($1,$2)=$2 AS valid',[accessCode,user.password_hash]);if(!check.rows[0].valid)return res.status(401).json({error:'INVALID_PARTNER_LOGIN'});res.json({token:tokenFor(user),user:{id:user.id,role:user.role,phone:user.phone,fullName:user.full_name}});}));
app.get('/v1/admin/me',auth('admin'),asyncRoute(async(req,res)=>res.json({ok:true,user:req.user})));
app.get('/v1/admin/main-users',auth('admin'),asyncRoute(async(_req,res)=>{const rows=await pool.query(`SELECT u.id,u.full_name,u.phone,COALESCE(sc.is_active,true) is_active FROM users u LEFT JOIN staff_credentials sc ON sc.user_id=u.id WHERE u.role='admin' ORDER BY u.created_at`);res.json({users:rows.rows});}));
app.post('/v1/admin/main-users',auth('admin'),asyncRoute(async(req,res)=>{const {fullName,phone,accessCode}=req.body;if(!fullName||!/^01\d{9}$/.test(String(phone||''))||String(accessCode||'').length<8)return res.status(400).json({error:'ADMIN_USER_FIELDS_REQUIRED'});const client=await pool.connect();try{await client.query('BEGIN');let user=await client.query('SELECT id,role FROM users WHERE phone=$1',[phone]);if(user.rowCount&&user.rows[0].role!=='admin'){await client.query('ROLLBACK');return res.status(409).json({error:'PHONE_BELONGS_TO_ANOTHER_ROLE'});}if(!user.rowCount)user=await client.query(`INSERT INTO users(role,phone,full_name,is_phone_verified) VALUES('admin',$1,$2,true) RETURNING id`,[phone,fullName]);else await client.query('UPDATE users SET full_name=$1,updated_at=now() WHERE id=$2',[fullName,user.rows[0].id]);await client.query(`INSERT INTO staff_credentials(user_id,password_hash,is_active) VALUES($1,crypt($2,gen_salt('bf')),true) ON CONFLICT(user_id) DO UPDATE SET password_hash=crypt($2,gen_salt('bf')),is_active=true,updated_at=now()`,[user.rows[0].id,accessCode]);await client.query(`INSERT INTO admin_audit_log(actor_user_id,target_user_id,action,details) VALUES($1,$2,'main_admin.saved',$3::jsonb)`,[req.user.sub,user.rows[0].id,JSON.stringify({phone})]);await client.query('COMMIT');res.status(201).json({ok:true});}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}));
app.patch('/v1/admin/main-users/:id',auth('admin'),asyncRoute(async(req,res)=>{if(req.params.id===req.user.sub)return res.status(409).json({error:'CANNOT_DISABLE_SELF'});const row=await pool.query(`UPDATE staff_credentials SET is_active=$1,updated_at=now() WHERE user_id=$2 RETURNING user_id,is_active`,[req.body.isActive===true,req.params.id]);if(!row.rowCount)return res.status(404).json({error:'ADMIN_USER_NOT_FOUND'});res.json({user:row.rows[0]});}));
app.post('/v1/admin/partner-credentials',auth('admin'),asyncRoute(async(req,res)=>{const phone=String(req.body.phone||'').trim(),role=String(req.body.role||''),accessCode=String(req.body.accessCode||'');if(!/^01\d{9}$/.test(phone)||!['merchant','rider'].includes(role)||accessCode.length<10)return res.status(400).json({error:'INVALID_PARTNER_CREDENTIALS'});const found=await pool.query('SELECT id,role FROM users WHERE phone=$1',[phone]);if(!found.rowCount||found.rows[0].role!==role)return res.status(404).json({error:'PARTNER_ACCOUNT_NOT_FOUND'});await pool.query(`INSERT INTO staff_credentials(user_id,password_hash,is_active) VALUES($1,crypt($2,gen_salt('bf')),true) ON CONFLICT(user_id) DO UPDATE SET password_hash=crypt($2,gen_salt('bf')),is_active=true,updated_at=now()`,[found.rows[0].id,accessCode]);await pool.query(`INSERT INTO admin_audit_log(actor_user_id,target_user_id,action,details) VALUES($1,$2,'partner.credentials.reset',$3::jsonb)`,[req.user.sub,found.rows[0].id,JSON.stringify({role})]);res.status(201).json({ok:true});}));
app.get('/v1/admin/partners',auth('admin'),asyncRoute(async(_req,res)=>{const [merchants,riders]=await Promise.all([pool.query(`SELECT m.id,m.display_name,m.category,m.address,m.minimum_order,m.is_accepting_orders,m.verification,m.created_at,u.full_name owner_name,u.phone,c.name city_name,c.governorate FROM merchants m JOIN users u ON u.id=m.owner_user_id LEFT JOIN cities c ON c.id=m.city_id ORDER BY m.created_at DESC`),pool.query(`SELECT r.id,u.full_name,u.phone,r.vehicle_type,r.verification,r.is_available,r.probation_ends_at,r.created_at,c.name city_name,c.governorate FROM riders r JOIN users u ON u.id=r.user_id LEFT JOIN cities c ON c.id=r.city_id ORDER BY r.created_at DESC`)]);res.json({merchants:merchants.rows,riders:riders.rows});}));
app.post('/v1/admin/merchants',auth('admin'),asyncRoute(async(req,res)=>{const ownerName=String(req.body.ownerName||'').trim(),phone=String(req.body.phone||'').trim(),displayName=String(req.body.displayName||'').trim(),category=String(req.body.category||'').trim(),address=String(req.body.address||'').trim(),cityId=String(req.body.cityId||''),accessCode=String(req.body.accessCode||''),minimumOrder=Number(req.body.minimumOrder||0);if(!ownerName||!/^01\d{9}$/.test(phone)||!displayName||!category||!address||!cityId||accessCode.length<10||!Number.isFinite(minimumOrder)||minimumOrder<0)return res.status(400).json({error:'INVALID_MERCHANT_FIELDS'});const client=await pool.connect();try{await client.query('BEGIN');const city=await client.query('SELECT id FROM cities WHERE id=$1 AND is_active=true',[cityId]);if(!city.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'CITY_NOT_FOUND'});}let user=await client.query('SELECT id,role FROM users WHERE phone=$1',[phone]);if(user.rowCount&&user.rows[0].role!=='merchant'){await client.query('ROLLBACK');return res.status(409).json({error:'PHONE_BELONGS_TO_ANOTHER_ROLE'});}if(!user.rowCount)user=await client.query(`INSERT INTO users(role,phone,full_name,is_phone_verified) VALUES('merchant',$1,$2,true) RETURNING id`,[phone,ownerName]);else await client.query('UPDATE users SET full_name=$1,is_phone_verified=true,updated_at=now() WHERE id=$2',[ownerName,user.rows[0].id]);const merchant=await client.query(`INSERT INTO merchants(owner_user_id,display_name,category,address,minimum_order,is_accepting_orders,verification,city_id) VALUES($1,$2,$3,$4,$5,true,'approved',$6) RETURNING id,display_name,category,address,minimum_order,is_accepting_orders,verification,city_id`,[user.rows[0].id,displayName,category,address,minimumOrder,cityId]);await client.query(`INSERT INTO staff_credentials(user_id,password_hash,is_active) VALUES($1,crypt($2,gen_salt('bf')),true) ON CONFLICT(user_id) DO UPDATE SET password_hash=crypt($2,gen_salt('bf')),is_active=true,updated_at=now()`,[user.rows[0].id,accessCode]);await client.query(`INSERT INTO admin_audit_log(actor_user_id,target_user_id,city_id,action,details) VALUES($1,$2,$3,'merchant.created',$4::jsonb)`,[req.user.sub,user.rows[0].id,cityId,JSON.stringify({merchantId:merchant.rows[0].id,displayName})]);await client.query('COMMIT');res.status(201).json({merchant:merchant.rows[0]});}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}));

app.post('/v1/admin/riders',auth('admin'),asyncRoute(async(req,res)=>{
  const fullName=String(req.body.fullName||'').trim(),phone=String(req.body.phone||'').trim(),cityId=String(req.body.cityId||''),vehicleType=String(req.body.vehicleType||'motorcycle').trim(),accessCode=String(req.body.accessCode||'');
  if(!fullName||!/^01\d{9}$/.test(phone)||!cityId||!['motorcycle','bicycle','car'].includes(vehicleType)||accessCode.length<10)return res.status(400).json({error:'INVALID_RIDER_FIELDS'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const city=await client.query('SELECT id FROM cities WHERE id=$1 AND is_active=true',[cityId]);
    if(!city.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'CITY_NOT_FOUND'});}
    let user=await client.query('SELECT id,role FROM users WHERE phone=$1',[phone]);
    if(user.rowCount&&user.rows[0].role!=='rider'){await client.query('ROLLBACK');return res.status(409).json({error:'PHONE_BELONGS_TO_ANOTHER_ROLE'});}
    if(!user.rowCount)user=await client.query(`INSERT INTO users(role,phone,full_name,is_phone_verified) VALUES('rider',$1,$2,true) RETURNING id`,[phone,fullName]);
    else await client.query('UPDATE users SET full_name=$1,is_phone_verified=true,updated_at=now() WHERE id=$2',[fullName,user.rows[0].id]);
    const rider=await client.query(`INSERT INTO riders(user_id,city_id,vehicle_type,verification,probation_ends_at,is_available) VALUES($1,$2,$3,'approved',now()+interval '3 months',true) RETURNING id,user_id,city_id,vehicle_type,verification,probation_ends_at,is_available`,[user.rows[0].id,cityId,vehicleType]);
    await client.query(`INSERT INTO staff_credentials(user_id,password_hash,is_active) VALUES($1,crypt($2,gen_salt('bf')),true) ON CONFLICT(user_id) DO UPDATE SET password_hash=crypt($2,gen_salt('bf')),is_active=true,updated_at=now()`,[user.rows[0].id,accessCode]);
    await client.query(`INSERT INTO admin_audit_log(actor_user_id,target_user_id,city_id,action,details) VALUES($1,$2,$3,'rider.created',$4::jsonb)`,[req.user.sub,user.rows[0].id,cityId,JSON.stringify({riderId:rider.rows[0].id,vehicleType})]);
    await client.query('COMMIT');
    res.status(201).json({rider:rider.rows[0]});
  }catch(error){await client.query('ROLLBACK');if(error.code==='23505')return res.status(409).json({error:'RIDER_ALREADY_EXISTS'});throw error;}finally{client.release();}
}));

app.get('/v1/public/cities',asyncRoute(async(_req,res)=>{const rows=await pool.query('SELECT id,name,governorate FROM cities WHERE is_active=true ORDER BY governorate,name');res.json({cities:rows.rows});}));
app.post('/v1/rider/applications',authRateLimit,asyncRoute(async(req,res)=>{const fullName=String(req.body.fullName||'').trim(),phone=String(req.body.phone||'').trim(),cityId=String(req.body.cityId||''),vehicleType=String(req.body.vehicleType||'motorcycle'),accessCode=String(req.body.accessCode||'');if(!fullName||!/^01\d{9}$/.test(phone)||!cityId||!['motorcycle','bicycle','car'].includes(vehicleType)||accessCode.length<10)return res.status(400).json({error:'INVALID_RIDER_APPLICATION'});const city=await pool.query('SELECT id FROM cities WHERE id=$1 AND is_active=true',[cityId]);if(!city.rowCount)return res.status(404).json({error:'CITY_NOT_FOUND'});const exists=await pool.query('SELECT 1 FROM users WHERE phone=$1 UNION ALL SELECT 1 FROM rider_applications WHERE phone=$1 AND status=$2 LIMIT 1',[phone,'pending']);if(exists.rowCount)return res.status(409).json({error:'PHONE_ALREADY_REGISTERED_OR_PENDING'});const row=await pool.query(`INSERT INTO rider_applications(full_name,phone,city_id,vehicle_type,source,access_code_hash) VALUES($1,$2,$3,$4,'self',crypt($5,gen_salt('bf'))) RETURNING id,status,created_at`,[fullName,phone,cityId,vehicleType,accessCode]);res.status(201).json({application:row.rows[0]});}));
app.post('/v1/merchant/rider-nominations',auth('merchant'),asyncRoute(async(req,res)=>{const fullName=String(req.body.fullName||'').trim(),phone=String(req.body.phone||'').trim(),cityId=String(req.body.cityId||''),vehicleType=String(req.body.vehicleType||'motorcycle'),accessCode=String(req.body.accessCode||'');if(!fullName||!/^01\d{9}$/.test(phone)||!cityId||!['motorcycle','bicycle','car'].includes(vehicleType)||accessCode.length<10)return res.status(400).json({error:'INVALID_RIDER_NOMINATION'});const merchant=await pool.query('SELECT id FROM merchants WHERE owner_user_id=$1',[req.user.sub]);if(!merchant.rowCount)return res.status(404).json({error:'MERCHANT_NOT_FOUND'});const row=await pool.query(`INSERT INTO rider_applications(full_name,phone,city_id,vehicle_type,source,nominated_by_merchant_id,access_code_hash) VALUES($1,$2,$3,$4,'merchant',$5,crypt($6,gen_salt('bf'))) RETURNING id,status,created_at`,[fullName,phone,cityId,vehicleType,merchant.rows[0].id,accessCode]);res.status(201).json({application:row.rows[0]});}));
app.get('/v1/admin/rider-applications',auth('admin'),asyncRoute(async(_req,res)=>{const rows=await pool.query(`SELECT a.id,a.full_name,a.phone,a.vehicle_type,a.source,a.status,a.created_at,c.name city_name,c.governorate,m.display_name nominating_merchant FROM rider_applications a JOIN cities c ON c.id=a.city_id LEFT JOIN merchants m ON m.id=a.nominated_by_merchant_id ORDER BY CASE WHEN a.status='pending' THEN 0 ELSE 1 END,a.created_at DESC`);res.json({applications:rows.rows});}));
app.patch('/v1/admin/rider-applications/:id',auth('admin'),asyncRoute(async(req,res)=>{if(!['approved','rejected'].includes(req.body.status))return res.status(400).json({error:'INVALID_REVIEW'});const client=await pool.connect();try{await client.query('BEGIN');const found=await client.query('SELECT * FROM rider_applications WHERE id=$1 AND status=$2 FOR UPDATE',[req.params.id,'pending']);if(!found.rowCount){await client.query('ROLLBACK');return res.status(409).json({error:'APPLICATION_ALREADY_REVIEWED'});}const application=found.rows[0];if(req.body.status==='approved'){let user=await client.query('SELECT id,role FROM users WHERE phone=$1',[application.phone]);if(user.rowCount){await client.query('ROLLBACK');return res.status(409).json({error:'PHONE_ALREADY_REGISTERED'});}user=await client.query(`INSERT INTO users(role,phone,full_name,is_phone_verified) VALUES('rider',$1,$2,true) RETURNING id`,[application.phone,application.full_name]);await client.query(`INSERT INTO riders(user_id,city_id,vehicle_type,verification,probation_ends_at,is_available) VALUES($1,$2,$3,'approved',now()+interval '3 months',true)`,[user.rows[0].id,application.city_id,application.vehicle_type]);await client.query(`INSERT INTO staff_credentials(user_id,password_hash,is_active) VALUES($1,$2,true)`,[user.rows[0].id,application.access_code_hash]);}const updated=await client.query('UPDATE rider_applications SET status=$1,reviewed_by=$2,reviewed_at=now() WHERE id=$3 RETURNING id,status',[req.body.status,req.user.sub,req.params.id]);await client.query('COMMIT');res.json({application:updated.rows[0]});}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}));

app.post('/v1/auth/request-otp', asyncRoute(async (req, res) => {
  const phone=String(req.body.phone||'').trim(),email=String(req.body.email||'').trim().toLowerCase();
  if(!/^01\d{9}$/.test(phone))return res.status(400).json({error:'INVALID_EGYPTIAN_PHONE'});
  if(process.env.OTP_PROVIDER==='resend_email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'INVALID_EMAIL'});
  const existing=await pool.query('SELECT role,phone,email,is_email_verified FROM users WHERE phone=$1 OR lower(email)=lower($2)',[phone,email]);
  if(existing.rows.some(user=>user.role!=='customer'))return res.status(403).json({error:'STAFF_ACCOUNT_REQUIRES_STAFF_LOGIN'});
  if(existing.rows.some(user=>user.email&&user.email.toLowerCase()===email&&user.phone!==phone))return res.status(409).json({error:'EMAIL_ALREADY_IN_USE'});
  if(existing.rows.some(user=>user.phone===phone&&user.is_email_verified&&user.email?.toLowerCase()!==email))return res.status(409).json({error:'PHONE_ALREADY_IN_USE'});
  if(process.env.NODE_ENV==='production'&&!['webhook','meta_whatsapp','resend_email'].includes(process.env.OTP_PROVIDER))return res.status(503).json({error:'OTP_PROVIDER_NOT_CONFIGURED'});
  const otp=crypto.randomInt(100000,1000000).toString(),hash=crypto.createHmac('sha256',process.env.JWT_SECRET).update(`${phone}:${otp}`).digest('hex');
  await pool.query(`UPDATE auth_challenges SET consumed_at=now() WHERE phone=$1 AND purpose='customer_login' AND consumed_at IS NULL`,[phone]);
  await pool.query(`INSERT INTO auth_challenges(phone,email,otp_hash,expires_at) VALUES($1,$2,$3,now()+interval '5 minutes')`,[phone,email||null,hash]);
  if(process.env.NODE_ENV==='production'){try{await deliverOtp({phone,email},otp);}catch(error){if(error.message==='OTP_PROVIDER_NOT_CONFIGURED')return res.status(503).json({error:'OTP_PROVIDER_NOT_CONFIGURED'});return res.status(502).json({error:'OTP_DELIVERY_FAILED'});}}
  res.status(202).json({accepted:true,...(process.env.NODE_ENV!=='production'?{devOtp:otp}:{})});
}));
app.post('/v1/auth/verify-otp',asyncRoute(async(req,res)=>{
  const phone=String(req.body.phone||'').trim(),email=String(req.body.email||'').trim().toLowerCase(),fullName=String(req.body.fullName||'').trim(),otp=String(req.body.otp||'');
  if(!/^01\d{9}$/.test(phone)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!fullName||fullName.length>120||!/^\d{6}$/.test(otp))return res.status(400).json({error:'INVALID_VERIFICATION_FIELDS'});
  const challenge=await pool.query(`SELECT id,email,otp_hash,attempts FROM auth_challenges WHERE phone=$1 AND lower(email)=lower($2) AND purpose='customer_login' AND consumed_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 1`,[phone,email]);
  if(!challenge.rowCount||challenge.rows[0].attempts>=5)return res.status(401).json({error:'OTP_INVALID_OR_EXPIRED'});
  const hash=crypto.createHmac('sha256',process.env.JWT_SECRET).update(`${phone}:${otp}`).digest('hex');
  const valid=crypto.timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(challenge.rows[0].otp_hash,'hex'));
  if(!valid){await pool.query('UPDATE auth_challenges SET attempts=attempts+1 WHERE id=$1',[challenge.rows[0].id]);return res.status(401).json({error:'OTP_INVALID_OR_EXPIRED'});}
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('UPDATE auth_challenges SET consumed_at=now() WHERE id=$1',[challenge.rows[0].id]);
    const conflicts=await client.query(`SELECT id,role,phone,email,is_email_verified FROM users WHERE phone=$1 OR lower(email)=lower($2) FOR UPDATE`,[phone,email]);
    if(conflicts.rows.some(user=>user.role!=='customer')){await client.query('ROLLBACK');return res.status(403).json({error:'STAFF_ACCOUNT_REQUIRES_STAFF_LOGIN'});}
    if(conflicts.rows.some(user=>user.email?.toLowerCase()===email&&user.phone!==phone)){await client.query('ROLLBACK');return res.status(409).json({error:'EMAIL_ALREADY_IN_USE'});}
    if(conflicts.rows.some(user=>user.phone===phone&&user.is_email_verified&&user.email?.toLowerCase()!==email)){await client.query('ROLLBACK');return res.status(409).json({error:'PHONE_ALREADY_IN_USE'});}
    let user=await client.query('SELECT id,role,phone,full_name,email FROM users WHERE lower(email)=lower($1)',[email]);
    if(!user.rowCount)user=await client.query(`INSERT INTO users(role,phone,full_name,email,is_phone_verified,is_email_verified) VALUES('customer',$1,$2,$3,false,true) RETURNING id,role,phone,full_name,email`,[phone,fullName,email]);
    else user=await client.query(`UPDATE users SET full_name=$1,phone=$2,is_email_verified=true,updated_at=now() WHERE id=$3 RETURNING id,role,phone,full_name,email`,[fullName,phone,user.rows[0].id]);
    await client.query('COMMIT');res.json({token:tokenFor(user.rows[0]),user:user.rows[0]});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}));
app.post('/v1/auth/session',(_req,res)=>res.status(410).json({error:'OTP_VERIFICATION_REQUIRED'}));

app.post('/v1/orders', auth('customer'), asyncRoute(async (req, res) => {
  const { merchantId, items, deliveryAddress, deliveryLat, deliveryLng, paymentMethod = 'cod' } = req.body;
  if (!merchantId || !Array.isArray(items) || !items.length || !deliveryAddress) return res.status(400).json({ error: 'ORDER_FIELDS_REQUIRED' });
  // Electronic payments remain disabled until a signed provider webhook is implemented.
  if (paymentMethod !== 'cod') return res.status(400).json({ error: 'PAYMENT_METHOD_NOT_AVAILABLE' });
  const requested = items.map(item => ({ productId:String(item.productId || ''),quantity:Number(item.quantity || item.qty) }));
  if (requested.some(item => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50)) return res.status(400).json({ error: 'INVALID_ITEMS' });
  const idempotencyKey=String(req.headers['x-idempotency-key']||'');
  if(!/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey))return res.status(400).json({error:'IDEMPOTENCY_KEY_REQUIRED'});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const replay=await client.query('SELECT * FROM orders WHERE idempotency_key=$1 AND customer_id=$2',[idempotencyKey,req.user.sub]);
    if(replay.rowCount){await client.query('COMMIT');return res.json({order:customerOrderView(replay.rows[0]),replayed:true});}
    const merchant = await client.query('SELECT city_id,category FROM merchants WHERE id=$1 AND verification=$2 AND is_accepting_orders=true',[merchantId,'approved']);
    if(!merchant.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'MERCHANT_NOT_AVAILABLE'});}
    const productIds=[...new Set(requested.map(item=>item.productId))];
    const products=await client.query('SELECT id,name,price FROM products WHERE merchant_id=$1 AND is_available=true AND id=ANY($2::uuid[])',[merchantId,productIds]);
    const catalog=new Map(products.rows.map(product=>[product.id,product]));
    if(catalog.size!==productIds.length){await client.query('ROLLBACK');return res.status(409).json({error:'PRODUCT_NOT_AVAILABLE'});}
    const normalized=requested.map(item=>({productName:catalog.get(item.productId).name,quantity:item.quantity,unitPrice:Number(catalog.get(item.productId).price)}));
    const merchandiseTotal=normalized.reduce((sum,item)=>sum+item.quantity*item.unitPrice,0),deliveryFee=20,otp=crypto.randomInt(1000,10000).toString();
    const selected=await client.query(`SELECT calculation_type,value,minimum_amount,maximum_amount FROM commission_rules WHERE is_active=true AND (city_id IS NULL OR city_id=$1) AND (merchant_category IS NULL OR merchant_category=$2) ORDER BY (city_id IS NOT NULL)::int DESC,(merchant_category IS NOT NULL)::int DESC,created_at DESC LIMIT 1`,[merchant.rows[0].city_id,merchant.rows[0].category]);
    const rule=selected.rows[0];let commission=rule?(rule.calculation_type==='fixed'?Number(rule.value):merchandiseTotal*Number(rule.value)/100):merchandiseTotal*commissionRate;if(rule){commission=Math.max(commission,Number(rule.minimum_amount||0));if(rule.maximum_amount!=null)commission=Math.min(commission,Number(rule.maximum_amount));}commission=Number(Math.min(commission,merchandiseTotal).toFixed(2));const merchantPayout=Number((merchandiseTotal-commission).toFixed(2));
    const created=await client.query(`INSERT INTO orders(public_code,customer_id,merchant_id,city_id,delivery_address,delivery_lat,delivery_lng,payment_method,merchandise_total,delivery_fee,platform_commission,merchant_payout,delivery_otp_hash,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,[publicCode(),req.user.sub,merchantId,merchant.rows[0].city_id,deliveryAddress,deliveryLat||null,deliveryLng||null,paymentMethod,merchandiseTotal,deliveryFee,commission,merchantPayout,otpHash(otp),idempotencyKey]);
    const order=created.rows[0];for(const item of normalized)await client.query('INSERT INTO order_items(order_id,product_name,quantity,unit_price) VALUES($1,$2,$3,$4)',[order.id,item.productName,item.quantity,item.unitPrice]);await client.query('INSERT INTO order_events(order_id,actor_user_id,status,note) VALUES($1,$2,$3,$4)',[order.id,req.user.sub,'awaiting_merchant','تم إنشاء الطلب']);await client.query('COMMIT');res.status(201).json({order:customerOrderView(order,otp)});
  } catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}));

app.get('/v1/customer/orders', auth('customer'), asyncRoute(async (req,res)=>{
  const rows=await pool.query(`SELECT id,public_code,status,delivery_address,merchandise_total,delivery_fee,created_at,updated_at FROM orders WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 20`,[req.user.sub]);
  res.json({orders:rows.rows});
}));
app.post('/v1/customer/orders/:id/reset-delivery-code', auth('customer'), asyncRoute(async(req,res)=>{
  const otp=crypto.randomInt(1000,10000).toString();
  const order=await pool.query(`UPDATE orders SET delivery_otp_hash=$1,delivery_otp_attempts=0,delivery_otp_locked_at=NULL,updated_at=now() WHERE id=$2 AND customer_id=$3 AND status IN ('assigned','picked_up') RETURNING id,public_code,status`,[otpHash(otp),req.params.id,req.user.sub]);
  if(!order.rowCount)return res.status(409).json({error:'ORDER_NOT_READY_FOR_DELIVERY_CODE'});
  await pool.query(`INSERT INTO order_events(order_id,actor_user_id,status,note) VALUES($1,$2,$3,'أعاد العميل إصدار رمز التسليم')`,[order.rows[0].id,req.user.sub,order.rows[0].status]);
  res.json({order:{...order.rows[0],deliveryOtp:otp}});
}));

app.get('/v1/merchant/orders', auth('merchant'), asyncRoute(async (req, res) => { const rows = await pool.query(`SELECT o.* FROM orders o JOIN merchants m ON m.id=o.merchant_id WHERE m.owner_user_id=$1 AND o.status IN ('awaiting_merchant','preparing') ORDER BY o.created_at DESC`, [req.user.sub]); res.json({ orders: rows.rows }); }));
app.get('/v1/merchant/profile',auth('merchant'),asyncRoute(async(req,res)=>{const row=await pool.query(`SELECT m.id,m.display_name,m.category,m.address,m.lat,m.lng,m.minimum_order,m.is_accepting_orders,m.verification,c.name city_name,c.governorate,u.full_name owner_name,u.phone FROM merchants m JOIN users u ON u.id=m.owner_user_id LEFT JOIN cities c ON c.id=m.city_id WHERE m.owner_user_id=$1 ORDER BY m.created_at LIMIT 1`,[req.user.sub]);if(!row.rowCount)return res.status(404).json({error:'MERCHANT_PROFILE_NOT_FOUND'});res.json({merchant:row.rows[0]});}));
app.patch('/v1/merchant/profile',auth('merchant'),asyncRoute(async(req,res)=>{const address=String(req.body.address||'').trim(),minimumOrder=Number(req.body.minimumOrder||0),lat=req.body.lat==null?null:Number(req.body.lat),lng=req.body.lng==null?null:Number(req.body.lng);if(!address||!Number.isFinite(minimumOrder)||minimumOrder<0||(lat!=null&&!Number.isFinite(lat))||(lng!=null&&!Number.isFinite(lng)))return res.status(400).json({error:'INVALID_MERCHANT_PROFILE'});const row=await pool.query(`UPDATE merchants SET address=$1,minimum_order=$2,lat=COALESCE($3,lat),lng=COALESCE($4,lng) WHERE owner_user_id=$5 RETURNING id,display_name,address,lat,lng,minimum_order,is_accepting_orders,verification`,[address,minimumOrder,lat,lng,req.user.sub]);if(!row.rowCount)return res.status(404).json({error:'MERCHANT_PROFILE_NOT_FOUND'});res.json({merchant:row.rows[0]});}));
app.get('/v1/merchant/products',auth('merchant'),asyncRoute(async(req,res)=>{const rows=await pool.query(`SELECT p.id,p.name,p.price,p.is_available,p.created_at FROM products p JOIN merchants m ON m.id=p.merchant_id WHERE m.owner_user_id=$1 ORDER BY p.created_at DESC`,[req.user.sub]);res.json({products:rows.rows});}));
app.post('/v1/merchant/products',auth('merchant'),asyncRoute(async(req,res)=>{const name=String(req.body.name||'').trim(),price=Number(req.body.price);if(!name||name.length>150||!Number.isFinite(price)||price<0)return res.status(400).json({error:'INVALID_PRODUCT'});const row=await pool.query(`INSERT INTO products(merchant_id,name,price,is_available) SELECT id,$1,$2,true FROM merchants WHERE owner_user_id=$3 ORDER BY created_at LIMIT 1 RETURNING id,name,price,is_available,created_at`,[name,price,req.user.sub]);if(!row.rowCount)return res.status(404).json({error:'MERCHANT_PROFILE_NOT_FOUND'});res.status(201).json({product:row.rows[0]});}));
app.post('/v1/orders/:id/merchant-accept', auth('merchant'), asyncRoute(async (req, res) => { const prepMinutes = Number(req.body.prepMinutes || 20); const order = await pool.query(`SELECT o.* FROM orders o JOIN merchants m ON m.id=o.merchant_id WHERE o.id=$1 AND m.owner_user_id=$2`, [req.params.id, req.user.sub]); if (!order.rowCount) return res.status(404).json({ error: 'ORDER_NOT_FOUND' }); if (!transitionAllowed(order.rows[0].status, 'preparing')) return res.status(409).json({ error: 'INVALID_STATE' }); await pool.query(`UPDATE orders SET status='preparing',prep_minutes=$1,updated_at=now() WHERE id=$2`, [prepMinutes, req.params.id]); await pool.query(`INSERT INTO order_events(order_id,actor_user_id,status,note) VALUES($1,$2,'preparing',$3)`, [req.params.id, req.user.sub, `وقت التجهيز ${prepMinutes} دقيقة`]); res.json({ ok:true }); }));
app.post('/v1/orders/:id/ready', auth('merchant'), asyncRoute(async (req, res) => { const result = await pool.query(`UPDATE orders o SET status='awaiting_rider',updated_at=now() FROM merchants m WHERE o.id=$1 AND o.status='preparing' AND m.id=o.merchant_id AND m.owner_user_id=$2 RETURNING o.id`, [req.params.id,req.user.sub]); if (!result.rowCount) return res.status(409).json({ error:'INVALID_STATE_OR_OWNER' }); await pool.query(`INSERT INTO order_events(order_id,actor_user_id,status,note) VALUES($1,$2,'awaiting_rider','الطلب جاهز للاستلام')`, [req.params.id,req.user.sub]); res.json({ ok:true }); }));
app.get('/v1/rider/offers', auth('rider'), asyncRoute(async (req, res) => { const rows = await pool.query(`SELECT o.id,o.public_code,o.merchant_id,o.delivery_address,o.delivery_fee,o.created_at FROM orders o JOIN riders r ON r.user_id=$1 AND r.verification='approved' AND r.is_available=true WHERE o.status='awaiting_rider' AND o.city_id=r.city_id ORDER BY o.created_at ASC LIMIT 20`,[req.user.sub]); res.json({ orders:rows.rows }); }));
app.get('/v1/rider/dashboard',auth('rider'),asyncRoute(async(req,res)=>{const profile=await pool.query(`SELECT r.id,r.vehicle_type,r.verification,r.probation_ends_at,r.is_available,u.full_name,u.phone,c.name city_name,c.governorate FROM riders r JOIN users u ON u.id=r.user_id LEFT JOIN cities c ON c.id=r.city_id WHERE r.user_id=$1`,[req.user.sub]);if(!profile.rowCount)return res.status(404).json({error:'RIDER_PROFILE_NOT_FOUND'});const [active,offers,stats]=await Promise.all([pool.query(`SELECT o.id,o.public_code,o.status,o.delivery_address,o.delivery_fee,o.created_at,m.display_name merchant_name,m.address merchant_address FROM orders o JOIN riders r ON r.id=o.rider_id JOIN merchants m ON m.id=o.merchant_id WHERE r.user_id=$1 AND o.status IN ('assigned','picked_up') ORDER BY o.updated_at DESC LIMIT 1`,[req.user.sub]),pool.query(`SELECT o.id,o.public_code,o.delivery_address,o.delivery_fee,o.created_at,m.display_name merchant_name,m.address merchant_address FROM orders o JOIN riders r ON r.user_id=$1 AND r.verification='approved' AND r.is_available=true JOIN merchants m ON m.id=o.merchant_id WHERE o.status='awaiting_rider' AND o.city_id=r.city_id ORDER BY o.created_at LIMIT 20`,[req.user.sub]),pool.query(`SELECT count(*) FILTER (WHERE status='delivered' AND updated_at>=date_trunc('day',now()))::int completed_today,COALESCE(sum(delivery_fee) FILTER (WHERE status='delivered' AND updated_at>=date_trunc('day',now())),0) earnings_today FROM orders o JOIN riders r ON r.id=o.rider_id WHERE r.user_id=$1`,[req.user.sub])]);res.json({rider:profile.rows[0],activeOrder:active.rows[0]||null,offers:offers.rows,stats:stats.rows[0]});}));
app.post('/v1/orders/:id/rider-accept', auth('rider'), asyncRoute(async (req,res) => { const rider = await pool.query('SELECT id,city_id FROM riders WHERE user_id=$1 AND verification=$2 AND is_available=true',[req.user.sub,'approved']); if(!rider.rowCount) return res.status(403).json({error:'RIDER_NOT_AVAILABLE_OR_APPROVED'}); const result=await pool.query(`UPDATE orders SET status='assigned',rider_id=$1,updated_at=now() WHERE id=$2 AND city_id=$3 AND status='awaiting_rider' RETURNING id`,[rider.rows[0].id,req.params.id,rider.rows[0].city_id]); if(!result.rowCount)return res.status(409).json({error:'ORDER_ALREADY_TAKEN_OR_OUTSIDE_CITY'}); await pool.query(`INSERT INTO order_events(order_id,actor_user_id,status,note) VALUES($1,$2,'assigned','تم قبول الطلب بواسطة المندوب')`,[req.params.id,req.user.sub]);res.json({ok:true}); }));
app.post('/v1/orders/:id/pickup', auth('rider'), asyncRoute(async (req,res) => { const result=await pool.query(`UPDATE orders o SET status='picked_up',updated_at=now() FROM riders r WHERE o.id=$1 AND o.status='assigned' AND o.rider_id=r.id AND r.user_id=$2 RETURNING o.id`,[req.params.id,req.user.sub]);if(!result.rowCount)return res.status(409).json({error:'ORDER_NOT_ASSIGNED_TO_RIDER'});await pool.query(`INSERT INTO order_events(order_id,actor_user_id,status,note) VALUES($1,$2,'picked_up','تم استلام الطلب من المحل')`,[req.params.id,req.user.sub]);res.json({ok:true}); }));
app.post('/v1/orders/:id/deliver', auth('rider'), asyncRoute(async (req,res) => {
  const otp=String(req.body.otp||'');
  if(!/^\d{4}$/.test(otp))return res.status(400).json({error:'INVALID_DELIVERY_CONFIRMATION'});
  const order=await pool.query(`SELECT o.* FROM orders o JOIN riders r ON r.id=o.rider_id WHERE o.id=$1 AND r.user_id=$2`,[req.params.id,req.user.sub]);
  if(!order.rowCount)return res.status(404).json({error:'ORDER_NOT_ASSIGNED_TO_RIDER'});
  const current=order.rows[0];
  if(current.delivery_otp_locked_at||current.delivery_otp_attempts>=5)return res.status(423).json({error:'DELIVERY_CONFIRMATION_LOCKED'});
  if(current.status!=='picked_up'||otpHash(otp)!==current.delivery_otp_hash){
    await pool.query(`UPDATE orders SET delivery_otp_attempts=delivery_otp_attempts+1,delivery_otp_locked_at=CASE WHEN delivery_otp_attempts+1>=5 THEN now() ELSE delivery_otp_locked_at END,updated_at=now() WHERE id=$1`,[req.params.id]);
    return res.status(409).json({error:'INVALID_DELIVERY_CONFIRMATION'});
  }
  const delivered=await pool.query(`UPDATE orders SET status='delivered',updated_at=now() WHERE id=$1 AND status='picked_up' RETURNING id`,[req.params.id]);
  if(!delivered.rowCount)return res.status(409).json({error:'INVALID_ORDER_TRANSITION'});
  await pool.query(`INSERT INTO order_events(order_id,actor_user_id,status,note) VALUES($1,$2,'delivered','تم التسليم برمز العميل')`,[req.params.id,req.user.sub]);
  res.json({ok:true});
}));
app.get('/v1/admin/orders', auth('admin','support'), asyncRoute(async (_req,res)=>{const rows=await pool.query(`SELECT o.*,u.full_name customer_name,m.display_name merchant_name FROM orders o JOIN users u ON u.id=o.customer_id JOIN merchants m ON m.id=o.merchant_id ORDER BY o.created_at DESC LIMIT 200`);res.json({orders:rows.rows});}));
app.get('/v1/admin/order-details/:code', auth('admin','support'), asyncRoute(async(req,res)=>{
  const order=await pool.query(`SELECT o.id,o.public_code,o.status,o.delivery_address,o.payment_method,o.merchandise_total,o.delivery_fee,o.platform_commission,o.merchant_payout,o.created_at,o.updated_at,customer.full_name customer_name,merchant.display_name merchant_name,rider_user.full_name rider_name FROM orders o JOIN users customer ON customer.id=o.customer_id JOIN merchants merchant ON merchant.id=o.merchant_id LEFT JOIN riders rider ON rider.id=o.rider_id LEFT JOIN users rider_user ON rider_user.id=rider.user_id WHERE o.public_code=$1`,[req.params.code]);
  if(!order.rowCount)return res.status(404).json({error:'ORDER_NOT_FOUND'});
  const id=order.rows[0].id,[items,events]=await Promise.all([
    pool.query(`SELECT product_name,quantity,unit_price FROM order_items WHERE order_id=$1 ORDER BY id`,[id]),
    pool.query(`SELECT e.status,e.note,e.created_at,u.full_name actor_name,u.role actor_role FROM order_events e LEFT JOIN users u ON u.id=e.actor_user_id WHERE e.order_id=$1 ORDER BY e.created_at`,[id])
  ]);
  res.json({order:order.rows[0],items:items.rows,events:events.rows});
}));
app.get('/v1/admin/overview', auth('admin','support'), asyncRoute(async(_req,res)=>{
  const [orders,partners,approvals]=await Promise.all([
    pool.query(`SELECT count(*) FILTER (WHERE created_at>=date_trunc('day',now()))::int orders_today,count(*) FILTER (WHERE status NOT IN ('delivered','cancelled'))::int active_orders,count(*) FILTER (WHERE status='awaiting_merchant')::int awaiting_merchant,count(*) FILTER (WHERE status='preparing')::int preparing,count(*) FILTER (WHERE status='awaiting_rider')::int awaiting_rider,count(*) FILTER (WHERE status IN ('assigned','picked_up'))::int on_the_way,COALESCE(sum(platform_commission) FILTER (WHERE status='delivered' AND updated_at>=date_trunc('day',now())),0) commission_today FROM orders`),
    pool.query(`SELECT count(*) FILTER (WHERE verification='approved' AND is_accepting_orders=true)::int active_merchants FROM merchants`),
    pool.query(`SELECT count(*) FILTER (WHERE status='pending')::int pending_approvals FROM city_partner_requests`)
  ]);
  res.json({overview:{...orders.rows[0],...partners.rows[0],...approvals.rows[0]}});
}));

app.get('/v1/admin/cities', auth('admin'), asyncRoute(async (_req,res)=>{const rows=await pool.query(`SELECT c.*,count(DISTINCT a.user_id)::int admin_count FROM cities c LEFT JOIN city_admin_assignments a ON a.city_id=c.id AND a.is_active=true GROUP BY c.id ORDER BY c.governorate,c.name`);res.json({cities:rows.rows});}));
app.post('/v1/admin/cities', auth('admin'), asyncRoute(async (req,res)=>{const {governorate,name,code}=req.body;if(!governorate||!name||!/^[a-z0-9-]{3,60}$/.test(String(code||'')))return res.status(400).json({error:'CITY_FIELDS_REQUIRED'});const row=await pool.query(`INSERT INTO cities(governorate,name,code) VALUES($1,$2,$3) RETURNING *`,[governorate,name,code]);res.status(201).json({city:row.rows[0]});}));
app.get('/v1/admin/city-users', auth('admin'), asyncRoute(async (_req,res)=>{const rows=await pool.query(`SELECT u.id,u.full_name,u.phone,a.city_id,c.name city_name,c.governorate,a.permissions,a.is_active,a.updated_at FROM city_admin_assignments a JOIN users u ON u.id=a.user_id JOIN cities c ON c.id=a.city_id ORDER BY c.name,u.full_name`);res.json({users:rows.rows});}));
app.post('/v1/admin/city-users', auth('admin'), asyncRoute(async (req,res)=>{const {fullName,phone,cityId,accessCode}=req.body;if(!fullName||!/^01\d{9}$/.test(String(phone||''))||!cityId||String(accessCode||'').length<8)return res.status(400).json({error:'CITY_USER_FIELDS_OR_CODE_REQUIRED'});const permissions=normalizePermissions(req.body.permissions);const client=await pool.connect();try{await client.query('BEGIN');let user=await client.query('SELECT id,role FROM users WHERE phone=$1',[phone]);if(user.rowCount&&user.rows[0].role!=='city_admin'){await client.query('ROLLBACK');return res.status(409).json({error:'PHONE_BELONGS_TO_ANOTHER_ROLE'});}if(!user.rowCount)user=await client.query(`INSERT INTO users(role,phone,full_name,is_phone_verified) VALUES('city_admin',$1,$2,true) RETURNING id,role`,[phone,fullName]);else await client.query('UPDATE users SET full_name=$1,updated_at=now() WHERE id=$2',[fullName,user.rows[0].id]);await client.query(`INSERT INTO staff_credentials(user_id,password_hash) VALUES($1,crypt($2,gen_salt('bf'))) ON CONFLICT(user_id) DO UPDATE SET password_hash=crypt($2,gen_salt('bf')),updated_at=now()`,[user.rows[0].id,accessCode]);const assigned=await client.query(`INSERT INTO city_admin_assignments(user_id,city_id,permissions,created_by) VALUES($1,$2,$3::jsonb,$4) ON CONFLICT(user_id) DO UPDATE SET city_id=excluded.city_id,permissions=excluded.permissions,is_active=true,updated_at=now() RETURNING *`,[user.rows[0].id,cityId,JSON.stringify(permissions),req.user.sub]);await client.query(`INSERT INTO admin_audit_log(actor_user_id,target_user_id,city_id,action,details) VALUES($1,$2,$3,'city_admin.saved',$4::jsonb)`,[req.user.sub,user.rows[0].id,cityId,JSON.stringify({permissions})]);await client.query('COMMIT');res.status(201).json({assignment:assigned.rows[0]});}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}));
app.patch('/v1/admin/city-users/:id', auth('admin'), asyncRoute(async (req,res)=>{const permissions=normalizePermissions(req.body.permissions);const isActive=req.body.isActive!==false;const cityId=req.body.cityId;const result=await pool.query(`UPDATE city_admin_assignments SET city_id=COALESCE($1,city_id),permissions=$2::jsonb,is_active=$3,updated_at=now() WHERE user_id=$4 RETURNING *`,[cityId||null,JSON.stringify(permissions),isActive,req.params.id]);if(!result.rowCount)return res.status(404).json({error:'CITY_USER_NOT_FOUND'});await pool.query(`INSERT INTO admin_audit_log(actor_user_id,target_user_id,city_id,action,details) VALUES($1,$2,$3,'city_admin.permissions_changed',$4::jsonb)`,[req.user.sub,req.params.id,result.rows[0].city_id,JSON.stringify({permissions,isActive})]);res.json({assignment:result.rows[0]});}));

app.get('/v1/city-admin/context', auth('admin','city_admin'), cityPermission('orders.read'), asyncRoute(async (req,res)=>{if(!req.cityScope)return res.json({role:'admin',unrestricted:true});res.json({role:'city_admin',city:{id:req.cityScope.city_id,name:req.cityScope.city_name,governorate:req.cityScope.governorate},permissions:req.cityScope.permissions});}));
app.get('/v1/city-admin/orders', auth('admin','city_admin'), cityPermission('orders.read'), asyncRoute(async (req,res)=>{const values=[];let where='';if(req.cityScope){values.push(req.cityScope.city_id);where='WHERE o.city_id=$1';}const rows=await pool.query(`SELECT o.*,u.full_name customer_name,m.display_name merchant_name,ru.full_name rider_name FROM orders o JOIN users u ON u.id=o.customer_id JOIN merchants m ON m.id=o.merchant_id LEFT JOIN riders r ON r.id=o.rider_id LEFT JOIN users ru ON ru.id=r.user_id ${where} ORDER BY o.created_at DESC LIMIT 200`,values);res.json({orders:rows.rows});}));
app.get('/v1/city-admin/riders', auth('admin','city_admin'), cityPermission('riders.read'), asyncRoute(async (req,res)=>{const values=[];let where='';if(req.cityScope){values.push(req.cityScope.city_id);where='WHERE r.city_id=$1';}const rows=await pool.query(`SELECT r.id,u.full_name,u.phone,r.vehicle_type,r.verification,r.is_available,r.probation_ends_at,r.city_id FROM riders r JOIN users u ON u.id=r.user_id ${where} ORDER BY r.is_available DESC,u.full_name`,values);res.json({riders:rows.rows});}));
app.patch('/v1/city-admin/riders/:id/availability', auth('admin','city_admin'), cityPermission('riders.manage'), asyncRoute(async (req,res)=>{const values=[req.body.isAvailable===true,req.params.id];let cityCheck='';if(req.cityScope){values.push(req.cityScope.city_id);cityCheck=' AND city_id=$3';}const result=await pool.query(`UPDATE riders SET is_available=$1 WHERE id=$2 AND verification='approved'${cityCheck} RETURNING id,is_available`,values);if(!result.rowCount)return res.status(404).json({error:'RIDER_NOT_FOUND_IN_CITY'});res.json({rider:result.rows[0]});}));
app.post('/v1/city-admin/orders/:id/assign', auth('admin','city_admin'), cityPermission('orders.manage'), asyncRoute(async (req,res)=>{const {riderId}=req.body;const values=[riderId,req.params.id];let cityCheck='';if(req.cityScope){values.push(req.cityScope.city_id);cityCheck=' AND o.city_id=$3 AND r.city_id=$3';}const result=await pool.query(`UPDATE orders o SET rider_id=r.id,status='assigned',updated_at=now() FROM riders r WHERE r.id=$1 AND o.id=$2 AND o.status='awaiting_rider' AND r.verification='approved' AND r.is_available=true${cityCheck} RETURNING o.id,o.public_code,o.status`,values);if(!result.rowCount)return res.status(409).json({error:'ORDER_OR_RIDER_NOT_AVAILABLE_IN_CITY'});await pool.query(`INSERT INTO order_events(order_id,actor_user_id,status,note) VALUES($1,$2,'assigned','إسناد يدوي بواسطة إدارة المدينة')`,[req.params.id,req.user.sub]);res.json({order:result.rows[0]});}));

app.get('/v1/admin/commission-rules',auth('admin'),asyncRoute(async(_req,res)=>{const rows=await pool.query(`SELECT r.*,c.name city_name FROM commission_rules r LEFT JOIN cities c ON c.id=r.city_id ORDER BY r.created_at DESC`);res.json({rules:rows.rows});}));
app.post('/v1/admin/commission-rules',auth('admin'),asyncRoute(async(req,res)=>{const {cityId,merchantCategory,calculationType,value,minimumAmount=0,maximumAmount}=req.body;if(!['percentage','fixed'].includes(calculationType)||!Number.isFinite(Number(value))||Number(value)<0||(calculationType==='percentage'&&Number(value)>100))return res.status(400).json({error:'INVALID_COMMISSION_RULE'});const row=await pool.query(`INSERT INTO commission_rules(city_id,merchant_category,calculation_type,value,minimum_amount,maximum_amount,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[cityId||null,merchantCategory||null,calculationType,Number(value),Number(minimumAmount)||0,maximumAmount===''||maximumAmount==null?null:Number(maximumAmount),req.user.sub]);res.status(201).json({rule:row.rows[0]});}));
app.patch('/v1/admin/commission-rules/:id',auth('admin'),asyncRoute(async(req,res)=>{const row=await pool.query(`UPDATE commission_rules SET is_active=$1,updated_at=now() WHERE id=$2 RETURNING *`,[req.body.isActive===true,req.params.id]);if(!row.rowCount)return res.status(404).json({error:'RULE_NOT_FOUND'});res.json({rule:row.rows[0]});}));
app.get('/v1/admin/partner-requests',auth('admin'),asyncRoute(async(_req,res)=>{const rows=await pool.query(`SELECT p.*,c.name city_name,u.full_name requester_name FROM city_partner_requests p JOIN cities c ON c.id=p.city_id JOIN users u ON u.id=p.requested_by ORDER BY p.created_at DESC`);res.json({requests:rows.rows});}));
app.patch('/v1/admin/partner-requests/:id',auth('admin'),asyncRoute(async(req,res)=>{if(!['approved','rejected'].includes(req.body.status))return res.status(400).json({error:'INVALID_REVIEW'});const row=await pool.query(`UPDATE city_partner_requests SET status=$1,reviewed_by=$2,reviewed_at=now() WHERE id=$3 AND status='pending' RETURNING *`,[req.body.status,req.user.sub,req.params.id]);if(!row.rowCount)return res.status(409).json({error:'REQUEST_ALREADY_REVIEWED'});res.json({request:row.rows[0]});}));
app.post('/v1/city-admin/partner-requests',auth('city_admin'),cityPermission('partners.request'),asyncRoute(async(req,res)=>{const {partnerType,fullName,phone,details={}}=req.body;if(!['merchant','rider'].includes(partnerType)||!fullName||!/^01\d{9}$/.test(String(phone||'')))return res.status(400).json({error:'INVALID_PARTNER_REQUEST'});const row=await pool.query(`INSERT INTO city_partner_requests(city_id,requested_by,partner_type,full_name,phone,details) VALUES($1,$2,$3,$4,$5,$6::jsonb) RETURNING *`,[req.cityScope.city_id,req.user.sub,partnerType,fullName,phone,JSON.stringify(details)]);res.status(201).json({request:row.rows[0]});}));
app.get('/v1/city-admin/partner-requests',auth('city_admin'),cityPermission('partners.request'),asyncRoute(async(req,res)=>{const rows=await pool.query(`SELECT * FROM city_partner_requests WHERE city_id=$1 ORDER BY created_at DESC`,[req.cityScope.city_id]);res.json({requests:rows.rows});}));

app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'INTERNAL_ERROR' }); });
app.listen(port, () => console.log(`Khalasa API listening on :${port}`));
