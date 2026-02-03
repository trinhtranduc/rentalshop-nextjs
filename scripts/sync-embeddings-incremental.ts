/**
 * Incremental Embedding Sync - Chỉ sync những gì thiếu/thay đổi
 * 
 * Giải pháp đồng bộ nhanh chóng:
 * 1. So sánh Database (S3 images) với Qdrant (embeddings)
 * 2. Chỉ generate embeddings cho products thiếu/thay đổi
 * 3. Batch processing tối ưu với parallel workers
 * 4. Progress tracking realtime
 * 
 * Performance:
 * - Full sync: ~5-10 phút cho 1.5k images
 * - Incremental sync: ~30 giây - 2 phút (chỉ sync missing)
 * 
 * Usage:
 *   QDRANT_COLLECTION_ENV=production \
 *   yarn tsx scripts/sync-embeddings-incremental.ts --yes
 * 
 * Options:
 *   --merchant-id=123   Sync specific merchant only
 *   --force             Force regenerate all (skip comparison)
 *   --batch-size=50     Batch size for processing (default: 50)
 *   --workers=5         Number of parallel workers (default: 5)
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

// Load environment variables (priority: .env.production/.env.development > .env.local > .env)
const collectionEnv = process.env.QDRANT_COLLECTION_ENV;
if (collectionEnv) {
  const normalized = collectionEnv.replace(/_/g, '-').toLowerCase();
  if (normalized === 'production' || normalized === 'prod') {
    const prodEnvPath = resolve(process.cwd(), '.env.production');
    loadEnvFile(prodEnvPath);
    console.log(`📦 Loaded .env.production for production environment`);
  } else {
    const devEnvPath = resolve(process.cwd(), '.env.development');
    loadEnvFile(devEnvPath);
    console.log(`📦 Loaded .env.development for development environment`);
  }
}

const envLocalPath = resolve(process.cwd(), '.env.local');
loadEnvFile(envLocalPath);

const envPath = resolve(process.cwd(), '.env');
loadEnvFile(envPath);

import { PrismaClient, Prisma } from '@prisma/client';
import { getEmbeddingService, getVectorStore } from '../packages/database/src/server';
import { extractKeyFromImageUrl, getBucketName, parseProductImages } from '@rentalshop/utils';
import { randomUUID } from 'crypto';

interface ProductWithImage {
  id: string; // CUID
  name: string;
  images: any;
  merchantId: string;
  categoryId?: string | null;
  updatedAt: Date;
}

interface QdrantPoint {
  id: string;
  payload?: {
    productId?: string;
    imageUrl?: string;
    updatedAt?: string;
  };
}

interface SyncResult {
  total: number;
  missing: number;
  outdated: number;
  upToDate: number;
  processed: number;
  errors: number;
}

/**
 * Get all products with images from database
 */
async function getProductsWithImages(prisma: PrismaClient, merchantId?: number): Promise<ProductWithImage[]> {
  const where: any = {
    images: { not: Prisma.JsonNull },
    isActive: true
  };

  if (merchantId) {
    // Find merchant by publicId (number) - need to get all and filter
    // Or use a different approach - for now, skip merchant filter if merchantId is provided
    // TODO: Implement proper merchant lookup by publicId
    const merchant = await prisma.merchant.findFirst({
      where: { 
        // Note: Prisma doesn't have publicId in where, need to fetch all and filter
        // For now, we'll skip merchant filter
      }
    });
    // For now, skip merchant filtering - will need to implement proper lookup
    console.warn(`⚠️  Merchant filtering by publicId not yet implemented, processing all products`);
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true, // CUID
      name: true,
      images: true,
      merchantId: true,
      categoryId: true,
      updatedAt: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  return products
    .filter(p => {
      const images = parseProductImages(p.images);
      return images.length > 0;
    })
    .map(p => ({
      id: String(p.id), // Ensure CUID is string
      name: p.name,
      images: p.images,
      merchantId: String(p.merchantId),
      categoryId: p.categoryId ? String(p.categoryId) : null,
      updatedAt: p.updatedAt
    })) as ProductWithImage[];
}

/**
 * Get all embeddings from Qdrant for comparison
 */
async function getAllQdrantPoints(vectorStore: any): Promise<Map<string, QdrantPoint>> {
  console.log('🔍 Fetching all Qdrant points for comparison...');
  const pointsMap = new Map<string, QdrantPoint>();
  
  try {
    const qdrantClient = (vectorStore as any).client;
    const collectionName = (vectorStore as any).collectionName;
    
    let offset: string | undefined = undefined;
    let hasMore = true;
    let totalFetched = 0;

    while (hasMore) {
      const scrollResult = await qdrantClient.scroll(collectionName, {
        limit: 100,
        offset,
        with_payload: true,
        with_vector: false // Don't need vectors for comparison
      });

      const points = scrollResult.points || [];
      totalFetched += points.length;

      for (const point of points) {
        const productId = point.payload?.productId;
        if (productId) {
          // Store by productId for quick lookup
          pointsMap.set(productId, point);
        }
      }

      offset = scrollResult.next_page_offset;
      hasMore = !!offset && points.length > 0;
      
      if (totalFetched % 500 === 0) {
        console.log(`   📊 Fetched ${totalFetched} points...`);
      }
    }

    console.log(`✅ Fetched ${totalFetched} total points from Qdrant`);
    return pointsMap;
  } catch (error: any) {
    console.error('❌ Error fetching Qdrant points:', error.message);
    return pointsMap;
  }
}

/**
 * Compare database products with Qdrant embeddings
 */
function findMissingAndOutdated(
  products: ProductWithImage[],
  qdrantPoints: Map<string, QdrantPoint>
): {
  missing: ProductWithImage[];
  outdated: ProductWithImage[];
  upToDate: ProductWithImage[];
} {
  const missing: ProductWithImage[] = [];
  const outdated: ProductWithImage[] = [];
  const upToDate: ProductWithImage[] = [];

  for (const product of products) {
    const productId = product.id; // Use CUID for comparison
    const qdrantPoint = qdrantPoints.get(productId);

    if (!qdrantPoint) {
      // Product has no embedding in Qdrant
      missing.push(product);
    } else {
      // Check if product was updated after embedding was created
      const productUpdatedAt = new Date(product.updatedAt).getTime();
      const embeddingUpdatedAt = qdrantPoint.payload?.updatedAt 
        ? new Date(qdrantPoint.payload.updatedAt).getTime()
        : 0;

      if (productUpdatedAt > embeddingUpdatedAt) {
        // Product was updated, need to regenerate embedding
        outdated.push(product);
      } else {
        // Embedding is up to date
        upToDate.push(product);
      }
    }
  }

  return { missing, outdated, upToDate };
}

/**
 * Process batch of products (generate embeddings and store in Qdrant)
 */
async function processBatch(
  products: ProductWithImage[],
  embeddingService: any,
  vectorStore: any,
  bucketName: string,
  awsRegion: string
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  // Collect S3 keys for batch
  const batchData: Array<{ product: ProductWithImage; imageUrl: string; s3Key: string }> = [];
  
  for (const product of products) {
    const images = parseProductImages(product.images);
    const imageUrl = images[0]; // Use first image
    if (imageUrl) {
      const s3Key = extractKeyFromImageUrl(imageUrl);
      if (s3Key) {
        batchData.push({ product, imageUrl, s3Key });
      }
    }
  }

  if (batchData.length === 0) {
    return { processed: 0, errors: products.length };
  }

  try {
    const s3Keys = batchData.map(d => d.s3Key);
    
    // Generate embeddings using S3 direct access
    const embeddings = await embeddingService.generateEmbeddingsFromS3Keys(
      s3Keys,
      bucketName,
      awsRegion
    );

    // Create results for Qdrant
    const results: Array<{
      imageId: string;
      embedding: number[];
      metadata: {
        productId: string;
        imageUrl: string;
        merchantId: string;
        categoryId?: string;
        productName: string;
        updatedAt: string;
      };
    }> = [];
    for (let i = 0; i < embeddings.length && i < batchData.length; i++) {
      const { product, imageUrl } = batchData[i];
      results.push({
        imageId: randomUUID(),
        embedding: embeddings[i],
        metadata: {
          productId: String(product.id), // Use CUID as string
          imageUrl,
          merchantId: String(product.merchantId),
          categoryId: product.categoryId ? String(product.categoryId) : undefined,
          productName: product.name,
          updatedAt: new Date().toISOString()
        }
      });
    }

    // Store in Qdrant
    if (results.length > 0) {
      await vectorStore.storeProductImagesEmbeddings(results as any);
      processed = results.length;
    }
  } catch (error: any) {
    console.error(`❌ Error processing batch:`, error.message);
    errors = products.length;
  }

  return { processed, errors };
}

/**
 * Process products with parallel workers
 */
async function processWithWorkers(
  products: ProductWithImage[],
  embeddingService: any,
  vectorStore: any,
  bucketName: string,
  awsRegion: string,
  batchSize: number,
  workers: number
): Promise<{ processed: number; errors: number }> {
  let totalProcessed = 0;
  let totalErrors = 0;

  // Split products into batches
  const batches: ProductWithImage[][] = [];
  for (let i = 0; i < products.length; i += batchSize) {
    batches.push(products.slice(i, i + batchSize));
  }

  console.log(`\n🚀 Processing ${products.length} products in ${batches.length} batches with ${workers} workers...\n`);

  // Process batches with limited concurrency
  for (let i = 0; i < batches.length; i += workers) {
    const workerBatches = batches.slice(i, i + workers);
    
    const results = await Promise.all(
      workerBatches.map(batch => 
        processBatch(batch, embeddingService, vectorStore, bucketName, awsRegion)
      )
    );

    for (const result of results) {
      totalProcessed += result.processed;
      totalErrors += result.errors;
    }

    const progress = Math.min(i + workers, batches.length);
    console.log(`📊 Progress: ${progress}/${batches.length} batches (${totalProcessed} processed, ${totalErrors} errors)`);

    // Small delay between worker groups to avoid overwhelming API
    if (i + workers < batches.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { processed: totalProcessed, errors: totalErrors };
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const yes = args.includes('--yes');
  
  let merchantId: number | undefined;
  let batchSize = 50;
  let workers = 5;

  // Parse arguments
  for (const arg of args) {
    if (arg.startsWith('--merchant-id=')) {
      merchantId = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--batch-size=')) {
      batchSize = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--workers=')) {
      workers = parseInt(arg.split('=')[1], 10);
    }
  }

  if (!yes) {
    console.log('⚠️  This script will sync embeddings incrementally (only missing/outdated)');
    console.log('   Use --yes to skip confirmation\n');
    process.exit(1);
  }

  console.log('🚀 Incremental Embedding Sync');
  console.log('============================================\n');

  // Check AWS credentials
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  // Debug: Check if credentials are loaded
  console.log(`🔍 AWS Credentials Check:`);
  console.log(`   AWS_ACCESS_KEY_ID: ${awsAccessKeyId ? '✅ Found (' + awsAccessKeyId.substring(0, 8) + '...)' : '❌ Missing'}`);
  console.log(`   AWS_SECRET_ACCESS_KEY: ${awsSecretAccessKey ? '✅ Found (' + awsSecretAccessKey.substring(0, 8) + '...)' : '❌ Missing'}`);
  console.log('');
  
  if (!awsAccessKeyId || !awsSecretAccessKey) {
    console.error('❌ Missing AWS credentials');
    console.error('   Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    console.error('   Make sure they are in .env.development or .env.local file');
    process.exit(1);
  }

  const vectorStore = getVectorStore();
  const embeddingService = getEmbeddingService();
  const bucketName = getBucketName();
  const awsRegion = process.env.AWS_REGION || 'ap-southeast-1';

  console.log(`📦 Collection: ${(vectorStore as any).collectionName}`);
  console.log(`📦 Batch Size: ${batchSize}`);
  console.log(`⚡ Workers: ${workers}`);
  console.log(`🔑 AWS Region: ${awsRegion}`);
  console.log(`🪣 S3 Bucket: ${bucketName}`);
  if (merchantId) {
    console.log(`🏢 Merchant ID: ${merchantId}`);
  }
  console.log('');

  const prisma = new PrismaClient();

  try {
    // Step 1: Get all products with images
    console.log('📊 Step 1: Fetching products from database...');
    const products = await getProductsWithImages(prisma, merchantId);
    console.log(`✅ Found ${products.length} products with images\n`);

    if (products.length === 0) {
      console.log('✅ No products to sync');
      return;
    }

    // Step 2: Compare with Qdrant (unless force mode)
    let productsToSync: ProductWithImage[] = [];
    let syncResult: SyncResult;

    if (force) {
      console.log('🔄 Force mode: Will regenerate all embeddings\n');
      productsToSync = products;
      syncResult = {
        total: products.length,
        missing: products.length,
        outdated: 0,
        upToDate: 0,
        processed: 0,
        errors: 0
      };
    } else {
      console.log('🔍 Step 2: Comparing database with Qdrant...');
      const qdrantPoints = await getAllQdrantPoints(vectorStore);
      console.log('');

      const comparison = findMissingAndOutdated(products, qdrantPoints);
      productsToSync = [...comparison.missing, ...comparison.outdated];
      
      syncResult = {
        total: products.length,
        missing: comparison.missing.length,
        outdated: comparison.outdated.length,
        upToDate: comparison.upToDate.length,
        processed: 0,
        errors: 0
      };

      console.log('📊 Comparison Results:');
      console.log(`   Total products: ${syncResult.total}`);
      console.log(`   ✅ Up to date: ${syncResult.upToDate}`);
      console.log(`   ❌ Missing: ${syncResult.missing}`);
      console.log(`   🔄 Outdated: ${syncResult.outdated}`);
      console.log(`   📝 To sync: ${productsToSync.length}\n`);

      if (productsToSync.length === 0) {
        console.log('✅ All embeddings are up to date!');
        return;
      }
    }

    // Step 3: Process products to sync
    console.log('🚀 Step 3: Generating embeddings...');
    const startTime = Date.now();
    
    const processResult = await processWithWorkers(
      productsToSync,
      embeddingService,
      vectorStore,
      bucketName,
      awsRegion,
      batchSize,
      workers
    );

    syncResult.processed = processResult.processed;
    syncResult.errors = processResult.errors;

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n✅ Sync completed!');
    console.log('============================================');
    console.log(`📊 Total products: ${syncResult.total}`);
    console.log(`✅ Up to date: ${syncResult.upToDate}`);
    console.log(`🔄 Synced: ${syncResult.processed}`);
    console.log(`❌ Errors: ${syncResult.errors}`);
    console.log(`⏱️  Duration: ${duration} minutes`);
    console.log(`⚡ Speed: ${syncResult.processed > 0 ? ((syncResult.processed / parseFloat(duration)).toFixed(1)) : 0} products/minute`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
