/**
 * Simple Qdrant Connection Test for Railway
 * 
 * Tests Qdrant Cloud connection without importing database package
 * to avoid auth client initialization issues
 * 
 * Usage:
 *   railway run --service apis npx tsx scripts/test-qdrant-railway.ts
 */

import { QdrantClient } from '@qdrant/js-client-rest';

async function testConnection() {
  console.log('🔍 Testing Qdrant Cloud connection...\n');

  // Check environment variables
  const qdrantUrl = process.env.QDRANT_URL;
  const qdrantApiKey = process.env.QDRANT_API_KEY;

  console.log('📊 Configuration:');
  console.log(`   QDRANT_URL: ${qdrantUrl || 'NOT SET'}`);
  console.log(`   QDRANT_API_KEY: ${qdrantApiKey ? '***SET***' : 'NOT SET'}`);
  console.log('');

  if (!qdrantUrl) {
    console.error('❌ QDRANT_URL is not set!');
    console.error('   Please set QDRANT_URL in Railway environment variables');
    process.exit(1);
  }

  if (!qdrantApiKey) {
    console.error('❌ QDRANT_API_KEY is not set!');
    console.error('   Please set QDRANT_API_KEY in Railway environment variables');
    process.exit(1);
  }

  try {
    // Create Qdrant client
    const client = new QdrantClient({
      url: qdrantUrl,
      apiKey: qdrantApiKey
    });

    console.log('🔄 Connecting to Qdrant...');

    // Test connection by getting collections
    const collections = await client.getCollections();
    console.log('✅ Successfully connected to Qdrant!');
    console.log(`\n📊 Collections: ${collections.collections.length}`);
    
    // Check if product-images collection exists
    const productImagesCollection = collections.collections.find(
      (col: any) => col.name === 'product-images'
    );

    if (productImagesCollection) {
      console.log('\n✅ Collection "product-images" exists');
      
      // Get collection info
      const collectionInfo = await client.getCollection('product-images');
      const vectors = collectionInfo.config?.params?.vectors;
      if (vectors) {
        console.log(`   Vector size: ${vectors.size}`);
        console.log(`   Distance: ${vectors.distance}`);
      }
      console.log(`   Points count: ${collectionInfo.points_count || 0}`);
      console.log(`   Status: ${collectionInfo.status}`);
    } else {
      console.log('\n⚠️  Collection "product-images" does not exist yet');
      console.log('   It will be created automatically when first embedding is stored');
      console.log('   Or you can create it manually by running:');
      console.log('   railway run --service apis yarn setup:image-search');
    }

    console.log('\n✅ Qdrant connection test passed!');
    console.log('🎯 Ready to use image search!');
    
    if (qdrantUrl.includes('cloud.qdrant.io')) {
      console.log('\n💡 Qdrant Cloud detected:');
      console.log('   - Check dashboard: https://cloud.qdrant.io');
      console.log('   - Monitor storage usage in dashboard');
      console.log('   - Free tier: 1GB storage (~200,000-400,000 products)');
    }

  } catch (error: any) {
    console.error('\n❌ Connection test failed!');
    console.error(`   Error: ${error.message}`);
    
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
      console.error('\n💡 Possible solutions:');
      console.error('   1. Check QDRANT_URL is correct');
      console.error('   2. Check QDRANT_API_KEY is correct');
      console.error('   3. Verify cluster is running in Qdrant Cloud dashboard');
      console.error('   4. Check network connectivity from Railway');
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
