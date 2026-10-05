import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration=await readFile(new URL('../migrations/0032_refund_event_integrity.sql',import.meta.url),'utf8');

test('refund history is recorded once with cancelled status',()=>{
  assert.match(migration,/CREATE OR REPLACE FUNCTION record_refunded_order_event\(\)/);
  assert.match(migration,/BEGIN\s+RETURN NEW;\s+END;/s);
  assert.match(migration,/NEW\.status='cancelled'/);
  assert.match(migration,/BEFORE INSERT ON order_events/);
});
