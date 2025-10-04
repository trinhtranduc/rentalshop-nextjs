#!/usr/bin/env node

/**
 * Autocannon Stress Test for Order API
 * Simple but effective load testing
 */

const autocannon = require('autocannon');
const { performance } = require('perf_hooks');

// Test configurations
const TEST_CONFIGS = [
  {
    name: 'Light Load Test',
    connections: 10,
    duration: 30,
    description: '10 concurrent connections for 30 seconds'
  },
  {
    name: 'Medium Load Test',
    connections: 50,
    duration: 60,
    description: '50 concurrent connections for 60 seconds'
  },
  {
    name: 'Heavy Load Test',
    connections: 100,
    duration: 120,
    description: '100 concurrent connections for 120 seconds'
  },
  {
    name: 'Peak Load Test',
    connections: 200,
    duration: 180,
    description: '200 concurrent connections for 180 seconds'
  }
];

// API endpoints to test
const ENDPOINTS = [
  {
    name: 'Order Search',
    url: '/api/orders',
    method: 'GET',
    queries: [
      '?limit=20&offset=0',
      '?limit=50&offset=100',
      '?limit=100&offset=500',
      '?status=ACTIVE&limit=20',
      '?orderType=RENT&limit=30',
      '?startDate=2024-01-01&endDate=2024-12-31&limit=40'
    ]
  },
  {
    name: 'Order Details',
    url: '/api/orders',
    method: 'GET',
    queries: [
      '/1', '/2', '/3', '/4', '/5', '/10', '/15', '/20', '/25', '/30'
    ]
  }
];

async function runAutocannonTest(config, endpoint) {
  console.log(`\n🚀 Running: ${config.name}`);
  console.log(`📊 ${config.description}`);
  console.log(`🎯 Endpoint: ${endpoint.name}`);
  console.log('-'.repeat(50));
  
  const startTime = performance.now();
  
  // Create autocannon instance
  const instance = autocannon({
    url: `http://localhost:3000${endpoint.url}`,
    connections: config.connections,
    duration: config.duration,
    method: endpoint.method,
    requests: endpoint.queries.map(query => ({
      method: endpoint.method,
      path: `${endpoint.url}${query}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    }))
  });
  
  // Track results
  autocannon.track(instance, { renderProgressBar: true });
  
  // Wait for completion
  return new Promise((resolve, reject) => {
    instance.on('done', (result) => {
      const endTime = performance.now();
      const totalDuration = Math.round(endTime - startTime);
      
      console.log(`\n📈 Results for ${endpoint.name}:`);
      console.log(`⏱️  Duration: ${totalDuration}ms`);
      console.log(`📊 Requests: ${result.requests.total}`);
      console.log(`📊 Throughput: ${result.throughput.average} req/sec`);
      console.log(`📊 Latency (avg): ${result.latency.average}ms`);
      console.log(`📊 Latency (p95): ${result.latency.p95}ms`);
      console.log(`📊 Latency (p99): ${result.latency.p99}ms`);
      console.log(`❌ Errors: ${result.non2xx}`);
      console.log(`📊 Error Rate: ${((result.non2xx / result.requests.total) * 100).toFixed(2)}%`);
      
      // Performance assessment
      const avgLatency = result.latency.average;
      const p95Latency = result.latency.p95;
      const errorRate = (result.non2xx / result.requests.total) * 100;
      
      let performanceGrade = 'A';
      if (avgLatency > 1000 || p95Latency > 2000 || errorRate > 5) {
        performanceGrade = 'C';
      } else if (avgLatency > 500 || p95Latency > 1000 || errorRate > 2) {
        performanceGrade = 'B';
      }
      
      console.log(`🏆 Performance Grade: ${performanceGrade}`);
      
      resolve({
        config: config.name,
        endpoint: endpoint.name,
        duration: totalDuration,
        requests: result.requests.total,
        throughput: result.throughput.average,
        latency: {
          average: result.latency.average,
          p95: result.latency.p95,
          p99: result.latency.p99
        },
        errors: result.non2xx,
        errorRate: errorRate,
        grade: performanceGrade
      });
    });
    
    instance.on('error', (error) => {
      console.error(`❌ Test failed: ${error.message}`);
      reject(error);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting Autocannon Stress Tests');
  console.log('📊 Target: 1 Million Orders Dataset');
  console.log('=' .repeat(60));
  
  const allResults = [];
  
  for (const config of TEST_CONFIGS) {
    for (const endpoint of ENDPOINTS) {
      try {
        const result = await runAutocannonTest(config, endpoint);
        allResults.push(result);
        
        // Wait between tests
        console.log('\n⏳ Waiting 5 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.error(`❌ Test failed: ${config.name} - ${endpoint.name}`);
        console.error(`   Error: ${error.message}`);
      }
    }
  }
  
  // Generate summary report
  generateSummaryReport(allResults);
}

function generateSummaryReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📈 STRESS TEST SUMMARY REPORT');
  console.log('='.repeat(60));
  
  if (results.length === 0) {
    console.log('❌ No test results to report');
    return;
  }
  
  // Overall statistics
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.errorRate < 10).length;
  const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / results.length;
  const avgLatency = results.reduce((sum, r) => sum + r.latency.average, 0) / results.length;
  const avgP95Latency = results.reduce((sum, r) => sum + r.latency.p95, 0) / results.length;
  const avgErrorRate = results.reduce((sum, r) => sum + r.errorRate, 0) / results.length;
  
  console.log(`📊 Test Summary:`);
  console.log(`   • Total Tests: ${totalTests}`);
  console.log(`   • Successful Tests: ${successfulTests} (${((successfulTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`   • Average Throughput: ${avgThroughput.toFixed(2)} req/sec`);
  console.log(`   • Average Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`   • Average P95 Latency: ${avgP95Latency.toFixed(2)}ms`);
  console.log(`   • Average Error Rate: ${avgErrorRate.toFixed(2)}%`);
  
  // Performance grades
  const gradeCounts = results.reduce((counts, r) => {
    counts[r.grade] = (counts[r.grade] || 0) + 1;
    return counts;
  }, {});
  
  console.log(`\n🏆 Performance Grades:`);
  Object.entries(gradeCounts).forEach(([grade, count]) => {
    console.log(`   • Grade ${grade}: ${count} tests`);
  });
  
  // Best and worst performers
  const bestThroughput = results.reduce((best, r) => r.throughput > best.throughput ? r : best);
  const worstLatency = results.reduce((worst, r) => r.latency.average > worst.latency.average ? r : worst);
  
  console.log(`\n🚀 Best Performance:`);
  console.log(`   • Highest Throughput: ${bestThroughput.throughput.toFixed(2)} req/sec`);
  console.log(`   • Test: ${bestThroughput.config} - ${bestThroughput.endpoint}`);
  
  console.log(`\n🐌 Worst Performance:`);
  console.log(`   • Highest Latency: ${worstLatency.latency.average.toFixed(2)}ms`);
  console.log(`   • Test: ${worstLatency.config} - ${worstLatency.endpoint}`);
  
  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS:`);
  console.log('-'.repeat(40));
  
  if (avgLatency > 1000) {
    console.log('🔴 High latency detected (>1000ms average)');
    console.log('   • Consider database query optimization');
    console.log('   • Implement query caching');
    console.log('   • Add more database indexes');
  }
  
  if (avgErrorRate > 5) {
    console.log('🔴 High error rate detected (>5%)');
    console.log('   • Check server resources');
    console.log('   • Review error logs');
    console.log('   • Consider rate limiting');
  }
  
  if (avgThroughput < 50) {
    console.log('🟡 Low throughput detected (<50 req/sec)');
    console.log('   • Consider horizontal scaling');
    console.log('   • Optimize database connections');
    console.log('   • Review API implementation');
  }
  
  if (avgLatency < 500 && avgErrorRate < 2 && avgThroughput > 100) {
    console.log('🟢 Excellent performance!');
    console.log('   ✅ Ready for production deployment');
    console.log('   ✅ Can handle high load');
  }
  
  // Vercel compatibility assessment
  console.log(`\n🚀 VERCEL COMPATIBILITY:`);
  console.log('-'.repeat(40));
  
  const vercelCompatible = results.filter(r => 
    r.latency.average < 5000 && r.errorRate < 10
  );
  
  const compatibility = (vercelCompatible.length / results.length) * 100;
  
  console.log(`📊 Vercel Compatibility: ${compatibility.toFixed(1)}%`);
  
  if (compatibility >= 90) {
    console.log('🟢 Excellent Vercel compatibility');
  } else if (compatibility >= 70) {
    console.log('🟡 Good Vercel compatibility');
  } else {
    console.log('🔴 Poor Vercel compatibility');
    console.log('   • Consider optimizing for Vercel limits');
    console.log('   • Review timeout and memory usage');
  }
}

// Run the stress tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAutocannonTest,
  runAllTests,
  generateSummaryReport
};
