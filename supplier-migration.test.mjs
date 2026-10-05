import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
const migration = await readFile(new URL('../migrations/0044_staff_job_titles_and_workplaces.sql', import.meta.url), 'utf8');

test('staff profiles store a job title and an optional workplace city', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS job_title text/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS workplace_city_id uuid REFERENCES cities\(id\)/i);
  assert.match(migration, /users_job_title_length_check/i);
  assert.match(server, /job_title,workplace_city_id/);
  assert.match(server, /INVALID_WORKPLACE_CITY/);
});

test('city administrators expose and persist their job title', () => {
  assert.match(server, /u\.job_title,a\.city_id/);
  assert.match(server, /job_title=\$2,workplace_city_id=\$3/);
  assert.match(server, /JSON\.stringify\(\{permissions,jobTitle\}\)/);
});

test('administrator can edit a staff profile without forcing a password reset', () => {
  assert.match(server, /staff\.profile_updated/);
  assert.match(server, /accessCodeChanged:Boolean\(accessCode\)/);
  assert.match(server, /accessCode\?await client\.query/);
  assert.match(server, /DELETE FROM user_roles WHERE user_id=\$1 AND role IN \('support','accountant'\)/);
  assert.match(server, /INVALID_STAFF_PROFILE/);
});
