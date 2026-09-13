import http from 'node:http';
import { readFile, writeFile, mkdir, rename, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, 'data');
const dbFile = path.join(dataDir, 'orders.json');
const port = Number(process.env.PORT || 4173);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const validTransitions = {awaiting_merchant:['preparing','cancelled'],preparing:['awaiting_rider','cancelled'],awaiting_rider:['assigned','cancelled'],assigned:['picked_up','cancelled'],picked_up:['delivered'],delivered:[],cancelled:[]};
const PLATFORM_COMMISSION_RATE = 0.12;

async function load() { try { return JSON.parse(await readFile(dbFile, 'utf8')); } catch { return {orders:[], sequence:2050}; } }
async function save(db) { await mkdir(dataDir, {recursive:true}); const temp = `${dbFile}.tmp`; await writeFile(temp, JSON.stringify(db, null, 2)); await rename(temp, dbFile); }
function send(res, status, body) { res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store'}); res.end(JSON.stringify(body)); }
function log(order, actor, state, note) { order.events.push({at:new Date().toISOString(), actor, state, note}); }
async function body(req) { let raw=''; for await (const chunk of req) raw += chunk; try { return raw ? JSON.parse(raw) : {}; } catch { throw new Error('INVALID_JSON'); } }
function find(db, id) { return db.orders.find(o => o.id === id); }
function transition(order, next, actor, note) { if (!validTransitions[order.status]?.includes(next)) throw new Error(`INVALID_TRANSITION:${order.status}:${next}`); order.status=next; order.updatedAt=new Date().toISOString(); log(order, actor, next, note); }

const server = http.createServer(async (req,res) => {
  const url = new URL(req.url, `http://${req.headers.host}`); const parts = url.pathname.split('/').filter(Boolean);
  try {
    if (url.pathname === '/api/health') return send(res,200,{ok:true,service:'wasla-order-core'});
    let db = await load();
    if (url.pathname === '/api/admin/orders' && req.method === 'GET') return send(res,200,{orders:db.orders});
    if (url.pathname === '/api/orders' && req.method === 'POST') {
      const input = await body(req); if (!input.customer?.phone || !Array.isArray(input.items) || !input.items.length) return send(res,400,{error:'CUSTOMER_AND_ITEMS_REQUIRED'});
      const id = `WS-${++db.sequence}`; const now = new Date().toISOString();
      const merchandiseTotal = Number(input.total||0); const deliveryFee = Number(input.deliveryFee??20); const commission = Math.round(merchandiseTotal * PLATFORM_COMMISSION_RATE * 100) / 100; const customerCharge = merchandiseTotal + deliveryFee;
      const settlement = {commissionRate:PLATFORM_COMMISSION_RATE,platformCommission:commission,merchantPayout:Math.round((merchandiseTotal-commission)*100)/100,riderEarnings:deliveryFee,customerCharge,method:input.payment||'cod',status:'pending'};
      const order = {id,status:'awaiting_merchant',customer:{name:input.customer.name||'عميل خالصة',phone:input.customer.phone,address:input.customer.address||'كفر صقر'},merchant:{id:input.merchantId||'burger-street',name:input.merchantName||'برجر ستريت'},items:input.items,total:merchandiseTotal,deliveryFee,payment:input.payment||'cod',settlement,otp:String(Math.floor(1000+Math.random()*9000)),rider:null,createdAt:now,updatedAt:now,events:[]};
      log(order,'customer','awaiting_merchant','تم إنشاء الطلب'); db.orders.unshift(order); await save(db); return send(res,201,{order});
    }
    if (url.pathname === '/api/merchant/orders' && req.method === 'GET') return send(res,200,{orders:db.orders.filter(o=>['awaiting_merchant','preparing'].includes(o.status))});
    if (url.pathname === '/api/merchant/settlement' && req.method === 'GET') return send(res,200,{orders:db.orders.filter(o=>o.status==='delivered').map(o=>({id:o.id,merchant:o.merchant.name,payout:o.settlement?.merchantPayout||0,status:o.settlement?.status||'pending'}))});
    if (url.pathname === '/api/rider/settlement' && req.method === 'GET') return send(res,200,{orders:db.orders.filter(o=>o.status==='delivered'&&o.rider).map(o=>({id:o.id,rider:o.rider.name,earnings:o.settlement?.riderEarnings||0,status:o.settlement?.status||'pending'}))});
    if (url.pathname === '/api/rider/offers' && req.method === 'GET') return send(res,200,{orders:db.orders.filter(o=>o.status==='awaiting_rider')});
    if (parts[0] === 'api' && parts[1] === 'orders' && parts[2]) {
      const order = find(db, parts[2]); if (!order) return send(res,404,{error:'ORDER_NOT_FOUND'});
      if (parts.length === 3 && req.method === 'GET') return send(res,200,{order});
      const action = parts[3]; const input = await body(req);
      if (action === 'merchant-accept' && req.method === 'POST') { transition(order,'preparing','merchant',`وقت التجهيز ${input.prepMinutes||20} دقيقة`); order.prepMinutes=Number(input.prepMinutes||20); }
      else if (action === 'ready' && req.method === 'POST') transition(order,'awaiting_rider','merchant','الطلب جاهز للاستلام');
      else if (action === 'rider-accept' && req.method === 'POST') { transition(order,'assigned','rider','قبل المندوب الطلب'); order.rider={id:input.riderId||'rider-001',name:input.riderName||'محمد السيد'}; }
      else if (action === 'pickup' && req.method === 'POST') transition(order,'picked_up','rider','تم استلام الطلب من المحل');
      else if (action === 'deliver' && req.method === 'POST') { if (String(input.otp||'') !== order.otp) return send(res,400,{error:'INVALID_DELIVERY_OTP'}); transition(order,'delivered','rider','تم التسليم وتأكيد رمز العميل'); order.settlement.status=order.payment==='cod'?'cash_reconciliation_due':'ready_for_provider_payout'; log(order,'settlement',order.settlement.status,`عمولة خالصة ${order.settlement.platformCommission} ج.م`); }
      else if (action === 'cancel' && req.method === 'POST') transition(order,'cancelled',input.actor||'admin',input.reason||'تم إلغاء الطلب');
      else return send(res,404,{error:'UNKNOWN_ACTION'});
      await save(db); return send(res,200,{order});
    }
    if (req.method === 'GET') {
      const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname); const safePath = path.resolve(root, `.${requested}`); if (!safePath.startsWith(root)) return send(res,403,{error:'FORBIDDEN'});
      try { const info = await stat(safePath); if (!info.isFile()) throw new Error('NOT_FILE'); res.writeHead(200,{'content-type':mime[path.extname(safePath)]||'application/octet-stream'}); createReadStream(safePath).pipe(res); } catch { send(res,404,{error:'NOT_FOUND'}); }
      return;
    }
    send(res,404,{error:'NOT_FOUND'});
  } catch (error) { console.error(error); send(res,400,{error:error.message||'REQUEST_FAILED'}); }
});
server.listen(port, () => console.log(`Khalasa order core running at http://localhost:${port}`));
