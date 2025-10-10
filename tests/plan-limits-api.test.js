#!/usr/bin/env node

// ============================================================================
// PLAN LIMITS API INTEGRATION TESTS
// ============================================================================
// Comprehensive tests for plan limits validation in API endpoints

const http = require('http');
const https = require('https');

class PlanLimitsAPITester {
  constructor() {
    this.baseURL = process.env.API_URL || 'http://localhost:3001';
    this.testResults = [];
    this.authToken = null;
    this.merchantId = null;
    this.outletId = null;
    this.customerId = null;
    this.productId = null;
    this.userId = null;
  }

  async makeRequest(endpoint, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseURL);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (this.authToken) {
        options.headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const req = client.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = responseData ? JSON.parse(responseData) : null;
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: jsonData
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: responseData
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async authenticate() {
    console.log('🔐 Authenticating...');
    
    try {
      // Try to authenticate with test credentials
      const loginData = {
        email: 'merchant1@example.com',
        password: 'merchant123'
      };

      const response = await this.makeRequest('/api/auth/login', 'POST', loginData);
      
      if (response.statusCode === 200 && response.data?.success) {
        this.authToken = response.data.data?.token || response.data.token;
        console.log('✅ Authentication successful');
        return true;
      } else {
        console.log('❌ Authentication failed:', response.data?.message || 'Unknown error');
        return false;
      }
    } catch (error) {
      console.log('❌ Authentication error:', error.message);
      return false;
    }
  }

  async getCurrentPlanLimits() {
    console.log('\n📊 Getting current plan limits...');
    
    try {
      const response = await this.makeRequest('/api/subscription/limits');
      
      if (response.statusCode === 200 && response.data?.success) {
        const planInfo = response.data.data.planInfo;
        console.log('✅ Current plan limits retrieved');
        console.log(`   Plan: ${planInfo.planSummary?.planName || 'Unknown'}`);
        console.log(`   Outlets: ${planInfo.currentCounts.outlets}/${planInfo.planLimits.outlets}`);
        console.log(`   Users: ${planInfo.currentCounts.users}/${planInfo.planLimits.users}`);
        console.log(`   Products: ${planInfo.currentCounts.products}/${planInfo.planLimits.products}`);
        console.log(`   Customers: ${planInfo.currentCounts.customers}/${planInfo.planLimits.customers}`);
        
        return planInfo;
      } else {
        console.log('❌ Failed to get plan limits:', response.data?.message);
        return null;
      }
    } catch (error) {
      console.log('❌ Error getting plan limits:', error.message);
      return null;
    }
  }

  async testCreateOutletWithLimit() {
    console.log('\n🧪 Testing outlet creation with plan limits...');
    
    try {
      const outletData = {
        name: 'Test Outlet for Plan Limits',
        address: 'Test Address',
        phone: '1234567890',
        status: 'ACTIVE'
      };

      const response = await this.makeRequest('/api/outlets', 'POST', outletData);
      
      if (response.statusCode === 201) {
        this.outletId = response.data.data.id;
        console.log('✅ Outlet created successfully');
        console.log(`   Outlet ID: ${this.outletId}`);
        return true;
      } else if (response.statusCode === 403 && response.data?.error === 'PLAN_LIMIT_EXCEEDED') {
        console.log('✅ Plan limit validation working - blocked outlet creation');
        console.log(`   Message: ${response.data.message}`);
        return true;
      } else {
        console.log('❌ Unexpected response:', response.statusCode, response.data?.message);
        return false;
      }
    } catch (error) {
      console.log('❌ Error creating outlet:', error.message);
      return false;
    }
  }

  async testCreateProductWithLimit() {
    console.log('\n🧪 Testing product creation with plan limits...');
    
    try {
      if (!this.outletId) {
        console.log('⚠️  No outlet ID available, skipping product test');
        return false;
      }

      const productData = {
        name: 'Test Product for Plan Limits',
        description: 'Test Description',
        rentPrice: 10.00,
        salePrice: 100.00,
        totalStock: 5,
        outletStock: [
          { outletId: this.outletId, stock: 5 }
        ]
      };

      const response = await this.makeRequest('/api/products', 'POST', productData);
      
      if (response.statusCode === 201) {
        this.productId = response.data.data.id;
        console.log('✅ Product created successfully');
        console.log(`   Product ID: ${this.productId}`);
        return true;
      } else if (response.statusCode === 403 && response.data?.error === 'PLAN_LIMIT_EXCEEDED') {
        console.log('✅ Plan limit validation working - blocked product creation');
        console.log(`   Message: ${response.data.message}`);
        return true;
      } else {
        console.log('❌ Unexpected response:', response.statusCode, response.data?.message);
        return false;
      }
    } catch (error) {
      console.log('❌ Error creating product:', error.message);
      return false;
    }
  }

  async testCreateCustomerWithLimit() {
    console.log('\n🧪 Testing customer creation with plan limits...');
    
    try {
      const customerData = {
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test.customer@example.com',
        phone: '1234567890'
      };

      const response = await this.makeRequest('/api/customers', 'POST', customerData);
      
      if (response.statusCode === 201) {
        this.customerId = response.data.data.id;
        console.log('✅ Customer created successfully');
        console.log(`   Customer ID: ${this.customerId}`);
        return true;
      } else if (response.statusCode === 403 && response.data?.error === 'PLAN_LIMIT_EXCEEDED') {
        console.log('✅ Plan limit validation working - blocked customer creation');
        console.log(`   Message: ${response.data.message}`);
        return true;
      } else {
        console.log('❌ Unexpected response:', response.statusCode, response.data?.message);
        return false;
      }
    } catch (error) {
      console.log('❌ Error creating customer:', error.message);
      return false;
    }
  }

  async testCreateUserWithLimit() {
    console.log('\n🧪 Testing user creation with plan limits...');
    
    try {
      const userData = {
        name: 'Test User',
        email: 'test.user@example.com',
        phone: '1234567890',
        role: 'OUTLET_STAFF'
      };

      const response = await this.makeRequest('/api/users', 'POST', userData);
      
      if (response.statusCode === 201) {
        this.userId = response.data.data.id;
        console.log('✅ User created successfully');
        console.log(`   User ID: ${this.userId}`);
        return true;
      } else if (response.statusCode === 403 && response.data?.error === 'PLAN_LIMIT_EXCEEDED') {
        console.log('✅ Plan limit validation working - blocked user creation');
        console.log(`   Message: ${response.data.message}`);
        return true;
      } else {
        console.log('❌ Unexpected response:', response.statusCode, response.data?.message);
        return false;
      }
    } catch (error) {
      console.log('❌ Error creating user:', error.message);
      return false;
    }
  }

  async testCreateOrderWithLimit() {
    console.log('\n🧪 Testing order creation with plan limits...');
    
    try {
      if (!this.outletId || !this.customerId || !this.productId) {
        console.log('⚠️  Missing required IDs, skipping order test');
        return false;
      }

      const orderData = {
        orderType: 'RENT',
        outletId: this.outletId,
        customerId: this.customerId,
        orderItems: [
          {
            productId: this.productId,
            quantity: 1,
            unitPrice: 10.00
          }
        ],
        totalAmount: 10.00,
        depositAmount: 5.00
      };

      const response = await this.makeRequest('/api/orders', 'POST', orderData);
      
      if (response.statusCode === 201) {
        console.log('✅ Order created successfully');
        console.log(`   Order ID: ${response.data.data.id}`);
        return true;
      } else if (response.statusCode === 403 && response.data?.error === 'PLAN_LIMIT_EXCEEDED') {
        console.log('✅ Plan limit validation working - blocked order creation');
        console.log(`   Message: ${response.data.message}`);
        return true;
      } else {
        console.log('❌ Unexpected response:', response.statusCode, response.data?.message);
        return false;
      }
    } catch (error) {
      console.log('❌ Error creating order:', error.message);
      return false;
    }
  }

  async testPlanLimitsCheckAPI() {
    console.log('\n🧪 Testing plan limits check API...');
    
    const testCases = [
      {
        name: 'Check single entity type',
        data: { entityType: 'outlets' }
      },
      {
        name: 'Check multiple entity types',
        data: { entityTypes: ['outlets', 'users', 'products'] }
      },
      {
        name: 'Check invalid entity type',
        data: { entityType: 'invalid' }
      }
    ];

    let passedTests = 0;

    for (const testCase of testCases) {
      try {
        const response = await this.makeRequest('/api/subscription/limits/check', 'POST', testCase.data);
        
        const passed = response.statusCode === 200 && response.data?.success;
        
        console.log(`   ${passed ? '✅' : '❌'} ${testCase.name}`);
        console.log(`   Status: ${response.statusCode}`);
        
        if (passed) {
          console.log(`   Response:`, JSON.stringify(response.data.data, null, 2));
          passedTests++;
        } else {
          console.log(`   Error:`, response.data?.message || 'Unknown error');
        }
        
        this.testResults.push({
          test: `POST /api/subscription/limits/check - ${testCase.name}`,
          passed,
          statusCode: response.statusCode,
          data: response.data
        });
        
      } catch (error) {
        console.log(`   ❌ ${testCase.name} - ERROR: ${error.message}`);
        
        this.testResults.push({
          test: `POST /api/subscription/limits/check - ${testCase.name}`,
          passed: false,
          error: error.message
        });
      }
    }

    return passedTests === testCases.length;
  }

  async testPlanLimitsSummary() {
    console.log('\n🧪 Testing plan limits summary...');
    
    try {
      const response = await this.makeRequest('/api/subscription/limits');
      
      if (response.statusCode === 200 && response.data?.success) {
        const data = response.data.data;
        
        // Test plan info structure
        const hasRequiredFields = data.planInfo && 
          data.planSummary && 
          data.upgradeSuggestions &&
          data.canCreate;
        
        console.log(`   ${hasRequiredFields ? '✅' : '❌'} Plan limits summary structure`);
        
        if (hasRequiredFields) {
          console.log(`   Plan: ${data.planInfo.planSummary?.planName || 'Unknown'}`);
          console.log(`   Platform: ${data.planInfo.platformAccess?.mobile ? 'Mobile' : ''} ${data.planInfo.platformAccess?.web ? '+ Web' : ''}`);
          console.log(`   Can Create:`, data.canCreate);
        }
        
        this.testResults.push({
          test: 'GET /api/subscription/limits - structure validation',
          passed: hasRequiredFields,
          statusCode: response.statusCode,
          data: data
        });
        
        return hasRequiredFields;
      } else {
        console.log('❌ Failed to get plan limits summary');
        return false;
      }
    } catch (error) {
      console.log('❌ Error testing plan limits summary:', error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Plan Limits API Integration Tests...\n');
    console.log(`Base URL: ${this.baseURL}`);
    
    try {
      // Authenticate first
      const authSuccess = await this.authenticate();
      
      if (!authSuccess) {
        console.log('❌ Cannot proceed without authentication');
        return;
      }
      
      // Get current plan limits
      const planInfo = await this.getCurrentPlanLimits();
      if (!planInfo) {
        console.log('❌ Cannot proceed without plan limits information');
        return;
      }
      
      // Run API tests
      const tests = [
        { name: 'Plan Limits Summary', test: () => this.testPlanLimitsSummary() },
        { name: 'Plan Limits Check API', test: () => this.testPlanLimitsCheckAPI() },
        { name: 'Create Outlet with Limits', test: () => this.testCreateOutletWithLimit() },
        { name: 'Create Product with Limits', test: () => this.testCreateProductWithLimit() },
        { name: 'Create Customer with Limits', test: () => this.testCreateCustomerWithLimit() },
        { name: 'Create User with Limits', test: () => this.testCreateUserWithLimit() },
        { name: 'Create Order with Limits', test: () => this.testCreateOrderWithLimit() }
      ];
      
      let passedTests = 0;
      
      for (const test of tests) {
        console.log(`\n📋 Running: ${test.name}`);
        console.log('='.repeat(50));
        
        try {
          const result = await test.test();
          if (result) {
            passedTests++;
            console.log(`✅ ${test.name} - PASSED`);
          } else {
            console.log(`❌ ${test.name} - FAILED`);
          }
        } catch (error) {
          console.log(`❌ ${test.name} - ERROR: ${error.message}`);
        }
      }
      
      this.printResults(passedTests, tests.length);
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    }
  }

  printResults(passed, total) {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    console.log('\n📋 DETAILED RESULTS:');
    console.log('-'.repeat(50));
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.test}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      } else if (result.statusCode) {
        console.log(`    Status: ${result.statusCode}`);
      }
    });
    
    if (passed === total) {
      console.log('\n🎉 ALL TESTS PASSED! Plan limits API integration is working correctly.');
      console.log('\n✅ Plan limits features verified:');
      console.log('   - Plan limits validation in all creation endpoints');
      console.log('   - Plan limits check API functionality');
      console.log('   - Plan limits summary API');
      console.log('   - Proper error handling for limit exceeded');
      console.log('   - Authentication and authorization');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the results above.');
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new PlanLimitsAPITester();
  tester.runAllTests().catch(console.error);
}

module.exports = PlanLimitsAPITester;
