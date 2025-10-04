#!/usr/bin/env node

/**
 * Database Stress Test
 * Tests database performance under high load with 100k+ records
 */

const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

const prisma = new PrismaClient();

// Test configurations
const STRESS_CONFIGS = {
  concurrent_users: [1, 5, 10, 20, 50],
  query_volumes: [100, 500, 1000, 5000, 10000],
  record_limits: [10, 50, 100, 500, 1000]
};

/**
 * Simulate concurrent users making queries
 */
async function simulateConcurrentUsers(userCount, queryCount) {
  console.log(`👥 Simulating ${userCount} concurrent users, ${queryCount} queries each`);
  
  const startTime = performance.now();
  const promises = [];
  
  for (let user = 0; user < userCount; user++) {
    const userPromises = [];
    
    for (let query = 0; query < queryCount; query++) {
      const queryPromise = prisma.order.findMany({
        where: {
          status: 'ACTIVE'
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
      
      userPromises.push(queryPromise);
    }
    
    promises.push(Promise.all(userPromises));
  }
  
  try {
    await Promise.all(promises);
    const endTime = performance.now();
    const totalDuration = Math.round(endTime - startTime);
    const totalQueries = userCount * queryCount;
    const avgQueryTime = Math.round(totalDuration / totalQueries);
    
    return {
      success: true,
      userCount,
      queryCount,
      totalQueries,
      totalDuration,
      avgQueryTime,
      queriesPerSecond: Math.round(totalQueries / (totalDuration / 1000))
    };
  } catch (error) {
    const endTime = performance.now();
    return {
      success: false,
      userCount,
      queryCount,
      totalDuration: Math.round(endTime - startTime),
      error: error.message
    };
  }
}

/**
 * Test database connection pool under load
 */
async function testConnectionPool() {
  console.log('\n🔗 Testing Database Connection Pool');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const userCount of STRESS_CONFIGS.concurrent_users) {
    const result = await simulateConcurrentUsers(userCount, 10);
    results.push(result);
    
    const status = result.success ? '✅' : '❌';
    const qps = result.success ? result.queriesPerSecond : 0;
    
    console.log(`${status} ${userCount} users: ${result.totalDuration}ms total, ${qps} QPS`);
    
    if (result.success) {
      console.log(`   Average query time: ${result.avgQueryTime}ms`);
    } else {
      console.log(`   Error: ${result.error}`);
    }
  }
  
  return results;
}

/**
 * Test query performance with different record limits
 */
async function testRecordLimits() {
  console.log('\n📊 Testing Different Record Limits');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const limit of STRESS_CONFIGS.record_limits) {
    const startTime = performance.now();
    
    try {
      const orders = await prisma.order.findMany({
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          outlet: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
      
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      const result = {
        success: true,
        limit,
        duration,
        recordCount: orders.length
      };
      
      results.push(result);
      
      const timeColor = duration > 1000 ? '🔴' : duration > 500 ? '🟡' : '🟢';
      console.log(`${timeColor} Limit ${limit}: ${duration}ms (${orders.length} records)`);
      
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      results.push({
        success: false,
        limit,
        duration,
        error: error.message
      });
      
      console.log(`❌ Limit ${limit}: ${duration}ms - ${error.message}`);
    }
  }
  
  return results;
}

/**
 * Test memory usage under load
 */
async function testMemoryUsage() {
  console.log('\n💾 Testing Memory Usage');
  console.log('=' .repeat(50));
  
  const results = [];
  
  // Get initial memory usage
  const initialMemory = process.memoryUsage();
  
  // Run heavy queries
  const heavyQueries = [];
  for (let i = 0; i < 100; i++) {
    heavyQueries.push(
      prisma.order.findMany({
        include: {
          customer: true,
          outlet: true,
          orderItems: {
            include: {
              product: true
            }
          },
          payments: true
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
    );
  }
  
  try {
    const startTime = performance.now();
    await Promise.all(heavyQueries);
    const endTime = performance.now();
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    const result = {
      success: true,
      duration: Math.round(endTime - startTime),
      initialMemory: Math.round(initialMemory.heapUsed / 1024 / 1024),
      finalMemory: Math.round(finalMemory.heapUsed / 1024 / 1024),
      memoryIncrease: Math.round(memoryIncrease / 1024 / 1024),
      queriesCount: heavyQueries.length
    };
    
    results.push(result);
    
    console.log(`✅ Heavy queries completed: ${result.duration}ms`);
    console.log(`   Initial memory: ${result.initialMemory}MB`);
    console.log(`   Final memory: ${result.finalMemory}MB`);
    console.log(`   Memory increase: ${result.memoryIncrease}MB`);
    
  } catch (error) {
    console.log(`❌ Memory test failed: ${error.message}`);
    results.push({
      success: false,
      error: error.message
    });
  }
  
  return results;
}

/**
 * Test database transaction performance
 */
async function testTransactionPerformance() {
  console.log('\n🔄 Testing Transaction Performance');
  console.log('=' .repeat(50));
  
  const results = [];
  
  // Test single transaction
  const singleTransaction = async () => {
    return await prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: { status: 'ACTIVE' },
        take: 10,
        select: { id: true, orderNumber: true }
      });
      
      return orders.length;
    });
  };
  
  // Test multiple transactions
  const multipleTransactions = async (count) => {
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(singleTransaction());
    }
    return await Promise.all(promises);
  };
  
  const transactionTests = [
    { name: 'Single Transaction', fn: singleTransaction },
    { name: '10 Concurrent Transactions', fn: () => multipleTransactions(10) },
    { name: '50 Concurrent Transactions', fn: () => multipleTransactions(50) },
    { name: '100 Concurrent Transactions', fn: () => multipleTransactions(100) }
  ];
  
  for (const test of transactionTests) {
    const startTime = performance.now();
    
    try {
      const result = await test.fn();
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      results.push({
        success: true,
        name: test.name,
        duration,
        result
      });
      
      console.log(`✅ ${test.name}: ${duration}ms`);
      
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      results.push({
        success: false,
        name: test.name,
        duration,
        error: error.message
      });
      
      console.log(`❌ ${test.name}: ${duration}ms - ${error.message}`);
    }
  }
  
  return results;
}

/**
 * Test query timeout scenarios
 */
async function testQueryTimeouts() {
  console.log('\n⏰ Testing Query Timeouts');
  console.log('=' .repeat(50));
  
  const results = [];
  
  // Test very large queries
  const largeQueryTests = [
    {
      name: 'Large Select (No Limit)',
      query: () => prisma.order.findMany({
        select: { id: true, orderNumber: true }
      })
    },
    {
      name: 'Complex Join Query',
      query: () => prisma.order.findMany({
        include: {
          customer: true,
          outlet: true,
          orderItems: {
            include: {
              product: true
            }
          },
          payments: true
        },
        take: 1000
      })
    },
    {
      name: 'Aggregate Query',
      query: () => prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
        _sum: { totalAmount: true }
      })
    }
  ];
  
  for (const test of largeQueryTests) {
    const startTime = performance.now();
    
    try {
      const result = await test.query();
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      results.push({
        success: true,
        name: test.name,
        duration,
        recordCount: Array.isArray(result) ? result.length : 1
      });
      
      const timeColor = duration > 10000 ? '🔴' : duration > 5000 ? '🟡' : '🟢';
      console.log(`${timeColor} ${test.name}: ${duration}ms`);
      
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      results.push({
        success: false,
        name: test.name,
        duration,
        error: error.message
      });
      
      console.log(`❌ ${test.name}: ${duration}ms - ${error.message}`);
    }
  }
  
  return results;
}

/**
 * Run all stress tests
 */
async function runStressTests() {
  console.log('🚀 Starting Database Stress Tests');
  console.log('=' .repeat(60));
  
  const startTime = performance.now();
  
  try {
    // Check database size
    const dbStats = await prisma.order.count();
    console.log(`📊 Database: ${dbStats.toLocaleString()} orders\n`);
    
    if (dbStats < 1000) {
      console.log('⚠️  Warning: Database has less than 1000 orders.');
      console.log('   For accurate stress testing, consider generating more data:');
      console.log('   node scripts/generate-large-test-data.js');
    }
    
    // Run all stress tests
    const allResults = [
      ...(await testConnectionPool()),
      ...(await testRecordLimits()),
      ...(await testMemoryUsage()),
      ...(await testTransactionPerformance()),
      ...(await testQueryTimeouts())
    ];
    
    const endTime = performance.now();
    const totalDuration = Math.round(endTime - startTime);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 STRESS TEST SUMMARY');
    console.log('=' .repeat(60));
    
    const successfulTests = allResults.filter(r => r.success);
    const failedTests = allResults.filter(r => !r.success);
    
    console.log(`✅ Successful tests: ${successfulTests.length}/${allResults.length}`);
    console.log(`⏱️  Total test time: ${totalDuration}ms`);
    
    if (failedTests.length > 0) {
      console.log(`\n❌ Failed tests: ${failedTests.length}`);
      failedTests.forEach(test => {
        console.log(`   - ${test.name || 'Unknown'}: ${test.error}`);
      });
    }
    
    // Performance analysis
    console.log('\n💡 PERFORMANCE ANALYSIS');
    console.log('-'.repeat(40));
    
    const slowTests = successfulTests.filter(r => r.duration > 5000);
    if (slowTests.length > 0) {
      console.log('🔴 Slow operations detected (>5000ms):');
      slowTests.forEach(test => {
        console.log(`   - ${test.name || 'Unknown'}: ${test.duration}ms`);
      });
    }
    
    const memoryTests = allResults.filter(r => r.memoryIncrease);
    if (memoryTests.length > 0) {
      const maxMemoryIncrease = Math.max(...memoryTests.map(r => r.memoryIncrease || 0));
      console.log(`💾 Max memory increase: ${maxMemoryIncrease}MB`);
      
      if (maxMemoryIncrease > 100) {
        console.log('⚠️  High memory usage detected. Consider:');
        console.log('   • Implementing query result streaming');
        console.log('   • Adding connection pooling limits');
        console.log('   • Optimizing query memory usage');
      }
    }
    
    // Vercel compatibility
    console.log('\n🚀 VERCEL COMPATIBILITY ASSESSMENT');
    console.log('-'.repeat(40));
    
    const timeoutTests = successfulTests.filter(r => r.duration > 10000);
    const timeoutCount = timeoutTests.length;
    
    if (timeoutCount === 0) {
      console.log('🟢 All tests completed within Vercel limits');
      console.log('✅ Ready for production deployment');
    } else {
      console.log(`🔴 ${timeoutCount} operations exceed Vercel timeout limits`);
      console.log('⚠️  Consider:');
      console.log('   • Upgrading to Enterprise plan');
      console.log('   • Implementing query optimization');
      console.log('   • Using background job processing');
      console.log('   • Implementing data pagination');
    }
    
  } catch (error) {
    console.error('❌ Stress test suite failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run stress tests
if (require.main === module) {
  runStressTests();
}

module.exports = {
  testConnectionPool,
  testRecordLimits,
  testMemoryUsage,
  testTransactionPerformance,
  testQueryTimeouts,
  runStressTests
};
