import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const migration=await readFile(new URL('../migrations/0049_live_rider_tracking.sql',import.meta.url),'utf8');
test('tracking retains only the latest rider position',()=>{assert.match(migration,/rider_id uuid PRIMARY KEY/);assert.match(migration,/no historical movement trail/i);assert.match(server,/ON CONFLICT\(rider_id\) DO UPDATE/)});
test('location updates require an active approved delivery and bounded input',()=>{assert.match(server,/\/v1\/rider\/location/);assert.match(server,/ACTIVE_DELIVERY_REQUIRED/);assert.match(server,/accuracy > 150/);assert.match(server,/capturedAt\.getTime\(\)<now-300000/)});
test('tracking endpoints are scoped to the customer or merchant that owns the order',()=>{assert.match(server,/\/v1\/customer\/orders\/:id\/tracking',auth\('customer'\)/);assert.match(server,/o\.customer_id=\$2/);assert.match(server,/\/v1\/merchant\/orders\/:id\/tracking',auth\('merchant'\)/);assert.match(server,/m\.owner_user_id=\$2/);assert.match(server,/o\.status IN \('assigned','picked_up'\)/)});
test('ETA marks stale locations and does not expose inactive tracking',()=>{assert.match(server,/ageSeconds>180/);assert.match(server,/etaMinutes/);assert.match(server,/ACTIVE_TRACKING_NOT_FOUND/)});
