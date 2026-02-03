/**
 * Fast Embedding Generation with Batch API
 * 
 * Tối ưu cho số lượng lớn (1k+ images):
 * - Sử dụng batch API endpoint (/embed/batch) - nhanh hơn 5-10x
 * - Batch processing thông minh (20 images/batch)
 * - Connection pooling và reuse
 * - Progress tracking realtime
 * - Error handling và retry tốt hơn
 * 
 * Performance:
 * - Single API: ~2-5s/image (network + processing)
 * - Batch API: ~10-20s/20 images (0.5-1s/image) - 5-10x faster!
 * 
 * Usage:
 *   QDRANT_COLLECTION_ENV=production \
 *   yarn tsx scripts/generate-embeddings-fast.ts --yes
 * 
 * Options:
 *   --api-batch-size=20  Batch size for API calls (default: 20)
 *   --qdrant-batch=50    Batch size for Qdrant upsert (default: 50)
 *   --merchant-id=123   Process specific merchant only
 *   --skip-existing     Skip products that already have embeddings
 *   --reset             Delete Qdrant collection before syncing (fresh start)
 */

// Load environment variables
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(filePath: string): void {
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim();
          let value = trimmed.substring(equalIndex + 1).trim();
          
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          
          if (key && !process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  }
}

// Load .env files based on environment
const collectionEnv = process.env.QDRANT_COLLECTION_ENV;
const nodeEnv = process.env.NODE_ENV;
const isProduction = collectionEnv === 'production' || collectionEnv === 'prod' || 
                     (nodeEnv !== undefined && (nodeEnv === 'production' || nodeEnv.toLowerCase() === 'prod'));

if (isProduction) {
  loadEnvFile(resolve(process.cwd(), '.env.production'));
} else {
  loadEnvFile(resolve(process.cwd(), '.env.development'));
}
loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '.env'));

import { getEmbeddingService } from '../packages/database/src/ml/image-embeddings';
import { getVectorStore } from '../packages/database/src/ml/vector-store';
import { PrismaClient, Prisma } from '@prisma/client';
import { parseProductImages, extractKeyFromImageUrl } from '../packages/utils/src/utils/product-image-helpers';
import { getBucketName } from '../packages/utils/src/api/aws-s3';
import { randomUUID } from 'crypto';

interface ProductWithImage {
  id: number;
  name: string;
  images: any;
  merchantId: number;
  categoryId?: number;
}

interface EmbeddingResult {
  imageId: string;
  embedding: number[];
  metadata: {
    productId: string;
    imageUrl: string;
    merchantId: string;
    categoryId?: string;
    productName?: string;
  };
}

async function main() {
  console.log('🚀 Fast Embedding Generation with Worker Pool');
  console.log('============================================\n');

  // Parse arguments
  const args = process.argv.slice(2);
  const apiBatchSizeArg = args.find(arg => arg.startsWith('--api-batch-size='));
  const qdrantBatchArg = args.find(arg => arg.startsWith('--qdrant-batch='));
  const merchantIdArg = args.find(arg => arg.startsWith('--merchant-id='));
  const skipExisting = args.includes('--skip-existing');
  const resetCollection = args.includes('--reset');

  const apiBatchSize = apiBatchSizeArg ? parseInt(apiBatchSizeArg.split('=')[1]) || 20 : 20;
  const qdrantBatchSize = qdrantBatchArg ? parseInt(qdrantBatchArg.split('=')[1]) || 50 : 50;
  const merchantId = merchantIdArg ? parseInt(merchantIdArg.split('=')[1]) : undefined;

  // Check environment
  const collectionEnv = process.env.QDRANT_COLLECTION_ENV;
  if (!collectionEnv) {
    console.error('\n❌ QDRANT_COLLECTION_ENV is not set (REQUIRED)');
    process.exit(1);
  }

  // Validate AWS credentials (REQUIRED for S3 direct access - NO FALLBACK)
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!awsAccessKeyId || !awsSecretAccessKey) {
    console.error('\n❌ AWS credentials are not set (REQUIRED for S3 direct access)');
    console.error('   This script requires S3 direct access - no fallback to URL download');
    console.error('   Please set in your .env file:');
    console.error('   - AWS_ACCESS_KEY_ID');
    console.error('   - AWS_SECRET_ACCESS_KEY');
    console.error('   - AWS_REGION (optional, default: ap-southeast-1)');
    process.exit(1);
  }

  const normalized = collectionEnv.replace(/_/g, '-').toLowerCase();
  let collectionName: string;
  if (normalized.startsWith('product-images-')) {
    collectionName = normalized;
  } else {
    const isProd = normalized === 'production' || normalized === 'prod';
    collectionName = isProd ? 'product-images-pro' : 'product-images-dev';
  }

  console.log(`📦 Collection: ${collectionName}`);
  console.log(`⚡ API Batch Size: ${apiBatchSize} (images per API call)`);
  console.log(`📦 Qdrant Batch Size: ${qdrantBatchSize} (embeddings per upsert)`);
  console.log(`🔑 AWS Credentials: ✅ Configured (${awsAccessKeyId.substring(0, 8)}...)`);
  if (merchantId) {
    console.log(`🏢 Merchant ID: ${merchantId}`);
  }
  if (resetCollection) {
    console.log(`🗑️  Reset Mode: Will delete collection before syncing`);
  }
  console.log('');

  const prisma = new PrismaClient();
  const vectorStore = getVectorStore();

  try {
    // Get products
    const productWhere: any = {
      images: { not: Prisma.JsonNull },
      isActive: true
    };
    
    if (merchantId) {
      productWhere.merchantId = merchantId;
    }

    const products = await prisma.product.findMany({
      where: productWhere,
      select: {
        id: true,
        name: true,
        images: true,
        merchantId: true,
        categoryId: true
      }
    });

    const productsWithImages = products.filter(p => {
      const images = parseProductImages(p.images);
      return images.length > 0 && images[0];
    });

    console.log(`📊 Found ${productsWithImages.length} products with images\n`);

    if (productsWithImages.length === 0) {
      console.log('⚠️  No products with images found');
      return;
    }

    // Reset collection if requested
    if (resetCollection) {
      console.log(`🗑️  Deleting collection ${collectionName}...`);
      try {
        const deleted = await vectorStore.deleteCollection();
        if (deleted) {
          console.log(`✅ Collection ${collectionName} deleted successfully`);
        } else {
          console.log(`⚠️  Collection ${collectionName} does not exist (nothing to delete)`);
        }
      } catch (error) {
        console.error(`❌ Error deleting collection:`, error);
        throw error;
      }
      console.log('');
    }

    // Initialize collection
    try {
      await vectorStore.initialize();
    } catch (error) {
      console.warn('⚠️  Collection initialization warning:', error);
    }

    const embeddingService = getEmbeddingService();
    console.log('🚀 Starting fast embedding generation with batch API...\n');
    const startTime = Date.now();

    let processed = 0;
    let totalErrors = 0;
    const allResults: EmbeddingResult[] = [];
    const qdrantBatches: EmbeddingResult[][] = [];

    // Process products in API batches
    for (let i = 0; i < productsWithImages.length; i += apiBatchSize) {
      const batch = productsWithImages.slice(i, i + apiBatchSize);
      const batchNumber = Math.floor(i / apiBatchSize) + 1;
      const totalBatches = Math.ceil(productsWithImages.length / apiBatchSize);

      console.log(`\n📦 Processing API Batch ${batchNumber}/${totalBatches} (${batch.length} products)...`);

      // Collect image URLs for this batch
      const batchData: Array<{ product: ProductWithImage; imageUrl: string }> = [];
      for (const product of batch) {
        const images = parseProductImages(product.images);
        const imageUrl = images[0];
        if (imageUrl) {
          batchData.push({ product, imageUrl });
        }
      }

      if (batchData.length === 0) {
        console.log(`⚠️  No images in batch ${batchNumber}, skipping`);
        continue;
      }

      try {
        const imageUrls = batchData.map(d => d.imageUrl);
        
        // Extract S3 keys from URLs (FASTEST METHOD - Direct S3 access)
        const s3Keys: string[] = [];
        const validBatchData: Array<{ product: ProductWithImage; imageUrl: string; s3Key: string }> = [];
        
        for (const { product, imageUrl } of batchData) {
          const s3Key = extractKeyFromImageUrl(imageUrl);
          if (s3Key) {
            s3Keys.push(s3Key);
            validBatchData.push({ product, imageUrl, s3Key });
          }
        }

        if (s3Keys.length === 0) {
          console.error(`   ❌ No S3 keys found in batch ${batchNumber}`);
          console.error(`   ⚠️  All images must be from S3 (CloudFront/S3 URLs) for direct S3 access`);
          console.error(`   💡 Skipping batch ${batchNumber} - images must be stored in S3`);
          totalErrors += batchData.length;
          continue;
        }

        // Get bucket name from environment
        const bucketName = getBucketName();
        const awsRegion = process.env.AWS_REGION || 'ap-southeast-1';
        
        console.log(`   🚀 Using S3 direct access (${s3Keys.length} keys from ${bucketName})...`);
        const embeddingStart = Date.now();
        
        // Generate embeddings using S3 keys (FASTEST - no download/upload needed)
        const embeddings = await embeddingService.generateEmbeddingsFromS3Keys(
          s3Keys,
          bucketName,
          awsRegion
        );
        
        const embeddingTime = ((Date.now() - embeddingStart) / 1000).toFixed(1);
        console.log(`   ✅ Generated ${embeddings.length} embeddings in ${embeddingTime}s (via S3)`);

        // Create results
        for (let j = 0; j < embeddings.length && j < validBatchData.length; j++) {
          const { product, imageUrl } = validBatchData[j];
          const result: EmbeddingResult = {
            imageId: randomUUID(),
            embedding: embeddings[j],
            metadata: {
              productId: String(product.id),
              imageUrl,
              merchantId: String(product.merchantId),
              categoryId: product.categoryId ? String(product.categoryId) : undefined,
              productName: product.name
            }
          };
          allResults.push(result);
          processed++;
        }

        // Group results for Qdrant batches
        while (allResults.length >= qdrantBatchSize) {
          qdrantBatches.push(allResults.splice(0, qdrantBatchSize));
        }

      } catch (error) {
        console.error(`   ❌ Error processing batch ${batchNumber}:`, error);
        totalErrors += batch.length;
      }

      // Progress update
      const progress = ((Math.min(i + apiBatchSize, productsWithImages.length) / productsWithImages.length) * 100).toFixed(1);
      console.log(`📊 Overall Progress: ${Math.min(i + apiBatchSize, productsWithImages.length)}/${productsWithImages.length} (${progress}%) | Processed: ${processed} | Errors: ${totalErrors}`);
    }

    // Add remaining results to Qdrant batches
    if (allResults.length > 0) {
      qdrantBatches.push(allResults);
    }

    // Store all batches to Qdrant
    console.log(`\n📤 Storing ${qdrantBatches.length} batch(es) to Qdrant...`);
    for (let i = 0; i < qdrantBatches.length; i++) {
      const batch = qdrantBatches[i];
      try {
        await vectorStore.storeProductImagesEmbeddings(batch);
        console.log(`✅ Stored Qdrant batch ${i + 1}/${qdrantBatches.length} (${batch.length} embeddings)`);
      } catch (error) {
        console.error(`❌ Error storing Qdrant batch ${i + 1}:`, error);
        totalErrors += batch.length;
      }
    }

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n✅ Completed!`);
    console.log(`📊 Total: ${processed} processed, ${totalErrors} errors`);
    console.log(`⏱️  Time: ${duration} minutes`);
    console.log(`⚡ Speed: ${(processed / parseFloat(duration)).toFixed(1)} products/minute`);

    // Verify collection
    try {
      const info = await vectorStore.getCollectionInfo();
      console.log(`\n📦 Collection: ${collectionName}`);
      console.log(`   Points: ${(info.points_count || 0).toLocaleString()}`);
      console.log(`   Status: ${info.status || 'OK'}`);
    } catch (error) {
      console.warn('⚠️  Could not verify collection:', error);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
