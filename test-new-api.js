// ============================================================================
// SIMPLE TEST FOR NEW DATABASE API
// ============================================================================

const { testNewDatabaseAPI } = require('./packages/database/dist/test-db-new.js');

async function main() {
  console.log('🚀 Testing new simplified database API...');
  
  try {
    await testNewDatabaseAPI();
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main();
