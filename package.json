import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, routeCompatibility, routePolicyFor } from '../src/route-policy.mjs';

test('vehicle policies use the approved operational limits', () => {
  assert.deepEqual(routePolicyFor('bicycle'), { pickupKm: 0.5, deliveryKm: 1, detourMinutes: 5, capacity: 2 });
  assert.equal(routePolicyFor('unknown').pickupKm, 1);
});

test('a first legacy order is allowed, but a second order still requires coordinates', () => {
  assert.equal(distanceKm(null, 31, 30, 31), null);
  assert.equal(routeCompatibility([], { merchant_lat: null, merchant_lng: 31, delivery_lat: 30, delivery_lng: 31 }, 'motorcycle').compatible, true);
  const active = [{ status: 'assigned', merchant_lat: 30, merchant_lng: 31, delivery_lat: 30.01, delivery_lng: 31.01 }];
  assert.equal(routeCompatibility(active, { merchant_lat: null, merchant_lng: 31, delivery_lat: 30, delivery_lng: 31 }, 'motorcycle').reason, 'ORDER_LOCATION_REQUIRED');
});

test('a nearby second order is accepted and a distant one is rejected', () => {
  const active = [{ status: 'assigned', merchant_lat: 30.0000, merchant_lng: 31.0000, delivery_lat: 30.0100, delivery_lng: 31.0100 }];
  const nearby = { merchant_lat: 30.0040, merchant_lng: 31.0000, delivery_lat: 30.0200, delivery_lng: 31.0100 };
  const distant = { merchant_lat: 30.0300, merchant_lng: 31.0000, delivery_lat: 30.0600, delivery_lng: 31.0100 };
  assert.equal(routeCompatibility(active, nearby, 'motorcycle').compatible, true);
  assert.equal(routeCompatibility(active, distant, 'motorcycle').reason, 'ORDER_NOT_COMPATIBLE_WITH_CURRENT_ROUTE');
});

test('no new pickup is allowed after delivery has started', () => {
  const active = [{ status: 'picked_up', merchant_lat: 30, merchant_lng: 31, delivery_lat: 30.01, delivery_lng: 31.01 }];
  const candidate = { merchant_lat: 30, merchant_lng: 31, delivery_lat: 30.01, delivery_lng: 31.01 };
  assert.equal(routeCompatibility(active, candidate, 'car').reason, 'DELIVER_CURRENT_ORDER_FIRST');
});
