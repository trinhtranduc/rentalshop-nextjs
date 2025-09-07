#!/usr/bin/env node

/**
 * Test Runner Script
 * Runs all test scripts in the test-scripts directory
 */

const { spawn } = require('child_process');
const path = require('path');

const testScripts = [
  'test-authentication.js',
  'test-plan-change.js',
  'test-subscription-extension.js',
  'test-expired-merchant-access.js',
  'test-exact-dates.js',
  'test-proration.js'
];

async function runTest(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running ${scriptName}...`);
    console.log('=' .repeat(50));
    
    const scriptPath = path.join(__dirname, scriptName);
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${scriptName} completed successfully`);
        resolve({ script: scriptName, success: true, code });
      } else {
        console.log(`\n❌ ${scriptName} failed with exit code ${code}`);
        resolve({ script: scriptName, success: false, code });
      }
    });
    
    child.on('error', (error) => {
      console.log(`\n❌ ${scriptName} error: ${error.message}`);
      resolve({ script: scriptName, success: false, error: error.message });
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting Rental Shop Test Suite');
  console.log('=' .repeat(50));
  console.log(`📅 Test run started at: ${new Date().toISOString()}`);
  console.log(`📁 Test directory: ${__dirname}`);
  console.log(`🔢 Total tests: ${testScripts.length}`);
  
  const results = [];
  const startTime = Date.now();
  
  for (const script of testScripts) {
    const result = await runTest(script);
    results.push(result);
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`⏱️  Total duration: ${duration}s`);
  console.log(`✅ Successful: ${successful}/${testScripts.length}`);
  console.log(`❌ Failed: ${failed}/${testScripts.length}`);
  
  if (successful === testScripts.length) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED');
    console.log('\nFailed tests:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`   - ${result.script} (exit code: ${result.code})`);
    });
  }
  
  console.log('\n📋 Detailed Results:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.script}`);
  });
  
  console.log('\n' + '=' .repeat(50));
  console.log(`📅 Test run completed at: ${new Date().toISOString()}`);
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run all tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('\n❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, runTest };
