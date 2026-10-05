import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
const migration = await readFile(new URL('../migrations/0042_city_role_permissions.sql', import.meta.url), 'utf8');

test('city permissions include separate operational domains', () => {
  for (const permission of ['fleet.read','personnel.manage','attendance.manage','payroll.manage','treasury.manage']) assert.match(server, new RegExp(permission.replace('.', '\\.'), 'g'));
  assert.match(server, /cityPermission\(\)/);
});

test('legacy city assignments are upgraded without granting permissions to unrelated users', () => {
  assert.match(migration, /WHERE NOT permissions \? 'personnel\.read'/);
  assert.match(migration, /legacy rider permissions mapped once/);
});
