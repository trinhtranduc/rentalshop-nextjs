#!/usr/bin/env node

/**
 * Performance Test Script for Order Loading
 * Tests performance with various order counts and scenarios
 */

const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

const prisma = new PrismaClient();

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Small Dataset (100 orders)',
    limit: 100,
    expectedMaxTime: 500 // 500ms
  },
  {
    name: 'Medium Dataset (1000 orders)',
    limit: 1000,
    expectedMaxTime: 1000 // 1 second
  },
  {
    name: 'Large Dataset (10000 orders)',
    limit: 10000,
    expectedMaxTime: 3000 // 3 seconds
  },
  {
    name: 'Very Large Dataset (100000 orders)',
    limit: 100000,
    expectedMaxTime: 10000 // 10 seconds
  }
];

// Query types to test
const QUERY_TYPES = [
  {
    name: 'Basic List',
    query: (limit) => ({
      where: {},
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
  },
  {
    name: 'With Customer Join',
    query: (limit) => ({
      where: {},
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
  },
  {
    name: 'With Full Relations',
    query: (limit) => ({
      where: {},
      include: {
        customer: true,
        outlet: true,
        createdBy: true,
        orderItems: {
          include: {
            product: true
          }
        },
        payments: true
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
  },
  {
    name: 'Filtered by Status',
    query: (limit) => ({
      where: {
        status: 'ACTIVE'
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
  },
  {
    name: 'Date Range Filter',
    query: (limit) => ({
      where: {
        createdAt: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-12-31')
        }
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
  },
  {
    name: 'Text Search',
    query: (limit) => ({
      where: {
        OR: [
          { orderNumber: { contains: 'ORD' } },
          { customer: { firstName: { contains: 'John' } } }
        ]
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
  }
];

async function measureQuery(queryName, queryFn, recordCount) {
  const start = performance.now();
  
  try {
    const result = await queryFn();
    const end = performance.now();
    const duration = Math.round(end - start);
    
    return {
      success: true,
      duration,
      recordCount: Array.isArray(result) ? result.length : 1,
      queryName
    };
  } catch (error) {
    const end = performance.now();
    const duration = Math.round(end - start);
    
    return {
      success: false,
      duration,
      error: error.message,
      queryName
    };
  }
}

async function testDatabasePerformance() {
  console.log('🚀 Starting Order Performance Tests\n');
  console.log('=' .repeat(60));
  
  // Check current database size
  const totalOrders = await prisma.order.count();
  console.log(`📊 Current database: ${totalOrders.toLocaleString()} orders\n`);
  
  if (totalOrders === 0) {
    console.log('❌ No orders found in database. Please seed some data first.');
    return;
  }
  
  const results = [];
  
  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log('-'.repeat(40));
    
    for (const queryType of QUERY_TYPES) {
      const queryFn = () => prisma.order.findMany(queryType.query(scenario.limit));
      
      const result = await measureQuery(
        `${queryType.name} (${scenario.limit} records)`,
        queryFn,
        scenario.limit
      );
      
      results.push(result);
      
      const status = result.success ? '✅' : '❌';
      const timeColor = result.duration > scenario.expectedMaxTime ? '🔴' : '🟢';
      
      console.log(`${status} ${queryType.name}: ${timeColor} ${result.duration}ms`);
      
      if (!result.success) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.duration > scenario.expectedMaxTime) {
        console.log(`   ⚠️  Exceeds expected time of ${scenario.expectedMaxTime}ms`);
      }
      
      // Small delay between queries
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 PERFORMANCE SUMMARY');
  console.log('='.repeat(60));
  
  const successfulQueries = results.filter(r => r.success);
  const failedQueries = results.filter(r => !r.success);
  
  if (successfulQueries.length > 0) {
    const avgDuration = Math.round(
      successfulQueries.reduce((sum, r) => sum + r.duration, 0) / successfulQueries.length
    );
    const maxDuration = Math.max(...successfulQueries.map(r => r.duration));
    const minDuration = Math.min(...successfulQueries.map(r => r.duration));
    
    console.log(`✅ Successful queries: ${successfulQueries.length}/${results.length}`);
    console.log(`⏱️  Average duration: ${avgDuration}ms`);
    console.log(`🚀 Fastest query: ${minDuration}ms`);
    console.log(`🐌 Slowest query: ${maxDuration}ms`);
  }
  
  if (failedQueries.length > 0) {
    console.log(`\n❌ Failed queries: ${failedQueries.length}`);
    failedQueries.forEach(q => {
      console.log(`   - ${q.queryName}: ${q.error}`);
    });
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('-'.repeat(40));
  
  const slowQueries = successfulQueries.filter(r => r.duration > 1000);
  if (slowQueries.length > 0) {
    console.log('🔴 Slow queries detected (>1000ms):');
    slowQueries.forEach(q => {
      console.log(`   - ${q.queryName}: ${q.duration}ms`);
    });
    console.log('\n   Consider:');
    console.log('   • Adding database indexes');
    console.log('   • Optimizing query structure');
    console.log('   • Implementing pagination');
    console.log('   • Using cursor-based pagination for large datasets');
  } else {
    console.log('🟢 All queries are performing well!');
  }
  
  // Vercel compatibility check
  console.log('\n🚀 VERCEL COMPATIBILITY CHECK');
  console.log('-'.repeat(40));
  
  const vercelLimits = [
    { plan: 'Hobby', timeout: 10000, memory: 1024 },
    { plan: 'Pro', timeout: 60000, memory: 1024 },
    { plan: 'Enterprise', timeout: 900000, memory: 3008 }
  ];
  
  vercelLimits.forEach(plan => {
    const compatibleQueries = successfulQueries.filter(r => r.duration < plan.timeout);
    const compatibility = Math.round((compatibleQueries.length / successfulQueries.length) * 100);
    
    console.log(`${plan.plan} Plan: ${compatibility}% compatible (${compatibleQueries.length}/${successfulQueries.length} queries)`);
    
    if (compatibility < 100) {
      const incompatibleQueries = successfulQueries.filter(r => r.duration >= plan.timeout);
      console.log(`   Incompatible queries:`);
      incompatibleQueries.forEach(q => {
        console.log(`   - ${q.queryName}: ${q.duration}ms`);
      });
    }
  });
}

async function main() {
  try {
    await testDatabasePerformance();
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

module.exports = { testDatabasePerformance };
