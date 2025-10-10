#!/usr/bin/env node

/**
 * Basic API Performance Test
 * Tests API endpoints without complex dependencies
 */

const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_ENDPOINTS = [
  {
    name: 'Health Check',
    url: '/api/health',
    method: 'GET'
  },
  {
    name: 'Orders List (No Auth)',
    url: '/api/orders?limit=5',
    method: 'GET'
  },
  {
    name: 'Products List',
    url: '/api/products?limit=5',
    method: 'GET'
  },
  {
    name: 'Customers List',
    url: '/api/customers?limit=5',
    method: 'GET'
  }
];

async function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    
    const url = new URL(BASE_URL + endpoint.url);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Performance-Test/1.0'
      },
      timeout: 10000 // 10 second timeout
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
          data: data.substring(0, 200) // First 200 chars
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

    req.end();
  });
}

async function testEndpoint(endpoint, iterations = 5) {
  console.log(`\n🧪 Testing: ${endpoint.name}`);
  console.log(`   URL: ${endpoint.method} ${endpoint.url}`);
  console.log(`   Iterations: ${iterations}`);
  console.log('-'.repeat(50));

  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const result = await makeRequest(endpoint);
    results.push(result);
    
    const status = result.success ? '✅' : '❌';
    const timeColor = result.duration > 1000 ? '🔴' : result.duration > 500 ? '🟡' : '🟢';
    
    if (result.success) {
      console.log(`   ${status} ${i + 1}/${iterations}: ${timeColor} ${result.duration}ms (${result.status})`);
    } else {
      console.log(`   ${status} ${i + 1}/${iterations}: ${timeColor} ${result.duration}ms - ${result.error}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

async function runBasicAPITest() {
  console.log('🚀 Basic API Performance Test');
  console.log('📊 Testing API endpoints without authentication');
  console.log('=' .repeat(60));
  
  const allResults = [];
  
  for (const endpoint of TEST_ENDPOINTS) {
    const results = await testEndpoint(endpoint, 3);
    allResults.push({
      endpoint: endpoint.name,
      results
    });
  }
  
  // Generate summary
  generateSummary(allResults);
}

function generateSummary(allResults) {
  console.log('\n' + '='.repeat(60));
  console.log('📈 PERFORMANCE SUMMARY');
  console.log('=' .repeat(60));
  
  for (const { endpoint, results } of allResults) {
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    
    console.log(`\n🎯 ${endpoint}:`);
    
    if (successfulResults.length > 0) {
      const avgDuration = Math.round(
        successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length
      );
      const minDuration = Math.min(...successfulResults.map(r => r.duration));
      const maxDuration = Math.max(...successfulResults.map(r => r.duration));
      
      console.log(`   ✅ Successful: ${successfulResults.length}/${results.length}`);
      console.log(`   ⏱️  Average: ${avgDuration}ms`);
      console.log(`   🚀 Fastest: ${minDuration}ms`);
      console.log(`   🐌 Slowest: ${maxDuration}ms`);
      
      // Status codes
      const statusCodes = successfulResults.map(r => r.status);
      const uniqueStatuses = [...new Set(statusCodes)];
      console.log(`   📊 Status codes: ${uniqueStatuses.join(', ')}`);
    }
    
    if (failedResults.length > 0) {
      console.log(`   ❌ Failed: ${failedResults.length}/${results.length}`);
      failedResults.forEach(failed => {
        console.log(`      - ${failed.error}`);
      });
    }
  }
  
  // Overall assessment
  console.log('\n💡 ASSESSMENT:');
  console.log('-'.repeat(40));
  
  const totalResults = allResults.flatMap(r => r.results);
  const totalSuccessful = totalResults.filter(r => r.success).length;
  const totalFailed = totalResults.filter(r => !r.success).length;
  
  console.log(`📊 Overall Success Rate: ${((totalSuccessful / totalResults.length) * 100).toFixed(1)}%`);
  
  if (totalFailed > 0) {
    console.log('🔴 Some endpoints failed - check server status');
  } else {
    console.log('🟢 All endpoints responded successfully');
  }
  
  const avgResponseTime = Math.round(
    totalResults
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.duration, 0) / totalSuccessful
  );
  
  console.log(`⏱️  Average Response Time: ${avgResponseTime}ms`);
  
  if (avgResponseTime < 200) {
    console.log('🟢 Excellent response time!');
  } else if (avgResponseTime < 500) {
    console.log('🟡 Good response time');
  } else if (avgResponseTime < 1000) {
    console.log('🟡 Acceptable response time');
  } else {
    console.log('🔴 Slow response time - consider optimization');
  }
  
  // Recommendations
  console.log('\n🚀 NEXT STEPS:');
  console.log('-'.repeat(40));
  console.log('1. If API is responding well, proceed with stress tests');
  console.log('2. If some endpoints failed, check authentication requirements');
  console.log('3. For stress testing with 1M orders, run:');
  console.log('   ./stress-tests/run-stress-tests.sh');
}

async function main() {
  try {
    await runBasicAPITest();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  main();
}

module.exports = { runBasicAPITest };
