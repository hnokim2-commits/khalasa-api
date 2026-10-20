import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
test('financial-only release preserves old OTP login and has no new merchant activation gate',()=>{
 assert.match(server,/app\.post\('\/v1\/auth\/request-otp'/);
 assert.match(server,/app\.post\('\/v1\/auth\/verify-otp'/);
 assert.doesNotMatch(server,/customer_credentials|MERCHANT_ACTIVATION_REQUIRED|merchantActivationState/);
 assert.match(server,/registerFinancialWrites\(app,\{pool,auth,asyncRoute\}\)/);
});
test('financial-only release does not include customer, product or service-zone migrations',async()=>{
 const names=await readdir(new URL('../migrations/',import.meta.url));
 assert.ok(names.includes('0071_financial_operation_results.sql'));
 for(const name of ['0068_live_service_zones_and_support.sql','0069_product_category.sql','0070_customer_credentials.sql'])assert.ok(!names.includes(name));
});
test('financial middleware does not independently claim or delete keys',()=>{
 const start=server.indexOf("app.use(asyncRoute(async(req,res,next)=>{\n  if(!isProtectedFinancialWrite(req))");
 const end=server.indexOf('const cleanupTimer=',start);const block=server.slice(start,end);
 assert.ok(start>=0&&end>start);assert.match(block,/req\.financialContext=/);assert.doesNotMatch(block,/INSERT INTO financial_request_keys|DELETE FROM financial_request_keys/);
});
