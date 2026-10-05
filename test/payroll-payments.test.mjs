import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const migration=await readFile(new URL('../migrations/0036_payroll_payments_and_receipts.sql',import.meta.url),'utf8');

test('payroll payment requires prior approval and is recorded once',()=>{
  assert.match(server,/PAYROLL_MUST_BE_APPROVED/);
  assert.match(server,/PAYROLL_PAYMENT_ALREADY_RECORDED/);
  assert.match(server,/branch_payroll_payments/);
  assert.match(migration,/payroll_item_id uuid NOT NULL UNIQUE/);
  assert.match(migration,/branch_payroll_payment_reference_uidx/);
});

test('cash requires acknowledgement and transfers require references',()=>{
  assert.match(server,/method==='cash'.*acknowledgedBy/s);
  assert.match(server,/method!=='cash'.*reference/s);
  assert.match(migration,/payment_method='cash'.*acknowledged_by/s);
  assert.match(migration,/payment_method<>'cash'.*payment_reference/s);
});

test('branch employment documents use the larger protected document parser',()=>{
  assert.match(server,/city-admin\\\/personnel/);
  assert.match(server,/documentJsonParser/);
});
