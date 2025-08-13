#!/usr/bin/env node

/**
 * Test script for Order Detail API endpoint
 * 
 * This script tests the GET /api/orders/[orderId] endpoint to ensure:
 * - Authentication works correctly
 * - Order details are returned properly
 * - Authorization is enforced
 * - Error handling works as expected
 */

const fetch = require('node-fetch');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const TEST_ORDER_ID = process.env.TEST_ORDER_ID || 'test-order-id';
const TEST_TOKEN = process.env.TEST_TOKEN || 'your-test-jwt-token';

async function testOrderDetailAPI() {
  console.log('🧪 Testing Order Detail API...\n');

  // Test 1: Missing authentication
  console.log('1️⃣ Testing missing authentication...');
  try {
    const response = await fetch(`${API_BASE}/api/orders/${TEST_ORDER_ID}`);
    if (response.status === 401) {
      console.log('✅ PASS: Missing authentication returns 401');
    } else {
      console.log(`❌ FAIL: Expected 401, got ${response.status}`);
    }
  } catch (error) {
    console.log('❌ FAIL: Request failed:', error.message);
  }

  // Test 2: Invalid token
  console.log('\n2️⃣ Testing invalid token...');
  try {
    const response = await fetch(`${API_BASE}/api/orders/${TEST_ORDER_ID}`, {
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json',
      },
    });
    if (response.status === 401) {
      console.log('✅ PASS: Invalid token returns 401');
    } else {
      console.log(`❌ FAIL: Expected 401, got ${response.status}`);
    }
  } catch (error) {
    console.log('❌ FAIL: Request failed:', error.message);
  }

  // Test 3: Valid token (if provided)
  if (TEST_TOKEN && TEST_TOKEN !== 'your-test-jwt-token') {
    console.log('\n3️⃣ Testing valid token...');
    try {
      const response = await fetch(`${API_BASE}/api/orders/${TEST_ORDER_ID}`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.status === 404) {
        console.log('✅ PASS: Valid token returns 404 for non-existent order (expected)');
      } else if (response.status === 200) {
        const data = await response.json();
        if (data.success && data.data) {
          console.log('✅ PASS: Valid token returns order details');
          console.log('📋 Order data structure:');
          console.log(`   - ID: ${data.data.id}`);
          console.log(`   - Order Number: ${data.data.orderNumber}`);
          console.log(`   - Status: ${data.data.status}`);
          console.log(`   - Type: ${data.data.orderType}`);
          console.log(`   - Customer: ${data.data.customerFullName || 'N/A'}`);
          console.log(`   - Total Amount: ${data.data.totalAmount}`);
          console.log(`   - Items Count: ${data.data.orderItems?.length || 0}`);
          console.log(`   - Payments Count: ${data.data.payments?.length || 0}`);
        } else {
          console.log('❌ FAIL: Response structure is invalid');
        }
      } else {
        console.log(`❌ FAIL: Unexpected status ${response.status}`);
      }
    } catch (error) {
      console.log('❌ FAIL: Request failed:', error.message);
    }
  } else {
    console.log('\n3️⃣ Skipping valid token test (no TEST_TOKEN provided)');
  }

  // Test 4: Non-existent order ID
  console.log('\n4️⃣ Testing non-existent order ID...');
  try {
    const response = await fetch(`${API_BASE}/api/orders/non-existent-order-id`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.status === 404) {
      console.log('✅ PASS: Non-existent order returns 404');
    } else {
      console.log(`❌ FAIL: Expected 404, got ${response.status}`);
    }
  } catch (error) {
    console.log('❌ FAIL: Request failed:', error.message);
  }

  // Test 5: Test PUT method (update order)
  console.log('\n5️⃣ Testing PUT method (update order)...');
  try {
    const response = await fetch(`${API_BASE}/api/orders/${TEST_ORDER_ID}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'CONFIRMED',
        notes: 'Test update from script'
      }),
    });
    
    if (response.status === 404) {
      console.log('✅ PASS: PUT method returns 404 for non-existent order (expected)');
    } else if (response.status === 200) {
      console.log('✅ PASS: PUT method works for existing order');
    } else {
      console.log(`❌ FAIL: PUT method returned unexpected status ${response.status}`);
    }
  } catch (error) {
    console.log('❌ FAIL: PUT request failed:', error.message);
  }

  // Test 6: Test DELETE method (cancel order)
  console.log('\n6️⃣ Testing DELETE method (cancel order)...');
  try {
    const response = await fetch(`${API_BASE}/api/orders/${TEST_ORDER_ID}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'Test cancellation from script'
      }),
    });
    
    if (response.status === 404) {
      console.log('✅ PASS: DELETE method returns 404 for non-existent order (expected)');
    } else if (response.status === 200) {
      console.log('✅ PASS: DELETE method works for existing order');
    } else {
      console.log(`❌ FAIL: DELETE method returned unexpected status ${response.status}`);
    }
  } catch (error) {
    console.log('❌ FAIL: DELETE request failed:', error.message);
  }

  console.log('\n🎯 Order Detail API testing completed!');
  console.log('\n📝 To test with a real order:');
  console.log('1. Create an order first using the create order endpoint');
  console.log('2. Set TEST_ORDER_ID to the created order ID');
  console.log('3. Set TEST_TOKEN to a valid JWT token');
  console.log('4. Run this script again');
}

// Run the tests
testOrderDetailAPI().catch(console.error);
