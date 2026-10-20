import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const policyStart=source.indexOf('function validStaffAccessCode('),policyEnd=source.indexOf('\napp.use(',policyStart);
const guardStart=source.indexOf('const partnerAccessCodeWritePaths='),guardEnd=source.indexOf('\n});',guardStart)+4;
assert.ok(policyStart>=0&&policyEnd>policyStart&&guardStart>=0&&guardEnd>guardStart);
function invoke(path,body,{authorized=true}={}){
 let middleware,next=false,authCalls=0,status=200,payload;
 const sandbox={Buffer,app:{use(fn){middleware=fn;}},auth:()=> (_req,res,callback)=>{authCalls++;if(!authorized)return res.status(401).json({error:'AUTH_REQUIRED'});return callback();}};
 vm.runInNewContext(source.slice(policyStart,policyEnd)+'\n'+source.slice(guardStart,guardEnd),sandbox);
 const res={status(value){status=value;return this;},json(value){payload=value;}};
 middleware({path,method:'POST',body},res,()=>{next=true;});
 return {next,authCalls,status,error:payload?.error};
}
test('new public application codes reject phone-derived, repeated and over72-byte codes',()=>{
 for(const accessCode of ['01009999002','aaaaaaaaaa','1234567890','مرحبا'.repeat(8)])assert.equal(invoke('/v1/merchant/applications',{phone:'01009999002',accessCode}).error,'WEAK_PARTNER_ACCESS_CODE');
 assert.equal(invoke('/v1/rider/applications',{phone:'01009999003',accessCode:'LocalSynthetic-NewCode-2026'}).next,true);
});
test('protected credential writes check authorization before code policy',()=>{
 const result=invoke('/v1/admin/partner-credentials',{phone:'01009999002',accessCode:'01009999002'},{authorized:false});
 assert.equal(result.authCalls,1);assert.equal(result.status,401);assert.equal(result.error,'AUTH_REQUIRED');
 assert.equal(invoke('/v1/admin/partner-credentials',{phone:'01009999002',accessCode:'01009999002'}).error,'WEAK_PARTNER_ACCESS_CODE');
});
test('existing partner login is not intercepted and no-code operational writes still pass',()=>{
 const login=invoke('/v1/partner/login',{phone:'01009999002',accessCode:'01009999002'});assert.equal(login.next,true);assert.equal(login.authCalls,0);
 assert.equal(invoke('/v1/admin/riders/00000000-0000-4000-8000-000000000001/cash-remittances',{amount:100}).next,true);
});
test('recovery rejects a replacement matching stored account phone before credential writes',async()=>{
 const route=source.split(/\r?\n/).find(line=>line.startsWith("app.patch('/v1/admin/account-recovery-requests/:id',"));
 let handler;const queries=[];
 const client={async query(sql){queries.push(sql);return sql.startsWith('SELECT r.id')?{rowCount:1,rows:[{id:'request-test',user_id:'user-test',requested_role:'merchant',phone:'01009999002'}]}:{rowCount:1,rows:[]};},release(){}};
 const sandbox={Buffer,app:{patch(_path,_auth,fn){handler=fn;}},auth:()=>()=>{},asyncRoute:fn=>fn,pool:{connect:async()=>client}};
 vm.runInNewContext(source.slice(policyStart,policyEnd)+'\n'+route,sandbox);
 let status,payload;await handler({body:{status:'approved',newAccessCode:'01009999002'},params:{id:'request-test'},user:{sub:'admin-test'}},{status(n){status=n;return this;},json(v){payload=v;}});
 assert.equal(status,400);assert.equal(payload.error,'WEAK_PARTNER_ACCESS_CODE');assert.ok(queries.includes('ROLLBACK'));assert.ok(!queries.some(sql=>sql.startsWith('INSERT')||sql.startsWith('UPDATE')));
});
