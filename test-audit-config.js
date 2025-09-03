/**
 * Test script to check audit configuration
 */

// Test the audit configuration
console.log('🔍 Testing Audit Configuration...\n');

// Simulate environment
process.env.NODE_ENV = 'development';

try {
  // Import the audit config
  const { shouldLogEntity, getAuditConfig } = require('./packages/utils/dist/index.js');
  
  console.log('✅ Audit config imported successfully');
  
  // Test configuration
  const config = getAuditConfig();
  console.log('📊 Global config:', {
    enabled: config.global.enabled,
    async: config.global.async,
    retentionDays: config.global.retentionDays
  });
  
  // Test entity configuration
  console.log('📊 Customer entity config:', config.entities.Customer);
  
  // Test shouldLogEntity function
  const shouldLogCustomer = shouldLogEntity('Customer', 'UPDATE');
  console.log('📊 Should log Customer UPDATE:', shouldLogCustomer);
  
  const shouldLogOrder = shouldLogEntity('Order', 'UPDATE');
  console.log('📊 Should log Order UPDATE:', shouldLogOrder);
  
} catch (error) {
  console.error('❌ Error testing audit config:', error.message);
  console.log('💡 Make sure to build the utils package first:');
  console.log('   cd packages/utils && npm run build');
}
