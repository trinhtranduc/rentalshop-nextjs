#!/usr/bin/env node

/**
 * Order Performance Tests
 * Tests optimized order queries with various scenarios
 */

const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

const prisma = new PrismaClient();

// Import optimized functions
const { 
  searchOrdersOptimized, 
  searchOrdersWithCursor, 
  getOrderDetailsOptimized, 
  getOrderSummary 
} = require('../../packages/database/dist/order-optimized');

// Test configurations
const TEST_CONFIGS = {
  small: { limit: 20, description: 'Small dataset (20 orders)' },
  medium: { limit: 100, description: 'Medium dataset (100 orders)' },
  large: { limit: 1000, description: 'Large dataset (1000 orders)' },
  xlarge: { limit: 10000, description: 'Extra large dataset (10000 orders)' }
};

const QUERY_SCENARIOS = [
  {
    name: 'Basic Search',
    filters: {}
  },
  {
    name: 'Search by Status',
    filters: { status: 'ACTIVE' }
  },
  {
    name: 'Search by Order Type',
    filters: { orderType: 'RENT' }
  },
  {
    name: 'Search by Date Range',
    filters: { 
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31')
    }
  },
  {
    name: 'Text Search',
    filters: { q: 'ORD' }
  },
  {
    name: 'Complex Filter',
    filters: {
      status: 'ACTIVE',
      orderType: 'RENT',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31')
    }
  }
];

/**
 * Measure query performance
 */
async function measureQuery(name, queryFn, recordCount) {
  const start = performance.now();
  
  try {
    const result = await queryFn();
    const end = performance.now();
    const duration = Math.round(end - start);
    
    return {
      success: true,
      name,
      duration,
      recordCount: result.data?.length || result.length || 1,
      total: result.total || 0,
      hasMore: result.hasMore || false
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

/**
 * Test optimized order search
 */
async function testOptimizedOrderSearch() {
  console.log('🧪 Testing Optimized Order Search');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const [configKey, config] of Object.entries(TEST_CONFIGS)) {
    console.log(`\n📊 ${config.description}`);
    console.log('-'.repeat(30));
    
    for (const scenario of QUERY_SCENARIOS) {
      const filters = {
        ...scenario.filters,
        limit: config.limit,
        offset: 0
      };
      
      const result = await measureQuery(
        `${scenario.name} (${config.limit} records)`,
        () => searchOrdersOptimized(filters),
        config.limit
      );
      
      results.push(result);
      
      const status = result.success ? '✅' : '❌';
      const timeColor = result.duration > 1000 ? '🔴' : result.duration > 500 ? '🟡' : '🟢';
      
      console.log(`${status} ${scenario.name}: ${timeColor} ${result.duration}ms`);
      
      if (result.success) {
        console.log(`   Records: ${result.recordCount}, Total: ${result.total}`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
    }
  }
  
  return results;
}

/**
 * Test cursor-based pagination
 */
async function testCursorPagination() {
  console.log('\n🧪 Testing Cursor-Based Pagination');
  console.log('=' .repeat(50));
  
  const results = [];
  const filters = { limit: 50 };
  
  try {
    // First page
    const firstPage = await measureQuery(
      'Cursor Pagination - First Page',
      () => searchOrdersWithCursor(filters),
      50
    );
    results.push(firstPage);
    
    console.log(`✅ First Page: ${firstPage.duration}ms`);
    
    if (firstPage.success && firstPage.hasMore) {
      // Second page
      const secondPageFilters = { ...filters, cursor: firstPage.nextCursor };
      const secondPage = await measureQuery(
        'Cursor Pagination - Second Page',
        () => searchOrdersWithCursor(secondPageFilters),
        50
      );
      results.push(secondPage);
      
      console.log(`✅ Second Page: ${secondPage.duration}ms`);
    }
    
  } catch (error) {
    console.error('❌ Cursor pagination test failed:', error.message);
  }
  
  return results;
}

/**
 * Test order details optimization
 */
async function testOrderDetailsOptimization() {
  console.log('\n🧪 Testing Order Details Optimization');
  console.log('=' .repeat(50));
  
  const results = [];
  
  // Get a sample order
  const sampleOrder = await prisma.order.findFirst({
    select: { id: true }
  });
  
  if (!sampleOrder) {
    console.log('❌ No orders found for testing');
    return results;
  }
  
  const orderId = sampleOrder.id;
  
  // Test different detail loading options
  const detailTests = [
    {
      name: 'Summary Only',
      query: () => getOrderSummary(orderId)
    },
    {
      name: 'Details without Items',
      query: () => getOrderDetailsOptimized(orderId, false, false)
    },
    {
      name: 'Details with Items',
      query: () => getOrderDetailsOptimized(orderId, true, false)
    },
    {
      name: 'Full Details',
      query: () => getOrderDetailsOptimized(orderId, true, true)
    }
  ];
  
  for (const test of detailTests) {
    const result = await measureQuery(test.name, test.query, 1);
    results.push(result);
    
    const status = result.success ? '✅' : '❌';
    const timeColor = result.duration > 1000 ? '🔴' : result.duration > 500 ? '🟡' : '🟢';
    
    console.log(`${status} ${test.name}: ${timeColor} ${result.duration}ms`);
  }
  
  return results;
}

/**
 * Test database indexes effectiveness
 */
async function testIndexEffectiveness() {
  console.log('\n🧪 Testing Database Indexes');
  console.log('=' .repeat(50));
  
  const results = [];
  
  // Test indexed queries
  const indexTests = [
    {
      name: 'Order by CreatedAt (Indexed)',
      query: () => prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { id: true, createdAt: true }
      })
    },
    {
      name: 'Filter by Status (Indexed)',
      query: () => prisma.order.findMany({
        where: { status: 'ACTIVE' },
        take: 100,
        select: { id: true, status: true }
      })
    },
    {
      name: 'Filter by OutletId (Indexed)',
      query: () => prisma.order.findMany({
        where: { outletId: 1 },
        take: 100,
        select: { id: true, outletId: true }
      })
    },
    {
      name: 'Composite Filter (Status + OutletId)',
      query: () => prisma.order.findMany({
        where: { 
          status: 'ACTIVE',
          outletId: 1
        },
        take: 100,
        select: { id: true, status: true, outletId: true }
      })
    }
  ];
  
  for (const test of indexTests) {
    const result = await measureQuery(test.name, test.query, 100);
    results.push(result);
    
    const status = result.success ? '✅' : '❌';
    const timeColor = result.duration > 100 ? '🔴' : result.duration > 50 ? '🟡' : '🟢';
    
    console.log(`${status} ${test.name}: ${timeColor} ${result.duration}ms`);
  }
  
  return results;
}

/**
 * Compare old vs new query performance
 */
async function compareQueryPerformance() {
  console.log('\n🧪 Comparing Old vs New Query Performance');
  console.log('=' .repeat(50));
  
  const results = [];
  
  // Old query (with heavy includes)
  const oldQuery = () => prisma.order.findMany({
    where: {},
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      outlet: { 
        select: { 
          id: true, 
          name: true,
          merchant: { select: { id: true, name: true } }
        } 
      },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      orderItems: {
        include: {
          product: { select: { id: true, name: true, barcode: true } }
        }
      },
      payments: true
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  // New optimized query
  const newQuery = () => searchOrdersOptimized({ limit: 20, offset: 0 });
  
  const oldResult = await measureQuery('Old Query (Heavy Includes)', oldQuery, 20);
  const newResult = await measureQuery('New Query (Optimized)', newQuery, 20);
  
  results.push(oldResult, newResult);
  
  console.log(`🔴 Old Query: ${oldResult.duration}ms`);
  console.log(`🟢 New Query: ${newResult.duration}ms`);
  
  if (oldResult.success && newResult.success) {
    const improvement = Math.round(((oldResult.duration - newResult.duration) / oldResult.duration) * 100);
    console.log(`📈 Performance improvement: ${improvement}%`);
  }
  
  return results;
}

/**
 * Test Vercel compatibility
 */
async function testVercelCompatibility() {
  console.log('\n🧪 Testing Vercel Compatibility');
  console.log('=' .repeat(50));
  
  const vercelLimits = [
    { plan: 'Hobby', timeout: 10000, memory: 1024 },
    { plan: 'Pro', timeout: 60000, memory: 1024 },
    { plan: 'Enterprise', timeout: 900000, memory: 3008 }
  ];
  
  // Test with realistic query
  const realisticQuery = () => searchOrdersOptimized({
    status: 'ACTIVE',
    limit: 50,
    offset: 0
  });
  
  const result = await measureQuery('Realistic Query (50 orders)', realisticQuery, 50);
  
  console.log(`📊 Query duration: ${result.duration}ms`);
  
  vercelLimits.forEach(plan => {
    const compatible = result.duration < plan.timeout;
    const status = compatible ? '✅' : '❌';
    
    console.log(`${status} ${plan.plan} Plan: ${compatible ? 'Compatible' : 'Timeout risk'} (${plan.timeout}ms limit)`);
  });
  
  return [result];
}

/**
 * Run all performance tests
 */
async function runAllTests() {
  console.log('🚀 Starting Order Performance Tests');
  console.log('=' .repeat(60));
  
  const startTime = performance.now();
  
  try {
    // Check database connection
    const dbStats = await prisma.order.count();
    console.log(`📊 Database: ${dbStats.toLocaleString()} orders\n`);
    
    if (dbStats === 0) {
      console.log('❌ No orders found. Please run data generation script first:');
      console.log('   node scripts/generate-large-test-data.js');
      return;
    }
    
    // Run all tests
    const allResults = [
      ...(await testOptimizedOrderSearch()),
      ...(await testCursorPagination()),
      ...(await testOrderDetailsOptimization()),
      ...(await testIndexEffectiveness()),
      ...(await compareQueryPerformance()),
      ...(await testVercelCompatibility())
    ];
    
    const endTime = performance.now();
    const totalDuration = Math.round(endTime - startTime);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));
    
    const successfulTests = allResults.filter(r => r.success);
    const failedTests = allResults.filter(r => !r.success);
    
    console.log(`✅ Successful tests: ${successfulTests.length}/${allResults.length}`);
    console.log(`⏱️  Total test time: ${totalDuration}ms`);
    
    if (successfulTests.length > 0) {
      const avgDuration = Math.round(
        successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length
      );
      const maxDuration = Math.max(...successfulTests.map(r => r.duration));
      const minDuration = Math.min(...successfulTests.map(r => r.duration));
      
      console.log(`📊 Average query time: ${avgDuration}ms`);
      console.log(`🚀 Fastest query: ${minDuration}ms`);
      console.log(`🐌 Slowest query: ${maxDuration}ms`);
    }
    
    if (failedTests.length > 0) {
      console.log(`\n❌ Failed tests: ${failedTests.length}`);
      failedTests.forEach(test => {
        console.log(`   - ${test.name}: ${test.error}`);
      });
    }
    
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
      console.log('   • Adding more database indexes');
      console.log('   • Implementing query caching');
      console.log('   • Using cursor-based pagination');
      console.log('   • Optimizing query structure');
    } else {
      console.log('🟢 All queries are performing well!');
      console.log('✅ Ready for production deployment');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testOptimizedOrderSearch,
  testCursorPagination,
  testOrderDetailsOptimization,
  testIndexEffectiveness,
  compareQueryPerformance,
  testVercelCompatibility,
  runAllTests
};
