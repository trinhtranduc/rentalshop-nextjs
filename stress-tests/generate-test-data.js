#!/usr/bin/env node

/**
 * Generate Test Data for Stress Testing
 * Creates realistic test data for Artillery and k6 tests
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  orderIds: 1000,
  customerIds: 100,
  outletIds: 50,
  productIds: 200,
  outputFile: './test-data.json'
};

function generateTestData() {
  console.log('🎯 Generating test data for stress testing...');
  
  const data = {
    orderIds: [],
    customerIds: [],
    outletIds: [],
    productIds: []
  };
  
  // Generate order IDs (1-1000)
  for (let i = 1; i <= CONFIG.orderIds; i++) {
    data.orderIds.push(i);
  }
  
  // Generate customer IDs (1-100)
  for (let i = 1; i <= CONFIG.customerIds; i++) {
    data.customerIds.push(i);
  }
  
  // Generate outlet IDs (1-50)
  for (let i = 1; i <= CONFIG.outletIds; i++) {
    data.outletIds.push(i);
  }
  
  // Generate product IDs (1-200)
  for (let i = 1; i <= CONFIG.productIds; i++) {
    data.productIds.push(i);
  }
  
  // Write to file
  const outputPath = path.join(__dirname, CONFIG.outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  
  console.log(`✅ Generated test data:`);
  console.log(`   • Order IDs: ${data.orderIds.length}`);
  console.log(`   • Customer IDs: ${data.customerIds.length}`);
  console.log(`   • Outlet IDs: ${data.outletIds.length}`);
  console.log(`   • Product IDs: ${data.productIds.length}`);
  console.log(`   • Output file: ${outputPath}`);
  
  return data;
}

// Run if called directly
if (require.main === module) {
  generateTestData();
}

module.exports = { generateTestData };
