import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');

test('administrators can manage scoped staff accounts safely',()=>{
  assert.match(server,/app\.get\('\/v1\/staff\/me',auth\('admin','city_admin','support','accountant'\)/);
  assert.match(server,/app\.get\('\/v1\/admin\/staff-users',auth\('admin'\)/);
  assert.match(server,/app\.post\('\/v1\/admin\/staff-users',auth\('admin'\)/);
  assert.match(server,/!\['support','accountant'\]\.includes\(role\)/);
  assert.match(server,/accessCode=String\(req\.body\.accessCode\|\|''\)\.trim\(\)/);
  assert.match(server,/staff\.credentials_reset/);
  assert.match(server,/ON CONFLICT\(user_id\) DO UPDATE SET password_hash/);
  assert.match(server,/session_version=session_version\+1/);
});
