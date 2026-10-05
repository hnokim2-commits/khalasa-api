import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
test('staff login supports declared operational roles with short sessions',()=>{
  assert.match(server,/u\.role IN \('admin','city_admin','support','accountant'\)/);
  assert.match(server,/\['admin','city_admin','support','accountant','investor'\]\.includes\(requestedRole\)\?'8h':'24h'/);
});
test('payout decisions remain restricted to administrators',()=>{
  const withdrawal=server.slice(server.indexOf("app.post('/v1/admin/rider-withdrawals/:id/decision'"),server.indexOf("app.post('/v1/admin/rider-withdrawals/:id/decision'")+250);
  const settlement=server.slice(server.indexOf("app.post('/v1/admin/merchant-settlements/:id/decision'"),server.indexOf("app.post('/v1/admin/merchant-settlements/:id/decision'")+250);
  assert.match(withdrawal,/auth\('admin'\)/);
  assert.match(settlement,/auth\('admin'\)/);
});
test('full order refunds have an administrator-only guard',()=>{
  const marker="app.post('/v1/admin/orders/:id/refund',auth('admin'),(_req,_res,next)=>next());";
  const guarded=server.indexOf(marker);
  const refundHandler=server.indexOf("app.post('/v1/admin/orders/:id/refund',auth('admin','accountant')");
  assert.ok(guarded>=0);
  assert.ok(refundHandler>guarded);
});
