/**
 * Verify Railway Setup Script
 * 
 * Verifies Qdrant Cloud connection and collection setup on Railway
 * 
 * Usage:
 *   railway run --service apis tsx scripts/verify-railway-setup.ts
 *   Or: yarn verify:railway-setup (if added to package.json)
 */

import { getVectorStore } from '@rentalshop/database/server';
// Import Prisma directly to avoid auth client initialization
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verifySetup() {
  console.log('🚀 Verifying Railway setup for Image Search...\n');

  // Step 1: Check environment variables
  console.log('📊 Step 1: Checking environment variables...');
  const qdrantUrl = process.env.QDRANT_URL;
  const qdrantApiKey = process.env.QDRANT_API_KEY;

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

  console.log(`✅ QDRANT_URL: ${qdrantUrl.includes('cloud.qdrant.io') ? 'Qdrant Cloud' : 'Local'}`);
  console.log(`✅ QDRANT_API_KEY: ${qdrantApiKey ? '***SET***' : 'NOT SET'}`);
  console.log('');

  // Step 2: Test Qdrant connection
  console.log('🔍 Step 2: Testing Qdrant connection...');
  try {
    const vectorStore = getVectorStore();
    
    // Try to get collection info to verify connection
    try {
      const collectionInfo = await vectorStore.getCollectionInfo();
      console.log('✅ Qdrant connection successful!');
      console.log(`✅ Collection "${collectionInfo.name}" exists`);
      console.log(`   Vector size: ${collectionInfo.config.params.vectors.size}`);
      console.log(`   Distance: ${collectionInfo.config.params.vectors.distance}`);
      console.log(`   Points count: ${collectionInfo.points_count || 0}`);
      console.log('');
    } catch (err: any) {
      // Collection might not exist yet, try to initialize
      if (err.status === 404 || err.message?.includes('not found')) {
        console.log('⚠️  Collection "product-images" does not exist yet');
        console.log('🔄 Initializing collection...');
        
        try {
          await vectorStore.initialize();
          console.log('✅ Collection "product-images" created successfully!');
          
          const collectionInfo = await vectorStore.getCollectionInfo();
          console.log(`   Vector size: ${collectionInfo.config.params.vectors.size}`);
          console.log(`   Distance: ${collectionInfo.config.params.vectors.distance}`);
          console.log(`   Points count: ${collectionInfo.points_count || 0}`);
          console.log('');
        } catch (initError: any) {
          console.error('❌ Failed to create collection:', initError.message);
          throw initError;
        }
      } else {
        throw err;
      }
    }
  } catch (error: any) {
    console.error('❌ Qdrant connection failed!');
    console.error(`   Error: ${error.message}`);
    console.error('\n💡 Possible solutions:');
    console.error('   1. Check QDRANT_URL is correct');
    console.error('   2. Check QDRANT_API_KEY is correct');
    console.error('   3. Verify cluster is running in Qdrant Cloud dashboard');
    console.error('   4. Check network connectivity from Railway');
    process.exit(1);
  }

  // Step 3: Check products with images
  console.log('📦 Step 3: Checking products with images...');
  try {
    const totalProducts = await prisma.product.count({
      where: {
        images: {
          not: null as any
        },
        isActive: true
      }
    });

    console.log(`✅ Found ${totalProducts} product(s) with images in database`);
    
    if (totalProducts === 0) {
      console.log('\n💡 No products with images found.');
      console.log('   To test embedding generation:');
      console.log('   1. Create a product with images via API or admin dashboard');
      console.log('   2. Embedding will be auto-generated in background');
      console.log('   3. Check Qdrant Cloud dashboard to verify points');
    } else {
      console.log(`\n💡 You can generate embeddings for existing products:`);
      console.log(`   railway run --service apis yarn generate:embeddings-only`);
    }
    console.log('');
  } catch (error: any) {
    console.error('❌ Failed to check products:', error.message);
    process.exit(1);
  }

  // Step 4: Summary
  console.log('✅ Railway setup verification completed!');
  console.log('\n📋 Next steps:');
  console.log('   1. Create a product with images to test auto-generate embedding');
  console.log('   2. Check Railway logs for embedding generation');
  console.log('   3. Verify points in Qdrant Cloud dashboard');
  console.log('   4. Test image search API: POST /api/products/search-by-image');
  console.log('\n🎯 Ready to use image search!');
}

// Run verification
verifySetup().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
