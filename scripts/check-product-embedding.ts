/**
 * Check product embedding status by barcode
 * 
 * Usage:
 *   tsx scripts/check-product-embedding.ts <barcode> [environment]
 * 
 * Examples:
 *   tsx scripts/check-product-embedding.ts 020317 dev
 *   tsx scripts/check-product-embedding.ts 020317 production
 */

import { PrismaClient } from '@prisma/client';
import { getVectorStore } from '../packages/database/src/ml/vector-store';
import { generateProductEmbedding } from '../packages/database/src/jobs/generate-product-embeddings';

const prisma = new PrismaClient();

function parseProductImages(images: any): string[] {
  if (Array.isArray(images)) {
    return images.filter((img): img is string => typeof img === 'string' && img.trim() !== '');
  }
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.filter((img): img is string => typeof img === 'string' && img.trim() !== '');
      }
    } catch {
      return images.split(',').map((img: string) => img.trim()).filter(Boolean);
    }
  }
  return [];
}

async function checkProductEmbedding(barcode: string) {
  console.log('================================================================================');
  console.log(`🔍 Checking Product Embedding Status for Barcode: ${barcode}`);
  console.log('================================================================================\n');

  try {
    // 1. Find product by barcode
    console.log('📦 Step 1: Finding product by barcode...');
    const product = await prisma.product.findUnique({
      where: { barcode },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!product) {
      console.error(`❌ Product with barcode "${barcode}" not found.`);
      return;
    }

    console.log('✅ Product found:');
    console.log(`   ID: ${product.id}`);
    console.log(`   Name: ${product.name}`);
    console.log(`   Barcode: ${product.barcode}`);
    console.log(`   Merchant: ${product.merchant.name} (ID: ${product.merchant.id})`);
    console.log(`   Category: ${product.category.name} (ID: ${product.category.id})`);
    console.log(`   Is Active: ${product.isActive}`);
    console.log(`   Created At: ${product.createdAt}`);
    console.log(`   Updated At: ${product.updatedAt}`);
    console.log(`   Embedding Generated At: ${product.embeddingGeneratedAt || 'NOT SET'}\n`);

    // 2. Check images
    console.log('📸 Step 2: Checking product images...');
    const images = parseProductImages(product.images);
    console.log(`   Images count: ${images.length}`);
    
    if (images.length === 0) {
      console.log('   ⚠️  No images found - embedding cannot be generated without images');
      console.log('   💡 Solution: Add images to the product first');
      return;
    }

    console.log('   ✅ Images found:');
    images.forEach((img, index) => {
      console.log(`      ${index + 1}. ${img.substring(0, 80)}${img.length > 80 ? '...' : ''}`);
    });
    console.log('');

    // 3. Check embeddingGeneratedAt
    console.log('🔍 Step 3: Checking embeddingGeneratedAt field...');
    if (product.embeddingGeneratedAt) {
      console.log(`   ✅ Embedding generated at: ${product.embeddingGeneratedAt}`);
      const timeDiff = Date.now() - new Date(product.embeddingGeneratedAt).getTime();
      const minutesAgo = Math.floor(timeDiff / 60000);
      console.log(`   ⏰ Generated ${minutesAgo} minute(s) ago`);
    } else {
      console.log('   ❌ embeddingGeneratedAt is NOT SET');
      console.log('   💡 This means embedding was never successfully generated or stored');
    }
    console.log('');

    // 4. Check Qdrant collection
    console.log('🔍 Step 4: Checking Qdrant collection...');
    try {
      const vectorStore = getVectorStore();
      const collectionInfo = await vectorStore.getCollectionInfo();
      console.log(`   Collection: ${(vectorStore as any).collectionName}`);
      console.log(`   Total points: ${collectionInfo.points_count || 0}`);
      console.log(`   Vector size: ${collectionInfo.config?.params?.vectors?.size || 'N/A'}`);
      console.log('');

      // Try to find embeddings for this product
      console.log('   🔍 Searching for embeddings with productId:', product.id);
      try {
        const qdrantClient = (vectorStore as any).client;
        const scrollResult = await qdrantClient.scroll((vectorStore as any).collectionName, {
          filter: {
            must: [
              {
                key: 'productId',
                match: { value: String(product.id) }
              }
            ]
          },
          limit: 100
        });

        const productEmbeddings = scrollResult.points || [];
        console.log(`   Found ${productEmbeddings.length} embedding(s) for this product`);
        
        if (productEmbeddings.length > 0) {
          console.log('   ✅ Embeddings found in Qdrant:');
          productEmbeddings.forEach((point: any, index: number) => {
            console.log(`      ${index + 1}. Point ID: ${point.id}`);
            console.log(`         Image URL: ${point.payload?.imageUrl?.substring(0, 60)}...`);
            console.log(`         Product Name: ${point.payload?.productName || 'N/A'}`);
          });
        } else {
          console.log('   ❌ No embeddings found in Qdrant for this product');
          console.log('   💡 This means embeddings were never stored or were deleted');
        }
      } catch (searchError: any) {
        console.error('   ⚠️  Error searching Qdrant:', searchError.message);
      }
    } catch (qdrantError: any) {
      console.error('   ❌ Error connecting to Qdrant:', qdrantError.message);
      console.log('   💡 Check QDRANT_URL and QDRANT_API_KEY environment variables');
    }
    console.log('');

    // 5. Summary and recommendations
    console.log('📊 Summary:');
    console.log('================================================================================');
    const hasImages = images.length > 0;
    const hasEmbeddingTimestamp = !!product.embeddingGeneratedAt;
    const needsRegeneration = hasImages && !hasEmbeddingTimestamp;

    console.log(`   ✅ Has Images: ${hasImages ? 'YES' : 'NO'}`);
    console.log(`   ✅ Embedding Generated: ${hasEmbeddingTimestamp ? 'YES' : 'NO'}`);
    console.log(`   ⚠️  Needs Regeneration: ${needsRegeneration ? 'YES' : 'NO'}`);

    if (needsRegeneration) {
      console.log('\n💡 Recommendation:');
      console.log('   This product has images but no embedding timestamp.');
      console.log('   You can regenerate embeddings by running:');
      console.log(`   tsx scripts/regenerate-product-embedding.ts ${product.id}`);
    } else if (!hasImages) {
      console.log('\n💡 Recommendation:');
      console.log('   Add images to this product first, then embedding will be auto-generated.');
    } else if (hasEmbeddingTimestamp) {
      console.log('\n✅ Product embedding is up to date!');
    }
    console.log('================================================================================\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const barcode = process.argv[2];
if (!barcode) {
  console.error('Usage: tsx scripts/check-product-embedding.ts <barcode>');
  console.error('Example: tsx scripts/check-product-embedding.ts 020317');
  process.exit(1);
}

// Set DATABASE_URL for local execution
if (!process.env.DATABASE_URL) {
  // Default to dev database
  process.env.DATABASE_URL = 'postgresql://postgres:rcoiKvDAztXzqINtiUYlxZaPDpqrtRLg@maglev.proxy.rlwy.net:46280/railway';
  console.log('ℹ️  Using default DATABASE_URL (dev environment)');
}

checkProductEmbedding(barcode);
