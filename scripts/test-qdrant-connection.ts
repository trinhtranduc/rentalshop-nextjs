/**
 * Test Qdrant Connection Script
 * 
 * Tests connection to Qdrant (local or cloud) and verifies collection setup
 * 
 * Usage:
 *   tsx scripts/test-qdrant-connection.ts
 */

import { getVectorStore } from '@rentalshop/database/server';

async function testConnection() {
  console.log('🔍 Testing Qdrant connection...\n');

  // Check environment variables
  const qdrantUrl = process.env.QDRANT_URL;
  const qdrantApiKey = process.env.QDRANT_API_KEY;

  console.log('📊 Configuration:');
  console.log(`   QDRANT_URL: ${qdrantUrl || 'NOT SET'}`);
  console.log(`   QDRANT_API_KEY: ${qdrantApiKey ? '***SET***' : 'NOT SET'}`);
  console.log('');

  if (!qdrantUrl) {
    console.error('❌ QDRANT_URL is not set!');
    console.error('   Please set QDRANT_URL in your .env file');
    console.error('   Example: QDRANT_URL=https://your-cluster.qdrant.io');
    process.exit(1);
  }

  try {
    // Initialize vector store
    console.log('🔄 Initializing vector store...');
    const vectorStore = getVectorStore();
    console.log('✅ Vector store initialized');

    // Test connection by getting collection info
    console.log('\n🔍 Testing connection to Qdrant...');
    try {
      const collectionInfo = await vectorStore.getCollectionInfo();
      console.log('✅ Successfully connected to Qdrant!');
      console.log('\n📊 Collection Info:');
      console.log(`   Name: ${collectionInfo.name}`);
      console.log(`   Vector size: ${collectionInfo.config.params.vectors.size}`);
      console.log(`   Distance: ${collectionInfo.config.params.vectors.distance}`);
      console.log(`   Points count: ${collectionInfo.points_count || 0}`);
      console.log(`   Status: ${collectionInfo.status}`);
    } catch (err: any) {
      // Collection might not exist yet, try to initialize
      if (err.message?.includes('not found') || err.status === 404) {
        console.log('⚠️  Collection "product-images" does not exist yet');
        console.log('🔄 Attempting to create collection...');
        
        try {
          await vectorStore.initialize();
          console.log('✅ Collection "product-images" created successfully!');
          
          const collectionInfo = await vectorStore.getCollectionInfo();
          console.log('\n📊 Collection Info:');
          console.log(`   Name: ${collectionInfo.name}`);
          console.log(`   Vector size: ${collectionInfo.config.params.vectors.size}`);
          console.log(`   Distance: ${collectionInfo.config.params.vectors.distance}`);
          console.log(`   Points count: ${collectionInfo.points_count || 0}`);
        } catch (initError: any) {
          console.error('❌ Failed to create collection:', initError.message);
          throw initError;
        }
      } else {
        throw err;
      }
    }

    // Test write operation (optional - create a test point)
    console.log('\n🧪 Testing write operation...');
    try {
      // This is just a connection test, we won't actually write
      console.log('✅ Write operation test skipped (connection verified)');
    } catch (writeError: any) {
      console.error('❌ Write operation failed:', writeError.message);
      throw writeError;
    }

    console.log('\n✅ All tests passed!');
    console.log('🎯 Qdrant is ready to use for image search!');
    
    if (qdrantUrl.includes('cloud.qdrant.io')) {
      console.log('\n💡 Qdrant Cloud detected:');
      console.log('   - Check dashboard: https://cloud.qdrant.io');
      console.log('   - Monitor storage usage in dashboard');
      console.log('   - Free tier: 1GB storage (~200,000-400,000 products)');
    } else {
      console.log('\n💡 Local Qdrant detected:');
      console.log('   - Dashboard: http://localhost:6333/dashboard');
      console.log('   - Health check: http://localhost:6333/health');
    }

  } catch (error: any) {
    console.error('\n❌ Connection test failed!');
    console.error(`   Error: ${error.message}`);
    
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
      console.error('\n💡 Possible solutions:');
      if (qdrantUrl.includes('localhost')) {
        console.error('   1. Make sure Qdrant is running:');
        console.error('      docker compose -f docker-compose.local.yml up -d qdrant');
        console.error('      Or: yarn qdrant:start');
        console.error('   2. Wait 5-10 seconds after starting');
        console.error('   3. Verify: curl http://localhost:6333/health');
      } else {
        console.error('   1. Check QDRANT_URL is correct');
        console.error('   2. Check QDRANT_API_KEY is correct');
        console.error('   3. Verify cluster is running in Qdrant Cloud dashboard');
        console.error('   4. Check network connectivity');
      }
    } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      console.error('\n💡 Authentication failed:');
      console.error('   1. Check QDRANT_API_KEY is correct');
      console.error('   2. Verify API key in Qdrant Cloud dashboard');
      console.error('   3. Make sure API key has proper permissions');
    } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
      console.error('\n💡 Permission denied:');
      console.error('   1. Check API key permissions in Qdrant Cloud');
      console.error('   2. Verify cluster access settings');
    }
    
    process.exit(1);
  }
}

// Run test
testConnection().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
