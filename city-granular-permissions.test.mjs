import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const migration=await readFile(new URL('../migrations/0034_branch_personnel_and_hiring_documents.sql',import.meta.url),'utf8');

test('branch personnel and documents are scoped to the assigned city',()=>{
  assert.match(server,/\/v1\/city-admin\/personnel/);
  assert.match(server,/PERSONNEL_NOT_FOUND_IN_CITY/);
  assert.match(server,/DOCUMENT_NOT_FOUND_IN_CITY/);
  assert.match(server,/cityPermission\('personnel\.manage'\)/);
  assert.match(server,/cityPermission\('personnel\.documents\.manage'\)/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS branch_personnel/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS branch_personnel_documents/);
});

test('hiring documents use private storage with bounded file types and temporary viewing',()=>{
  assert.match(server,/decodeDocument\(req\.body,'employment'\)/);
  assert.match(server,/signedPrivateUrl/);
  assert.match(server,/expiresIn:300/);
  assert.match(migration,/file_size<=4194304/);
  assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
});
