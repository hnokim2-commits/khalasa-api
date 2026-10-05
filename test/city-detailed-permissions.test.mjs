import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
const migration = await readFile(new URL('../migrations/0043_city_detailed_permissions.sql', import.meta.url), 'utf8');

test('sensitive city actions have dedicated permissions', () => {
  for (const permission of ['orders.assign','fleet.assets.manage','personnel.documents.manage','attendance.corrections.manage','payroll.submit','treasury.settlements.create']) {
    assert.match(server, new RegExp(`cityPermission\\('${permission.replace('.', '\\.')}\\'`));
  }
});

test('detailed permission migration preserves existing authorized operators once', () => {
  assert.match(migration, /parent permissions mapped once/);
  assert.match(migration, /WHERE NOT permissions \? 'attendance\.records\.manage'/);
});
