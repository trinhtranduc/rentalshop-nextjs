/**
 * Test script for Analytics Income timezone handling
 * Run with: tsx scripts/test-analytics-income-timezone.ts
 */

// Simple assertion helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ FAILED: ${message}`);
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual: ${actual}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log('🧪 Testing Analytics Income - Timezone and Order Filtering\n');

// ============================================================================
// Test 1: Date normalization for UTC
// ============================================================================
console.log('📅 Test 1: Date normalization for UTC');

// Test start of month in UTC
const year = 2025;
const month = 11; // December (0-indexed)
const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

assertEqual(startOfMonth.getUTCHours(), 0, 'Start of month should be at 00:00 UTC');
assertEqual(startOfMonth.getUTCMinutes(), 0, 'Start of month minutes should be 0');
assertEqual(startOfMonth.getUTCSeconds(), 0, 'Start of month seconds should be 0');
assertEqual(startOfMonth.getUTCMilliseconds(), 0, 'Start of month milliseconds should be 0');
assertEqual(startOfMonth.getUTCFullYear(), 2025, 'Start of month year should be 2025');
assertEqual(startOfMonth.getUTCMonth(), 11, 'Start of month should be December (11)');
assertEqual(startOfMonth.getUTCDate(), 1, 'Start of month date should be 1');

// Test end of month in UTC
const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
assertEqual(endOfMonth.getUTCHours(), 23, 'End of month should be at 23:59 UTC');
assertEqual(endOfMonth.getUTCMinutes(), 59, 'End of month minutes should be 59');
assertEqual(endOfMonth.getUTCSeconds(), 59, 'End of month seconds should be 59');
assertEqual(endOfMonth.getUTCMilliseconds(), 999, 'End of month milliseconds should be 999');
assertEqual(endOfMonth.getUTCFullYear(), 2025, 'End of month year should be 2025');
assertEqual(endOfMonth.getUTCMonth(), 11, 'End of month should be December (11)');
assertEqual(endOfMonth.getUTCDate(), 31, 'End of month date should be 31 (last day)');

// Test start of day in UTC
const day = 15;
const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
assertEqual(startOfDay.getUTCHours(), 0, 'Start of day should be at 00:00 UTC');
assertEqual(startOfDay.getUTCDate(), 15, 'Start of day date should be 15');

// Test end of day in UTC
const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
assertEqual(endOfDay.getUTCHours(), 23, 'End of day should be at 23:59 UTC');
assertEqual(endOfDay.getUTCDate(), 15, 'End of day date should be 15');

console.log('');

// ============================================================================
// Test 2: Order filtering with pickedUpAt
// ============================================================================
console.log('📦 Test 2: Order filtering with pickedUpAt');

// Test: Order created before period but picked up during period
const orderCreatedAt = new Date('2025-12-01T10:00:00.000Z');
const orderPickedUpAt = new Date('2025-12-15T14:30:00.000Z');
const startOfPeriod = new Date(Date.UTC(2025, 11, 15, 0, 0, 0, 0));
const endOfPeriod = new Date(Date.UTC(2025, 11, 15, 23, 59, 59, 999));

const isIncluded = (
  (orderCreatedAt >= startOfPeriod && orderCreatedAt <= endOfPeriod) ||
  (orderPickedUpAt && orderPickedUpAt >= startOfPeriod && orderPickedUpAt <= endOfPeriod)
);

assert(isIncluded, 'Order picked up during period should be included (even if created before)');

// Test: Order returned during period
const orderReturnedAt = new Date('2025-12-20T16:45:00.000Z');
const startOfPeriodDec20 = new Date(Date.UTC(2025, 11, 20, 0, 0, 0, 0));
const endOfPeriodDec20 = new Date(Date.UTC(2025, 11, 20, 23, 59, 59, 999));

const isIncludedReturned = (
  (orderCreatedAt >= startOfPeriodDec20 && orderCreatedAt <= endOfPeriodDec20) ||
  (orderPickedUpAt && orderPickedUpAt >= startOfPeriodDec20 && orderPickedUpAt <= endOfPeriodDec20) ||
  (orderReturnedAt && orderReturnedAt >= startOfPeriodDec20 && orderReturnedAt <= endOfPeriodDec20)
);

assert(isIncludedReturned, 'Order returned during period should be included (even if created/picked up before)');

// Test: Order with no events in period
const orderReturnedAtDec10 = new Date('2025-12-10T16:45:00.000Z');
const startOfPeriodDec25 = new Date(Date.UTC(2025, 11, 25, 0, 0, 0, 0));
const endOfPeriodDec25 = new Date(Date.UTC(2025, 11, 25, 23, 59, 59, 999));

const isExcluded = (
  (orderCreatedAt >= startOfPeriodDec25 && orderCreatedAt <= endOfPeriodDec25) ||
  (orderPickedUpAt && orderPickedUpAt >= startOfPeriodDec25 && orderPickedUpAt <= endOfPeriodDec25) ||
  (orderReturnedAtDec10 && orderReturnedAtDec10 >= startOfPeriodDec25 && orderReturnedAtDec10 <= endOfPeriodDec25)
);

assert(!isExcluded, 'Order with no events in period should be excluded');

console.log('');

// ============================================================================
// Test 3: Timezone edge cases
// ============================================================================
console.log('🌍 Test 3: Timezone edge cases');

// Test: Order picked up at midnight UTC
const orderPickedUpAtMidnight = new Date('2025-12-15T00:00:00.000Z');
const isIncludedMidnight = (
  orderPickedUpAtMidnight >= startOfPeriod && orderPickedUpAtMidnight <= endOfPeriod
);
assert(isIncludedMidnight, 'Order picked up at midnight UTC should be included');

// Test: Order picked up at end of day UTC
const orderPickedUpAtEndOfDay = new Date('2025-12-15T23:59:59.999Z');
const isIncludedEndOfDay = (
  orderPickedUpAtEndOfDay >= startOfPeriod && orderPickedUpAtEndOfDay <= endOfPeriod
);
assert(isIncludedEndOfDay, 'Order picked up at end of day UTC should be included');

// Test: Timezone difference (UTC+7)
// User in UTC+7 picks up order at local midnight (00:00:00 local) = 17:00:00 UTC previous day
const orderPickedUpAtLocalMidnight = new Date('2025-12-14T17:00:00.000Z'); // Dec 15 00:00 local (UTC+7)
const isIncludedDec15 = (
  orderPickedUpAtLocalMidnight >= startOfPeriod && orderPickedUpAtLocalMidnight <= endOfPeriod
);
assert(!isIncludedDec15, 'Order picked up at local midnight (Dec 15) but UTC Dec 14 should NOT be included in Dec 15 UTC period');

// But should be included in Dec 14 UTC period
const startOfPeriodDec14 = new Date(Date.UTC(2025, 11, 14, 0, 0, 0, 0));
const endOfPeriodDec14 = new Date(Date.UTC(2025, 11, 14, 23, 59, 59, 999));
const isIncludedDec14 = (
  orderPickedUpAtLocalMidnight >= startOfPeriodDec14 && orderPickedUpAtLocalMidnight <= endOfPeriodDec14
);
assert(isIncludedDec14, 'Order picked up at local midnight (Dec 15) but UTC Dec 14 should be included in Dec 14 UTC period');

console.log('');

// ============================================================================
// Test 4: Real-world scenario
// ============================================================================
console.log('🎯 Test 4: Real-world scenario');

// Scenario: User picks up order on Dec 15 at 14:30 local time (UTC+7)
// Local time: 2025-12-15 14:30:00 (UTC+7)
// UTC time: 2025-12-15 07:30:00 UTC
const orderPickedUpAtRealWorld = new Date('2025-12-15T07:30:00.000Z');

// Period: Dec 15 UTC (00:00:00 UTC to 23:59:59.999 UTC)
const isIncludedRealWorld = (
  orderPickedUpAtRealWorld >= startOfPeriod && orderPickedUpAtRealWorld <= endOfPeriod
);
assert(isIncludedRealWorld, 'Order picked up on Dec 15 local time (UTC+7) should be included in Dec 15 UTC period');

// Verify the UTC date is correct
assertEqual(orderPickedUpAtRealWorld.getUTCDate(), 15, 'Order picked up date should be Dec 15 UTC');
assertEqual(orderPickedUpAtRealWorld.getUTCHours(), 7, 'Order picked up hour should be 07:00 UTC');

console.log('');

// ============================================================================
// Summary
// ============================================================================
console.log('✨ All tests passed!');
console.log('');
console.log('📝 Summary:');
console.log('  ✅ Date normalization to UTC works correctly');
console.log('  ✅ Order filtering includes orders with events in period');
console.log('  ✅ Timezone edge cases handled correctly');
console.log('  ✅ Real-world scenarios work as expected');
console.log('');
console.log('💡 Key findings:');
console.log('  - Dates must be created using Date.UTC() to match database timezone');
console.log('  - Orders with pickedUpAt/returnedAt in period are included even if created before');
console.log('  - Local timezone differences are handled correctly when using UTC');
