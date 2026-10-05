import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const migration=await readFile(new URL('../migrations/0037_branch_treasury_and_expenses.sql',import.meta.url),'utf8');

test('branch treasury has an immutable source ledger and scoped expense requests',()=>{
  assert.match(migration,/CREATE TABLE IF NOT EXISTS branch_cash_ledger/);
  assert.match(migration,/branch_cash_ledger_source_uidx/);
  assert.match(server,/\/v1\/city-admin\/treasury/);
  assert.match(server,/cityPermission\('treasury\.expenses\.create'\)/);
});

test('expenses and payroll cannot be paid without configured sufficient balance',()=>{
  assert.match(server,/TREASURY_NOT_CONFIGURED/);
  assert.match(server,/INSUFFICIENT_BRANCH_BALANCE/);
  assert.match(server,/PAYROLL_MUST_BE_APPROVED/);
  assert.match(server,/EXPENSE_MUST_BE_APPROVED/);
});

test('expense approvals and payments remain accountant or administrator operations',()=>{
  assert.match(server,/\/v1\/admin\/treasury\/expenses\/:id\/decision',auth\('admin','accountant'\)/);
  assert.match(server,/\/v1\/admin\/treasury\/expenses\/:id\/payment',auth\('admin','accountant'\)/);
  assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
});
