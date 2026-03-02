// ============================================================================
// PRODUCT AVAILABILITY DATE CONVERSION & LOGIC TEST SCRIPT
// ============================================================================
// Test date conversion and product availability logic
// Run: tsx scripts/test-product-availability-date-logic.ts

import { convertLocalDateToUTCDatetime, getLocalDateKey } from '@rentalshop/utils';

// Mock constants
const ORDER_STATUS = {
  RESERVED: 'RESERVED',
  PICKUPED: 'PICKUPED',
  RETURNED: 'RETURNED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

const ORDER_TYPE = {
  RENT: 'RENT',
  SALE: 'SALE'
};

/**
 * Helper function: Check if order overlaps with requested rental period
 * This matches the logic from apps/api/app/api/products/availability/route.ts
 */
function isOrderActiveInPeriod(
  order: {
    orderType: string;
    status: string;
    pickupPlanAt: Date | string | null;
    returnPlanAt: Date | string | null;
  },
  requestedDateKey: string, // YYYY-MM-DD format
  startOfPeriod: Date,
  endOfPeriod: Date
): boolean {
  const status = order.status;
  
  if (order.orderType !== ORDER_TYPE.RENT) {
    return status === ORDER_STATUS.RESERVED;
  }
  
  const orderPickup = order.pickupPlanAt ? new Date(order.pickupPlanAt) : null;
  const orderReturn = order.returnPlanAt ? new Date(order.returnPlanAt) : null;
  
  if (!orderPickup) return false;
  
  // ✅ Use getLocalDateKey to get local date for comparison
  const orderPickupDateKey = getLocalDateKey(orderPickup);
  
  // Normalize return date to end of day UTC for comparison
  const orderReturnEnd = orderReturn ? new Date(orderReturn) : null;
  if (orderReturnEnd) {
    orderReturnEnd.setUTCHours(23, 59, 59, 999);
  }
  
  if (status === ORDER_STATUS.PICKUPED) {
    if (!orderReturnEnd) {
      return orderPickupDateKey === requestedDateKey;
    }
    // Order is active if:
    // 1. Pickup date matches requested date, OR
    // 2. Return date is within requested period (order ends during period), OR
    // 3. Order spans across requested period (pickup before, return after)
    const pickupMatches = orderPickupDateKey === requestedDateKey;
    const returnInPeriod = orderReturnEnd >= startOfPeriod && orderReturnEnd <= endOfPeriod;
    const spansAcross = orderPickup < startOfPeriod && orderReturnEnd > endOfPeriod;
    return pickupMatches || returnInPeriod || spansAcross;
  }
  
  if (status === ORDER_STATUS.RESERVED) {
    // Reserved: active if pickup date matches OR period overlaps
    const pickupMatches = orderPickupDateKey === requestedDateKey;
    const returnInPeriod = orderReturnEnd && orderReturnEnd >= startOfPeriod && orderReturnEnd <= endOfPeriod;
    const spansAcross = orderPickup < startOfPeriod && orderReturnEnd && orderReturnEnd > endOfPeriod;
    return pickupMatches || returnInPeriod || spansAcross;
  }
  
  if (status === ORDER_STATUS.RETURNED) {
    return false;
  }
  
  return false;
}

// ============================================================================
// TEST CASES
// ============================================================================

console.log('🧪 Testing Product Availability Date Conversion & Logic\n');
console.log('='.repeat(80));

// Test 1: Date Conversion
console.log('\n📅 Test 1: Date Conversion');
console.log('-'.repeat(80));

const testCases = [
  { localDate: '2026-03-27', expectedUTC: '2026-03-27T17:00:00.000Z', description: 'Pickup 27/03 → UTC (17:00 UTC = 00:00 UTC+7 next day)' },
  { localDate: '2026-03-30', expectedUTC: '2026-03-30T17:00:00.000Z', description: 'Pickup 30/03 → UTC (17:00 UTC = 00:00 UTC+7 next day)' },
  { localDate: '2026-03-10', expectedUTC: '2026-03-10T17:00:00.000Z', description: 'Pickup 10/03 → UTC (17:00 UTC = 00:00 UTC+7 next day)' },
  { localDate: '2026-03-11', expectedUTC: '2026-03-11T17:00:00.000Z', description: 'Pickup 11/03 → UTC (17:00 UTC = 00:00 UTC+7 next day)' },
];

testCases.forEach(({ localDate, expectedUTC, description }) => {
  const result = convertLocalDateToUTCDatetime(localDate);
  const passed = result === expectedUTC;
  console.log(`${passed ? '✅' : '❌'} ${description}`);
  console.log(`   Input: ${localDate}`);
  console.log(`   Expected: ${expectedUTC}`);
  console.log(`   Got: ${result}`);
  if (!passed) {
    console.log(`   ⚠️  FAILED!`);
  }
  console.log();
});

// Test 2: getLocalDateKey
console.log('\n📅 Test 2: getLocalDateKey (UTC → Local Date)');
console.log('-'.repeat(80));

const dateKeyTests = [
  { utc: '2026-03-26T17:00:00.000Z', expected: '2026-03-27', description: 'Pickup UTC → 27/03' },
  { utc: '2026-03-30T16:59:59.000Z', expected: '2026-03-30', description: 'Return UTC → 30/03' },
  { utc: '2026-03-10T17:00:00.000Z', expected: '2026-03-11', description: 'Pickup UTC → 11/03' },
  { utc: '2026-03-09T17:00:00.000Z', expected: '2026-03-10', description: 'Pickup UTC → 10/03' },
];

dateKeyTests.forEach(({ utc, expected, description }) => {
  const result = getLocalDateKey(utc);
  const passed = result === expected;
  console.log(`${passed ? '✅' : '❌'} ${description}`);
  console.log(`   Input: ${utc}`);
  console.log(`   Expected: ${expected}`);
  console.log(`   Got: ${result}`);
  if (!passed) {
    console.log(`   ⚠️  FAILED!`);
  }
  console.log();
});

// Test 3: Product Availability Logic
console.log('\n📦 Test 3: Product Availability Logic');
console.log('-'.repeat(80));

// Test 3.1: Order 11/03 should NOT count for 10/03
console.log('\n🔍 Test 3.1: Order 11/03 should NOT count for 10/03');
const order1 = {
  orderType: ORDER_TYPE.RENT,
  status: ORDER_STATUS.RESERVED,
  pickupPlanAt: '2026-03-10T17:00:00.000Z', // 11/03 00:00 UTC+7
  returnPlanAt: '2026-03-14T16:59:59.000Z' // 15/03 23:59:59 UTC+7
};

const requestedDateKey1 = '2026-03-10';
const startOfPeriod1 = new Date('2026-03-10T00:00:00.000Z');
const endOfPeriod1 = new Date('2026-03-10T23:59:59.999Z');

const isActive1 = isOrderActiveInPeriod(order1, requestedDateKey1, startOfPeriod1, endOfPeriod1);
console.log(`   Order pickup: ${order1.pickupPlanAt} (${getLocalDateKey(order1.pickupPlanAt)})`);
console.log(`   Requested date: ${requestedDateKey1}`);
console.log(`   Is active: ${isActive1}`);
console.log(`   ${isActive1 === false ? '✅ PASSED' : '❌ FAILED'} - Should NOT be active`);

// Test 3.2: Order 10/03 should count for 10/03
console.log('\n🔍 Test 3.2: Order 10/03 should count for 10/03');
const order2 = {
  orderType: ORDER_TYPE.RENT,
  status: ORDER_STATUS.RESERVED,
  pickupPlanAt: '2026-03-09T17:00:00.000Z', // 10/03 00:00 UTC+7
  returnPlanAt: '2026-03-12T16:59:59.000Z' // 13/03 23:59:59 UTC+7
};

const requestedDateKey2 = '2026-03-10';
const startOfPeriod2 = new Date('2026-03-10T00:00:00.000Z');
const endOfPeriod2 = new Date('2026-03-10T23:59:59.999Z');

const isActive2 = isOrderActiveInPeriod(order2, requestedDateKey2, startOfPeriod2, endOfPeriod2);
console.log(`   Order pickup: ${order2.pickupPlanAt} (${getLocalDateKey(order2.pickupPlanAt)})`);
console.log(`   Requested date: ${requestedDateKey2}`);
console.log(`   Is active: ${isActive2}`);
console.log(`   ${isActive2 === true ? '✅ PASSED' : '❌ FAILED'} - Should be active`);

// Test 3.3: Order spans across requested date
console.log('\n🔍 Test 3.3: Order spans across requested date');
const order3 = {
  orderType: ORDER_TYPE.RENT,
  status: ORDER_STATUS.RESERVED,
  pickupPlanAt: '2026-03-08T17:00:00.000Z', // 09/03 00:00 UTC+7
  returnPlanAt: '2026-03-10T16:59:59.000Z' // 11/03 23:59:59 UTC+7
};

const requestedDateKey3 = '2026-03-10';
const startOfPeriod3 = new Date('2026-03-10T00:00:00.000Z');
const endOfPeriod3 = new Date('2026-03-10T23:59:59.999Z');

const isActive3 = isOrderActiveInPeriod(order3, requestedDateKey3, startOfPeriod3, endOfPeriod3);
console.log(`   Order pickup: ${order3.pickupPlanAt} (${getLocalDateKey(order3.pickupPlanAt)})`);
console.log(`   Order return: ${order3.returnPlanAt} (${getLocalDateKey(order3.returnPlanAt)})`);
console.log(`   Requested date: ${requestedDateKey3}`);
console.log(`   Is active: ${isActive3}`);
console.log(`   ${isActive3 === true ? '✅ PASSED' : '❌ FAILED'} - Should be active (spans across)`);

// Test 3.4: RETURNED orders should NOT count
console.log('\n🔍 Test 3.4: RETURNED orders should NOT count');
const order4 = {
  orderType: ORDER_TYPE.RENT,
  status: ORDER_STATUS.RETURNED,
  pickupPlanAt: '2026-03-09T17:00:00.000Z', // 10/03 00:00 UTC+7
  returnPlanAt: '2026-03-10T16:59:59.000Z' // 11/03 23:59:59 UTC+7
};

const requestedDateKey4 = '2026-03-10';
const startOfPeriod4 = new Date('2026-03-10T00:00:00.000Z');
const endOfPeriod4 = new Date('2026-03-10T23:59:59.999Z');

const isActive4 = isOrderActiveInPeriod(order4, requestedDateKey4, startOfPeriod4, endOfPeriod4);
console.log(`   Order status: ${order4.status}`);
console.log(`   Order pickup: ${order4.pickupPlanAt} (${getLocalDateKey(order4.pickupPlanAt)})`);
console.log(`   Requested date: ${requestedDateKey4}`);
console.log(`   Is active: ${isActive4}`);
console.log(`   ${isActive4 === false ? '✅ PASSED' : '❌ FAILED'} - Should NOT be active (already returned)`);

// Test 3.5: Mobile app scenario - User selects 27/03 - 30/03
console.log('\n🔍 Test 3.5: Mobile app scenario - User selects 27/03 - 30/03');
const mobileOrder = {
  orderType: ORDER_TYPE.RENT,
  status: ORDER_STATUS.RESERVED,
  pickupPlanAt: '2026-03-26T17:00:00.000Z', // Mobile sends: user selected 27/03
  returnPlanAt: '2026-03-30T16:59:59.000Z' // Mobile sends: user selected 30/03
};

// Check for 27/03
const requestedDateKey5 = '2026-03-27';
const startOfPeriod5 = new Date('2026-03-27T00:00:00.000Z');
const endOfPeriod5 = new Date('2026-03-27T23:59:59.999Z');

const isActive5 = isOrderActiveInPeriod(mobileOrder, requestedDateKey5, startOfPeriod5, endOfPeriod5);
console.log(`   Mobile sends: pickupPlanAt=${mobileOrder.pickupPlanAt}, returnPlanAt=${mobileOrder.returnPlanAt}`);
console.log(`   Local dates: pickup=${getLocalDateKey(mobileOrder.pickupPlanAt)}, return=${getLocalDateKey(mobileOrder.returnPlanAt)}`);
console.log(`   Check availability for: ${requestedDateKey5}`);
console.log(`   Is active: ${isActive5}`);
console.log(`   ${isActive5 === true ? '✅ PASSED' : '❌ FAILED'} - Should be active (pickup date matches)`);

// Check for 26/03 (day before pickup)
const requestedDateKey6 = '2026-03-26';
const startOfPeriod6 = new Date('2026-03-26T00:00:00.000Z');
const endOfPeriod6 = new Date('2026-03-26T23:59:59.999Z');

const isActive6 = isOrderActiveInPeriod(mobileOrder, requestedDateKey6, startOfPeriod6, endOfPeriod6);
console.log(`\n   Check availability for: ${requestedDateKey6} (day before pickup)`);
console.log(`   Is active: ${isActive6}`);
console.log(`   ${isActive6 === false ? '✅ PASSED' : '❌ FAILED'} - Should NOT be active (pickup is next day)`);

console.log('\n' + '='.repeat(80));
console.log('✅ All tests completed!');
console.log('='.repeat(80));
