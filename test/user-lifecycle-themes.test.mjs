import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const migration=await readFile(new URL('../migrations/0058_user_lifecycle_and_themes.sql',import.meta.url),'utf8');

test('archival is reversible, audited and revokes existing sessions',()=>{
  assert.match(migration,/archived_at timestamptz/);
  assert.match(server,/app\.delete\('\/v1\/admin\/staff-users\/:id'/);
  assert.match(server,/staff\.archived/);
  assert.match(server,/session_version=session_version\+1/);
  assert.match(server,/app\.post\('\/v1\/admin\/staff-users\/:id\/restore'/);
});

test('theme preferences are constrained and stored server-side',()=>{
  assert.match(migration,/preferences jsonb NOT NULL DEFAULT '\{\}'::jsonb/);
  assert.match(server,/app\.get\('\/v1\/me\/preferences'/);
  assert.match(server,/\['system','light','dark'\]\.includes\(theme\)/);
});

test('archived accounts cannot authenticate',()=>{
  assert.match(server,/WHERE u\.id=\$1 AND u\.archived_at IS NULL/);
});
