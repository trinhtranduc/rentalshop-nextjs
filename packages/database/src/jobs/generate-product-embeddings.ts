/**
 * Background Jobs để Generate Product Embeddings
 * Tự động tạo embeddings khi có sản phẩm mới hoặc cập nhật
 */

import { getEmbeddingService } from '../ml/image-embeddings';
import { getVectorStore } from '../ml/vector-store';
import { db } from '../index';
import { prisma } from '../client';
import { randomUUID } from 'crypto';
import { parseProductImages } from '@rentalshop/utils';

/**
 * Generate và store embeddings cho TẤT CẢ images của một product
 * Mỗi image sẽ có UUID riêng trong Qdrant
 * 
 * @param productId - Product ID (number)
 */
export async function generateProductEmbedding(productId: number): Promise<void> {
  try {
    // Fetch product
    const product = await db.products.findById(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    // Parse images (support multiple formats)
    const images = parseProductImages(product.images);

    if (images.length === 0) {
      console.log(`⚠️ Product ${productId} has no images, skipping`);
      return;
    }

    // Get merchantId - ensure we get the correct publicId (number)
    const merchantId = (product as any).merchantId ?? (product as any).merchant?.id;
    const categoryId = (product as any).categoryId ?? (product as any).category?.id;
    
    console.log(`🔄 Generating embeddings for product ${productId} (${images.length} image(s))...`);
    console.log(`   Product details:`, {
      id: product.id,
      name: product.name,
      merchantId: merchantId,
      categoryId: categoryId,
      imagesCount: images.length
    });

    // Check Python API configuration
    // USE_PYTHON_EMBEDDING_API defaults to true (Python embedding service is the default)
    const pythonApiUrl = process.env.PYTHON_EMBEDDING_API_URL;
    console.log(`   Python API config:`, {
      PYTHON_EMBEDDING_API_URL: pythonApiUrl || 'NOT SET'
    });

    if (!pythonApiUrl) {
      console.error(`❌ PYTHON_EMBEDDING_API_URL is not set!`);
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

    // Initialize services
    const embeddingService = getEmbeddingService();
    const vectorStore = getVectorStore();
    
    // Log collection name for debugging
    console.log(`   🔍 Vector store collection: ${(vectorStore as any).collectionName}`);
    console.log(`   🔍 Environment variables:`, {
      QDRANT_COLLECTION_ENV: process.env.QDRANT_COLLECTION_ENV || 'not set',
      APP_ENV: process.env.APP_ENV || 'not set',
      NODE_ENV: process.env.NODE_ENV || 'not set'
    });

    // Initialize collection if needed (creates collection and indexes)
    try {
      await vectorStore.initialize();
    } catch (error) {
      console.error(`⚠️ Failed to initialize Qdrant collection:`, error);
      // Continue anyway - collection might already exist
    }

    // Generate embeddings for all images
    const embeddings = await Promise.all(
      images.map(async (imageUrl, index) => {
        try {
          if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
            console.log(`⚠️ Product ${productId}, image ${index + 1}: Invalid URL, skipping`);
            return null;
          }

          // Generate embedding via Python API
          console.log(`   🔄 Generating embedding for image ${index + 1}/${images.length}: ${imageUrl.substring(0, 60)}...`);
          const embeddingStartTime = Date.now();
          const embedding = await embeddingService.generateEmbedding(imageUrl);
          const embeddingDuration = Date.now() - embeddingStartTime;
          console.log(`   ✅ Embedding generated for image ${index + 1} (${embeddingDuration}ms, dimension: ${embedding.length})`);

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
        } catch (error) {
          console.error(`❌ Error generating embedding for product ${productId}, image ${index + 1}:`, error);
          return null;
        }
      })
    );

    // Filter out nulls (errors)
    const validEmbeddings = embeddings.filter(e => e !== null) as Array<{
      imageId: string;
      embedding: number[];
      metadata: any;
    }>;

    if (validEmbeddings.length === 0) {
      console.log(`⚠️ Product ${productId}: No valid embeddings generated`);
      return;
    }

    // Store all embeddings in batch
    console.log(`💾 Storing ${validEmbeddings.length} embedding(s) to Qdrant...`);
    console.log(`   Collection: ${(vectorStore as any).collectionName}`);
    console.log(`   Product ID: ${product.id} (publicId)`);
    console.log(`   Embeddings to store:`, validEmbeddings.map(e => ({
      imageId: e.imageId,
      productId: e.metadata.productId,
      imageUrl: e.metadata.imageUrl?.substring(0, 60) + '...'
    })));
    
    try {
      await vectorStore.storeProductImagesEmbeddings(validEmbeddings);
      console.log(`✅ Successfully stored ${validEmbeddings.length} embedding(s) to Qdrant for product ${productId}`);
      
      // Update product to mark embedding as generated
      try {
        await db.products.update(productId, {
          embeddingGeneratedAt: new Date()
        });
        console.log(`✅ Updated product ${productId} with embeddingGeneratedAt timestamp`);
      } catch (updateError) {
        console.warn(`⚠️ Failed to update embeddingGeneratedAt for product ${productId}:`, updateError);
        // Don't throw - embedding was stored successfully
      }
      
      // Verify by checking collection info
      try {
        const collectionInfo = await vectorStore.getCollectionInfo();
        console.log(`📊 Qdrant collection now has ${collectionInfo.points_count || 0} total points`);
      } catch (verifyError) {
        console.warn(`⚠️ Could not verify collection info:`, verifyError);
      }
    } catch (storeError: any) {
      console.error(`❌ Error storing embeddings to Qdrant:`, storeError);
      console.error(`   Error message:`, storeError?.message);
      console.error(`   Error stack:`, storeError?.stack);
      throw storeError; // Re-throw to be caught by caller
    }
  } catch (error) {
    console.error(`❌ Error generating embedding for product ${productId}:`, error);
    throw error;
  }
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
    const productsWithImages = productList.filter(p => {
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
        batch.map(async (product) => {
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
