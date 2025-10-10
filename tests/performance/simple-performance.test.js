#!/usr/bin/env node

/**
 * Simple Performance Test
 * Tests basic database performance without complex imports
 */

const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

const prisma = new PrismaClient();

// Test configurations
const TEST_SCENARIOS = [
  { name: 'Basic Query (20 records)', limit: 20 },
  { name: 'Medium Query (100 records)', limit: 100 },
  { name: 'Large Query (1000 records)', limit: 1000 }
];

const QUERY_TYPES = [
  {
    name: 'Basic Select',
    query: (limit) => prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  },
  {
    name: 'With Customer Join',
    query: (limit) => prisma.order.findMany({
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
            lastName: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  },
  {
    name: 'With Outlet Join',
    query: (limit) => prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        outlet: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  },
  {
    name: 'Filtered by Status',
    query: (limit) => prisma.order.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  },
  {
    name: 'Date Range Filter',
    query: (limit) => prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-12-31')
        }
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  },
  {
    name: 'Text Search',
    query: (limit) => prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: 'ORD' } },
          { customer: { firstName: { contains: 'John' } } }
        ]
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }
];

async function measureQuery(name, queryFn) {
  const start = performance.now();
  
  try {
    const result = await queryFn();
    const end = performance.now();
    const duration = Math.round(end - start);
    
    return {
      success: true,
      name,
      duration,
      recordCount: result.length
    };
  } catch (error) {
    const end = performance.now();
    const duration = Math.round(end - start);
    
    return {
      success: false,
      name,
      duration,
      error: error.message
    };
  }
}

async function testBasicPerformance() {
  console.log('🚀 Starting Simple Performance Tests');
  console.log('=' .repeat(60));
  
  // Check database
  const dbStats = await prisma.order.count();
  console.log(`📊 Database: ${dbStats.toLocaleString()} orders\n`);
  
  if (dbStats === 0) {
    console.log('❌ No orders found. Please seed some data first.');
    return;
  }
  
  const results = [];
  
  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log('-'.repeat(40));
    
    for (const queryType of QUERY_TYPES) {
      const result = await measureQuery(
        `${queryType.name} (${scenario.limit} records)`,
        () => queryType.query(scenario.limit)
      );
      
      results.push(result);
      
      const status = result.success ? '✅' : '❌';
      const timeColor = result.duration > 1000 ? '🔴' : result.duration > 500 ? '🟡' : '🟢';
      
      console.log(`${status} ${queryType.name}: ${timeColor} ${result.duration}ms`);
      
      if (result.success) {
        console.log(`   Records: ${result.recordCount}`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 PERFORMANCE SUMMARY');
  console.log('=' .repeat(60));
  
  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  
  console.log(`✅ Successful tests: ${successfulTests.length}/${results.length}`);
  
  if (successfulTests.length > 0) {
    const avgDuration = Math.round(
      successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length
    );
    const maxDuration = Math.max(...successfulTests.map(r => r.duration));
    const minDuration = Math.min(...successfulTests.map(r => r.duration));
    
    console.log(`⏱️  Average duration: ${avgDuration}ms`);
    console.log(`🚀 Fastest query: ${minDuration}ms`);
    console.log(`🐌 Slowest query: ${maxDuration}ms`);
  }
  
  if (failedTests.length > 0) {
    console.log(`\n❌ Failed tests: ${failedTests.length}`);
    failedTests.forEach(test => {
      console.log(`   - ${test.name}: ${test.error}`);
    });
  }
  
  // Vercel compatibility
  console.log('\n🚀 VERCEL COMPATIBILITY');
  console.log('-'.repeat(40));
  
  const vercelLimits = [
    { plan: 'Hobby', timeout: 10000 },
    { plan: 'Pro', timeout: 60000 },
    { plan: 'Enterprise', timeout: 900000 }
  ];
  
  vercelLimits.forEach(plan => {
    const compatibleQueries = successfulTests.filter(r => r.duration < plan.timeout);
    const compatibility = Math.round((compatibleQueries.length / successfulTests.length) * 100);
    
    console.log(`${plan.plan} Plan: ${compatibility}% compatible (${compatibleQueries.length}/${successfulTests.length} queries)`);
  });
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('-'.repeat(40));
  
  const slowQueries = successfulTests.filter(r => r.duration > 1000);
  if (slowQueries.length > 0) {
    console.log('🔴 Slow queries detected (>1000ms):');
    slowQueries.forEach(q => {
      console.log(`   - ${q.name}: ${q.duration}ms`);
    });
    console.log('\n   Consider:');
    console.log('   • Adding database indexes');
    console.log('   • Optimizing query structure');
    console.log('   • Implementing pagination');
  } else {
    console.log('🟢 All queries are performing well!');
    console.log('✅ Ready for production deployment');
  }
}

async function main() {
  try {
    await testBasicPerformance();
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  main();
}

module.exports = { testBasicPerformance };
