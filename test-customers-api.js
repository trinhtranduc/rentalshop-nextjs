#!/usr/bin/env node

/**
 * Test script for new simplified customers API
 * Tests the new route-new.ts file
 */

console.log('🧪 Testing New Simplified Customers API...\n');

// Test configuration
const API_BASE_URL = 'http://localhost:3001/api';
const TEST_EMAIL = 'merchant1@example.com';
const TEST_PASSWORD = 'merchant123';

let authToken = null;

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...options.headers,
    },
    ...options,
  });
  
  const data = await response.json();
  return { response, data };
}

async function testLogin() {
  console.log('🔐 Testing login...');
  
  const { response, data } = await makeRequest(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });
  
  if (response.ok && data.success) {
    authToken = data.data.token;
    console.log('✅ Login successful');
    console.log(`   User: ${data.data.user.name} (${data.data.user.role})`);
    console.log(`   Merchant ID: ${data.data.user.merchantId}`);
    return true;
  } else {
    console.log('❌ Login failed:', data.message);
    return false;
  }
}

async function testCustomersSearch() {
  console.log('\n🔍 Testing customers search...');
  
  const { response, data } = await makeRequest(`${API_BASE_URL}/customers?page=1&limit=5`);
  
  if (response.ok && data.success) {
    console.log('✅ Customers search successful');
    console.log(`   Found: ${data.data.total} customers`);
    console.log(`   Page: ${data.data.page}/${data.data.totalPages}`);
    console.log(`   Returned: ${data.data.customers.length} customers`);
    
    if (data.data.customers.length > 0) {
      const customer = data.data.customers[0];
      console.log(`   Sample customer: ${customer.firstName} ${customer.lastName} (ID: ${customer.id})`);
    }
    return true;
  } else {
    console.log('❌ Customers search failed:', data.message);
    return false;
  }
}

async function testCustomersCreate() {
  console.log('\n➕ Testing customer creation...');
  
  const customerData = {
    firstName: `Test${Date.now()}`,
    lastName: 'Customer',
    email: `test${Date.now()}@example.com`,
    phone: `+123456789${Date.now().toString().slice(-4)}`,
    address: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    isActive: true
  };
  
  const { response, data } = await makeRequest(`${API_BASE_URL}/customers`, {
    method: 'POST',
    body: JSON.stringify(customerData),
  });
  
  if (response.ok && data.success) {
    console.log('✅ Customer creation successful');
    console.log(`   Customer ID: ${data.data.id}`);
    console.log(`   Customer Name: ${data.data.firstName} ${data.data.lastName}`);
    console.log(`   Email: ${data.data.email}`);
    return data.data.id;
  } else {
    console.log('❌ Customer creation failed:', data.message);
    if (data.error) {
      console.log('   Validation errors:', JSON.stringify(data.error, null, 2));
    }
    return null;
  }
}

async function testCustomersUpdate() {
  console.log('\n✏️ Testing customer update...');
  
  // First create a customer
  const customerId = await testCustomersCreate();
  if (!customerId) {
    console.log('❌ Cannot test update without creating customer first');
    return false;
  }
  
  const updateData = {
    id: customerId,
    firstName: 'UpdatedTest',
    lastName: 'UpdatedCustomer',
    address: '456 Updated Street'
  };
  
  const { response, data } = await makeRequest(`${API_BASE_URL}/customers`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  });
  
  if (response.ok && data.success) {
    console.log('✅ Customer update successful');
    console.log(`   Updated Name: ${data.data.firstName} ${data.data.lastName}`);
    console.log(`   Updated Address: ${data.data.address}`);
    return true;
  } else {
    console.log('❌ Customer update failed:', data.message);
    return false;
  }
}

async function testCustomersSearchWithFilters() {
  console.log('\n🔍 Testing customers search with filters...');
  
  const { response, data } = await makeRequest(`${API_BASE_URL}/customers?search=Test&isActive=true&page=1&limit=10`);
  
  if (response.ok && data.success) {
    console.log('✅ Filtered search successful');
    console.log(`   Found: ${data.data.total} customers matching filters`);
    console.log(`   Returned: ${data.data.customers.length} customers`);
    return true;
  } else {
    console.log('❌ Filtered search failed:', data.message);
    return false;
  }
}

async function testCustomersSpecificLookup() {
  console.log('\n🔍 Testing specific customer lookup...');
  
  // First get a list to find a customer ID
  const { response: searchResponse, data: searchData } = await makeRequest(`${API_BASE_URL}/customers?limit=1`);
  
  if (searchResponse.ok && searchData.success && searchData.data.customers.length > 0) {
    const customerId = searchData.data.customers[0].id;
    
    const { response, data } = await makeRequest(`${API_BASE_URL}/customers?customerId=${customerId}`);
    
    if (response.ok && data.success) {
      console.log('✅ Specific customer lookup successful');
      console.log(`   Customer: ${data.data.firstName} ${data.data.lastName}`);
      console.log(`   Email: ${data.data.email}`);
      return true;
    } else {
      console.log('❌ Specific customer lookup failed:', data.message);
      return false;
    }
  } else {
    console.log('❌ Cannot test specific lookup without customers in database');
    return false;
  }
}

async function testDatabaseDirect() {
  console.log('\n🗄️ Testing database package directly...');
  
  try {
    // Import the new database package
    const { db } = await import('./packages/database/dist/index.js');
    
    console.log('✅ Database package imported successfully');
    
    // Test connection
    const connectionResult = await db.checkDatabaseConnection();
    console.log('✅ Database connection test:', connectionResult);
    
    // Test customers search
    const customers = await db.customers.search({
      merchantId: 1,
      page: 1,
      limit: 3
    });
    
    console.log('✅ Direct database customers search:');
    console.log(`   Found: ${customers.total} customers`);
    console.log(`   Returned: ${customers.data?.length || 0} customers`);
    
    return true;
  } catch (error) {
    console.log('❌ Database package test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Customers API Tests...\n');
  
  const results = {
    login: false,
    customersSearch: false,
    customersCreate: false,
    customersUpdate: false,
    customersSearchFilters: false,
    customersSpecificLookup: false,
    databaseDirect: false
  };
  
  try {
    // Test 1: Login
    results.login = await testLogin();
    if (!results.login) {
      console.log('\n❌ Cannot continue without authentication');
      return results;
    }
    
    // Test 2: Database package direct test
    results.databaseDirect = await testDatabaseDirect();
    
    // Test 3: Customers search
    results.customersSearch = await testCustomersSearch();
    
    // Test 4: Customers creation
    results.customersCreate = await testCustomersCreate();
    
    // Test 5: Customers update
    results.customersUpdate = await testCustomersUpdate();
    
    // Test 6: Customers search with filters
    results.customersSearchFilters = await testCustomersSearchWithFilters();
    
    // Test 7: Specific customer lookup
    results.customersSpecificLookup = await testCustomersSpecificLookup();
    
  } catch (error) {
    console.log('\n❌ Test suite failed:', error.message);
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Customers API is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the logs above.');
  }
  
  return results;
}

// Run tests
runAllTests().catch(console.error);
