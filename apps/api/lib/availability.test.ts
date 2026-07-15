/**
 * Unit tests for availability calculation logic.
 * 
 * Run with: npx tsx apps/api/lib/availability.test.ts
 * 
 * Test cases based on real scenario:
 * Product "AD quả kem Khả Nhiên - S 8466" (ID: 24166)
 * - outletStock.stock = 3 (total inventory)
 * - outletStock.available = 2 (current shelf availability)
 * - outletStock.renting = 1 (currently PICKUPED)
 * 
 * Orders:
 * - #870852: Pickup 15/07 (14/07 17:00 UTC), Return 18/07 (18/07 17:00 UTC), PICKUPED
 * - #805256: Pickup 08/07, Return 09/07, RETURNED
 * - #270739: Pickup 03/07, Return 04/07, RETURNED
 */

import {
  calculateEffectivelyAvailable,
  resolveTotalAvailableStock,
  aggregateConflictingQuantities,
  buildAvailabilityMetrics,
} from './availability';

// Test helper
let passed = 0;
let failed = 0;
function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAILED: ${message}`);
  }
}

console.log('\n=== Availability Calculation Tests ===\n');

// ─── Test 1: resolveTotalAvailableStock ───────────────────────────
console.log('Test 1: resolveTotalAvailableStock');

assert(
  resolveTotalAvailableStock({ stock: 3, available: 2, renting: 1 }) === 2,
  'Returns available when valid (3 stock, 2 available, 1 renting) → 2'
);

assert(
  resolveTotalAvailableStock({ stock: 3, available: 0, renting: 3 }) === 0,
  'Returns 0 when all rented (3 stock, 0 available, 3 renting) → 0'
);

assert(
  resolveTotalAvailableStock({ stock: 3, available: -1, renting: 1 }) === 2,
  'Falls back to stock-renting when available is invalid → 2'
);

// ─── Test 2: calculateEffectivelyAvailable ────────────────────────
console.log('\nTest 2: calculateEffectivelyAvailable');

// Case A: Check date 27/07 - NO overlap with order 15-18/07
// conflictingQuantity = 0, stock=3 → available = 3 - 0 = 3
assert(
  calculateEffectivelyAvailable({
    totalStock: 3,
    totalAvailableStock: 2,
    totalRenting: 1,
    conflictingQuantity: 0,
    reservedConflictQuantity: 0,
  }) === 3,
  'No conflicts (check 27/07): effectivelyAvailable = stock - 0 = 3'
);

// Case B: Check date 15/07 - OVERLAP with order #870852 (PICKUPED)
// conflictingQuantity = 1 → available = 3 - 1 = 2
assert(
  calculateEffectivelyAvailable({
    totalStock: 3,
    totalAvailableStock: 2,
    totalRenting: 1,
    conflictingQuantity: 1,
    reservedConflictQuantity: 0,
  }) === 2,
  'PICKUPED conflict (check 15/07): effectivelyAvailable = stock - conflicts = 3 - 1 = 2'
);

// Case C: Check date 15/07 - OVERLAP with RESERVED order
// conflictingQuantity = 1 → available = 3 - 1 = 2
assert(
  calculateEffectivelyAvailable({
    totalStock: 3,
    totalAvailableStock: 2,
    totalRenting: 1,
    conflictingQuantity: 1,
    reservedConflictQuantity: 1,
  }) === 2,
  'RESERVED conflict (check 15/07): effectivelyAvailable = stock - conflicts = 3 - 1 = 2'
);

// Case D: All items rented out but none conflict with checked period
// stock=3, conflicting=0 → available = 3
assert(
  calculateEffectivelyAvailable({
    totalStock: 3,
    totalAvailableStock: 0,
    totalRenting: 3,
    conflictingQuantity: 0,
    reservedConflictQuantity: 0,
  }) === 3,
  'All rented, no conflicts: effectivelyAvailable = stock - 0 = 3 (items will return)'
);

// ─── Test 3: buildAvailabilityMetrics ─────────────────────────────
console.log('\nTest 3: buildAvailabilityMetrics - period-specific values');

// Case A: Check 27/07 (no conflict)
const metricsNoConflict = buildAvailabilityMetrics({
  outletStock: { stock: 3, available: 2, renting: 1, outlet: { id: 34, name: 'Test Outlet' } },
  conflictingQuantity: 0,
  reservedConflictQuantity: 0,
  requestedQuantity: 1,
});

assert(
  metricsNoConflict.effectivelyAvailable === 3,
  'No conflict: effectivelyAvailable = 3 (stock - 0)'
);
assert(
  metricsNoConflict.canFulfillRequest === true,
  'No conflict: canFulfillRequest = true'
);

// Case B: Check 15/07 (1 PICKUPED conflict)
const metricsWithConflict = buildAvailabilityMetrics({
  outletStock: { stock: 3, available: 2, renting: 1, outlet: { id: 34, name: 'Test Outlet' } },
  conflictingQuantity: 1,
  reservedConflictQuantity: 0,
  requestedQuantity: 1,
});

assert(
  metricsWithConflict.effectivelyAvailable === 2,
  'PICKUPED conflict: effectivelyAvailable = 2 (stock - 1)'
);
assert(
  metricsWithConflict.canFulfillRequest === true,
  'PICKUPED conflict: canFulfillRequest = true (2 >= 1)'
);

// Case C: Check 15/07 requesting 3 items (1 PICKUPED conflict)
const metricsConflictQty2 = buildAvailabilityMetrics({
  outletStock: { stock: 3, available: 2, renting: 1, outlet: { id: 34, name: 'Test Outlet' } },
  conflictingQuantity: 1,
  reservedConflictQuantity: 0,
  requestedQuantity: 3,
});

assert(
  metricsConflictQty2.effectivelyAvailable === 2,
  'PICKUPED conflict, qty=3: effectivelyAvailable = 2 (stock - 1)'
);
assert(
  metricsConflictQty2.canFulfillRequest === false,
  'PICKUPED conflict, qty=3: canFulfillRequest = false (2 < 3)'
);

// ─── Test 4: aggregateConflictingQuantities ───────────────────────
console.log('\nTest 4: aggregateConflictingQuantities');

const mockOrders = [
  {
    id: 6896,
    orderType: 'RENT',
    status: 'PICKUPED',
    outletId: 34,
    orderItems: [{ productId: 24166, quantity: 1 }],
  },
  {
    id: 7510,
    orderType: 'RENT',
    status: 'RETURNED', // Should NOT be counted
    outletId: 34,
    orderItems: [{ productId: 24166, quantity: 1 }],
  },
  {
    id: 9999,
    orderType: 'RENT',
    status: 'RESERVED',
    outletId: 34,
    orderItems: [{ productId: 24166, quantity: 1 }],
  },
];

const agg = aggregateConflictingQuantities(24166, 34, mockOrders);
assert(
  agg.conflictingQuantity === 2,
  'Aggregates PICKUPED + RESERVED = 2 (skips RETURNED)'
);
assert(
  agg.reservedConflictQuantity === 1,
  'Reserved conflict quantity = 1'
);
assert(
  agg.conflictOrderIds.size === 2,
  'Conflict order IDs = 2 (PICKUPED + RESERVED)'
);

// ─── Test 5: API Response field mapping ───────────────────────────
console.log('\nTest 5: Expected API response for mobile display');
console.log('');
console.log('  Scenario: Product stock=3, available=2, renting=1 (DB)');
console.log('  Order #870852: PICKUPED, pickup 15/07, return 18/07');
console.log('');
console.log('  ┌───────────────────┬────────────────────────────────────┐');
console.log('  │ Check Date        │ Expected Mobile Display            │');
console.log('  ├───────────────────┼────────────────────────────────────┤');
console.log('  │ 15/07 (overlap)   │ Kho=3, Có sẵn=2, Đang thuê=1     │');
console.log('  │ 20/07 (no overlap)│ Kho=3, Có sẵn=3, Đang thuê=0     │');
console.log('  └───────────────────┴────────────────────────────────────┘');
console.log('');
console.log('  API fields mobile should use:');
console.log('  - Kho (Storage)     → availabilityByOutlet[0].stock');
console.log('  - Có sẵn (Available)→ availabilityByOutlet[0].available (overridden to effectivelyAvailable)');
console.log('  - Đang thuê (Renting)→ availabilityByOutlet[0].renting (overridden to conflictingQuantity)');

// ─── Summary ──────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
