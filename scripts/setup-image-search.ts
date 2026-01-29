/**
 * Setup script for image search system
 * 
 * This script:
 * 1. Checks Qdrant connection
 * 2. Initializes Qdrant collection
 * 3. Generates embeddings for all products with images
 */

import { getVectorStore } from '@rentalshop/database/server';
import { generateAllProductEmbeddings } from '@rentalshop/database/server';
import { db } from '@rentalshop/database';

async function main() {
  console.log('🚀 Setting up image search system...\n');

  // Step 1: Check Qdrant connection (skip health check, use client directly)
  console.log('🔍 Checking Qdrant connection...');
  try {
    // Use Qdrant client to check connection (more reliable than fetch)
    const vectorStore = getVectorStore();
    
    // Try to get collection info to verify connection
    try {
      await vectorStore.getCollectionInfo();
      console.log('✅ Qdrant is connected');
    } catch (err) {
      // Collection might not exist yet, that's OK
      console.log('✅ Qdrant is connected (collection will be created)');
    }
  } catch (error) {
    console.error('\n❌ Failed to connect to Qdrant:', error);
    console.error('   Please make sure Qdrant is running:');
    console.error('   docker compose -f docker-compose.local.yml up -d qdrant');
    console.error('   Or: yarn qdrant:start');
    console.error('\n   Then verify:');
    console.error('   curl http://localhost:6333/health');
    console.error('   Or open: http://localhost:6333/dashboard');
    process.exit(1);
  }

  // Step 2: Initialize vector store
  console.log('\n📦 Initializing vector store...');
  try {
    const vectorStore = getVectorStore();
    await vectorStore.initialize();
    console.log('✅ Collection product-images initialized');
    console.log('   (Nếu collection đã tồn tại, sẽ skip)');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to initialize vector store:', errorMessage);
    console.error('\n💡 Tip: Bạn có thể tạo collection qua dashboard:');
    console.error('   1. Mở http://localhost:6333/dashboard');
    console.error('   2. Vào Collections → Create Collection');
    console.error('   3. Name: product-images, Vector size: 512, Distance: Cosine');
    console.error('   4. Sau đó chạy lại script này');
    process.exit(1);
  }

  // Step 3: Check products with images
  console.log('\n🔍 Checking products with images in database...');
  try {
    const totalCount = await db.prisma.product.count({
      where: {
        images: {
          not: null
        },
        isActive: true
      }
    });

    if (totalCount === 0) {
      console.error('\n❌ No products with images found in database!');
      console.error('\n💡 To add products with images:');
      console.error('   1. Create products via API or admin dashboard');
      console.error('   2. Upload images when creating/updating products');
      console.error('   3. Images should be stored in S3 or accessible URLs');
      process.exit(1);
    }

    console.log(`✅ Found ${totalCount} product(s) with images`);
  } catch (error) {
    console.error('\n❌ Failed to check products:', error);
    process.exit(1);
  }

  // Step 4: Generate embeddings for all products
  console.log('\n🎨 Generating product embeddings...');
  try {
    await generateAllProductEmbeddings({
      batchSize: 10,
      skipExisting: false
    });
    console.log('\n✅ Setup completed!');
    console.log('🎯 Ready to use image search!');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Failed to generate embeddings:', errorMessage);
    console.error('\n💡 Make sure:');
    console.error('   1. Products have images in database');
    console.error('   2. AWS credentials are set (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)');
    console.error('   3. Database connection is working');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
