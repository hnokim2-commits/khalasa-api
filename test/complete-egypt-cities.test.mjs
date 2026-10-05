import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../migrations/0045_complete_egypt_cities.sql', import.meta.url), 'utf8');
const rows = [...sql.matchAll(/\('([^']+)','([^']+)','([^']+)'\)/g)].map(([, governorate, city, code]) => ({ governorate, city, code }));

test('all Egyptian governorates have a broad city catalog', () => {
  assert.equal(new Set(rows.map(row => row.governorate)).size, 27);
  assert.ok(rows.length >= 250);
});

test('city catalog has unique stable codes and places', () => {
  assert.equal(new Set(rows.map(row => row.code)).size, rows.length);
  assert.equal(new Set(rows.map(row => `${row.governorate}\u0000${row.city}`)).size, rows.length);
  assert.match(sql, /ON CONFLICT \(code\) DO UPDATE/);
});
