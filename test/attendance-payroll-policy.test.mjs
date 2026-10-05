import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const migration=await readFile(new URL('../migrations/0041_attendance_payroll_policy.sql',import.meta.url),'utf8');

test('attendance payroll policy is city scoped and disabled by default',()=>{
  assert.match(migration,/CREATE TABLE IF NOT EXISTS branch_attendance_payroll_policies/);
  assert.match(migration,/is_active boolean NOT NULL DEFAULT false/);
  assert.match(server,/\/v1\/city-admin\/attendance\/payroll-policy/);
  assert.match(server,/cityPermission\('payroll\.policy\.manage'\)/);
});

test('policy rates and monthly caps are bounded',()=>{
  assert.match(migration,/late_deduction_per_minute BETWEEN 0 AND 1000/);
  assert.match(migration,/monthly_deduction_cap BETWEEN 0 AND 1000000/);
  assert.match(server,/Math\.min\(rawAttendanceDeduction/);
  assert.match(server,/Math\.min\(rawOvertimeBonus/);
});

test('payroll snapshots preserve calculated attendance money',()=>{
  assert.match(migration,/attendance_deduction numeric/);
  assert.match(migration,/overtime_bonus numeric/);
  assert.match(server,/attendance_deduction,overtime_bonus,calculation/);
  assert.match(server,/attendancePolicyActive/);
});

test('accountant approval remains required for submitted payroll',()=>{
  assert.match(server,/PAYROLL_MUST_BE_APPROVED/);
  assert.match(server,/\/v1\/admin\/payroll\/runs\/:id\/decision',auth\('admin','accountant'\)/);
});
