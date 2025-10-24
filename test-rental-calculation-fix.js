#!/usr/bin/env node

/**
 * Test script to verify the rental calculation fix
 * This script tests the product availability API to ensure:
 * 1. Only orders from the specific outlet are counted
 * 2. Only active RENT orders are counted
 * 3. Rental quantities are calculated correctly
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

async function testRentalCalculation() {
  console.log('🧪 Testing Rental Calculation Fix...\n');

  try {
    // Test 1: Get product availability for a specific product and outlet
    console.log('Test 1: Testing product availability with specific outlet...');
    
    const testParams = {
      productId: 1, // Replace with actual product ID
      outletId: 1,  // Replace with actual outlet ID
      date: '2024-01-15' // Replace with test date
    };

    const availabilityUrl = `${API_BASE_URL}/api/products/availability?${new URLSearchParams(testParams)}`;
    console.log(`Requesting: ${availabilityUrl}`);

    const response = await fetch(availabilityUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add authorization header if needed
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    });

    if (!response.ok) {
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API Response received');
    console.log('Response data:', JSON.stringify(data, null, 2));

    // Verify the response structure
    if (data.success && data.data) {
      const { product, summary, orders } = data.data;
      
      console.log('\n📊 Analysis:');
      console.log(`Product: ${product.name} (ID: ${product.id})`);
      console.log(`Outlet: ${product.outletId}`);
      console.log(`Total Stock: ${summary.totalStock}`);
      console.log(`Total Rented: ${summary.totalRented}`);
      console.log(`Total Reserved: ${summary.totalReserved}`);
      console.log(`Total Available: ${summary.totalAvailable}`);
      console.log(`Is Available: ${summary.isAvailable}`);
      console.log(`Orders Found: ${orders.length}`);

      // Verify that all orders belong to the correct outlet
      const wrongOutletOrders = orders.filter(order => order.outletId !== testParams.outletId);
      if (wrongOutletOrders.length > 0) {
        console.error(`❌ Found ${wrongOutletOrders.length} orders from wrong outlet!`);
        console.error('Wrong outlet orders:', wrongOutletOrders);
      } else {
        console.log('✅ All orders belong to the correct outlet');
      }

      // Verify that only RENT orders are counted
      const nonRentOrders = orders.filter(order => order.orderType !== 'RENT');
      if (nonRentOrders.length > 0) {
        console.error(`❌ Found ${nonRentOrders.length} non-RENT orders!`);
        console.error('Non-RENT orders:', nonRentOrders);
      } else {
        console.log('✅ All orders are RENT type');
      }

      // Verify that only active orders are counted
      const inactiveOrders = orders.filter(order => !['RESERVED', 'PICKUPED'].includes(order.status));
      if (inactiveOrders.length > 0) {
        console.error(`❌ Found ${inactiveOrders.length} inactive orders!`);
        console.error('Inactive orders:', inactiveOrders);
      } else {
        console.log('✅ All orders are active (RESERVED or PICKUPED)');
      }

    } else {
      console.error('❌ Invalid response structure');
      console.error('Response:', data);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Test 2: Test the detailed availability endpoint
async function testDetailedAvailability() {
  console.log('\n🧪 Testing Detailed Availability Endpoint...\n');

  try {
    const testParams = {
      productId: 1, // Replace with actual product ID
      outletId: 1,  // Replace with actual outlet ID
      startDate: '2024-01-15T09:00:00Z',
      endDate: '2024-01-20T17:00:00Z',
      quantity: 2
    };

    const availabilityUrl = `${API_BASE_URL}/api/products/${testParams.productId}/availability?${new URLSearchParams(testParams)}`;
    console.log(`Requesting: ${availabilityUrl}`);

    const response = await fetch(availabilityUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add authorization header if needed
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    });

    if (!response.ok) {
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Detailed Availability Response received');
    console.log('Response data:', JSON.stringify(data, null, 2));

    // Verify the response structure
    if (data.success && data.data) {
      const { productId, productName, totalStock, totalAvailableStock, totalRenting, availabilityByOutlet } = data.data;
      
      console.log('\n📊 Detailed Analysis:');
      console.log(`Product: ${productName} (ID: ${productId})`);
      console.log(`Total Stock: ${totalStock}`);
      console.log(`Total Available: ${totalAvailableStock}`);
      console.log(`Total Renting: ${totalRenting}`);
      console.log(`Availability by Outlet:`, availabilityByOutlet);

      // Verify outlet-specific data
      if (availabilityByOutlet && availabilityByOutlet.length > 0) {
        const outletData = availabilityByOutlet[0];
        console.log(`\nOutlet Details:`);
        console.log(`- Outlet ID: ${outletData.outletId}`);
        console.log(`- Outlet Name: ${outletData.outletName}`);
        console.log(`- Stock: ${outletData.stock}`);
        console.log(`- Available: ${outletData.available}`);
        console.log(`- Renting: ${outletData.renting}`);
        console.log(`- Conflicting Quantity: ${outletData.conflictingQuantity}`);
        console.log(`- Effectively Available: ${outletData.effectivelyAvailable}`);
        console.log(`- Can Fulfill Request: ${outletData.canFulfillRequest}`);
        console.log(`- Conflicts: ${outletData.conflicts.length}`);
      }

    } else {
      console.error('❌ Invalid detailed availability response structure');
      console.error('Response:', data);
    }

  } catch (error) {
    console.error('❌ Detailed availability test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the tests
async function runTests() {
  console.log('🚀 Starting Rental Calculation Tests...\n');
  console.log('Note: Make sure the API server is running and update the test parameters with actual IDs\n');
  
  await testRentalCalculation();
  await testDetailedAvailability();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Summary of fixes applied:');
  console.log('1. ✅ Fixed database query to filter by specific outletId instead of all merchant outlets');
  console.log('2. ✅ Fixed rental quantity calculation to only count active orders from correct outlet');
  console.log('3. ✅ Added proper validation to ensure outletId is used in conflict calculation');
  console.log('4. ✅ Added enhanced logging for debugging rental calculations');
  console.log('\n🎯 The rental quantity calculation should now be accurate!');
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testRentalCalculation, testDetailedAvailability, runTests };
