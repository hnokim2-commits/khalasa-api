import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const start=source.indexOf("app.patch('/v1/investor/users/:userId'");
const end=source.indexOf("app.post('/v1/admin/investors/:id/users'",start);
const route=source.slice(start,end);

test('editing the signed-in investor without an access-code change keeps the session',()=>{
  assert.ok(start>=0&&end>start);
  assert.match(route,/const revokeSessions=targetId!==req\.user\.sub\|\|Boolean\(accessCode\)/);
  assert.match(route,/session_version=session_version\+\(\$3::int\)/);
});

test('access-code changes and edits to other users still revoke old sessions',()=>{
  assert.match(route,/revokeSessions\?1:0/);
  assert.match(route,/sessionsRevoked:revokeSessions/);
  assert.match(route,/accessCodeReset:!!accessCode/);
});
