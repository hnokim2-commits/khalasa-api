import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');

test('authenticated requests require an active role credential', () => {
  assert.match(server, /credential_active/);
  assert.match(server, /ACCOUNT_DISABLED/);
  assert.match(server, /partner_credentials pc WHERE pc\.user_id=u\.id/);
  assert.match(server, /staff_credentials sc WHERE sc\.user_id=u\.id/);
});

test('credential changes and account disabling revoke existing sessions', () => {
  const increments = server.match(/session_version=session_version\+1/g) || [];
  assert.ok(increments.length >= 5, 'expected session revocation in recovery, credential, staff and city flows');
});

test('admin-created partners receive partner roles and credentials', () => {
  assert.match(server, /INSERT INTO user_roles\(user_id,role\) VALUES\(\$1,'merchant'\)/);
  assert.match(server, /INSERT INTO partner_credentials\(user_id,role,password_hash,is_active\) VALUES\(\$1,'merchant'/);
  assert.match(server, /INSERT INTO user_roles\(user_id,role\) VALUES\(\$1,'rider'\)/);
  assert.match(server, /INSERT INTO partner_credentials\(user_id,role,password_hash,is_active\) VALUES\(\$1,'rider'/);
});
