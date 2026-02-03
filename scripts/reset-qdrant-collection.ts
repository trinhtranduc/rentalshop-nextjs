/**
 * Reset Qdrant Collection and Regenerate All Embeddings
 * 
 * MỤC ĐÍCH:
 * - Xóa collection hiện tại (full reset)
 * - Regenerate embeddings cho tất cả products từ database
 * - Đảm bảo data integrity và merchantId đúng format
 * 
 * ⚠️ WARNING: This will DELETE all embeddings in the collection!
 * - Image search will be unavailable during regeneration
 * - Regeneration can take hours for large datasets
 * - Make sure you have backups and proper environment variables set
 * 
 * Usage:
 *   QDRANT_COLLECTION_ENV=product-images-pro \
 *   yarn tsx scripts/reset-qdrant-collection.ts
 * 
 * Or with confirmation prompt:
 *   QDRANT_COLLECTION_ENV=product-images-pro \
 *   yarn tsx scripts/reset-qdrant-collection.ts --confirm
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

// Load .env files in order of priority
// Priority: QDRANT_COLLECTION_ENV > NODE_ENV > default
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

// Import after env vars are loaded
import { getVectorStore } from '../packages/database/src/ml/vector-store';
import { generateAllProductEmbeddings } from '../packages/database/src/jobs/generate-product-embeddings';
import { db } from '../packages/database/src';
import { parseProductImages } from '../packages/utils/src/utils/product-image-helpers';

/**
 * Get collection info before deletion
 */
async function getCollectionInfo(collectionName: string): Promise<{ pointsCount: number; exists: boolean }> {
  const vectorStore = getVectorStore();
  
  try {
    const collectionInfo = await vectorStore.getCollectionInfo();
    const pointsCount = collectionInfo.points_count || 0;
    
    console.log(`📊 Collection info:`);
    console.log(`   Name: ${collectionName}`);
    console.log(`   Points: ${pointsCount.toLocaleString()}`);
    console.log(`   Vectors config: ${JSON.stringify(collectionInfo.config?.params?.vectors)}`);
    
    return { pointsCount, exists: true };
  } catch (error: any) {
    if (error?.status === 404 || error?.message?.includes('not found')) {
      console.log(`ℹ️  Collection ${collectionName} does not exist`);
      return { pointsCount: 0, exists: false };
    }
    throw error;
  }
}

/**
 * Fetch and analyze products from database
 */
async function analyzeProducts(): Promise<{
  totalProducts: number;
  productsWithImages: number;
  productsWithoutImages: number;
  merchantBreakdown: Record<number, { name: string; total: number; withImages: number }>;
  sampleProducts: Array<{ id: number; name: string; merchantId: number; merchantName: string; imageCount: number }>;
}> {
  console.log('📊 Fetching products from database...');
  
  // Fetch all active products
  const result = await db.products.search({
    isActive: true,
    limit: 10000, // Get all products
    page: 1
  });

  const allProducts = result.data || [];
  const totalProducts = allProducts.length;

  // Analyze products
  const productsWithImages: typeof allProducts = [];
  const productsWithoutImages: typeof allProducts = [];
  const merchantBreakdown: Record<number, { name: string; total: number; withImages: number }> = {};
  const sampleProducts: Array<{ id: number; name: string; merchantId: number; merchantName: string; imageCount: number }> = [];

  for (const product of allProducts) {
    const images = parseProductImages(product.images);
    const imageCount = images.length;
    const merchantId = product.merchant?.id || 0;
    const merchantName = product.merchant?.name || 'Unknown';

    // Update merchant breakdown
    if (!merchantBreakdown[merchantId]) {
      merchantBreakdown[merchantId] = {
        name: merchantName,
        total: 0,
        withImages: 0
      };
    }
    merchantBreakdown[merchantId].total++;
    if (imageCount > 0) {
      merchantBreakdown[merchantId].withImages++;
      productsWithImages.push(product);
    } else {
      productsWithoutImages.push(product);
    }

    // Collect sample products (first 20 with images)
    if (imageCount > 0 && sampleProducts.length < 20) {
      sampleProducts.push({
        id: product.id,
        name: product.name,
        merchantId,
        merchantName,
        imageCount
      });
    }
  }

  return {
    totalProducts,
    productsWithImages: productsWithImages.length,
    productsWithoutImages: productsWithoutImages.length,
    merchantBreakdown,
    sampleProducts
  };
}

/**
 * Main function
 */
async function main() {
  console.log('🔄 Qdrant Collection Full Reset & Regeneration');
  console.log('================================================\n');

  // Check for --confirm flag
  const args = process.argv.slice(2);
  const needsConfirmation = !args.includes('--confirm') && !args.includes('--yes');

  // Check required environment variables
  console.log('🔍 Checking required environment variables...');
  const collectionEnv = process.env.QDRANT_COLLECTION_ENV;
  const databaseUrl = process.env.DATABASE_URL;
  const qdrantUrl = process.env.QDRANT_URL;
  const qdrantApiKey = process.env.QDRANT_API_KEY;
  const pythonApiUrl = process.env.PYTHON_EMBEDDING_API_URL;

  if (!collectionEnv) {
    console.error('\n❌ QDRANT_COLLECTION_ENV is not set (REQUIRED)');
    console.error('   Please set: export QDRANT_COLLECTION_ENV="production" or "development"');
    console.error('   Or use direct collection name: export QDRANT_COLLECTION_ENV="product-images-pro"');
    console.error('   This determines which Qdrant collection to use:');
    console.error('   - production/prod → product-images-pro');
    console.error('   - development/dev → product-images-dev');
    process.exit(1);
  }

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

  // Resolve collection name using same logic as ProductVectorStore
  // This ensures consistency with the rest of the codebase
  const normalized = collectionEnv.replace(/_/g, '-').toLowerCase();
  let collectionName: string;
  if (normalized.startsWith('product-images-')) {
    collectionName = normalized;
  } else {
    const isProduction = normalized === 'production' || normalized === 'prod';
    collectionName = isProduction ? 'product-images-pro' : 'product-images-dev';
  }

  console.log(`   ✅ QDRANT_COLLECTION_ENV: ${collectionEnv}`);
  console.log(`   ✅ Resolved Collection: ${collectionName}`);
  
  // Warn if using production collection
  if (collectionName === 'product-images-pro') {
    console.log(`   ⚠️  WARNING: Using PRODUCTION collection (${collectionName})`);
    console.log(`   ⚠️  Make sure this is intentional!`);
  } else {
    console.log(`   ✅ Using DEVELOPMENT collection (${collectionName})`);
  }
  console.log(`   ✅ DATABASE_URL: ${databaseUrl.substring(0, 50)}...`);
  console.log(`   ✅ QDRANT_URL: ${qdrantUrl.substring(0, 50)}...`);
  console.log(`   ✅ QDRANT_API_KEY: ${qdrantApiKey ? qdrantApiKey.substring(0, 20) + '...' : 'Not set (local Qdrant)'}`);
  console.log(`   ✅ PYTHON_EMBEDDING_API_URL: ${pythonApiUrl}`);

  // Analyze products from database
  console.log('\n📊 Analyzing Products from Database');
  console.log('───────────────────────────────────');
  const productAnalysis = await analyzeProducts();

  // Display product statistics
  console.log(`\n📦 Product Statistics:`);
  console.log(`   Total products: ${productAnalysis.totalProducts.toLocaleString()}`);
  console.log(`   Products with images: ${productAnalysis.productsWithImages.toLocaleString()}`);
  console.log(`   Products without images: ${productAnalysis.productsWithoutImages.toLocaleString()}`);
  console.log(`   Products to regenerate: ${productAnalysis.productsWithImages.toLocaleString()}`);

  // Display merchant breakdown
  console.log(`\n🏢 Merchant Breakdown:`);
  const merchantIds = Object.keys(productAnalysis.merchantBreakdown)
    .map(Number)
    .sort((a, b) => a - b);
  
  for (const merchantId of merchantIds) {
    const merchant = productAnalysis.merchantBreakdown[merchantId];
    console.log(`   Merchant ${merchantId} (${merchant.name}):`);
    console.log(`      Total products: ${merchant.total.toLocaleString()}`);
    console.log(`      With images: ${merchant.withImages.toLocaleString()}`);
    console.log(`      Without images: ${(merchant.total - merchant.withImages).toLocaleString()}`);
  }

  // Display sample products
  if (productAnalysis.sampleProducts.length > 0) {
    console.log(`\n📋 Sample Products (first ${Math.min(20, productAnalysis.sampleProducts.length)} with images):`);
    for (const product of productAnalysis.sampleProducts.slice(0, 20)) {
      console.log(`   [${product.id}] ${product.name} (Merchant ${product.merchantId}: ${product.merchantName}) - ${product.imageCount} image(s)`);
    }
    if (productAnalysis.productsWithImages > 20) {
      console.log(`   ... and ${(productAnalysis.productsWithImages - 20).toLocaleString()} more products`);
    }
  }

  // Get collection info
  console.log(`\n📊 Qdrant Collection Info:`);
  console.log('─────────────────────────');
  const collectionInfo = await getCollectionInfo(collectionName);

  // Estimate time
  const estimatedMinutes = Math.ceil((productAnalysis.productsWithImages * 2) / 60); // ~2 seconds per product
  const estimatedHours = Math.floor(estimatedMinutes / 60);
  const estimatedMins = estimatedMinutes % 60;

  // Confirmation prompt
  if (needsConfirmation) {
    console.log(`\n⚠️  WARNING: This will DELETE all embeddings in the collection!`);
    console.log(`   Collection: ${collectionName}`);
    if (collectionInfo.exists && collectionInfo.pointsCount > 0) {
      console.log(`   Current points in collection: ${collectionInfo.pointsCount.toLocaleString()}`);
    }
    console.log(`   Products to regenerate: ${productAnalysis.productsWithImages.toLocaleString()}`);
    console.log(`   Estimated time: ${estimatedHours > 0 ? `${estimatedHours}h ` : ''}${estimatedMins}m`);
    console.log(`   Image search will be unavailable during regeneration`);
    console.log(`\n   To proceed, run with --confirm flag:`);
    console.log(`   yarn reset:qdrant-collection --confirm`);
    process.exit(0);
  }

  console.log(`\n✅ Confirmation received, proceeding with reset...`);
  console.log(`   Products to regenerate: ${productAnalysis.productsWithImages.toLocaleString()}`);
  console.log(`   Estimated time: ${estimatedHours > 0 ? `${estimatedHours}h ` : ''}${estimatedMins}m\n`);

  try {
    // Initialize vector store
    const vectorStore = getVectorStore();
    
    // Step 1: Delete collection
    console.log('📦 STEP 1: Deleting Qdrant Collection');
    console.log('────────────────────────────────────');
    
    if (collectionInfo.exists && collectionInfo.pointsCount > 0) {
      console.log(`⚠️  Collection has ${collectionInfo.pointsCount.toLocaleString()} points`);
      console.log(`   All embeddings will be deleted!`);
    }
    
    // Delete collection
    console.log(`\n🗑️  Deleting collection: ${collectionName}...`);
    const wasDeleted = await vectorStore.deleteCollection();
    
    if (wasDeleted) {
      console.log(`✅ Collection deleted successfully`);
    } else {
      console.log(`ℹ️  Collection was already deleted or doesn't exist`);
    }

    console.log('\n✅ Step 1 completed: Collection deleted\n');

    // Step 2: Initialize new collection
    console.log('📦 STEP 2: Initializing New Collection');
    console.log('───────────────────────────────────────');
    await vectorStore.initialize();
    console.log('✅ Step 2 completed: Collection initialized\n');

    // Step 3: Regenerate all embeddings
    console.log('📦 STEP 3: Regenerating All Product Embeddings');
    console.log('───────────────────────────────────────────────');
    console.log('⏱️  This may take a while depending on number of products...\n');
    
    const startTime = Date.now();
    await generateAllProductEmbeddings({
      batchSize: 5, // Increased batch size for faster processing
      skipExisting: false, // Overwrite (collection is empty anyway)
      merchantId: undefined, // Regenerate for all merchants
      delayBetweenBatches: 3000, // 3 seconds delay between batches
      maxRetries: 2, // Retry up to 2 times per product
    });
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    
    console.log(`\n✅ Step 3 completed: All embeddings regenerated (took ${duration} minutes)\n`);

    // Step 4: Verify collection
    console.log('📦 STEP 4: Verifying Collection');
    console.log('───────────────────────────────');
    try {
      const collectionInfo = await vectorStore.getCollectionInfo();
      const pointsCount = collectionInfo.points_count || 0;
      console.log(`✅ Collection verified:`);
      console.log(`   Name: ${collectionName}`);
      console.log(`   Points: ${pointsCount.toLocaleString()}`);
      console.log(`   Status: ${collectionInfo.status || 'OK'}`);
    } catch (error) {
      console.warn('⚠️  Could not verify collection info:', error);
    }

    console.log('\n🎉 Full reset completed successfully!');
    console.log('✅ Collection has been reset and all embeddings regenerated');
    console.log('✅ Image search is now available with correct merchantId filtering');

  } catch (error: any) {
    console.error('\n❌ Error during reset:', error);
    console.error('   Error message:', error?.message);
    if (error?.stack) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
