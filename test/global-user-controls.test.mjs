import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const migration=await readFile(new URL('../migrations/0059_global_account_status.sql',import.meta.url),'utf8');

test('all applications share one constrained account status',()=>{
  assert.match(migration,/account_status text NOT NULL DEFAULT 'active'/);
  assert.match(migration,/active','disabled','archived/);
  assert.match(server,/u\.account_status='active'/);
  assert.match(server,/ACCOUNT_NOT_ACTIVE/);
});

test('central lifecycle management protects owner and current admin',()=>{
  assert.match(server,/app\.post\('\/v1\/admin\/users\/:id\/lifecycle'/);
  assert.match(server,/CANNOT_CHANGE_SELF/);
  assert.match(server,/OWNER_ACCOUNT_PROTECTED/);
  assert.match(server,/user\.lifecycle\.\$\{action\}/);
});

test('central lifecycle covers staff, partners and investors',()=>{
  assert.match(server,/UPDATE staff_credentials SET is_active=false/);
  assert.match(server,/UPDATE partner_credentials SET is_active=false/);
  assert.match(server,/UPDATE investor_credentials SET is_active=false/);
  assert.match(server,/UPDATE investor_user_assignments SET is_active=false/);
});

test('attendance identities have the same safe lifecycle controls',()=>{
  assert.match(migration,/ALTER TABLE branch_personnel/);
  assert.match(server,/app\.get\('\/v1\/admin\/personnel-users'/);
  assert.match(server,/app\.post\('\/v1\/admin\/personnel-users\/:id\/lifecycle'/);
  assert.match(server,/branch_personnel_attendance_credentials SET session_version=session_version\+1/);
});
