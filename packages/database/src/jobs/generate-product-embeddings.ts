/**
 * Background Jobs để Generate Product Embeddings
 * Tự động tạo embeddings khi có sản phẩm mới hoặc cập nhật
 */

import { getEmbeddingService } from '../ml/image-embeddings';
import { getVectorStore } from '../ml/vector-store';
import { db } from '../index';
import { randomUUID } from 'crypto';

/**
 * Parse product images from various formats
 */
function parseProductImages(images: any): string[] {
  if (Array.isArray(images)) {
    return images.filter((img): img is string => typeof img === 'string' && img.trim() !== '');
  }
  if (typeof images === 'string') {
    // Try JSON parse first
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.filter((img): img is string => typeof img === 'string' && img.trim() !== '');
      }
    } catch {
      // Not JSON, try comma-separated
      return images.split(',').map((img: string) => img.trim()).filter(Boolean);
    }
  }
  return [];
}

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

    console.log(`🔄 Generating embeddings for product ${productId} (${images.length} image(s))...`);

    // Initialize services
    const embeddingService = getEmbeddingService();
    const vectorStore = getVectorStore();

    // Generate embeddings for all images
    const embeddings = await Promise.all(
      images.map(async (imageUrl, index) => {
        try {
          if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
            console.log(`⚠️ Product ${productId}, image ${index + 1}: Invalid URL, skipping`);
            return null;
          }

          // Generate embedding
          const embedding = await embeddingService.generateEmbedding(imageUrl);

          return {
            imageId: randomUUID(), // UUID cho mỗi image
            embedding,
            metadata: {
              productId: String(product.id),
              imageUrl,
              merchantId: String(product.merchantId),
              categoryId: product.categoryId ? String(product.categoryId) : undefined,
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
    await vectorStore.storeProductImagesEmbeddings(validEmbeddings);

    console.log(`✅ Generated and stored ${validEmbeddings.length} embedding(s) for product ${productId}`);
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
  } = {}
): Promise<void> {
  const { merchantId, batchSize = 10, skipExisting = false } = options;

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
      const images = Array.isArray(p.images)
        ? p.images
        : p.images
        ? JSON.parse(p.images as string)
        : [];
      
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

    let processed = 0;
    let errors = 0;

    for (let i = 0; i < productsWithImages.length; i += batchSize) {
      const batch = productsWithImages.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(productsWithImages.length / batchSize);

      console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)...`);

      // Generate embeddings
      const embeddings = await Promise.all(
        batch.map(async (product) => {
          try {
            const images = Array.isArray(product.images)
              ? product.images
              : JSON.parse(product.images as string);
            const imageUrl = images[0];

            const embedding = await embeddingService.generateEmbedding(imageUrl);
            
            return {
              productId: product.id,
              embedding,
              metadata: {
                productId: String(product.id),
                imageUrl,
                merchantId: String(product.merchantId),
                categoryId: product.categoryId ? String(product.categoryId) : undefined,
                productName: product.name
              }
            };
          } catch (error) {
            console.error(`❌ Error processing product ${product.id}:`, error);
            errors++;
            return null;
          }
        })
      );

      // Filter out nulls (errors)
      const validEmbeddings = embeddings.filter(e => e !== null) as Array<{
        productId: number;
        embedding: number[];
        metadata: any;
      }>;

      // Store in batch
      if (validEmbeddings.length > 0) {
        await vectorStore.storeEmbeddingsBatch(validEmbeddings);
        processed += validEmbeddings.length;
      }

      console.log(`✅ Processed ${validEmbeddings.length} products (${processed}/${productsWithImages.length} total)`);
    }

    console.log('\n✅ Batch embedding generation completed!');
    console.log(`📊 Summary: ${processed} processed, ${errors} errors`);
  } catch (error) {
    console.error('❌ Error in batch embedding generation:', error);
    throw error;
  }
}
