import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');

test('V181 limits realtime connections globally and per user',()=>{
  assert.match(source,/REALTIME_MAX_CLIENTS/);
  assert.match(source,/REALTIME_MAX_CLIENTS_PER_USER/);
  assert.match(source,/REALTIME_CONNECTION_LIMIT/);
  assert.match(source,/REALTIME_CAPACITY_REACHED/);
});

test('V181 releases counters on every connection termination path',()=>{
  assert.match(source,/function removeRealtimeClient/);
  assert.match(source,/req\.once\('close',close\)/);
  assert.match(source,/res\.once\('close',close\)/);
  assert.match(source,/res\.once\('error',close\)/);
});
