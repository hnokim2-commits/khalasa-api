import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
const migration = await readFile(new URL('../migrations/0046_main_staff_granular_permissions.sql', import.meta.url), 'utf8');

test('main staff permissions are stored separately and safely defaulted', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS main_staff_permissions/);
  assert.match(migration, /user_id uuid PRIMARY KEY REFERENCES users\(id\) ON DELETE CASCADE/);
  assert.match(migration, /ON CONFLICT \(user_id\) DO NOTHING/);
});

test('server normalizes permissions and enforces them before protected routes', () => {
  assert.match(server, /function normalizeMainStaffPermissions/);
  assert.match(server, /function mainStaffPermissionFor/);
  assert.match(server, /STAFF_PERMISSION_REQUIRED/);
  assert.match(server, /INSERT INTO main_staff_permissions\(user_id,permissions,updated_by\)/);
  assert.match(server, /COALESCE\(mp\.permissions,'\{\}'::jsonb\) permissions/);
});
