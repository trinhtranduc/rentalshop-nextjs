/**
 * Vector Store Service
 * Wrapper để tương tác với Qdrant vector database
 * 
 * Collection names:
 * - Development: product-images-dev
 * - Production: product-images-pro
 * 
 * Vector dimension: 512 (CLIP standard)
 * Distance metric: Cosine
 */

import { QdrantClient } from '@qdrant/js-client-rest';

export interface ProductEmbeddingMetadata {
  productId: string;
  imageUrl: string;
  merchantId: string;
  outletId?: string;
  categoryId?: string;
  productName?: string;
}

/**
 * ProductVectorStore
 * Quản lý embeddings trong Qdrant database
 */
export class ProductVectorStore {
  private client: QdrantClient;
  private collectionName: string;

  constructor() {
    // Determine collection name based on QDRANT_COLLECTION_ENV (preferred) or NODE_ENV (fallback)
    // Use QDRANT_COLLECTION_ENV to avoid Next.js automatically setting NODE_ENV=production
    const collectionEnv = process.env.QDRANT_COLLECTION_ENV || process.env.APP_ENV || process.env.NODE_ENV || 'development';
    const isProduction = collectionEnv === 'production' || collectionEnv === 'prod';
    
    this.collectionName = isProduction ? 'product-images-pro' : 'product-images-dev';
    console.log(`📦 Using Qdrant collection: ${this.collectionName}`, {
      QDRANT_COLLECTION_ENV: process.env.QDRANT_COLLECTION_ENV || 'not set',
      APP_ENV: process.env.APP_ENV || 'not set',
      NODE_ENV: process.env.NODE_ENV || 'not set',
      usedEnv: collectionEnv,
      isProduction: isProduction,
      '💡 Tip': 'Set QDRANT_COLLECTION_ENV=development in Railway Variables for dev server'
    });
    
    // Sanitize QDRANT_URL and QDRANT_API_KEY to avoid Unicode issues
    const qdrantUrl = (process.env.QDRANT_URL || 'http://localhost:6333')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x00-\x7F]/g, '');
    const qdrantApiKey = process.env.QDRANT_API_KEY
      ? process.env.QDRANT_API_KEY
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\x00-\x7F]/g, '')
      : undefined;

    this.client = new QdrantClient({
      url: qdrantUrl,
      apiKey: qdrantApiKey
    });
  }

  /**
   * Initialize collection
   * Tạo collection và indexes nếu chưa tồn tại
   */
  async initialize(): Promise<void> {
    try {
      const collection = await this.client.getCollection(this.collectionName);
      console.log(`✅ Collection ${this.collectionName} already exists`);
      return;
    } catch {
      // Collection không tồn tại, tạo mới
    }

    try {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: 512, // CLIP embedding dimension
          distance: 'Cosine' // Cosine similarity
        },
        optimizers_config: {
          default_segment_number: 2
        },
        replication_factor: 1
      });

      console.log(`✅ Created collection ${this.collectionName}`);

      // Create indexes cho filtering
      try {
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'merchantId',
          field_schema: 'keyword'
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'categoryId',
          field_schema: 'keyword'
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'outletId',
          field_schema: 'keyword'
        });

        console.log('✅ Created payload indexes');
      } catch (indexError) {
        // Indexes có thể đã tồn tại hoặc không hỗ trợ
        console.warn('⚠️ Could not create indexes (may already exist):', indexError);
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      throw error;
    }
  }

  /**
   * Store product embedding
   * 
   * @param productId - Product ID (sẽ convert thành string)
   * @param embedding - Embedding vector (512 dimensions)
   * @param metadata - Metadata kèm theo
   */
  async storeEmbedding(
    productId: string | number,
    embedding: number[],
    metadata: ProductEmbeddingMetadata
  ): Promise<void> {
    // Convert productId to string for Qdrant
    const pointId = String(productId);

    try {
      await this.client.upsert(this.collectionName, {
        points: [{
          id: pointId,
          vector: embedding,
          payload: {
            productId: String(metadata.productId),
            imageUrl: metadata.imageUrl,
            merchantId: String(metadata.merchantId),
            outletId: metadata.outletId ? String(metadata.outletId) : undefined,
            categoryId: metadata.categoryId ? String(metadata.categoryId) : undefined,
            productName: metadata.productName,
            updatedAt: new Date().toISOString()
          }
        }]
      });
    } catch (error) {
      console.error(`Error storing embedding for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Search similar products
   * 
   * @param queryEmbedding - Embedding của ảnh tìm kiếm
   * @param filters - Filters (merchantId, outletId, categoryId, minSimilarity, limit)
   * @returns Array các sản phẩm với similarity scores
   */
  async search(
    queryEmbedding: number[],
    filters: {
      merchantId?: string | number;
      outletId?: string | number;
      categoryId?: string | number;
      minSimilarity?: number;
      limit?: number;
    } = {}
  ): Promise<Array<{
    productId: string;
    similarity: number;
    metadata: any;
  }>> {
    const {
      merchantId,
      outletId,
      categoryId,
      minSimilarity = parseFloat(process.env.IMAGE_SEARCH_MIN_SIMILARITY || '0.5'),
      limit = 20
    } = filters;

    // Build filter
    const must: any[] = [];
    
    if (merchantId) {
      must.push({
        key: 'merchantId',
        match: { value: String(merchantId) }
      });
    }

    if (outletId) {
      must.push({
        key: 'outletId',
        match: { value: String(outletId) }
      });
    }

    if (categoryId) {
      must.push({
        key: 'categoryId',
        match: { value: String(categoryId) }
      });
    }

    const filter = must.length > 0 ? { must } : undefined;

    try {
      console.log('🔍 VectorStore.search - Parameters:', {
        collectionName: this.collectionName,
        embeddingLength: queryEmbedding.length,
        limit,
        minSimilarity,
        filter: filter ? JSON.stringify(filter) : 'none',
        merchantId,
        outletId,
        categoryId
      });

      // OPTIMIZATION: Use score_threshold at database level (faster than filtering in code)
      // Also reduce search limit multiplier from 3x to 2x for better performance
      const searchLimit = Math.max(limit * 2, 30); // Reduced from limit * 3 to limit * 2
      
      const results = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit: searchLimit,
        filter,
        // OPTIMIZATION: Filter at database level (Qdrant) instead of in code
        score_threshold: minSimilarity,
        with_payload: true
      });

      console.log(`📊 Qdrant returned ${results.length} results (filtered by score_threshold >= ${minSimilarity})`);
      
      // Log first few results for debugging
      if (results.length > 0) {
        console.log('📊 Sample results (first 5):', results.slice(0, 5).map((r: any) => ({
          productId: r.payload?.productId,
          score: r.score,
          merchantId: r.payload?.merchantId,
          outletId: r.payload?.outletId,
          categoryId: r.payload?.categoryId
        })));
      } else {
        console.warn('⚠️ No results from Qdrant! Possible issues:');
        console.warn('   1. No embeddings in collection');
        console.warn('   2. Filters too strict (merchantId/outletId mismatch)');
        console.warn('   3. Collection name mismatch');
        console.warn(`   4. Collection: ${this.collectionName}`);
        console.warn(`   5. minSimilarity (${minSimilarity}) too high`);
      }

      // OPTIMIZATION: No need to filter by similarity in code (already filtered by Qdrant)
      // Just slice to limit and map results
      const filteredResults = results
        .slice(0, limit)
        .map((result: any) => ({
          productId: result.payload?.productId || result.payload?.product_id,
          similarity: result.score,
          metadata: result.payload
        }));

      console.log(`✅ Final results (top ${filteredResults.length}): ${filteredResults.length} products`);

      return filteredResults;
    } catch (error) {
      console.error('❌ Error searching in Qdrant:', error);
      console.error('   Collection:', this.collectionName);
      console.error('   Filter:', filter);
      throw error;
    }
  }

  /**
   * Delete product embedding (legacy - dùng productId làm point ID)
   * 
   * @param productId - Product ID
   */
  async deleteEmbedding(productId: string | number): Promise<void> {
    try {
      await this.client.delete(this.collectionName, {
        points: [String(productId)]
      });
    } catch (error) {
      console.error(`Error deleting embedding for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Delete all embeddings của một product (dùng filter theo productId trong payload)
   * Dùng khi product có nhiều images (mỗi image có UUID riêng)
   * 
   * @param productId - Product ID
   */
  async deleteProductEmbeddings(productId: string | number): Promise<void> {
    try {
      await this.client.delete(this.collectionName, {
        filter: {
          must: [{
            key: 'productId',
            match: { value: String(productId) }
          }]
        }
      });
      console.log(`✅ Deleted all embeddings for product ${productId}`);
    } catch (error) {
      console.error(`Error deleting embeddings for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Update embedding (delete + insert)
   * 
   * @param productId - Product ID
   * @param embedding - New embedding
   * @param metadata - New metadata
   */
  async updateEmbedding(
    productId: string | number,
    embedding: number[],
    metadata: ProductEmbeddingMetadata
  ): Promise<void> {
    // Qdrant upsert sẽ tự động update nếu point ID đã tồn tại
    await this.storeEmbedding(productId, embedding, metadata);
  }

  /**
   * Batch store embeddings
   * 
   * @param embeddings - Array các embeddings với metadata
   */
  async storeEmbeddingsBatch(
    embeddings: Array<{
      productId: string | number;
      embedding: number[];
      metadata: ProductEmbeddingMetadata;
    }>
  ): Promise<void> {
    const points = embeddings.map(({ productId, embedding, metadata }) => ({
      id: String(productId),
      vector: embedding,
      payload: {
        productId: String(metadata.productId),
        imageUrl: metadata.imageUrl,
        merchantId: String(metadata.merchantId),
        outletId: metadata.outletId ? String(metadata.outletId) : undefined,
        categoryId: metadata.categoryId ? String(metadata.categoryId) : undefined,
        productName: metadata.productName,
        updatedAt: new Date().toISOString()
      }
    }));

    try {
      await this.client.upsert(this.collectionName, {
        points
      });
    } catch (error) {
      console.error('Error in batch store embeddings:', error);
      throw error;
    }
  }

  /**
   * Store multiple product images embeddings (mỗi image có UUID riêng)
   * Dùng cho product có nhiều images
   * 
   * @param embeddings - Array các embeddings với imageId (UUID) và metadata
   */
  async storeProductImagesEmbeddings(
    embeddings: Array<{
      imageId: string; // UUID
      embedding: number[];
      metadata: ProductEmbeddingMetadata;
    }>
  ): Promise<void> {
    // Sanitize all strings to avoid Unicode issues with Qdrant
    const points = embeddings.map(({ imageId, embedding, metadata }) => ({
      id: imageId, // UUID is already ASCII-safe
      vector: embedding,
      payload: {
        productId: String(metadata.productId).replace(/[^\x00-\x7F]/g, ''),
        imageUrl: String(metadata.imageUrl).replace(/[^\x00-\x7F]/g, ''),
        merchantId: String(metadata.merchantId),
        outletId: metadata.outletId ? String(metadata.outletId) : undefined,
        categoryId: metadata.categoryId ? String(metadata.categoryId) : undefined,
        productName: metadata.productName ? String(metadata.productName).replace(/[^\x00-\x7F]/g, '') : undefined,
        updatedAt: new Date().toISOString()
      }
    }));

    try {
      console.log(`📤 Upserting ${points.length} point(s) to Qdrant collection: ${this.collectionName}`);
      await this.client.upsert(this.collectionName, {
        points
      });
      console.log(`✅ Successfully upserted ${points.length} point(s) to Qdrant`);
    } catch (error: any) {
      // If collection doesn't exist, try to initialize and retry
      if (error?.status === 404 || error?.message?.includes('not found')) {
        console.log('⚠️ Collection not found, initializing...');
        try {
          await this.initialize();
          // Retry upsert after initialization
          await this.client.upsert(this.collectionName, {
            points
          });
          console.log('✅ Successfully stored embeddings after initialization');
        } catch (initError) {
          console.error('Error initializing collection:', initError);
          throw initError;
        }
      } else {
        console.error('Error storing product images embeddings:', error);
        throw error;
      }
    }
  }

  /**
   * Get collection name (for debugging)
   */
  getCollectionName(): string {
    return this.collectionName;
  }

  /**
   * Get collection info (for debugging)
   */
  async getCollectionInfo(): Promise<any> {
    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error) {
      console.error('Error getting collection info:', error);
      throw error;
    }
  }
}

// Singleton instance
let vectorStore: ProductVectorStore | null = null;
let cachedCollectionName: string | null = null;

/**
 * Get singleton instance của vector store
 * Recreates instance if environment changed (to use correct collection)
 */
export function getVectorStore(): ProductVectorStore {
  // Determine expected collection name based on QDRANT_COLLECTION_ENV (preferred) or NODE_ENV (fallback)
  const collectionEnv = process.env.QDRANT_COLLECTION_ENV || process.env.APP_ENV || process.env.NODE_ENV || 'development';
  const isProduction = collectionEnv === 'production' || collectionEnv === 'prod';
  const expectedCollectionName = isProduction ? 'product-images-pro' : 'product-images-dev';
  
  // Recreate instance if collection name changed (environment changed)
  if (!vectorStore || cachedCollectionName !== expectedCollectionName) {
    if (vectorStore && cachedCollectionName !== expectedCollectionName) {
      console.log(`🔄 Environment changed, recreating vector store instance`, {
        oldCollection: cachedCollectionName,
        newCollection: expectedCollectionName,
        oldEnv: cachedCollectionName === 'product-images-pro' ? 'production' : 'development',
        newEnv: collectionEnv,
        QDRANT_COLLECTION_ENV: process.env.QDRANT_COLLECTION_ENV || 'not set',
        APP_ENV: process.env.APP_ENV || 'not set',
        NODE_ENV: process.env.NODE_ENV || 'not set'
      });
    }
    vectorStore = new ProductVectorStore();
    cachedCollectionName = expectedCollectionName;
  }
  
  return vectorStore;
}
