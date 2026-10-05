import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const migration=await readFile(new URL('../migrations/0031_financial_request_idempotency.sql',import.meta.url),'utf8');
test('financial writes require and claim an idempotency key',()=>{
  assert.match(server,/FINANCIAL_REQUEST_ALREADY_SUBMITTED/);
  assert.match(server,/INSERT INTO financial_request_keys/);
  assert.match(server,/x-idempotency-key/);
  assert.match(server,/cash-remittances/);
  assert.match(server,/rider_cash_remittance/);
});
test('financial idempotency migration creates a unique key store',()=>{
  assert.match(migration,/bucket_key text PRIMARY KEY/);
  assert.match(migration,/merchant_settlement/);
});
