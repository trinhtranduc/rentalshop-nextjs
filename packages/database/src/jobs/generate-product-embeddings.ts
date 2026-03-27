/**
 * Background Jobs để Generate Product Embeddings
 * Tự động tạo embeddings khi có sản phẩm mới hoặc cập nhật
 */

import { getEmbeddingService } from '../ml/image-embeddings';
import { getVectorStore } from '../ml/vector-store';
import { db } from '../index';
import { prisma } from '../client';
import { randomUUID } from 'crypto';
import { extractKeyFromImageUrl, parseProductImages } from '@rentalshop/utils';

function resolveEmbeddingBucketName(): string {
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  if (process.env.AWS_S3_BUCKET_NAME) {
    return process.env.AWS_S3_BUCKET_NAME;
  }
  if (env === 'production' || env === 'prod') {
    return 'anyrent-images-pro';
  }
  return 'anyrent-images-dev';
}

// In-process dedupe: avoid running concurrent embedding jobs for same product.
const runningEmbeddingJobs = new Map<number, Promise<void>>();
const lastEmbeddingCompletedAt = new Map<number, number>();

function getEmbeddingCooldownMs(): number {
  const configured = process.env.EMBEDDING_REGEN_COOLDOWN_MS;
  if (configured) {
    const parsed = Number(configured);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  return env === 'production' || env === 'prod' ? 300000 : 120000; // 5m prod, 2m dev
}

/**
 * Generate và store embeddings cho TẤT CẢ images của một product
 * Mỗi image sẽ có UUID riêng trong Qdrant
 * 
 * @param productId - Product ID (number)
 */
async function runGenerateProductEmbedding(productId: number): Promise<void> {
  const jobStart = Date.now();
  try {
    console.log(`[Embedding] Step 1: Fetch product ${productId}`);
    const product = await db.products.findById(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }
    console.log(`[Embedding] Step 1 done: product "${product.name}" (id=${product.id})`);

    const images = parseProductImages(product.images);
    if (images.length === 0) {
      console.log(`[Embedding] ⚠️ Product ${productId} has no images, skipping`);
      return;
    }
    console.log(`[Embedding] Step 2: Parsed ${images.length} image URL(s)`);

    const merchantId = (product as any).merchantId ?? (product as any).merchant?.id;
    const categoryId = (product as any).categoryId ?? (product as any).category?.id;

    console.log(`[Embedding] Step 3: Config check`, {
      productId: product.id,
      name: product.name,
      merchantId: merchantId,
      categoryId: categoryId,
      imagesCount: images.length
    });

    const pythonApiUrl = process.env.PYTHON_EMBEDDING_API_URL;
    console.log(`[Embedding]    PYTHON_EMBEDDING_API_URL: ${pythonApiUrl ? 'SET' : 'NOT SET'}`);

    if (!pythonApiUrl) {
      console.error(`[Embedding] ❌ PYTHON_EMBEDDING_API_URL is not set!`);
      console.error(`   This is required for generating embeddings`);
      console.error(`   Current environment variables:`);
      console.error(`     - QDRANT_COLLECTION_ENV: ${process.env.QDRANT_COLLECTION_ENV || 'not set'}`);
      console.error(`     - APP_ENV: ${process.env.APP_ENV || 'not set'}`);
      console.error(`     - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
      console.error(`     - APP_ENV: ${process.env.APP_ENV || 'undefined'}`);
      console.error(`     - PYTHON_EMBEDDING_API_URL: ${process.env.PYTHON_EMBEDDING_API_URL || 'NOT SET'}`);
      console.error(`   💡 Fix: Set PYTHON_EMBEDDING_API_URL in your environment variables`);
      throw new Error('PYTHON_EMBEDDING_API_URL must be set to generate embeddings');
    }

    console.log(`[Embedding] Step 4: Init embedding service + vector store`);
    const embeddingService = getEmbeddingService();
    const vectorStore = getVectorStore();
    const collectionName = (vectorStore as any).collectionName;
    console.log(`[Embedding]    Collection: ${collectionName}, QDRANT_COLLECTION_ENV: ${process.env.QDRANT_COLLECTION_ENV || 'not set'}`);

    try {
      await vectorStore.initialize();
      console.log(`[Embedding] Step 4 done: Qdrant collection ready`);
    } catch (error) {
      console.warn(`[Embedding] Step 4: Init collection warning (may already exist):`, (error as Error)?.message);
    }

    console.log(`[Embedding] Step 5: Generate vectors via Python API (${images.length} image(s))`);
    const embeddings: Array<{
      imageId: string;
      embedding: number[];
      metadata: {
        productId: string;
        imageUrl: string;
        merchantId: string;
        categoryId?: string;
        productName: string;
      };
    } | null> = [];

    const buildEmbeddingPayload = (imageUrl: string, embedding: number[]) => {
      // Get merchantId - ensure we get the correct publicId (number)
      // Product from db.products.findById may have merchantId directly or via merchant.id
      const merchantId = (product as any).merchantId ?? (product as any).merchant?.id;
      if (!merchantId) {
        throw new Error(`Product ${product.id} missing merchantId`);
      }

      // Get categoryId - ensure we get the correct publicId (number)
      const categoryId = (product as any).categoryId ?? (product as any).category?.id;

      return {
        imageId: randomUUID(), // UUID cho mỗi image
        embedding,
        metadata: {
          productId: String(product.id),
          imageUrl,
          merchantId: String(merchantId), // Store as string of publicId (number)
          categoryId: categoryId ? String(categoryId) : undefined,
          productName: product.name
        }
      };
    };

    const normalizedImageUrls = images
      .filter((imageUrl) => typeof imageUrl === 'string' && imageUrl.trim() !== '')
      .map((imageUrl) => imageUrl.trim());

    const imagesWithS3Keys: Array<{ imageUrl: string; s3Key: string }> = [];
    const imagesWithoutS3Keys: string[] = [];
    for (const imageUrl of normalizedImageUrls) {
      const s3Key = extractKeyFromImageUrl(imageUrl);
      if (s3Key) {
        imagesWithS3Keys.push({ imageUrl, s3Key });
      } else {
        imagesWithoutS3Keys.push(imageUrl);
      }
    }

    // Primary path: direct S3 batch embedding (lower transfer + lower compute cost)
    if (imagesWithS3Keys.length > 0) {
      const bucketName = resolveEmbeddingBucketName();
      const awsRegion = process.env.AWS_REGION || 'ap-southeast-1';
      try {
        console.log(
          `[Embedding]    Using s3-batch for ${imagesWithS3Keys.length}/${normalizedImageUrls.length} image(s), bucket=${bucketName}`
        );
        const s3Embeddings = await embeddingService.generateEmbeddingsFromS3Keys(
          imagesWithS3Keys.map((item) => item.s3Key),
          bucketName,
          awsRegion
        );

        // Guard against response mismatch to avoid wrong image-vector pairing.
        if (s3Embeddings.length !== imagesWithS3Keys.length) {
          throw new Error(
            `s3-batch mismatch: expected ${imagesWithS3Keys.length}, got ${s3Embeddings.length}`
          );
        }

        s3Embeddings.forEach((embedding, index) => {
          embeddings.push(buildEmbeddingPayload(imagesWithS3Keys[index].imageUrl, embedding));
        });
      } catch (error) {
        console.warn(
          `[Embedding]    s3-batch failed, fallback to per-image for keyed images:`,
          (error as Error)?.message
        );
        imagesWithoutS3Keys.push(...imagesWithS3Keys.map((item) => item.imageUrl));
      }
    }

    // Fallback path: per-image embedding API
    if (imagesWithoutS3Keys.length > 0) {
      const perImageEmbeddings = await Promise.all(
        imagesWithoutS3Keys.map(async (imageUrl, index) => {
          try {
            console.log(
              `[Embedding]    Fallback image ${index + 1}/${imagesWithoutS3Keys.length}: fetch + embed ${imageUrl.substring(0, 55)}...`
            );
            const embeddingStartTime = Date.now();
            const embedding = await embeddingService.generateEmbedding(imageUrl);
            const embeddingDuration = Date.now() - embeddingStartTime;
            console.log(`[Embedding]    Fallback image ${index + 1} done: ${embeddingDuration}ms, dim=${embedding.length}`);
            return buildEmbeddingPayload(imageUrl, embedding);
          } catch (error) {
            console.error(`[Embedding]    Fallback image ${index + 1} failed:`, (error as Error)?.message);
            return null;
          }
        })
      );
      embeddings.push(...perImageEmbeddings);
    }

    const validEmbeddings = embeddings.filter(e => e !== null) as Array<{
      imageId: string;
      embedding: number[];
      metadata: any;
    }>;

    if (validEmbeddings.length === 0) {
      console.log(`[Embedding] ⚠️ Step 5: No valid embeddings for product ${productId}`);
      return;
    }
    console.log(`[Embedding] Step 5 done: ${validEmbeddings.length} vector(s)`);

    console.log(`[Embedding] Step 6: Upsert to Qdrant (${collectionName}), productId=${product.id}`);
    console.log(`[Embedding]    Point IDs:`, validEmbeddings.map(e => e.imageId));

    try {
      await vectorStore.storeProductImagesEmbeddings(validEmbeddings);
      const step6Ms = Date.now() - jobStart;
      console.log(`[Embedding] Step 6 done: upserted ${validEmbeddings.length} point(s) in ${step6Ms}ms`);

      try {
        await db.products.update(productId, {
          embeddingGeneratedAt: new Date()
        });
        console.log(`[Embedding] Step 7: Set embeddingGeneratedAt for product ${productId}`);
      } catch (updateError) {
        console.warn(`[Embedding] Step 7: Update embeddingGeneratedAt failed:`, (updateError as Error)?.message);
      }

      try {
        const collectionInfo = await vectorStore.getCollectionInfo();
        console.log(`[Embedding] Step 8: Collection ${collectionName} points_count=${collectionInfo.points_count ?? '?'}`);
      } catch (verifyError) {
        console.warn(`[Embedding] Step 8: getCollectionInfo failed:`, (verifyError as Error)?.message);
      }

      console.log(`[Embedding] ✅ Job done for product ${productId} in ${Date.now() - jobStart}ms`);
    } catch (storeError: any) {
      console.error(`[Embedding] ❌ Step 6 failed (Qdrant upsert):`, storeError?.message);
      throw storeError;
    }
  } catch (error) {
    console.error(`[Embedding] ❌ Job failed for product ${productId}:`, (error as Error)?.message);
    throw error;
  }
}

/**
 * Public API with in-process dedupe.
 * If a job for the same product is already running, reuse that promise instead of starting a new one.
 */
export async function generateProductEmbedding(productId: number): Promise<void> {
  const existing = runningEmbeddingJobs.get(productId);
  if (existing) {
    console.log(`[Embedding] Reusing in-flight job for product ${productId}`);
    return existing;
  }

  const cooldownMs = getEmbeddingCooldownMs();
  const lastCompleted = lastEmbeddingCompletedAt.get(productId);
  if (lastCompleted) {
    const elapsed = Date.now() - lastCompleted;
    if (elapsed < cooldownMs) {
      const remainingMs = cooldownMs - elapsed;
      console.log(
        `[Embedding] Skipping product ${productId}: cooldown active (${Math.ceil(
          remainingMs / 1000
        )}s remaining)`
      );
      return;
    }
  }

  const job = (async () => {
    try {
      await runGenerateProductEmbedding(productId);
      lastEmbeddingCompletedAt.set(productId, Date.now());
    } finally {
      runningEmbeddingJobs.delete(productId);
    }
  })();

  runningEmbeddingJobs.set(productId, job);
  return job;
}

/**
 * Generate embeddings cho tất cả products (batch processing)
 * 
 * @param options - Options cho batch processing
 */
export async function generateAllProductEmbeddings(
  options: {
    merchantId?: number;
    batchSize?: number;
    skipExisting?: boolean;
    delayBetweenBatches?: number; // Delay in ms between batches
    maxRetries?: number; // Max retries per product
  } = {}
): Promise<void> {
  const { 
    merchantId, 
    batchSize = 5, // Increased to 5 for faster processing
    skipExisting = false,
    delayBetweenBatches = 2000, // 2 seconds delay between batches
    maxRetries = 2 // Retry up to 2 times
  } = options;

  console.log('🚀 Starting batch embedding generation...');
  console.log(`📊 Options:`, { merchantId, batchSize, skipExisting });

  try {
    // Fetch all products
    const products = await db.products.search({
      merchantId,
      limit: 10000, // Lấy tất cả products
      isActive: true
    });

    const productList = products.data || [];
    console.log(`📊 Found ${productList.length} products`);

    // Filter products with images
    const productsWithImages = productList.filter((p: { images: any }) => {
      const images = parseProductImages(p.images);
      
      if (images.length === 0) return false;
      
      const imageUrl = images[0];
      return imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '';
    });

    console.log(`📊 Found ${productsWithImages.length} products with images`);

    if (productsWithImages.length === 0) {
      console.log('⚠️ No products with images found');
      return;
    }

    // Process in batches
    const embeddingService = getEmbeddingService();
    const vectorStore = getVectorStore();

    // Initialize collection if needed (creates collection and indexes)
    try {
      await vectorStore.initialize();
    } catch (error) {
      console.error(`⚠️ Failed to initialize Qdrant collection:`, error);
      // Continue anyway - collection might already exist
    }

    let processed = 0;
    let errors = 0;

    // Helper function to retry with exponential backoff
    // For production, use longer delays between retries
    const isProduction = process.env.QDRANT_COLLECTION_ENV === 'production' || 
                         process.env.QDRANT_COLLECTION_ENV === 'prod' ||
                         process.env.NODE_ENV === 'production';
    const baseRetryDelay = isProduction ? 5000 : 1000; // 5s for production, 1s for dev
    
    const retryWithBackoff = async <T>(
      fn: () => Promise<T>,
      retries: number = maxRetries,
      delay: number = baseRetryDelay
    ): Promise<T> => {
      try {
        return await fn();
      } catch (error) {
        if (retries > 0) {
          const backoffDelay = delay * (maxRetries - retries + 1) * 2; // Exponential backoff
          console.log(`   ⚠️ Retry in ${(backoffDelay/1000).toFixed(1)}s... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          return retryWithBackoff(fn, retries - 1, delay);
        }
        throw error;
      }
    };

    for (let i = 0; i < productsWithImages.length; i += batchSize) {
      const batch = productsWithImages.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(productsWithImages.length / batchSize);

      // Display batch header with current progress
      const currentProgress = ((i / productsWithImages.length) * 100).toFixed(1);
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 Batch ${batchNumber}/${totalBatches} (${batch.length} products) | Current Progress: ${currentProgress}%`);
      console.log(`${'='.repeat(60)}`);

      // Process products in parallel within batch for faster processing
      // Use Promise.all with controlled concurrency to avoid overwhelming the API
      const embeddings = await Promise.all(
        batch.map(async (product: { images: any; id: number; name: string; merchantId?: number; merchant?: { id: number }; categoryId?: number; category?: { id: number } }) => {
        try {
          const images = parseProductImages(product.images);
          const imageUrl = images[0];

          if (!imageUrl) {
            console.log(`⚠️ Product ${product.id}: No image URL, skipping`);
              return null;
            }

            // Check if we should skip existing embeddings
            if (skipExisting) {
              // Note: Skip check is done at batch level for performance
              // Individual product check would be too slow for large datasets
          }

          // Generate embedding with retry
          const embedding = await retryWithBackoff(
            () => embeddingService.generateEmbedding(imageUrl),
            maxRetries,
            2000 // 2 second base delay
          );
          
          // Get merchantId - ensure we get the correct publicId (number)
          // Product from db.products.search may have merchantId directly or via merchant.id
          const productMerchantId = (product as any).merchantId ?? (product as any).merchant?.id;
          if (!productMerchantId) {
            throw new Error(`Product ${product.id} missing merchantId`);
          }
          
          // Get categoryId - ensure we get the correct publicId (number)
          const categoryId = (product as any).categoryId ?? (product as any).category?.id;
          
            return {
            productId: product.id,
            embedding,
            pointId: randomUUID(), // Generate UUID for Qdrant point ID
            metadata: {
              productId: String(product.id),
              imageUrl,
              merchantId: String(productMerchantId), // Store as string of publicId (number)
              categoryId: categoryId ? String(categoryId) : undefined,
              productName: product.name
            }
            };
        } catch (error) {
          console.error(`❌ Error processing product ${product.id}:`, error);
            return null;
        }
        })
      );

      // Filter out nulls (errors)
      const validEmbeddings = embeddings.filter(e => e !== null) as Array<{
        productId: number;
        embedding: number[];
        pointId: string;
        metadata: any;
      }>;

      // Store in batch with retry
      if (validEmbeddings.length > 0) {
        try {
          await retryWithBackoff(
            () => vectorStore.storeEmbeddingsBatch(validEmbeddings),
            maxRetries,
            1000
          );
          processed += validEmbeddings.length;
        } catch (error) {
          console.error(`❌ Error storing batch ${batchNumber}:`, error);
          errors += validEmbeddings.length;
        }
      }

      // Calculate and display progress
      const progress = ((processed / productsWithImages.length) * 100).toFixed(2);
      const remaining = productsWithImages.length - processed;
      
      // Progress bar
      const barWidth = 40;
      const filled = Math.floor((processed / productsWithImages.length) * barWidth);
      const empty = barWidth - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      
      // Estimated time remaining (assuming ~2.5 seconds per product on average)
      const avgTimePerProduct = 2.5;
      const estimatedSecondsRemaining = remaining * avgTimePerProduct;
      const estimatedMinutes = Math.floor(estimatedSecondsRemaining / 60);
      const estimatedHours = Math.floor(estimatedMinutes / 60);
      const estimatedMins = estimatedMinutes % 60;
      
      // Display progress
      console.log(`\n📊 Progress:`);
      console.log(`   Batch: ${batchNumber}/${totalBatches} | Processed: ${processed}/${productsWithImages.length} | Errors: ${errors}`);
      console.log(`   [${bar}] ${progress}%`);
      if (remaining > 0) {
        if (estimatedHours > 0) {
          console.log(`   ⏱️  Estimated time remaining: ${estimatedHours}h ${estimatedMins}m`);
        } else {
          console.log(`   ⏱️  Estimated time remaining: ${estimatedMins}m`);
        }
      }
      console.log(`   ✅ Stored ${validEmbeddings.length} embeddings in this batch`);

      // Delay between batches to avoid overwhelming the system
      if (i + batchSize < productsWithImages.length && delayBetweenBatches > 0) {
        console.log(`   ⏳ Waiting ${(delayBetweenBatches / 1000).toFixed(1)}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    console.log('\n✅ Batch embedding generation completed!');
    console.log(`📊 Summary: ${processed} processed, ${errors} errors`);
  } catch (error) {
    console.error('❌ Error in batch embedding generation:', error);
    throw error;
  }
}
