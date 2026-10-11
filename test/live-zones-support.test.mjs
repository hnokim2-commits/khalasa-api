import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const migration=await readFile(new URL('../migrations/0068_live_service_zones_and_support.sql',import.meta.url),'utf8');

test('service zones are persisted and admin protected',()=>{
  assert.match(migration,/ALTER TABLE service_zones/);
  assert.match(server,/app\.get\('\/v1\/admin\/service-zones',auth\('admin'\)/);
  assert.match(server,/app\.post\('\/v1\/admin\/service-zones',auth\('admin'\)/);
  assert.match(server,/app\.patch\('\/v1\/admin\/service-zones\/:id',auth\('admin'\)/);
});

test('support tickets persist while support remains read only',()=>{
  assert.match(migration,/CREATE TABLE IF NOT EXISTS support_tickets/);
  assert.match(server,/app\.get\('\/v1\/admin\/support-tickets',auth\('admin','support'\)/);
  assert.match(server,/app\.post\('\/v1\/admin\/support-tickets',auth\('admin'\)/);
  assert.match(server,/app\.patch\('\/v1\/admin\/support-tickets\/:id',auth\('admin'\)/);
});
