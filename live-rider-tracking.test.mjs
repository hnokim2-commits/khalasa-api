import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
test('financial requests reject excessive and over-precision amounts',()=>{
  assert.match(server,/INVALID_FINANCIAL_AMOUNT/);
  assert.match(server,/raw>1000000/);
  assert.match(server,/Math\.abs\(raw-rounded\)>\.000001/);
});
