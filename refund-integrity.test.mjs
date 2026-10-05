import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');

test('all inventory-restoring cancellations run in database transactions', () => {
  for (const route of [
    '/v1/customer/orders/:id/cancel',
    '/v1/orders/:id/merchant-reject',
    '/v1/admin/orders/:id/cancel'
  ]) {
    const start = server.indexOf(`app.post('${route}'`);
    assert.notEqual(start, -1, `${route} should exist`);
    const section = server.slice(start, start + 3000);
    assert.match(section, /client\.query\('BEGIN'\)/);
    assert.match(section, /stock_quantity=p\.stock_quantity\+i\.qty/);
    assert.match(section, /client\.query\('COMMIT'\)/);
  }
});

test('administrative cancellation stops after rider pickup', () => {
  const start = server.indexOf("app.post('/v1/admin/orders/:id/cancel'");
  const section = server.slice(start, start + 3000);
  assert.match(section, /status IN \('awaiting_merchant','preparing','awaiting_rider','assigned'\)/);
  assert.doesNotMatch(section, /status NOT IN \('delivered','cancelled'\)/);
});
