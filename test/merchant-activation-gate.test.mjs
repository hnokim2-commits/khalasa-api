import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server=readFileSync(new URL('../src/server.mjs',import.meta.url),'utf8');
const migration=readFileSync(new URL('../migrations/0062_legal_acceptance_and_activation.sql',import.meta.url),'utf8');

test('merchant activation requires legal acceptance and four approved documents',()=>{
  assert.match(server,/merchantActivationState/);
  assert.match(server,/approved_documents\)>=4/);
  assert.match(server,/merchant\.verification==='approved'/);
  assert.match(server,/merchant\.legal_accepted/);
});

test('merchant operational writes are blocked before activation',()=>{
  assert.match(server,/isMerchantOperationalWrite/);
  assert.match(server,/MERCHANT_ACTIVATION_REQUIRED/);
  assert.match(server,/merchant-accept\|ready\|cancel/);
});

test('legal acceptances are auditable and existing accounts are preserved',()=>{
  assert.match(migration,/CREATE TABLE IF NOT EXISTS legal_acceptances/);
  assert.match(migration,/ip_hash text/);
  assert.match(migration,/user_agent_hash text/);
  assert.match(migration,/legacy-pre-v193/);
});
