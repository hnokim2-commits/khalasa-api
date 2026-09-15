export const ROUTE_POLICIES = Object.freeze({
  bicycle: Object.freeze({ pickupKm: 0.5, deliveryKm: 1, detourMinutes: 5, capacity: 2 }),
  motorcycle: Object.freeze({ pickupKm: 1, deliveryKm: 2, detourMinutes: 7, capacity: 2 }),
  car: Object.freeze({ pickupKm: 2, deliveryKm: 4, detourMinutes: 10, capacity: 2 })
});

export function routePolicyFor(vehicleType) {
  return ROUTE_POLICIES[vehicleType] || ROUTE_POLICIES.motorcycle;
}

export function hasCoordinates(lat, lng) {
  return lat !== null && lat !== undefined && lat !== '' && lng !== null && lng !== undefined && lng !== '' && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
}

export function distanceKm(aLat, aLng, bLat, bLng) {
  if (!hasCoordinates(aLat, aLng) || !hasCoordinates(bLat, bLng)) return null;
  const rad = value => Number(value) * Math.PI / 180;
  const dLat = rad(Number(bLat) - Number(aLat));
  const dLng = rad(Number(bLng) - Number(aLng));
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function routeCompatibility(activeOrders, candidate, vehicleType) {
  const policy = routePolicyFor(vehicleType);
  if (!hasCoordinates(candidate?.merchant_lat, candidate?.merchant_lng) || !hasCoordinates(candidate?.delivery_lat, candidate?.delivery_lng)) {
    return { compatible: false, reason: 'ORDER_LOCATION_REQUIRED', policy };
  }
  if (activeOrders.length >= policy.capacity) return { compatible: false, reason: 'RIDER_ROUTE_CAPACITY_REACHED', policy };
  if (activeOrders.some(order => order.status === 'picked_up')) return { compatible: false, reason: 'DELIVER_CURRENT_ORDER_FIRST', policy };
  if (!activeOrders.length) return { compatible: true, policy, pickupDistanceKm: 0, deliveryDistanceKm: 0 };
  const anchor = activeOrders[0];
  const pickupDistanceKm = distanceKm(anchor.merchant_lat, anchor.merchant_lng, candidate.merchant_lat, candidate.merchant_lng);
  const deliveryDistanceKm = distanceKm(anchor.delivery_lat, anchor.delivery_lng, candidate.delivery_lat, candidate.delivery_lng);
  if (pickupDistanceKm === null || deliveryDistanceKm === null) return { compatible: false, reason: 'ACTIVE_ROUTE_LOCATION_REQUIRED', policy };
  if (pickupDistanceKm > policy.pickupKm || deliveryDistanceKm > policy.deliveryKm) {
    return { compatible: false, reason: 'ORDER_NOT_COMPATIBLE_WITH_CURRENT_ROUTE', policy, pickupDistanceKm, deliveryDistanceKm };
  }
  return { compatible: true, policy, pickupDistanceKm, deliveryDistanceKm };
}
