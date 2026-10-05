import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
const migration = await readFile(new URL('../migrations/0047_investor_organizations.sql', import.meta.url), 'utf8');

test('investor records and city ownership are persistent and constrained', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS investor_organizations/i);
  assert.match(migration, /platform_commission_rate BETWEEN 0 AND 100/i);
  assert.match(migration, /city_id uuid PRIMARY KEY REFERENCES cities\(id\)/i);
  assert.match(migration, /investor_id uuid NOT NULL REFERENCES investor_organizations\(id\)/i);
});

test('only the main administrator manages investors', () => {
  assert.match(server, /app\.get\('\/v1\/admin\/investors',auth\('admin'\)/);
  assert.match(server, /app\.post\('\/v1\/admin\/investors',auth\('admin'\)/);
  assert.match(server, /app\.put\('\/v1\/admin\/investors\/:id\/cities',auth\('admin'\)/);
});

test('a city cannot silently move between investors', () => {
  assert.match(server, /CITY_ASSIGNED_TO_OTHER_INVESTOR/);
  assert.match(server, /a\.investor_id<>\$2/);
  assert.match(server, /WHERE investor_city_assignments\.investor_id=excluded\.investor_id/);
  assert.match(server, /investor\.cities_assigned/);
});
