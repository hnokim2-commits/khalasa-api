import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const migration=await readFile(new URL('../migrations/0039_mobile_attendance.sql',import.meta.url),'utf8');

test('mobile attendance credentials are separate and revocable',()=>{
  assert.match(migration,/branch_personnel_attendance_credentials/);
  assert.match(migration,/session_version integer NOT NULL DEFAULT 0/);
  assert.match(server,/\/v1\/personnel-attendance\/login/);
  assert.match(server,/role:'personnel_attendance'/);
  assert.match(server,/ATTENDANCE_ACCESS_DISABLED/);
});

test('branch managers configure a bounded attendance geofence',()=>{
  assert.match(migration,/allowed_radius_m BETWEEN 50 AND 500/);
  assert.match(server,/\/v1\/city-admin\/attendance\/settings/);
  assert.match(server,/distanceMeters/);
  assert.match(server,/OUTSIDE_ATTENDANCE_AREA/);
  assert.doesNotMatch(server,/allowed_radius_m\)\+accuracy/);
});

test('mobile check-in and checkout are server-timed and duplicate-safe',()=>{
  assert.match(server,/Africa\/Cairo/);
  assert.match(server,/ALREADY_CHECKED_IN/);
  assert.match(server,/ALREADY_CHECKED_OUT/);
  assert.match(server,/CHECK_IN_REQUIRED/);
  assert.match(migration,/recording_source IN \('manager','mobile'\)/);
});

test('location payload rejects unusable accuracy',()=>{
  assert.match(server,/accuracy>150/);
  assert.match(server,/INVALID_ATTENDANCE_LOCATION/);
});
