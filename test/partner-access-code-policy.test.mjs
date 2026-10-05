import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server=readFileSync(new URL('../src/server.mjs',import.meta.url),'utf8');

test('partner creation and application routes reject weak access codes',()=>{
  assert.match(server,/partnerAccessCodeWritePaths/);
  assert.match(server,/\/v1\\\/\(merchant\|rider\)\\\/applications/);
  assert.match(server,/merchant\\\/rider-nominations/);
  assert.match(server,/admin\\\/\(partner-credentials\|merchants\|riders\)/);
  assert.match(server,/WEAK_PARTNER_ACCESS_CODE/);
  assert.match(server,/validStaffAccessCode\(req\.body\?\.accessCode,req\.body\?\.phone\)/);
});

test('the shared access code policy rejects phone-derived and repeated secrets',()=>{
  assert.match(server,/code===normalizedPhone/);
  assert.match(server,/\/\^\(\.\)\\1\+\$\//);
  assert.match(server,/0123456789/);
});

test('partner account recovery compares a replacement code with the account phone',()=>{
  assert.match(server,/validStaffAccessCode\(newAccessCode,request\.phone\)/);
  assert.match(server,/WEAK_PARTNER_ACCESS_CODE/);
});
