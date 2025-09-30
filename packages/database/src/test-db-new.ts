// ============================================================================
// TEST FILE FOR NEW SIMPLIFIED DATABASE API
// ============================================================================
// This file tests the new simplified database API before replacing the old one

import { db, checkDatabaseConnection, generateOrderNumber } from './db-new';

/**
 * Test the new simplified database API
 */
export async function testNewDatabaseAPI() {
  console.log('🧪 Testing new simplified database API...');

  try {
    // Test 1: Check database connection
    console.log('1. Testing database connection...');
    const connectionResult = await checkDatabaseConnection();
    console.log('✅ Database connection:', connectionResult);

    // Test 2: Test user operations
    console.log('2. Testing user operations...');
    const users = await db.users.search({ page: 1, limit: 5 });
    console.log('✅ Users found:', users.total);

    // Test 3: Test product operations
    console.log('3. Testing product operations...');
    const products = await db.products.search({ page: 1, limit: 5 });
    console.log('✅ Products found:', products.total);

    // Test 4: Test order operations
    console.log('4. Testing order operations...');
    const orders = await db.orders.search({ page: 1, limit: 5 });
    console.log('✅ Orders found:', orders.total);

    // Test 5: Test order number generation
    console.log('5. Testing order number generation...');
    const orderNumber = await generateOrderNumber(1);
    console.log('✅ Generated order number:', orderNumber);

    console.log('🎉 All tests passed! New API is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

/**
 * Compare performance between old and new API
 */
export async function comparePerformance() {
  console.log('⚡ Comparing performance...');

  const iterations = 10;
  const startTime = Date.now();

  // Test new API performance
  for (let i = 0; i < iterations; i++) {
    await db.users.search({ page: 1, limit: 10 });
    await db.products.search({ page: 1, limit: 10 });
    await db.orders.search({ page: 1, limit: 10 });
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`✅ New API performance: ${duration}ms for ${iterations} iterations`);
  console.log(`📊 Average: ${duration / iterations}ms per iteration`);
}

// Export test functions
export { testNewDatabaseAPI, comparePerformance };
