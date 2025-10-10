#!/usr/bin/env node

/**
 * Run All Performance Tests
 * Master script to run all performance tests in sequence
 */

const { execSync } = require('child_process');
const path = require('path');

// Test scripts to run
const TEST_SCRIPTS = [
  {
    name: 'Order Performance Tests',
    script: 'order-performance.test.js',
    description: 'Tests optimized order queries and database indexes'
  },
  {
    name: 'Database Stress Tests',
    script: 'database-stress.test.js',
    description: 'Tests database performance under high load'
  },
  {
    name: 'Vercel Compatibility Tests',
    script: 'vercel-compatibility.test.js',
    description: 'Tests Vercel deployment compatibility and limits'
  }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80));
}

function logSubHeader(title) {
  console.log('\n' + '-'.repeat(50));
  log(title, 'cyan');
  console.log('-'.repeat(50));
}

/**
 * Check prerequisites
 */
async function checkPrerequisites() {
  logHeader('🔍 CHECKING PREREQUISITES');
  
  try {
    // Check if database exists and has data
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const orderCount = await prisma.order.count();
    const merchantCount = await prisma.merchant.count();
    const customerCount = await prisma.customer.count();
    
    await prisma.$disconnect();
    
    log(`📊 Database Status:`, 'blue');
    console.log(`   • Orders: ${orderCount.toLocaleString()}`);
    console.log(`   • Merchants: ${merchantCount.toLocaleString()}`);
    console.log(`   • Customers: ${customerCount.toLocaleString()}`);
    
    if (orderCount === 0) {
      log('\n⚠️  WARNING: No orders found in database!', 'yellow');
      log('   For comprehensive testing, consider running:', 'yellow');
      log('   node scripts/generate-large-test-data.js', 'yellow');
      log('\n   Continue with limited testing? (y/n)', 'yellow');
      
      // In a real scenario, you might want to prompt user input
      // For now, we'll continue with a warning
      log('   Proceeding with limited testing...', 'yellow');
    } else if (orderCount < 1000) {
      log('\n⚠️  WARNING: Limited data for stress testing', 'yellow');
      log('   Consider generating more test data for accurate results', 'yellow');
    } else {
      log('\n✅ Database ready for comprehensive testing', 'green');
    }
    
  } catch (error) {
    log(`❌ Database check failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

/**
 * Run individual test script
 */
async function runTestScript(test) {
  const scriptPath = path.join(__dirname, test.script);
  const startTime = Date.now();
  
  try {
    logSubHeader(`🧪 ${test.name}`);
    log(test.description, 'blue');
    console.log('');
    
    execSync(`node "${scriptPath}"`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    log(`\n✅ ${test.name} completed in ${duration}s`, 'green');
    
    return { success: true, duration };
    
  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    log(`\n❌ ${test.name} failed after ${duration}s`, 'red');
    log(`   Error: ${error.message}`, 'red');
    
    return { success: false, duration, error: error.message };
  }
}

/**
 * Generate comprehensive report
 */
function generateReport(results) {
  logHeader('📈 COMPREHENSIVE PERFORMANCE REPORT');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  
  log('\n🎯 EXECUTIVE SUMMARY', 'bright');
  console.log(`✅ Successful tests: ${successful.length}/${results.length}`);
  console.log(`❌ Failed tests: ${failed.length}/${results.length}`);
  console.log(`⏱️  Total execution time: ${totalTime}s`);
  
  if (failed.length > 0) {
    log('\n❌ FAILED TESTS:', 'red');
    failed.forEach(test => {
      console.log(`   • ${test.name}: ${test.error}`);
    });
  }
  
  log('\n💡 DEPLOYMENT READINESS ASSESSMENT', 'bright');
  
  // Analyze results to determine deployment readiness
  const hasOrderTests = results.find(r => r.name === 'Order Performance Tests')?.success;
  const hasStressTests = results.find(r => r.name === 'Database Stress Tests')?.success;
  const hasVercelTests = results.find(r => r.name === 'Vercel Compatibility Tests')?.success;
  
  if (hasOrderTests && hasStressTests && hasVercelTests) {
    log('🟢 FULLY READY FOR PRODUCTION DEPLOYMENT', 'green');
    console.log('   • All performance tests passed');
    console.log('   • Database optimization verified');
    console.log('   • Vercel compatibility confirmed');
  } else if (hasOrderTests && hasVercelTests) {
    log('🟡 READY WITH MONITORING', 'yellow');
    console.log('   • Core functionality tested');
    console.log('   • Vercel compatibility confirmed');
    console.log('   • Monitor performance in production');
  } else if (hasOrderTests) {
    log('🟡 READY WITH CAUTION', 'yellow');
    console.log('   • Basic performance tested');
    console.log('   • Vercel compatibility not verified');
    console.log('   • Consider upgrading Vercel plan');
  } else {
    log('🔴 NOT READY FOR DEPLOYMENT', 'red');
    console.log('   • Performance issues detected');
    console.log('   • Address failing tests before deployment');
  }
  
  log('\n🚀 NEXT STEPS', 'bright');
  console.log('1. Review individual test results above');
  console.log('2. Address any failing tests');
  console.log('3. Consider database optimization if needed');
  console.log('4. Choose appropriate Vercel plan based on test results');
  console.log('5. Set up monitoring in production');
  
  log('\n📚 DOCUMENTATION', 'bright');
  console.log('• Performance test results are logged above');
  console.log('• Check individual test files for detailed analysis');
  console.log('• Review database indexes in prisma/schema.prisma');
  console.log('• Monitor query performance in production');
}

/**
 * Main execution function
 */
async function main() {
  logHeader('🚀 RENTALSHOP PERFORMANCE TEST SUITE');
  log('Comprehensive performance testing for 100k+ order datasets', 'blue');
  
  const startTime = Date.now();
  
  try {
    // Check prerequisites
    await checkPrerequisites();
    
    // Run all test scripts
    const results = [];
    
    for (const test of TEST_SCRIPTS) {
      const result = await runTestScript(test);
      results.push({ ...result, name: test.name });
      
      // Add delay between tests
      if (test !== TEST_SCRIPTS[TEST_SCRIPTS.length - 1]) {
        console.log('\n⏳ Waiting 2 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const totalDuration = Math.round((Date.now() - startTime) / 1000);
    
    // Generate comprehensive report
    generateReport(results);
    
    logHeader('🎉 TEST SUITE COMPLETED');
    log(`Total execution time: ${totalDuration}s`, 'green');
    
    // Exit with appropriate code
    const allSuccessful = results.every(r => r.success);
    process.exit(allSuccessful ? 0 : 1);
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n\n⚠️  Test suite interrupted by user', 'yellow');
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('\n\n⚠️  Test suite terminated', 'yellow');
  process.exit(1);
});

// Run the test suite
if (require.main === module) {
  main();
}

module.exports = {
  checkPrerequisites,
  runTestScript,
  generateReport,
  main
};
