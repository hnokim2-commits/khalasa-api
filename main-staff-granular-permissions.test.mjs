import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
const migration = await readFile(new URL('../migrations/0048_investor_accounts_and_isolation.sql', import.meta.url), 'utf8');

test('investor accounts use a dedicated role, credential, and tenant assignment', () => {
  assert.match(migration, /ADD VALUE IF NOT EXISTS 'investor'/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS investor_user_assignments/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS investor_credentials/i);
  assert.match(migration, /investor_user_tenant_immutable/i);
});

test('every investor request validates account, organization, contract, and permission', () => {
  assert.match(server, /function investorPermission/);
  assert.match(server, /INVESTOR_ACCESS_DISABLED/);
  assert.match(server, /INVESTOR_CONTRACT_EXPIRED/);
  assert.match(server, /INVESTOR_PERMISSION_REQUIRED/);
  assert.match(server, /app\.get\('\/v1\/investor\/dashboard',auth\('investor'\),investorPermission\('dashboard\.read'\)/);
});

test('investor queries derive city scope from server-side assignments', () => {
  assert.match(server, /WHERE investor_id=\$1/);
  assert.match(server, /JOIN investor_city_assignments a ON a\.city_id=o\.city_id AND a\.investor_id=\$1/);
  assert.doesNotMatch(server, /v1\/investor\/orders[^\n]+req\.query\.cityId/);
});

test('investor authentication is rate limited and sessions are short lived', () => {
  assert.match(server, /'\/v1\/investor\/login'[^\n]+authRateLimit/);
  assert.match(server, /'accountant','investor'\]\.includes\(requestedRole\)\?'8h'/);
  assert.match(server, /staff\\\/login\|investor\\\/login/);
});

test('financial totals require the dedicated finance permission', () => {
  assert.match(server, /\/v1\/investor\/finance-summary',auth\('investor'\),investorPermission\('finance\.read'\)/);
  const dashboardRoute = server.match(/app\.get\('\/v1\/investor\/dashboard'.*?\}\)\);/s)?.[0] || '';
  assert.doesNotMatch(dashboardRoute, /city_revenue_month/);
});
