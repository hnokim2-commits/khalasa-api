import test from 'node:test';
import assert from 'node:assert/strict';
import {financialDigest,financialTransaction} from '../src/financial-transactions.mjs';
const context={key:'test-key',operation:'merchant_settlement',digest:'a'.repeat(64)};
function fixture({prior,claimed=true}={}){
 const calls=[];const client={async query(sql,args){calls.push({sql,args});if(sql.startsWith('INSERT INTO financial_request_keys'))return {rowCount:claimed?1:0};if(sql.startsWith('SELECT request_digest'))return {rowCount:prior?1:0,rows:prior?[prior]:[]};return {rowCount:1};},release(){calls.push({sql:'RELEASE'});}};
 return {calls,pool:{connect:async()=>client}};
}
test('digest binds target, role and body but ignores object key order',()=>{
 const req={method:'POST',path:'/a',user:{role:'merchant'},body:{amount:100,note:'x'}};
 assert.equal(financialDigest(req),financialDigest({...req,body:{note:'x',amount:100}}));
 for(const other of [{...req,path:'/b'},{...req,body:{amount:101,note:'x'}},{...req,user:{role:'admin'}}])assert.notEqual(financialDigest(req),financialDigest(other));
});
test('success persists recoverable response before commit',async()=>{
 const f=fixture();const result=await financialTransaction(f.pool,context,async()=>({status:201,body:{id:'one'}}));
 assert.equal(result.status,201);assert.ok(f.calls.findIndex(x=>x.sql.startsWith('INSERT INTO financial_operation_results'))<f.calls.findIndex(x=>x.sql==='COMMIT'));assert.equal(f.calls.at(-1).sql,'RELEASE');
});
test('business rejection rolls back key and does not store success',async()=>{
 const f=fixture();await financialTransaction(f.pool,context,async()=>({status:409,body:{error:'INSUFFICIENT'}}));
 assert.ok(f.calls.some(x=>x.sql==='ROLLBACK'));assert.ok(!f.calls.some(x=>x.sql==='COMMIT'||x.sql.startsWith('INSERT INTO financial_operation_results')));
});
test('thrown business error rolls back and releases',async()=>{
 const f=fixture();await assert.rejects(financialTransaction(f.pool,context,async()=>{throw Error('injected');}),/injected/);assert.ok(f.calls.some(x=>x.sql==='ROLLBACK'));assert.equal(f.calls.at(-1).sql,'RELEASE');
});
test('identical retry replays saved response without executing mutation',async()=>{
 const f=fixture({claimed:false,prior:{request_digest:context.digest,response_status:201,response_body:{id:'saved'}}});
 const result=await financialTransaction(f.pool,context,()=>assert.fail('mutation repeated'));assert.deepEqual(result,{status:201,body:{id:'saved'}});
});
test('changed payload is rejected and legacy key fails closed',async()=>{
 for(const [prior,error] of [[{request_digest:'b'.repeat(64)},'IDEMPOTENCY_PAYLOAD_MISMATCH'],[null,'FINANCIAL_REQUEST_ALREADY_SUBMITTED']]){
  const f=fixture({claimed:false,prior});const result=await financialTransaction(f.pool,context,()=>assert.fail('mutation repeated'));assert.equal(result.status,409);assert.equal(result.body.error,error);
 }
});
