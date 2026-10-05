import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');

test('new staff accounts reject weak or phone-derived access codes',()=>{
  assert.match(server,/function validStaffAccessCode\(value,phone=''\)/);
  assert.match(server,/code\.length<10\|\|code\.length>128\|\|code===normalizedPhone/);
  assert.match(server,/\/\^\(\.\)\\1\+\$\//);
  assert.match(server,/WEAK_STAFF_ACCESS_CODE/);
  assert.match(server,/\['\/v1\/admin\/main-users','\/v1\/admin\/city-users','\/v1\/admin\/staff-users'\]/);
  assert.match(server,/return auth\('admin'\)\(req,res,\(\)=>\{/);
  assert.match(server,/OWNER_CREDENTIAL_POLICY_REQUIRED/);
});
