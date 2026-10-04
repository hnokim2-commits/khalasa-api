import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');

test('V183 preserves machine error codes and adds Arabic messages',()=>{
  assert.match(source,/const arabicErrorMessages=/);
  assert.match(source,/body\.error==='string'&&!body\.message/);
  assert.match(source,/message:arabicErrorMessage\(body\.error,res\.statusCode\)/);
});

test('V183 covers security and resource errors',()=>{
  for(const code of ['AUTH_REQUIRED','INVALID_TOKEN','SESSION_REVOKED','FORBIDDEN','TOO_MANY_ATTEMPTS','PAYLOAD_TOO_LARGE','UPLOAD_CONCURRENCY_LIMIT'])assert.match(source,new RegExp(`${code}:'[^']*[\\u0600-\\u06FF]`));
});
