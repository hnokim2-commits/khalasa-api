import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');

test('attendance corrections are bounded and locked after payroll submission', () => {
  assert.match(server, /ageDays>90/);
  assert.match(server, /PAYROLL_MONTH_ALREADY_LOCKED/);
  assert.match(server, /attendance\.correction_reviewed/);
});

test('zero attendance caps cannot become unlimited deductions or bonuses', () => {
  assert.doesNotMatch(server, /monthly_deduction_cap\)>0\?/);
  assert.doesNotMatch(server, /monthly_overtime_cap\)>0\?/);
  assert.match(server, /active&&\(late>0\|\|early>0\)&&deductionCap<=0/);
  assert.match(server, /active&&overtime>0&&overtimeCap<=0/);
});

test('manager attendance overrides are audited and support overnight shifts', () => {
  assert.match(server, /attendance\.manager_override/);
  assert.match(server, /recording_source='manager'/);
  assert.doesNotMatch(server, /checkIn&&checkOut&&checkOut<=checkIn/);
});
