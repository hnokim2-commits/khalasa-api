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
const port = Number(process.env.PORT || 8080);
const commissionRate = Number(process.env.PLATFORM_COMMISSION_RATE || 0.12);
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); callback(new Error('CORS_NOT_ALLOWED')); } }));
app.use(express.json({ limit: '1mb' }));

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const publicCode = () => `KH-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
const otpHash = otp => crypto.createHash('sha256').update(String(otp)).digest('hex');
function tokenFor(user) { return jwt.sign({ sub: user.id, role: user.role, phone: user.phone }, process.env.JWT_SECRET, { expiresIn: '7d' }); }
function auth(...roles) { return (req, res, next) => { try { const raw = req.headers.authorization?.replace(/^Bearer\s+/i, ''); if (!raw) return res.status(401).json({ error: 'AUTH_REQUIRED' }); const user = jwt.verify(raw, process.env.JWT_SECRET); if (roles.length && !roles.includes(user.role)) return res.status(403).json({ error: 'FORBIDDEN' }); req.user = user; next(); } catch { res.status(401).json({ error: 'INVALID_TOKEN' }); } }; }
function transitionAllowed(from, to) { return ({ awaiting_merchant:['preparing','cancelled'], preparing:['awaiting_rider','cancelled'], awaiting_rider:['assigned','cancelled'], assigned:['picked_up','cancelled'], picked_up:['delivered'], delivered:[], cancelled:[] })[from]?.includes(to); }

app.get('/health', asyncRoute(async (_req, res) => { await pool.query('SELECT 1'); res.json({ ok: true, service: 'khalasa-api' }); }));

// A real SMS provider must replace this endpoint before production. It never sends or exposes an OTP in production.
app.post('/v1/auth/request-otp', asyncRoute(async (req, res) => {
  const phone = String(req.body.phone || ''); if (!/^01\d{9}$/.test(phone)) return res.status(400).json({ error: 'INVALID_EGYPTIAN_PHONE' });
  if (process.env.NODE_ENV === 'production' && process.env.OTP_PROVIDER === 'disabled') return res.status(503).json({ error: 'OTP_PROVIDER_NOT_CONFIGURED' });
  res.status(202).json({ accepted: true, message: 'OTP dispatch queued' });
}));
app.post('/v1/auth/session', asyncRoute(async (req, res) => {
  const { phone, fullName } = req.body; if (!/^01\d{9}$/.test(String(phone || '')) || !fullName) return res.status(400).json({ error: 'PHONE_AND_NAME_REQUIRED' });
  // New public registrations are always customers. Merchant, rider and staff roles are created only by the approval workflow.
  const existing = await pool.query('SELECT id, role, phone, full_name FROM users WHERE phone=$1', [phone]);
  if (existing.rowCount) return res.json({ token: tokenFor(existing.rows[0]), user: existing.rows[0] });
  const result = await pool.query(`INSERT INTO users(role, phone, full_name, is_phone_verified) VALUES('customer',$1,$2,$3) RETURNING id, role, phone, full_name`, [phone, fullName, process.env.NODE_ENV !== 'production']);
  const user = result.rows[0]; res.json({ token: tokenFor(user), user });
}));

app.post('/v1/orders', auth('customer'), asyncRoute(async (req, res) => {
  const { merchantId, items, deliveryAddress, deliveryLat, deliveryLng, paymentMethod = 'cod' } = req.body;
  if (!merchantId || !Array.isArray(items) || !items.length || !deliveryAddress) return res.status(400).json({ error: 'ORDER_FIELDS_REQUIRED' });
  if (!['cod','wallet','card'].includes(paymentMethod)) return res.status(400).json({ error: 'INVALID_PAYMENT_METHOD' });
  const normalized = items.map(item => ({ productName: String(item.productName || item.name || '').trim(), quantity: Number(item.quantity || item.qty), unitPrice: Number(item.unitPrice || item.price) }));
  if (normalized.some(item => !item.productName || !Number.isInteger(item.quantity) || item.quantity < 1 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) return res.status(400).json({ error: 'INVALID_ITEMS' });
  const merchandiseTotal = normalized.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0); const deliveryFee = 20; const commission = Number((merchandiseTotal * commissionRate).toFixed(2)); const merchantPayout = Number((merchandiseTotal - commission).toFixed(2)); const otp = crypto.randomInt(1000, 10000).toString();
  const client = await pool.connect();
  try { await client.query('BEGIN'); const created = await client.query(`INSERT INTO orders(public_code,customer_id,merchant_id,delivery_address,delivery_lat,delivery_lng,payment_method,merchandise_total,delivery_fee,platform_commission,merchant_payout,delivery_otp_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`, [publicCode(), req.user.sub, merchantId, deliveryAddress, deliveryLat || null, deliveryLng || null, paymentMethod, merchandiseTotal, deliveryFee, commission, merchantPayout, otpHash(otp)]); const order = created.rows[0]; for (const item of normalized) await client.query('INSERT INTO order_items(order_id,product_name,quantity,unit_price) VALUES($1,$2,$3,$4)', [order.id, item.productName, item.quantity, item.unitPrice]); await client.query('INSERT INTO order_events(order_id,actor_user_id,status,note) VALUES($1,$2,$3,$4)', [order.id, req.user.sub, 'awaiting_merchant', 'تم إنشاء الطلب']); await client.query('COMMIT'); res.status(201).json({ order: { ...order, deliveryOtp: process.env.NODE_ENV === 'production' ? undefined : otp } }); } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));

app.get('/v1/merchant/orders', auth('merchant'), asyncRoute(async (req, res) => { const rows = await pool.query(`SELECT o.* FROM orders o JOIN merchants m ON m.id=o.merchant_id WHERE m.owner_user_id=$1 AND o.status IN ('awaiting_merchant','preparing') ORDER BY o.created_at DESC`, [req.user.sub]); res.json({ orders: rows.rows }); }));
app.post('/v1/orders/:id/merchant-accept', auth('merchant'), asyncRoute(async (req, res) => { const prepMinutes = Number(req.body.prepMinutes || 20); const order = await pool.query(`SELECT o.* FROM orders o JOIN merchants m ON m.id=o.merchant_id WHERE o.id=$1 AND m.owner_user_id=$2`, [req.params.id, req.user.sub]); if (!order.rowCount) return res.status(404).json({ error: 'ORDER_NOT_FOUND' }); if (!transitionAllowed(order.rows[0].status, 'preparing')) return res.status(409).json({ error: 'INVALID_STATE' }); await pool.query(`UPDATE orders SET status='preparing',prep_minutes=$1,updated_at=now() WHERE id=$2`, [prepMinutes, req.params.id]); await pool.query(`INSERT INTO order_events(order_id,actor_user_id,status,note) VALUES($1,$2,'preparing',$3)`, [req.params.id, req.user.sub, `وقت التجهيز ${prepMinutes} دقيقة`]); res.json({ ok:true }); }));
app.post('/v1/orders/:id/ready', auth('merchant'), asyncRoute(async (req, res) => { const result = await pool.query(`UPDATE orders SET status='awaiting_rider',updated_at=now() WHERE id=$1 AND status='preparing' RETURNING id`, [req.params.id]); if (!result.rowCount) return res.status(409).json({ error:'INVALID_STATE' }); await pool.query(`INSERT INTO order_events(order_id,actor_user_id,status,note) VALUES($1,$2,'awaiting_rider','الطلب جاهز للاستلام')`, [req.params.id,req.user.sub]); res.json({ ok:true }); }));
app.get('/v1/rider/offers', auth('rider'), asyncRoute(async (_req, res) => { const rows = await pool.query(`SELECT id,public_code,merchant_id,delivery_address,delivery_fee,created_at FROM orders WHERE status='awaiting_rider' ORDER BY created_at ASC LIMIT 20`); res.json({ orders:rows.rows }); }));
app.post('/v1/orders/:id/rider-accept', auth('rider'), asyncRoute(async (req,res) => { const rider = await pool.query('SELECT id FROM riders WHERE user_id=$1 AND verification=$2 AND is_available=true',[req.user.sub,'approved']); if(!rider.rowCount) return res.status(403).json({error:'RIDER_NOT_AVAILABLE_OR_APPROVED'}); const result=await pool.query(`UPDATE orders SET status='assigned',rider_id=$1,updated_at=now() WHERE id=$2 AND status='awaiting_rider' RETURNING id`,[rider.rows[0].id,req.params.id]); if(!result.rowCount)return res.status(409).json({error:'ORDER_ALREADY_TAKEN'}); await pool.query(`INSERT INTO order_events(order_id,actor_user_id,status,note) VALUES($1,$2,'assigned','تم قبول الطلب بواسطة المندوب')`,[req.params.id,req.user.sub]);res.json({ok:true}); }));
app.post('/v1/orders/:id/deliver', auth('rider'), asyncRoute(async (req,res) => { const order=await pool.query('SELECT * FROM orders WHERE id=$1',[req.params.id]); if(!order.rowCount)return res.status(404).json({error:'ORDER_NOT_FOUND'}); if(order.rows[0].status!=='picked_up'||otpHash(req.body.otp)!==order.rows[0].delivery_otp_hash)return res.status(409).json({error:'INVALID_DELIVERY_CONFIRMATION'}); await pool.query(`UPDATE orders SET status='delivered',updated_at=now() WHERE id=$1`,[req.params.id]);await pool.query(`INSERT INTO order_events(order_id,actor_user_id,status,note) VALUES($1,$2,'delivered','تم التسليم برمز العميل')`,[req.params.id,req.user.sub]);res.json({ok:true}); }));
app.get('/v1/admin/orders', auth('admin','support'), asyncRoute(async (_req,res)=>{const rows=await pool.query(`SELECT o.*,u.full_name customer_name,m.display_name merchant_name FROM orders o JOIN users u ON u.id=o.customer_id JOIN merchants m ON m.id=o.merchant_id ORDER BY o.created_at DESC LIMIT 200`);res.json({orders:rows.rows});}));

app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'INTERNAL_ERROR' }); });
app.listen(port, () => console.log(`Khalasa API listening on :${port}`));
