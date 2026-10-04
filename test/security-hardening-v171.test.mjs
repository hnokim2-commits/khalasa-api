import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');

test('production database SSL verification is secure by default and configurable', () => {
  assert.match(source, /DB_SSL_REJECT_UNAUTHORIZED !== 'false'/);
  assert.doesNotMatch(source, /NODE_ENV === 'production' \? \{ rejectUnauthorized: false \}/);
});

test('financial idempotency storage requires a verified active session first', () => {
  const start = source.indexOf("app.use(asyncRoute(async(req,res,next)=>{\n  if(!isProtectedFinancialWrite(req))");
  const end = source.indexOf('const cleanupTimer=', start);
  const middleware = source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(middleware, /jwt\.verify/);
  assert.match(middleware, /account_status='active'/);
  assert.match(middleware, /session_version=\$3/);
  assert.ok(middleware.indexOf('jwt.verify') < middleware.indexOf('INSERT INTO financial_request_keys'));
});

test('financial idempotency hashes stable user id instead of raw authorization header', () => {
  assert.match(source, /`\$\{operation\}:\$\{financialIdentity\.sub\}:\$\{requestKey\}`/);
  assert.doesNotMatch(source, /`\$\{operation\}:\$\{identity\}:\$\{requestKey\}`/);
});
