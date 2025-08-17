#!/usr/bin/env node

/**
 * Test Customer API Creation
 * This script helps debug customer creation issues
 */

const BASE_URL = 'http://localhost:3000';

// Sample customer data
const sampleCustomer = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  merchantId: 'test_merchant_123',
  address: '123 Main St',
  city: 'New York',
  state: 'NY',
  zipCode: '10001',
  country: 'USA',
  idType: 'passport',
  idNumber: 'AB123456',
  notes: 'Test customer'
};

async function testCustomerAPI() {
  console.log('🧪 Testing Customer API...\n');
  
  // You need to replace this with a valid JWT token
  const token = process.env.JWT_TOKEN || 'your_jwt_token_here';
  
  if (token === 'your_jwt_token_here') {
    console.log('❌ Please set JWT_TOKEN environment variable or update the script');
    console.log('   Example: JWT_TOKEN=your_token node scripts/test-customer-api.js\n');
    return;
  }

  console.log('📋 Testing with sample data:');
  console.log(JSON.stringify(sampleCustomer, null, 2));
  console.log('\n');

  try {
    // Test 1: Test validation endpoint
    console.log('🔍 Test 1: Testing validation endpoint...');
    const validationResponse = await fetch(`${BASE_URL}/api/customers/test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleCustomer)
    });

    const validationResult = await validationResponse.json();
    console.log(`Status: ${validationResponse.status}`);
    console.log('Response:', JSON.stringify(validationResult, null, 2));
    console.log('\n');

    // Test 2: Debug endpoint
    console.log('🐛 Test 2: Testing debug endpoint...');
    const debugResponse = await fetch(`${BASE_URL}/api/customers/debug`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleCustomer)
    });

    const debugResult = await debugResponse.json();
    console.log(`Status: ${debugResponse.status}`);
    console.log('Response:', JSON.stringify(debugResult, null, 2));
    console.log('\n');

    // Test 3: Actual customer creation
    console.log('🚀 Test 3: Testing actual customer creation...');
    const createResponse = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleCustomer)
    });

    const createResult = await createResponse.json();
    console.log(`Status: ${createResponse.status}`);
    console.log('Response:', JSON.stringify(createResult, null, 2));
    console.log('\n');

    // Test 4: Get customers
    console.log('📋 Test 4: Testing get customers...');
    const getResponse = await fetch(`${BASE_URL}/api/customers`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const getResult = await getResponse.json();
    console.log(`Status: ${getResponse.status}`);
    console.log('Response:', JSON.stringify(getResult, null, 2));

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

// Run the test
testCustomerAPI().catch(console.error);
