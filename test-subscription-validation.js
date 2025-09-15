/**
 * Test script to verify subscription validation is working
 * This script will test API calls with different subscription statuses
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test credentials (you'll need to update these based on your test data)
const TEST_CREDENTIALS = {
  // Merchant with paused/cancelled subscription
  pausedMerchant: {
    email: 'merchant1@example.com',
    password: 'merchant123'
  },
  // Admin user (should work regardless of subscription)
  admin: {
    email: 'admin@rentalshop.com', 
    password: 'admin123'
  }
};

async function login(credentials) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();
    
    if (data.success && data.token) {
      console.log(`✅ Login successful for ${credentials.email}`);
      return data.token;
    } else {
      console.log(`❌ Login failed for ${credentials.email}:`, data.message);
      return null;
    }
  } catch (error) {
    console.log(`❌ Login error for ${credentials.email}:`, error.message);
    return null;
  }
}

async function testApiCall(token, endpoint, description) {
  try {
    console.log(`\n🔍 Testing ${description}...`);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Data:`, JSON.stringify(data, null, 2));
    
    if (response.status === 403 && data.error === 'SUBSCRIPTION_ERROR') {
      console.log(`✅ SUBSCRIPTION VALIDATION WORKING: ${description} correctly blocked due to subscription status`);
      return true;
    } else if (response.status === 200 && data.success) {
      console.log(`✅ API CALL SUCCESSFUL: ${description} allowed`);
      return true;
    } else {
      console.log(`❌ UNEXPECTED RESPONSE: ${description}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ API call error for ${description}:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Subscription Validation Tests\n');
  
  // Test 1: Login with paused merchant
  console.log('=== TEST 1: Paused Merchant Login ===');
  const pausedToken = await login(TEST_CREDENTIALS.pausedMerchant);
  
  if (pausedToken) {
    // Test API calls that should be blocked
    await testApiCall(pausedToken, '/api/products', 'Products API (should be blocked)');
    await testApiCall(pausedToken, '/api/orders', 'Orders API (should be blocked)');
    await testApiCall(pausedToken, '/api/customers', 'Customers API (should be blocked)');
  }
  
  // Test 2: Login with admin user
  console.log('\n=== TEST 2: Admin User Login ===');
  const adminToken = await login(TEST_CREDENTIALS.admin);
  
  if (adminToken) {
    // Test API calls that should work for admin
    await testApiCall(adminToken, '/api/products', 'Products API (admin should work)');
    await testApiCall(adminToken, '/api/orders', 'Orders API (admin should work)');
    await testApiCall(adminToken, '/api/customers', 'Customers API (admin should work)');
  }
  
  console.log('\n🏁 Tests completed!');
}

// Run the tests
runTests().catch(console.error);
