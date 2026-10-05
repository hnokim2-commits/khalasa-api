import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const migration=await readFile(new URL('../migrations/0035_branch_attendance_and_payroll.sql',import.meta.url),'utf8');

test('city managers record attendance and submit immutable monthly payroll snapshots',()=>{
  assert.match(server,/\/v1\/city-admin\/personnel\/:id\/attendance/);
  assert.match(server,/\/v1\/city-admin\/payroll\/runs/);
  assert.match(server,/PAYROLL_MONTH_ALREADY_SUBMITTED/);
  assert.match(migration,/UNIQUE\(city_id,payroll_month\)/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS branch_payroll_items/);
});

test('only administrators and accountants can decide submitted payroll',()=>{
  assert.match(server,/\/v1\/admin\/payroll\/runs\/:id\/decision',auth\('admin','accountant'\)/);
  assert.match(server,/AND status='submitted'/);
  assert.match(server,/`payroll\.\$\{decision\}`/);
});
