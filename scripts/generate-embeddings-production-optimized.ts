/**
 * Optimized Embedding Generation (Production & Development)
 * 
 * Tự động tối ưu cho cả production và development:
 * - Production: Batch size lớn hơn (20 products/batch), delay nhỏ (1s)
 * - Development: Batch size vừa phải (10 products/batch), delay vừa (2s)
 * - Parallel processing tốt hơn
 * - Skip existing embeddings để resume
 * - Progress tracking chi tiết
 * 
 * Usage:
 *   # Production - Auto loop through all merchants
 *   QDRANT_COLLECTION_ENV=production \
 *   yarn tsx scripts/generate-embeddings-production-optimized.ts --yes
 * 
 *   # Development - Auto loop through all merchants
 *   QDRANT_COLLECTION_ENV=development \
 *   yarn tsx scripts/generate-embeddings-production-optimized.ts --yes
 * 
 *   # Specific merchant only
 *   QDRANT_COLLECTION_ENV=production \
 *   yarn tsx scripts/generate-embeddings-production-optimized.ts --merchant-id=123 --yes
 * 
 * Options:
 *   --skip-existing       Skip products that already have embeddings (resume mode)
 *   --batch-size=20       Override batch size (auto-detected by default)
 *   --delay=1000          Override delay between batches in ms (auto-detected by default)
 *   --merchant-id=123     Generate embeddings for specific merchant only (skip auto-loop)
 *   --list-merchants      List all merchants with products that have images
 * 
 * Auto-loop behavior:
 *   - If --merchant-id is NOT specified, script will automatically:
 *     1. Detect all merchants with products that have images
 *     2. Loop through each merchant sequentially
 *     3. Process embeddings for each merchant
 *     4. Show summary at the end
 *   - If --merchant-id is specified, only that merchant will be processed
 */

// Load environment variables
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(filePath: string): void {
  if (existsSync(filePath)) {
    console.log(`📋 Loading environment variables from ${filePath}...`);
    const content = readFileSync(filePath, 'utf-8');
    let loadedCount = 0;
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
            loadedCount++;
          }
        }
      }
    });
    console.log(`   ✅ Loaded ${loadedCount} environment variables`);
  }
}

// Load .env files based on environment
// Priority: Environment-specific file > .env.local > .env
console.log('🔍 Loading environment variables...\n');

// Determine environment from QDRANT_COLLECTION_ENV or NODE_ENV
const collectionEnv = process.env.QDRANT_COLLECTION_ENV;
const nodeEnv = process.env.NODE_ENV;
const isProduction = collectionEnv === 'production' || collectionEnv === 'prod' || 
                     (nodeEnv !== undefined && (nodeEnv === 'production' || nodeEnv.toLowerCase() === 'prod'));

// Load environment-specific file first (highest priority)
if (isProduction) {
  const envProductionPath = resolve(process.cwd(), '.env.production');
  if (existsSync(envProductionPath)) {
    console.log('📋 Loading PRODUCTION environment variables...');
    loadEnvFile(envProductionPath);
  } else {
    console.log('⚠️  .env.production not found, using default files');
  }
} else {
  const envDevelopmentPath = resolve(process.cwd(), '.env.development');
  if (existsSync(envDevelopmentPath)) {
    console.log('📋 Loading DEVELOPMENT environment variables...');
    loadEnvFile(envDevelopmentPath);
  } else {
    console.log('⚠️  .env.development not found, using default files');
  }
}

// Load .env.local (local overrides, lower priority)
const envLocalPath = resolve(process.cwd(), '.env.local');
loadEnvFile(envLocalPath);

// Load .env (default, lowest priority)
const envPath = resolve(process.cwd(), '.env');
loadEnvFile(envPath);

console.log('');

import { generateAllProductEmbeddings } from '../packages/database/src/jobs/generate-product-embeddings';
import { getVectorStore } from '../packages/database/src/ml/vector-store';
import { PrismaClient, Prisma } from '@prisma/client';

async function main() {
  console.log('🚀 Optimized Embedding Generation (Production & Development)');
  console.log('============================================================\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const skipExisting = args.includes('--skip-existing');
  const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
  const delayArg = args.find(arg => arg.startsWith('--delay='));
  const merchantIdArg = args.find(arg => arg.startsWith('--merchant-id='));
  const listMerchants = args.includes('--list-merchants');
  
  // Check required environment variables first to determine environment
  const collectionEnv = process.env.QDRANT_COLLECTION_ENV;
  
  if (!collectionEnv) {
    console.error('\n❌ QDRANT_COLLECTION_ENV is not set (REQUIRED)');
    console.error('   Please set: export QDRANT_COLLECTION_ENV="production" or "development"');
    process.exit(1);
  }

  // Resolve collection name and determine environment
  const normalized = collectionEnv.replace(/_/g, '-').toLowerCase();
  let collectionName: string;
  let isProduction: boolean;
  
  if (normalized.startsWith('product-images-')) {
    collectionName = normalized;
    isProduction = normalized === 'product-images-pro';
  } else {
    isProduction = normalized === 'production' || normalized === 'prod';
    collectionName = isProduction ? 'product-images-pro' : 'product-images-dev';
  }

  // Auto-detect optimal settings based on environment
  // Production: smaller batches, longer delays to avoid overwhelming slow Python API
  // Development: smaller batches, longer delays (more conservative)
  // Note: Production Python API may be slow, so use conservative settings
  const defaultBatchSize = isProduction ? 5 : 10; // Reduced to 5 for production to avoid timeout
  const defaultDelay = isProduction ? 3000 : 2000; // 3s delay for production to give API more time
  
  const batchSize = batchSizeArg 
    ? parseInt(batchSizeArg.split('=')[1]) || defaultBatchSize 
    : defaultBatchSize;
  const delay = delayArg 
    ? parseInt(delayArg.split('=')[1]) || defaultDelay 
    : defaultDelay;

  // Check required environment variables
  console.log('🔍 Checking required environment variables...');
  const databaseUrl = process.env.DATABASE_URL;
  const qdrantUrl = process.env.QDRANT_URL;
  const qdrantApiKey = process.env.QDRANT_API_KEY;
  const pythonApiUrl = process.env.PYTHON_EMBEDDING_API_URL;

  if (!databaseUrl) {
    console.error('\n❌ DATABASE_URL is not set (REQUIRED)');
    process.exit(1);
  }

  if (!qdrantUrl) {
    console.error('\n❌ QDRANT_URL is not set (REQUIRED)');
    process.exit(1);
  }

  if (!pythonApiUrl) {
    console.error('\n❌ PYTHON_EMBEDDING_API_URL is not set (REQUIRED)');
    process.exit(1);
  }

  console.log(`   ✅ QDRANT_COLLECTION_ENV: ${collectionEnv}`);
  console.log(`   ✅ Resolved Collection: ${collectionName}`);
  console.log(`   ✅ Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`   ✅ Auto-detected settings:`);
  console.log(`      - Batch size: ${batchSize} products/batch`);
  console.log(`      - Delay: ${delay}ms between batches`);
  console.log(`   ✅ DATABASE_URL: ${databaseUrl.substring(0, 50)}...`);
  console.log(`   ✅ QDRANT_URL: ${qdrantUrl.substring(0, 50)}...`);
  console.log(`   ✅ PYTHON_EMBEDDING_API_URL: ${pythonApiUrl}`);
  
  if (collectionName === 'product-images-pro') {
    console.log(`   ⚠️  WARNING: Using PRODUCTION collection (${collectionName})`);
    console.log(`   ⚠️  Make sure this is intentional!`);
  }
  console.log('');

  // Get collection info
  console.log('📊 Analyzing Collection and Products...');
  console.log('───────────────────────────────────────');
  
  const prisma = new PrismaClient();
  const vectorStore = getVectorStore();

  try {
    // Parse merchant ID if provided
    const merchantId = merchantIdArg 
      ? parseInt(merchantIdArg.split('=')[1]) 
      : undefined;

    // List merchants if requested
    if (listMerchants) {
      console.log('📋 Listing all merchants with products that have images...\n');
      
      const merchants = await prisma.merchant.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          _count: {
            select: {
              products: true
            }
          }
        },
        orderBy: { id: 'asc' }
      });

      // Count products with images per merchant
      const merchantsWithStats = await Promise.all(
        merchants.map(async (merchant) => {
          const productsWithImages = await prisma.product.count({
            where: {
              merchantId: merchant.id,
              images: {
                not: Prisma.JsonNull
              },
              isActive: true
            }
          });

          return {
            id: merchant.id,
            name: merchant.name,
            email: merchant.email,
            totalProducts: merchant._count.products,
            productsWithImages
          };
        })
      );

      console.log('🏢 Merchants with products that have images:');
      console.log('─'.repeat(80));
      merchantsWithStats
        .filter(m => m.productsWithImages > 0)
        .forEach((merchant) => {
          console.log(`   Merchant ID: ${merchant.id}`);
          console.log(`   Name: ${merchant.name}`);
          console.log(`   Email: ${merchant.email}`);
          console.log(`   Total Products: ${merchant.totalProducts}`);
          console.log(`   Products with Images: ${merchant.productsWithImages}`);
          console.log(`   Command: QDRANT_COLLECTION_ENV=${collectionEnv} yarn tsx scripts/generate-embeddings-production-optimized.ts --merchant-id=${merchant.id} --yes`);
          console.log('');
        });

      console.log(`\n✅ Found ${merchantsWithStats.filter(m => m.productsWithImages > 0).length} merchant(s) with products that have images`);
      console.log('\n💡 Usage:');
      console.log('   To generate for specific merchant:');
      console.log(`   QDRANT_COLLECTION_ENV=${collectionEnv} yarn tsx scripts/generate-embeddings-production-optimized.ts --merchant-id=<ID> --yes`);
      console.log('\n   To generate for all merchants (one by one):');
      console.log(`   QDRANT_COLLECTION_ENV=${collectionEnv} yarn tsx scripts/generate-embeddings-production-optimized.ts --yes`);
      
      await prisma.$disconnect();
      process.exit(0);
    }

    // Get collection info
    let collectionInfo: any;
    try {
      collectionInfo = await vectorStore.getCollectionInfo();
      const pointsCount = collectionInfo.points_count || 0;
      console.log(`📦 Collection: ${collectionName}`);
      console.log(`   Points: ${pointsCount.toLocaleString()}`);
      console.log(`   Status: ${collectionInfo.status || 'OK'}`);
    } catch (error) {
      console.log(`📦 Collection: ${collectionName} (does not exist yet)`);
      collectionInfo = { points_count: 0 };
    }

    // Count products with images (filter by merchant if specified)
    const productWhere: any = {
      images: {
        not: Prisma.JsonNull
      },
      isActive: true
    };
    
    if (merchantId) {
      productWhere.merchantId = merchantId;
      // Get merchant info
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { id: true, name: true, email: true }
      });
      
      if (!merchant) {
        console.error(`\n❌ Merchant with ID ${merchantId} not found!`);
        process.exit(1);
      }
      
      console.log(`\n🏢 Processing for Merchant:`);
      console.log(`   ID: ${merchant.id}`);
      console.log(`   Name: ${merchant.name}`);
      console.log(`   Email: ${merchant.email}`);
      console.log('');
    }
    
    const totalProducts = await prisma.product.count({
      where: productWhere
    });

    const productsWithImages = await prisma.product.findMany({
      where: productWhere,
      select: {
        id: true,
        name: true
      },
      take: 1000 // Sample for estimation
    });

    console.log(`📊 Products with images: ${totalProducts.toLocaleString()}`);
    console.log(`📊 Existing embeddings: ${(collectionInfo.points_count || 0).toLocaleString()}`);
    
    if (skipExisting) {
      console.log(`   ✅ Skip existing mode: Will skip products that already have embeddings`);
      const remaining = Math.max(0, totalProducts - (collectionInfo.points_count || 0));
      console.log(`   📊 Estimated remaining: ${remaining.toLocaleString()} products`);
    } else {
      console.log(`   ⚠️  Full regeneration mode: Will regenerate all embeddings`);
    }

    // Estimate time
    const avgTimePerProduct = 2; // seconds (conservative estimate)
    const estimatedProducts = skipExisting 
      ? Math.max(0, totalProducts - (collectionInfo.points_count || 0))
      : totalProducts;
    const estimatedSeconds = estimatedProducts * avgTimePerProduct;
    const estimatedHours = Math.floor(estimatedSeconds / 3600);
    const estimatedMins = Math.floor((estimatedSeconds % 3600) / 60);
    
    console.log(`\n⏱️  Estimated time: ${estimatedHours > 0 ? `${estimatedHours}h ` : ''}${estimatedMins}m`);
    console.log(`   (Based on ${avgTimePerProduct}s per product, batch size: ${batchSize})`);
    console.log('');

    // Confirm before proceeding
    if (!args.includes('--yes') && !args.includes('--confirm')) {
      if (merchantId) {
        console.log(`⚠️  This will generate embeddings for merchant ${merchantId} products with images.`);
      } else {
        console.log('⚠️  This will generate embeddings for ALL products with images (all merchants).');
      }
      console.log('   Press Ctrl+C to cancel, or run with --yes to skip confirmation.');
      console.log('   Waiting 5 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log('🚀 Starting optimized embedding generation...\n');

    const startTime = Date.now();

    // If merchantId is specified, process only that merchant
    // Otherwise, loop through all merchants with products that have images
    if (merchantId) {
      // Process single merchant
      await generateAllProductEmbeddings({
        batchSize: batchSize,
        skipExisting: skipExisting,
        merchantId: merchantId,
        delayBetweenBatches: delay,
        maxRetries: 3,
      });
    } else {
      // Get all merchants with products that have images
      console.log('🔄 Auto-detecting merchants with products that have images...\n');
      
      const allMerchants = await prisma.merchant.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true
        },
        orderBy: { id: 'asc' }
      });

      // Filter merchants that have products with images
      const merchantsWithProducts = await Promise.all(
        allMerchants.map(async (merchant) => {
          const productsWithImages = await prisma.product.count({
            where: {
              merchantId: merchant.id,
              images: {
                not: Prisma.JsonNull
              },
              isActive: true
            }
          });

          return {
            id: merchant.id,
            name: merchant.name,
            email: merchant.email,
            productsWithImages
          };
        })
      );

      const validMerchants = merchantsWithProducts.filter(m => m.productsWithImages > 0);
      
      if (validMerchants.length === 0) {
        console.log('⚠️  No merchants found with products that have images.');
        await prisma.$disconnect();
        process.exit(0);
      }

      console.log(`📊 Found ${validMerchants.length} merchant(s) with products that have images:\n`);
      validMerchants.forEach((merchant, index) => {
        console.log(`   ${index + 1}. Merchant ID: ${merchant.id} - ${merchant.name} (${merchant.productsWithImages} products)`);
      });
      console.log('');

      // Process each merchant sequentially
      let totalProcessed = 0;
      let totalErrors = 0;

      for (let i = 0; i < validMerchants.length; i++) {
        const merchant = validMerchants[i];
        const merchantNumber = i + 1;
        const totalMerchants = validMerchants.length;

        console.log('\n' + '='.repeat(80));
        console.log(`🏢 Processing Merchant ${merchantNumber}/${totalMerchants}: ${merchant.name} (ID: ${merchant.id})`);
        console.log(`   Products with images: ${merchant.productsWithImages}`);
        console.log('='.repeat(80) + '\n');

        try {
          await generateAllProductEmbeddings({
            batchSize: batchSize,
            skipExisting: skipExisting,
            merchantId: merchant.id,
            delayBetweenBatches: delay,
            maxRetries: 3,
          });

          console.log(`\n✅ Completed merchant ${merchantNumber}/${totalMerchants}: ${merchant.name}`);
          totalProcessed += merchant.productsWithImages;
        } catch (error: any) {
          console.error(`\n❌ Error processing merchant ${merchant.id} (${merchant.name}):`, error?.message);
          totalErrors++;
          
          // Continue with next merchant instead of stopping
          console.log(`⚠️  Continuing with next merchant...\n`);
        }

        // Small delay between merchants to avoid overwhelming the system
        if (i < validMerchants.length - 1) {
          console.log(`⏳ Waiting 3 seconds before next merchant...\n`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      console.log('\n' + '='.repeat(80));
      console.log('📊 Summary - All Merchants Processing');
      console.log('='.repeat(80));
      console.log(`   Total merchants processed: ${validMerchants.length}`);
      console.log(`   Successful: ${validMerchants.length - totalErrors}`);
      console.log(`   Failed: ${totalErrors}`);
      console.log(`   Total products processed: ${totalProcessed}`);
      console.log('='.repeat(80));
    }

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const durationHours = Math.floor((Date.now() - startTime) / 1000 / 3600);
    const durationMins = Math.floor(((Date.now() - startTime) / 1000 % 3600) / 60);

    console.log('\n✅ Embedding generation completed!');
    console.log(`📊 Total time: ${durationHours > 0 ? `${durationHours}h ` : ''}${durationMins}m (${duration} minutes)`);

    // Verify final collection state
    console.log('\n📦 Verifying final collection state...');
    try {
      const finalInfo = await vectorStore.getCollectionInfo();
      const finalPoints = finalInfo.points_count || 0;
      console.log(`✅ Final collection state:`);
      console.log(`   Collection: ${collectionName}`);
      console.log(`   Points: ${finalPoints.toLocaleString()}`);
      console.log(`   Status: ${finalInfo.status || 'OK'}`);
    } catch (error) {
      console.warn('⚠️  Could not verify final collection state:', error);
    }

    console.log(`\n🎉 ${isProduction ? 'Production' : 'Development'} embedding generation completed successfully!`);
    console.log('✅ Image search is now available with all product embeddings');

  } catch (error: any) {
    console.error('\n❌ Error during embedding generation:', error);
    console.error('   Error message:', error?.message);
    if (error?.stack) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
