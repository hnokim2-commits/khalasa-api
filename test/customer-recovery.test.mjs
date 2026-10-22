import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerCustomerRecovery,normalizeRecoveryPhone,validateRecoveryReview} from '../src/customer-recovery.mjs';
const id='12345678-1234-1234-1234-123456789abc';
function harness({exists=true,conflict=false,fail=false}={}){
 const routes={},queries=[];let released=false;
 const query=async(sql,values)=>{queries.push({sql,values});if(sql.startsWith('SELECT r.user_id'))return {rowCount:exists?1:0,rows:exists?[{user_id:'synthetic-user',role:'customer'}]:[]};if(sql.startsWith('SELECT id FROM users'))return {rowCount:conflict?1:0,rows:[]};if(fail&&sql.startsWith('UPDATE users'))throw Error('SYNTHETIC_FAILURE');return {rowCount:0,rows:[]};};
 const app={post:(p,...h)=>routes[p]=h,get:(p,...h)=>routes[p]=h,patch:(p,...h)=>routes[p]=h};
 registerCustomerRecovery({app,pool:{query,connect:async()=>({query,release:()=>released=true})},auth:role=>({role}),asyncRoute:fn=>fn,rateLimit:'RATE_LIMIT',secret:'synthetic-test-secret'});
 const res={statusCode:200,status(n){this.statusCode=n;return this},json(body){this.body=body;return this}};
 const req={body:{status:'approved',email:'new@example.invalid',ownershipVerified:true,verificationReference:'verified via independent synthetic channel'},params:{id},user:{sub:'synthetic-admin'},ip:'127.0.0.1'};
 return {routes,queries,req,res,released:()=>released,review:()=>routes['/v1/admin/account-recovery-customers/:id'].at(-1)(req,res)};
}
test('normalizes Egyptian Arabic and international numbers',()=>assert.equal(normalizeRecoveryPhone('+٢٠ ١٠١٢٣٤٥٦٧٨'),'01012345678'));
test('approval requires explicit ownership and sufficient reference',()=>{assert.equal(validateRecoveryReview({status:'approved',email:'a@b.test'}),null);assert.equal(validateRecoveryReview({status:'approved',email:'a@b.test',ownershipVerified:true,verificationReference:'short'}),null)});
test('public request is rate limited and private for unknown phone',async()=>{const h=harness();assert.equal(h.routes['/v1/customer/recovery-requests'][0],'RATE_LIMIT');h.req.body={phone:'01012345678'};await h.routes['/v1/customer/recovery-requests'].at(-1)(h.req,h.res);assert.equal(h.res.statusCode,202);assert.equal(h.res.body.accepted,true);assert.match(h.queries[0].sql,/ON CONFLICT/);assert.match(h.queries[0].sql,/role='customer'/)});
test('admin authentication guards list and review',()=>{const h=harness();for(const route of ['/v1/admin/account-recovery-customers','/v1/admin/account-recovery-customers/:id'])assert.equal(h.routes[route][0].role,'admin')});
test('invalid approval performs no database writes',async()=>{const h=harness();h.req.body.ownershipVerified=false;await h.review();assert.equal(h.res.statusCode,400);assert.equal(h.queries.length,0)});
test('successful review binds unverified email, revokes sessions and old OTP, audits atomically',async()=>{const h=harness();await h.review();const sql=h.queries.map(q=>q.sql).join('\n');assert.match(sql,/FOR UPDATE OF r,u/);assert.match(sql,/is_email_verified=false,session_version=session_version\+1/);assert.match(sql,/UPDATE auth_challenges/);assert.match(sql,/admin_audit_log/);assert.equal(h.queries.at(-1).sql,'COMMIT');assert.equal(h.res.body.requiresEmailOtp,true);assert.equal(h.released(),true)});
test('already reviewed request is conflict without mutation',async()=>{const h=harness({exists:false});await h.review();assert.equal(h.res.statusCode,409);assert.equal(h.queries.at(-1).sql,'ROLLBACK')});
test('conflicting email rolls back before account change',async()=>{const h=harness({conflict:true});await h.review();assert.equal(h.res.statusCode,409);assert.ok(!h.queries.some(q=>q.sql.startsWith('UPDATE users')));assert.equal(h.queries.at(-1).sql,'ROLLBACK')});
test('failure rolls back and releases connection',async()=>{const h=harness({fail:true});await assert.rejects(h.review(),/SYNTHETIC_FAILURE/);assert.equal(h.queries.at(-1).sql,'ROLLBACK');assert.equal(h.released(),true)});
test('rejection does not mutate account or OTP',async()=>{const h=harness();h.req.body={status:'rejected'};await h.review();assert.ok(!h.queries.some(q=>/^UPDATE (users|auth_challenges)/.test(q.sql)));assert.equal(h.res.body.requiresEmailOtp,false)});
test('both OTP endpoints enforce bound email even before email verification',()=>{const source=readFileSync(new URL('../src/server.mjs',import.meta.url),'utf8');assert.equal((source.match(/user.phone===phone&&user.email&&user.email.toLowerCase\(\)!==email/g)||[]).length,2);assert.ok(!source.includes('user.phone===phone&&user.is_email_verified&&'));assert.match(source,/registerCustomerRecovery\(\{app,pool,auth,asyncRoute,rateLimit:authRateLimit/)});
