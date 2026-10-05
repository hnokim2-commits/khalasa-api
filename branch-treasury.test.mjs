import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const migration=await readFile(new URL('../migrations/0033_branch_salaried_rider_fleet.sql',import.meta.url),'utf8');

test('branch fleet is city scoped with daily targets and assets',()=>{
  assert.match(server,/\/v1\/city-admin\/fleet/);
  assert.match(server,/cityPermission\('fleet\.employment\.manage'\)/);
  assert.match(server,/cityPermission\('fleet\.assets\.manage'\)/);
  assert.match(server,/dailyMinimum>dailyTarget\|\|dailyTarget>dailyMaximum/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS branch_rider_employment/);
  assert.match(migration,/motorcycle_provided/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS branch_rider_assets/);
});

test('salaried riders do not also receive per-delivery wallet credit',()=>{
  assert.match(migration,/route_salaried_rider_delivery_earning/);
  assert.match(migration,/employment_type='salaried'/);
  assert.match(migration,/RETURN NULL/);
  assert.match(migration,/delivery_refund_reversal/);
});
