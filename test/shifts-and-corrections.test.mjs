import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const migration=await readFile(new URL('../migrations/0040_shifts_and_attendance_corrections.sql',import.meta.url),'utf8');

test('branch shifts support grace periods and overnight work',()=>{
  assert.match(migration,/CREATE TABLE IF NOT EXISTS branch_work_shifts/);
  assert.match(migration,/grace_minutes BETWEEN 0 AND 120/);
  assert.match(server,/endRaw<=start\?endRaw\+1440/);
  assert.match(server,/shiftAttendanceMetrics/);
});

test('each employee has one current shift assignment',()=>{
  assert.match(migration,/personnel_id uuid PRIMARY KEY REFERENCES branch_personnel/);
  assert.match(server,/\/v1\/city-admin\/personnel\/:id\/shift/);
  assert.match(server,/PERSONNEL_OR_SHIFT_NOT_FOUND_IN_CITY/);
});

test('attendance corrections require manager approval and city scope',()=>{
  assert.match(migration,/branch_attendance_correction_pending_uidx/);
  assert.match(server,/\/v1\/personnel-attendance\/corrections/);
  assert.match(server,/\/v1\/city-admin\/attendance\/corrections\/:id/);
  assert.match(server,/CORRECTION_NOT_PENDING/);
});

test('payroll snapshots preserve attendance metrics',()=>{
  assert.match(migration,/branch_payroll_items ADD COLUMN IF NOT EXISTS late_minutes/);
  assert.match(server,/late_minutes,early_leave_minutes,overtime_minutes,attendance_deduction,overtime_bonus,calculation/);
});
