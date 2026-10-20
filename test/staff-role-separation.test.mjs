import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');

test('support access is read-only and accountant writes are narrowly scoped',async()=>{
  const supportRoutes=[...server.matchAll(/app\.(get|post|patch|put|delete)\([^\n]*?auth\([^)]*'support'[^)]*\)/g)].map(match=>match[1]);
  assert.ok(supportRoutes.length>0);
  assert.deepEqual([...new Set(supportRoutes)],['get']);
  const financial=await readFile(new URL('../src/financial-transactions.mjs',import.meta.url),'utf8');
  assert.match(financial,/register\('\/v1\/admin\/riders\/:id\/cash-remittances',\['admin','accountant'\]/);
  assert.match(financial,/app\.post\(path,auth\(\.\.\.roles\)/);
  assert.match(server,/app\.post\('\/v1\/admin\/orders\/:id\/refund',auth\('admin'\),\(_req,_res,next\)=>next\(\)\)/);
});
