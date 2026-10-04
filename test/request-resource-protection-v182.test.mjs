import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');

test('V182 rejects oversized uploads before JSON parsing',()=>{
  assert.ok(source.indexOf("declaredLength>maxDocumentRequestBytes")<source.indexOf("documentJsonParser=express.json"));
  assert.match(source,/PAYLOAD_TOO_LARGE/);
  assert.match(source,/JSON_CONTENT_TYPE_REQUIRED/);
});

test('V182 constrains and releases concurrent document uploads',()=>{
  assert.match(source,/MAX_CONCURRENT_DOCUMENT_UPLOADS/);
  assert.match(source,/MAX_DOCUMENT_UPLOADS_PER_IP/);
  assert.match(source,/UPLOAD_CONCURRENCY_LIMIT/);
  assert.match(source,/res\.once\('finish',release\)/);
  assert.match(source,/res\.once\('close',release\)/);
});

test('V182 configures finite HTTP server resource limits',()=>{
  assert.match(source,/server\.headersTimeout=15_000/);
  assert.match(source,/server\.requestTimeout=60_000/);
  assert.match(source,/server\.maxRequestsPerSocket=100/);
});
