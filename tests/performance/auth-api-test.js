#!/usr/bin/env node

/**
 * Authenticated API Performance Test
 * Tests API endpoints with authentication
 */

const http = require('http');
const { performance } = require('perf_hooks');

// Test configuration
const BASE_URL = 'http://localhost:3000';

// You'll need to get a valid token from your login
const AUTH_TOKEN = 'test-token'; // Replace with actual token

async function makeAuthenticatedRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    
    const url = new URL(BASE_URL + endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'User-Agent': 'Performance-Test/1.0'
      },
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        resolve({
          success: true,
          status: res.statusCode,
          duration,
          size: data.length,
          data: data.substring(0, 200)
        });
      });
    });

    req.on('error', (error) => {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      resolve({
        success: false,
        error: error.message,
        duration
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      resolve({
        success: false,
        error: 'Request timeout',
        duration
      });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function testAuthenticatedEndpoints() {
  console.log('🚀 Authenticated API Performance Test');
  console.log('📊 Testing API endpoints with authentication');
  console.log('=' .repeat(60));
  
  const endpoints = [
    { name: 'Orders List', url: '/api/orders?limit=20', method: 'GET' },
    { name: 'Orders Search', url: '/api/orders?limit=10&offset=0', method: 'GET' },
    { name: 'Products List', url: '/api/products?limit=20', method: 'GET' },
    { name: 'Customers List', url: '/api/customers?limit=20', method: 'GET' },
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    console.log(`\n🧪 Testing: ${endpoint.name}`);
    console.log(`   URL: ${endpoint.method} ${endpoint.url}`);
    console.log('-'.repeat(40));
    
    const testResults = [];
    
    // Run 5 iterations
    for (let i = 0; i < 5; i++) {
      const result = await makeAuthenticatedRequest(endpoint.url, endpoint.method);
      testResults.push(result);
      
      const status = result.success ? '✅' : '❌';
      const timeColor = result.duration > 1000 ? '🔴' : result.duration > 500 ? '🟡' : '🟢';
      
      if (result.success) {
        console.log(`   ${status} ${i + 1}/5: ${timeColor} ${result.duration}ms (${result.status})`);
        
        // Show first few chars of response
        if (result.status === 200) {
          console.log(`       Response: ${result.data}...`);
        }
      } else {
        console.log(`   ${status} ${i + 1}/5: ${timeColor} ${result.duration}ms - ${result.error}`);
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    results.push({
      endpoint: endpoint.name,
      results: testResults
    });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 PERFORMANCE SUMMARY');
  console.log('=' .repeat(60));
  
  for (const { endpoint, results: testResults } of results) {
    const successfulResults = testResults.filter(r => r.success);
    const failedResults = testResults.filter(r => !r.success);
    
    console.log(`\n🎯 ${endpoint}:`);
    
    if (successfulResults.length > 0) {
      const avgDuration = Math.round(
        successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length
      );
      const minDuration = Math.min(...successfulResults.map(r => r.duration));
      const maxDuration = Math.max(...successfulResults.map(r => r.duration));
      
      console.log(`   ✅ Successful: ${successfulResults.length}/${testResults.length}`);
      console.log(`   ⏱️  Average: ${avgDuration}ms`);
      console.log(`   🚀 Fastest: ${minDuration}ms`);
      console.log(`   🐌 Slowest: ${maxDuration}ms`);
      
      // Status distribution
      const statusCounts = successfulResults.reduce((counts, r) => {
        counts[r.status] = (counts[r.status] || 0) + 1;
        return counts;
      }, {});
      
      console.log(`   📊 Status codes: ${Object.entries(statusCounts).map(([code, count]) => `${code}(${count})`).join(', ')}`);
    }
    
    if (failedResults.length > 0) {
      console.log(`   ❌ Failed: ${failedResults.length}/${testResults.length}`);
    }
  }
  
  // Overall assessment
  const totalResults = results.flatMap(r => r.results);
  const totalSuccessful = totalResults.filter(r => r.success).length;
  const authErrors = totalResults.filter(r => r.success && r.status === 401).length;
  const successWithData = totalResults.filter(r => r.success && r.status === 200).length;
  
  console.log('\n💡 ASSESSMENT:');
  console.log('-'.repeat(40));
  console.log(`📊 Total Requests: ${totalResults.length}`);
  console.log(`✅ Successful: ${totalSuccessful} (${((totalSuccessful / totalResults.length) * 100).toFixed(1)}%)`);
  console.log(`🔐 Auth Required: ${authErrors} (${((authErrors / totalResults.length) * 100).toFixed(1)}%)`);
  console.log(`📊 Data Retrieved: ${successWithData} (${((successWithData / totalResults.length) * 100).toFixed(1)}%)`);
  
  if (authErrors > 0) {
    console.log('\n🔐 AUTHENTICATION REQUIRED:');
    console.log('   • API endpoints require valid authentication');
    console.log('   • Update AUTH_TOKEN in this script with a valid token');
    console.log('   • Get token by logging in via API: POST /api/auth/login');
  }
  
  if (successWithData > 0) {
    const dataResults = totalResults.filter(r => r.success && r.status === 200);
    const avgDataResponseTime = Math.round(
      dataResults.reduce((sum, r) => sum + r.duration, 0) / dataResults.length
    );
    
    console.log(`\n⏱️  Average Response Time (with data): ${avgDataResponseTime}ms`);
    
    if (avgDataResponseTime < 200) {
      console.log('🟢 Excellent response time!');
    } else if (avgDataResponseTime < 500) {
      console.log('🟡 Good response time');
    } else {
      console.log('🔴 Slow response time - consider optimization');
    }
  }
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('-'.repeat(40));
  console.log('1. If authentication is working, proceed with full stress tests');
  console.log('2. For stress testing with 1M orders:');
  console.log('   ./stress-tests/run-stress-tests.sh');
  console.log('3. For generating massive test data:');
  console.log('   node scripts/generate-massive-test-data.js');
}

async function main() {
  try {
    await testAuthenticatedEndpoints();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  main();
}

module.exports = { testAuthenticatedEndpoints };
