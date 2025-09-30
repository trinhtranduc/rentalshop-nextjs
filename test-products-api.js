#!/usr/bin/env node

/**
 * Test script for new simplified products API
 * Tests the new route-new.ts file
 */

console.log('🧪 Testing New Simplified Products API...\n');

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

async function testProductsSearch() {
  console.log('\n🔍 Testing products search...');
  
  const { response, data } = await makeRequest(`${API_BASE_URL}/products?page=1&limit=5`);
  
  if (response.ok && data.success) {
    console.log('✅ Products search successful');
    console.log(`   Found: ${data.pagination.total} products`);
    console.log(`   Page: ${data.pagination.page}/${data.pagination.totalPages}`);
    console.log(`   Returned: ${data.data.length} products`);
    
    if (data.data.length > 0) {
      const product = data.data[0];
      console.log(`   Sample product: ${product.name} (ID: ${product.id})`);
    }
    return true;
  } else {
    console.log('❌ Products search failed:', data.message);
    return false;
  }
}

async function testProductsCreate() {
  console.log('\n➕ Testing product creation...');
  
  const productData = {
    name: `Test Product ${Date.now()}`,
    description: 'Test product created by API test',
    categoryId: 1, // Assuming category 1 exists
    rentPrice: 50.00,
    deposit: 100.00,
    outletStock: [
      { outletId: 1, stock: 5 }
    ]
  };
  
  const { response, data } = await makeRequest(`${API_BASE_URL}/products`, {
    method: 'POST',
    body: JSON.stringify(productData),
  });
  
  if (response.ok && data.success) {
    console.log('✅ Product creation successful');
    console.log(`   Product ID: ${data.data.id}`);
    console.log(`   Product Name: ${data.data.name}`);
    console.log(`   Rent Price: $${data.data.rentPrice}`);
    return data.data.id;
  } else {
    console.log('❌ Product creation failed:', data.message);
    if (data.error) {
      console.log('   Validation errors:', JSON.stringify(data.error, null, 2));
    }
    return null;
  }
}

async function testProductsSearchWithFilters() {
  console.log('\n🔍 Testing products search with filters...');
  
  const { response, data } = await makeRequest(`${API_BASE_URL}/products?search=Test&minPrice=10&maxPrice=100&page=1&limit=10`);
  
  if (response.ok && data.success) {
    console.log('✅ Filtered search successful');
    console.log(`   Found: ${data.pagination.total} products matching filters`);
    console.log(`   Returned: ${data.data.length} products`);
    return true;
  } else {
    console.log('❌ Filtered search failed:', data.message);
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
    
    // Test products search
    const products = await db.products.search({
      merchantId: 1,
      page: 1,
      limit: 3
    });
    
    console.log('✅ Direct database products search:');
    console.log(`   Found: ${products.total} products`);
    console.log(`   Returned: ${products.data?.length || 0} products`);
    
    return true;
  } catch (error) {
    console.log('❌ Database package test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Products API Tests...\n');
  
  const results = {
    login: false,
    productsSearch: false,
    productsCreate: false,
    productsSearchFilters: false,
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
    
    // Test 3: Products search
    results.productsSearch = await testProductsSearch();
    
    // Test 4: Products creation
    results.productsCreate = await testProductsCreate();
    
    // Test 5: Products search with filters
    results.productsSearchFilters = await testProductsSearchWithFilters();
    
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
    console.log('🎉 All tests passed! Products API is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the logs above.');
  }
  
  return results;
}

// Run tests
runAllTests().catch(console.error);
