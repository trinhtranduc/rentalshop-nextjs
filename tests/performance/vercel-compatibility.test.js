#!/usr/bin/env node

/**
 * Vercel Compatibility Test
 * Tests specific Vercel limitations and requirements
 */

const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

const prisma = new PrismaClient();

// Vercel limits by plan
const VERCEL_LIMITS = {
  hobby: {
    timeout: 10000,      // 10 seconds
    memory: 1024,        // 1GB
    concurrent: 10,      // estimated
    description: 'Hobby Plan'
  },
  pro: {
    timeout: 60000,      // 60 seconds
    memory: 1024,        // 1GB
    concurrent: 50,      // estimated
    description: 'Pro Plan'
  },
  enterprise: {
    timeout: 900000,     // 900 seconds (15 minutes)
    memory: 3008,        // 3GB
    concurrent: 100,     // estimated
    description: 'Enterprise Plan'
  }
};

/**
 * Test function timeout limits
 */
async function testTimeoutLimits() {
  console.log('⏰ Testing Function Timeout Limits');
  console.log('=' .repeat(50));
  
  const results = [];
  
  // Test scenarios that might cause timeouts
  const timeoutTests = [
    {
      name: 'Large Dataset Query (10k records)',
      query: () => prisma.order.findMany({
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10000
      }),
      expectedTime: 2000
    },
    {
      name: 'Complex Join Query (1k records)',
      query: () => prisma.order.findMany({
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          outlet: {
            select: {
              id: true,
              name: true
            }
          },
          orderItems: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              product: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 1000
      }),
      expectedTime: 1500
    },
    {
      name: 'Aggregate Query',
      query: () => prisma.order.groupBy({
        by: ['status', 'orderType'],
        _count: { status: true },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true }
      }),
      expectedTime: 1000
    },
    {
      name: 'Text Search Query',
      query: () => prisma.order.findMany({
        where: {
          OR: [
            { orderNumber: { contains: 'ORD' } },
            { customer: { firstName: { contains: 'John' } } },
            { customer: { lastName: { contains: 'Doe' } } }
          ]
        },
        select: {
          id: true,
          orderNumber: true,
          customer: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 500
      }),
      expectedTime: 800
    }
  ];
  
  for (const test of timeoutTests) {
    const startTime = performance.now();
    
    try {
      const result = await test.query();
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      const testResult = {
        success: true,
        name: test.name,
        duration,
        expectedTime: test.expectedTime,
        recordCount: Array.isArray(result) ? result.length : 1
      };
      
      results.push(testResult);
      
      // Check compatibility with each plan
      const hobbyCompatible = duration < VERCEL_LIMITS.hobby.timeout;
      const proCompatible = duration < VERCEL_LIMITS.pro.timeout;
      const enterpriseCompatible = duration < VERCEL_LIMITS.enterprise.timeout;
      
      const status = duration <= test.expectedTime ? '✅' : '⚠️';
      console.log(`${status} ${test.name}: ${duration}ms`);
      console.log(`   Records: ${testResult.recordCount}`);
      console.log(`   Hobby: ${hobbyCompatible ? '✅' : '❌'} | Pro: ${proCompatible ? '✅' : '❌'} | Enterprise: ${enterpriseCompatible ? '✅' : '❌'}`);
      
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
 * Test memory usage limits
 */
async function testMemoryLimits() {
  console.log('\n💾 Testing Memory Usage Limits');
  console.log('=' .repeat(50));
  
  const results = [];
  
  // Get initial memory usage
  const initialMemory = process.memoryUsage();
  console.log(`Initial memory: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
  
  // Test memory-intensive operations
  const memoryTests = [
    {
      name: 'Large Result Set (5k orders)',
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
        orderBy: { createdAt: 'desc' },
        take: 5000
      })
    },
    {
      name: 'Multiple Concurrent Queries',
      query: async () => {
        const promises = [];
        for (let i = 0; i < 20; i++) {
          promises.push(
            prisma.order.findMany({
              include: {
                customer: true,
                outlet: true
              },
              take: 100
            })
          );
        }
        return await Promise.all(promises);
      }
    },
    {
      name: 'Deep Nested Query',
      query: () => prisma.order.findMany({
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              orders: {
                select: {
                  id: true,
                  orderNumber: true,
                  orderItems: {
                    select: {
                      id: true,
                      quantity: true,
                      product: {
                        select: {
                          id: true,
                          name: true,
                          outletStock: true
                        }
                      }
                    }
                  }
                },
                take: 5
              }
            }
          },
          outlet: {
            select: {
              id: true,
              name: true,
              products: {
                select: {
                  id: true,
                  name: true
                },
                take: 10
              }
            }
          }
        },
        take: 100
      })
    }
  ];
  
  for (const test of memoryTests) {
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage();
    
    try {
      const result = await test.query();
      const endTime = performance.now();
      const memoryAfter = process.memoryUsage();
      
      const duration = Math.round(endTime - startTime);
      const memoryUsed = Math.round((memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024);
      const totalMemory = Math.round(memoryAfter.heapUsed / 1024 / 1024);
      
      const testResult = {
        success: true,
        name: test.name,
        duration,
        memoryUsed,
        totalMemory,
        recordCount: Array.isArray(result) ? result.length : 1
      };
      
      results.push(testResult);
      
      // Check memory compatibility
      const hobbyCompatible = totalMemory < VERCEL_LIMITS.hobby.memory;
      const proCompatible = totalMemory < VERCEL_LIMITS.pro.memory;
      const enterpriseCompatible = totalMemory < VERCEL_LIMITS.enterprise.memory;
      
      const status = memoryUsed < 100 ? '✅' : memoryUsed < 200 ? '⚠️' : '❌';
      console.log(`${status} ${test.name}: ${duration}ms`);
      console.log(`   Memory used: ${memoryUsed}MB, Total: ${totalMemory}MB`);
      console.log(`   Hobby: ${hobbyCompatible ? '✅' : '❌'} | Pro: ${proCompatible ? '✅' : '❌'} | Enterprise: ${enterpriseCompatible ? '✅' : '❌'}`);
      
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
 * Test cold start performance
 */
async function testColdStartPerformance() {
  console.log('\n❄️ Testing Cold Start Performance');
  console.log('=' .repeat(50));
  
  const results = [];
  
  // Simulate cold start by creating new Prisma client
  const coldStartTests = [
    {
      name: 'Database Connection',
      query: async () => {
        const newPrisma = new PrismaClient();
        await newPrisma.$connect();
        const result = await newPrisma.order.count();
        await newPrisma.$disconnect();
        return result;
      }
    },
    {
      name: 'First Query After Connection',
      query: async () => {
        const newPrisma = new PrismaClient();
        await newPrisma.$connect();
        const result = await newPrisma.order.findMany({
          take: 1,
          select: { id: true }
        });
        await newPrisma.$disconnect();
        return result.length;
      }
    },
    {
      name: 'Complex Query After Connection',
      query: async () => {
        const newPrisma = new PrismaClient();
        await newPrisma.$connect();
        const result = await newPrisma.order.findMany({
          include: {
            customer: true,
            outlet: true
          },
          take: 10
        });
        await newPrisma.$disconnect();
        return result.length;
      }
    }
  ];
  
  for (const test of coldStartTests) {
    const startTime = performance.now();
    
    try {
      const result = await test.query();
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      results.push({
        success: true,
        name: test.name,
        duration,
        result
      });
      
      const status = duration < 1000 ? '✅' : duration < 3000 ? '⚠️' : '❌';
      console.log(`${status} ${test.name}: ${duration}ms`);
      
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
 * Test concurrent request handling
 */
async function testConcurrentRequests() {
  console.log('\n🔄 Testing Concurrent Request Handling');
  console.log('=' .repeat(50));
  
  const results = [];
  
  // Test different levels of concurrency
  const concurrencyLevels = [1, 5, 10, 20, 50];
  
  for (const level of concurrencyLevels) {
    console.log(`\nTesting ${level} concurrent requests...`);
    
    const startTime = performance.now();
    const promises = [];
    
    for (let i = 0; i < level; i++) {
      const promise = prisma.order.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
      promises.push(promise);
    }
    
    try {
      const results_array = await Promise.all(promises);
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      const avgResponseTime = Math.round(duration / level);
      
      const result = {
        success: true,
        concurrency: level,
        totalDuration: duration,
        avgResponseTime,
        totalRequests: level,
        successfulRequests: results_array.length
      };
      
      results.push(result);
      
      const status = avgResponseTime < 1000 ? '✅' : avgResponseTime < 3000 ? '⚠️' : '❌';
      console.log(`${status} ${level} requests: ${duration}ms total, ${avgResponseTime}ms avg`);
      
      // Check if this level exceeds Vercel concurrent limits
      const hobbyOk = level <= VERCEL_LIMITS.hobby.concurrent;
      const proOk = level <= VERCEL_LIMITS.pro.concurrent;
      const enterpriseOk = level <= VERCEL_LIMITS.enterprise.concurrent;
      
      console.log(`   Hobby: ${hobbyOk ? '✅' : '❌'} | Pro: ${proOk ? '✅' : '❌'} | Enterprise: ${enterpriseOk ? '✅' : '❌'}`);
      
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      results.push({
        success: false,
        concurrency: level,
        totalDuration: duration,
        error: error.message
      });
      
      console.log(`❌ ${level} requests: ${duration}ms - ${error.message}`);
    }
  }
  
  return results;
}

/**
 * Generate Vercel deployment recommendations
 */
function generateRecommendations(results) {
  console.log('\n💡 VERCEL DEPLOYMENT RECOMMENDATIONS');
  console.log('=' .repeat(50));
  
  // Analyze timeout results
  const timeoutResults = results.filter(r => r.name && r.duration);
  const slowQueries = timeoutResults.filter(r => r.duration > 5000);
  const verySlowQueries = timeoutResults.filter(r => r.duration > 10000);
  
  // Analyze memory results
  const memoryResults = results.filter(r => r.totalMemory);
  const highMemoryQueries = memoryResults.filter(r => r.totalMemory > 500);
  const veryHighMemoryQueries = memoryResults.filter(r => r.totalMemory > 1000);
  
  // Analyze concurrency results
  const concurrencyResults = results.filter(r => r.concurrency);
  const slowConcurrency = concurrencyResults.filter(r => r.avgResponseTime > 3000);
  
  console.log('\n📊 ANALYSIS:');
  
  if (verySlowQueries.length > 0) {
    console.log(`🔴 ${verySlowQueries.length} queries exceed 10-second timeout:`);
    verySlowQueries.forEach(q => {
      console.log(`   - ${q.name}: ${q.duration}ms`);
    });
    console.log('\n   ❌ Hobby Plan: NOT RECOMMENDED');
    console.log('   ⚠️  Pro Plan: RISKY');
    console.log('   ✅ Enterprise Plan: OK');
  } else if (slowQueries.length > 0) {
    console.log(`🟡 ${slowQueries.length} queries are slow (5-10 seconds):`);
    slowQueries.forEach(q => {
      console.log(`   - ${q.name}: ${q.duration}ms`);
    });
    console.log('\n   ❌ Hobby Plan: NOT RECOMMENDED');
    console.log('   ✅ Pro Plan: OK');
    console.log('   ✅ Enterprise Plan: OK');
  } else {
    console.log('🟢 All queries complete within 5 seconds');
    console.log('\n   ✅ Hobby Plan: OK');
    console.log('   ✅ Pro Plan: OK');
    console.log('   ✅ Enterprise Plan: OK');
  }
  
  if (veryHighMemoryQueries.length > 0) {
    console.log(`\n🔴 ${veryHighMemoryQueries.length} queries use >1GB memory:`);
    veryHighMemoryQueries.forEach(q => {
      console.log(`   - ${q.name}: ${q.totalMemory}MB`);
    });
    console.log('\n   ⚠️  Consider optimizing queries or upgrading plan');
  } else if (highMemoryQueries.length > 0) {
    console.log(`\n🟡 ${highMemoryQueries.length} queries use >500MB memory`);
    console.log('   ⚠️  Monitor memory usage in production');
  } else {
    console.log('\n🟢 Memory usage is within acceptable limits');
  }
  
  // Final recommendations
  console.log('\n🎯 FINAL RECOMMENDATIONS:');
  console.log('-'.repeat(30));
  
  if (verySlowQueries.length > 0 || veryHighMemoryQueries.length > 0) {
    console.log('🏢 RECOMMENDED: Enterprise Plan');
    console.log('   • 15-minute timeout limit');
    console.log('   • 3GB memory limit');
    console.log('   • Better performance guarantees');
  } else if (slowQueries.length > 0 || highMemoryQueries.length > 0) {
    console.log('💼 RECOMMENDED: Pro Plan');
    console.log('   • 60-second timeout limit');
    console.log('   • 1GB memory limit');
    console.log('   • Cost-effective for most use cases');
  } else {
    console.log('🆓 RECOMMENDED: Hobby Plan');
    console.log('   • 10-second timeout limit');
    console.log('   • 1GB memory limit');
    console.log('   • Perfect for small to medium datasets');
  }
  
  console.log('\n🚀 OPTIMIZATION TIPS:');
  console.log('-'.repeat(30));
  console.log('• Use database indexes for frequently queried fields');
  console.log('• Implement pagination for large datasets');
  console.log('• Use cursor-based pagination for better performance');
  console.log('• Consider query caching for repeated requests');
  console.log('• Optimize SELECT statements (avoid SELECT *)');
  console.log('• Use database connection pooling');
  console.log('• Monitor query performance in production');
}

/**
 * Run all Vercel compatibility tests
 */
async function runVercelCompatibilityTests() {
  console.log('🚀 Starting Vercel Compatibility Tests');
  console.log('=' .repeat(60));
  
  const startTime = performance.now();
  
  try {
    // Check database
    const dbStats = await prisma.order.count();
    console.log(`📊 Database: ${dbStats.toLocaleString()} orders\n`);
    
    // Run all tests
    const allResults = [
      ...(await testTimeoutLimits()),
      ...(await testMemoryLimits()),
      ...(await testColdStartPerformance()),
      ...(await testConcurrentRequests())
    ];
    
    const endTime = performance.now();
    const totalDuration = Math.round(endTime - startTime);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 VERCEL COMPATIBILITY SUMMARY');
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
    
    // Generate recommendations
    generateRecommendations(allResults);
    
  } catch (error) {
    console.error('❌ Vercel compatibility test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
if (require.main === module) {
  runVercelCompatibilityTests();
}

module.exports = {
  testTimeoutLimits,
  testMemoryLimits,
  testColdStartPerformance,
  testConcurrentRequests,
  generateRecommendations,
  runVercelCompatibilityTests
};
