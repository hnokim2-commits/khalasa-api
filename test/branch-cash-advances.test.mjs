import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const migration=await readFile(new URL('../migrations/0038_branch_cash_advances.sql',import.meta.url),'utf8');

test('cash advances keep one unresolved advance per employee',()=>{
  assert.match(migration,/CREATE TABLE IF NOT EXISTS branch_cash_advances/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS branch_cash_advance_settlements/);
  assert.match(migration,/branch_cash_advance_one_open_uidx/);
  assert.match(migration,/status IN \('submitted','approved','paid','partially_settled'\)/);
});

test('advance requests and settlements remain scoped to the assigned city',()=>{
  assert.match(server,/\/v1\/city-admin\/treasury\/advances',auth\('admin','city_admin'\),cityPermission\('treasury\.read'\)/);
  assert.match(server,/ADVANCE_NOT_FOUND_IN_CITY/);
  assert.match(server,/PERSONNEL_NOT_FOUND_IN_CITY/);
});

test('advance payment and settlement enforce treasury and receipt controls',()=>{
  assert.match(server,/ADVANCE_MUST_BE_APPROVED/);
  assert.match(server,/INSUFFICIENT_BRANCH_BALANCE/);
  assert.match(server,/SETTLEMENT_EXCEEDS_ADVANCE/);
  assert.match(server,/RECEIPT_REQUIRED_FOR_SPENT_AMOUNT/);
  assert.match(server,/source_type,source_id/);
});

test('only administrators and accountants approve, pay, and inspect receipts',()=>{
  assert.match(server,/\/v1\/admin\/treasury\/advances\/:id\/decision',auth\('admin','accountant'\)/);
  assert.match(server,/\/v1\/admin\/treasury\/advances\/:id\/payment',auth\('admin','accountant'\)/);
  assert.match(server,/\/v1\/admin\/treasury\/advance-settlements\/:id\/receipt',auth\('admin','accountant'\)/);
});
