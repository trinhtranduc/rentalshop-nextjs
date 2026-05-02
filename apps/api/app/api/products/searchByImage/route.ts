/**
 * POST /api/products/searchByImage
 * Search products by uploading an image using AI/ML similarity search
 * 
 * Flow:
 * 1. Validate image file
 * 2. Check cache (fast path)
 * 3. Compress image for embedding
 * 4. Call Python service (embedding + vector search + product fetch)
 * 5. Normalize and return results
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { ResponseBuilder, parseProductImages } from '@rentalshop/utils';
import { VALIDATION } from '@rentalshop/constants';
import { compressImageForEmbedding } from '../../../../lib/image-compression';
import { 
  generateImageHash, 
  getCachedSearchResults,
  cacheSearchResults 
} from '../../../../lib/image-search-cache';
import { fetchWithPooling } from '../../../../lib/python-api-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Allowed image types
const ALLOWED_TYPES = VALIDATION.ALLOWED_IMAGE_TYPES;
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = VALIDATION.MAX_FILE_SIZE; // 5MB

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse imageUrl (may be JSON string from Qdrant metadata)
 * Handles: '["url"]', '"url"', 'url'
 */
function parseImageUrl(imageUrl: any): string | null {
  if (!imageUrl) return null;
  
  try {
    // Try to parse as JSON if it looks like JSON array
    const parsed = typeof imageUrl === 'string' && imageUrl.trim().startsWith('[')
      ? JSON.parse(imageUrl)
      : imageUrl;
    
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0];
    }
    if (typeof parsed === 'string') {
      return parsed;
    }
    return String(imageUrl);
  } catch {
    return typeof imageUrl === 'string' ? imageUrl : String(imageUrl);
  }
}

/**
 * Normalize product images: merge images array and imageUrl into single images array
 */
function normalizeProductImages(product: any): string[] {
  let images = parseProductImages(product.images);
  const imageUrl = parseImageUrl(product.imageUrl);
  
  // Add imageUrl to images if not already present
  if (imageUrl && !images.includes(imageUrl)) {
    images = [imageUrl, ...images];
  }
  
  // Fallback to imageUrl if images is empty
  if (images.length === 0 && imageUrl) {
    images = [imageUrl];
  }
  
  return images;
}

/**
 * Convert string IDs to integers (Python service may return strings from Qdrant)
 */
function normalizeProductIds(product: any): any {
  const normalized = { ...product };
  
  // Normalize top-level IDs
  ['merchantId', 'categoryId', 'outletId'].forEach(key => {
    if (normalized[key] !== undefined && normalized[key] !== null) {
      normalized[key] = typeof normalized[key] === 'string' 
        ? parseInt(normalized[key], 10) 
        : normalized[key];
    }
  });
  
  // Normalize nested object IDs
  if (normalized.merchant?.id) {
    normalized.merchant.id = typeof normalized.merchant.id === 'string'
      ? parseInt(normalized.merchant.id, 10)
      : normalized.merchant.id;
  }
  
  if (normalized.category?.id) {
    normalized.category.id = typeof normalized.category.id === 'string'
      ? parseInt(normalized.category.id, 10)
      : normalized.category.id;
  }
  
  return normalized;
}

/**
 * Normalize a single product: images + IDs
 */
function normalizeProduct(product: any): any {
  const normalized = normalizeProductIds({
    ...product,
    images: normalizeProductImages(product),
    imageUrl: undefined // Remove imageUrl (images array is source of truth)
  });
  
  return normalized;
}

/**
 * Build search filters from user scope and category
 */
function buildSearchFilters(
  userScope: { merchantId?: number; outletId?: number },
  categoryId?: number
) {
  const filters: {
    merchantId?: number;
    outletId?: number;
    categoryId?: number;
  } = {};
  
  if (userScope.merchantId) {
    filters.merchantId = userScope.merchantId;
  }
  
  if (userScope.outletId) {
    filters.outletId = userScope.outletId;
  }
  
  if (categoryId) {
    filters.categoryId = categoryId;
  }
  
  return filters;
}

/**
 * Validate image file
 */
function validateImage(file: File): { isValid: boolean; error?: string } {
  const fileTypeLower = file.type.toLowerCase().trim();
  const fileNameLower = file.name.toLowerCase().trim();
  
  const isValidMimeType = fileTypeLower ? ALLOWED_TYPES.some(type => 
    fileTypeLower === type.toLowerCase()
  ) : false;
  
  const isValidExtension = ALLOWED_EXTENSIONS.some(ext => 
    fileNameLower.endsWith(ext)
  );
  
  if (!isValidMimeType && !isValidExtension) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')} or extensions: ${ALLOWED_EXTENSIONS.join(',')}`
    };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    };
  }
  
  if (file.size < 100) {
    return {
      isValid: false,
      error: 'File size is too small, file may be corrupted'
    };
  }
  
  return { isValid: true };
}

export const POST = withPermissions(['products.view'], { requireActiveSubscription: false })(
  async (request: NextRequest, { user, userScope }) => {
    const requestStartTime = Date.now();
    try {
      console.log(`🔍 POST /api/products/searchByImage - User: ${user.email} (${user.role})`);

      // ============================================================
      // STEP 1: Parse form data and validate image
      // ============================================================
      const formData = await request.formData();
      const file = formData.get('image') as File;
      const limitParam = formData.get('limit');
      const minSimilarityParam = formData.get('minSimilarity');
      const categoryIdParam = formData.get('categoryId');

      // Validate image
      if (!file) {
        return NextResponse.json(
          ResponseBuilder.error('NO_IMAGE_FILE'),
          { status: 400 }
        );
      }

      const validation = validateImage(file);
      if (!validation.isValid) {
        return NextResponse.json(
          ResponseBuilder.error('IMAGE_VALIDATION_FAILED'),
          { status: 400 }
        );
      }

      // Parse optional parameters
      const limit = limitParam ? parseInt(String(limitParam)) : 50;
      const minSimilarity = minSimilarityParam 
        ? parseFloat(String(minSimilarityParam)) 
        : parseFloat(process.env.IMAGE_SEARCH_MIN_SIMILARITY || '0.5');
      const categoryId = categoryIdParam ? parseInt(String(categoryIdParam)) : undefined;

      // Validate parameters
      if (limit < 1 || limit > 100) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_LIMIT'),
          { status: 400 }
        );
      }

      if (minSimilarity < 0 || minSimilarity > 1) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_MIN_SIMILARITY'),
          { status: 400 }
        );
      }

      console.log('✅ Step 1: Image validated successfully:', {
        fileName: file.name,
        fileSize: file.size,
        limit,
        minSimilarity,
        categoryId
      });

      // ============================================================
      // STEP 1.5: Generate normalized image hash for caching
      // ============================================================
      // ✅ Normalized hash ensures cache works with both web and mobile
      // ✅ Normalizes image (resize, format, metadata) before hashing
      const bytes = await file.arrayBuffer();
      const originalBuffer = Buffer.from(new Uint8Array(bytes));
      const imageHash = await generateImageHash(originalBuffer);
      
      console.log(`📝 Image hash (normalized): ${imageHash.substring(0, 8)}...`);

      // ============================================================
      // STEP 2: Check cache first (FAST PATH - 80-90% latency reduction)
      // ============================================================
      const searchFilters = buildSearchFilters(userScope, categoryId);

      // Check if we have cached search results
      const cacheCheckStart = Date.now();
      const cachedResults = getCachedSearchResults(imageHash, searchFilters);
      const cacheCheckDuration = Date.now() - cacheCheckStart;
      
      if (cachedResults) {
        const totalDuration = Date.now() - requestStartTime;
        console.log(`✅ Cache hit! Returning cached results in ${totalDuration}ms (cache check: ${cacheCheckDuration}ms)`);
        
        const normalizedCachedResults = cachedResults.map(normalizeProduct);
        
        return NextResponse.json(
          ResponseBuilder.success('PRODUCTS_FOUND', {
            products: normalizedCachedResults,
            total: normalizedCachedResults.length,
            message: `Tìm thấy ${normalizedCachedResults.length} sản phẩm tương tự (cached)`,
            debug: {
              cacheHit: true,
              totalDuration: `${totalDuration}ms`,
              cacheCheckDuration: `${cacheCheckDuration}ms`,
              source: 'memory-cache'
            }
          })
        );
      }

      console.log(`❌ Cache miss: Need to process search (check took ${cacheCheckDuration}ms)`);
      
      // Record cache miss for statistics (will be updated with full duration after search)
      const { cacheStats } = await import('../../../../lib/image-search-cache-stats');
      const missStartTime = Date.now();

      // ============================================================
      // STEP 3: Compress image for embedding (optimized for ML models)
      // ============================================================
      console.log(`🔄 Step 2: Compressing image for embedding... (original: ${(originalBuffer.length / 1024).toFixed(2)} KB)`);
      
      // OPTIMIZATION: Use aggressive compression for embedding (100KB, 800px)
      // CLIP model only needs 224x224, so smaller images = faster processing
      const compressedBuffer = await compressImageForEmbedding(originalBuffer);
      
      console.log(`✅ Step 2: Image compressed for embedding: ${(compressedBuffer.length / 1024).toFixed(2)} KB (${Math.round((1 - compressedBuffer.length / originalBuffer.length) * 100)}% reduction)`);

      // ============================================================
      // STEP 4: Complete search in Python service (OPTIMIZED)
      // ============================================================
      // OPTIMIZATION: Move all processing to Python service to minimize network round-trips
      // Python service handles: embedding + vector search + product fetching
      // This reduces network latency from 3 calls to 1 call
      console.log('🔄 Step 3: Processing complete search in Python service...');
      
      const PYTHON_SEARCH_TIMEOUT_MS = 60000; // 60s (embedding + Qdrant + DB can be slow on cold start)
      let searchStartTime = 0;
      
      try {
        const pythonApiUrl = process.env.PYTHON_EMBEDDING_API_URL || 'http://localhost:8000';
        const baseUrl = pythonApiUrl.startsWith('http') 
          ? pythonApiUrl 
          : `https://${pythonApiUrl}`;

        // Create form data for Python service
        const formData = new FormData();
        const uint8Array = new Uint8Array(compressedBuffer);
        const blob = new Blob([uint8Array], { type: 'image/jpeg' });
        formData.append('file', blob, 'image.jpg');
        
        if (searchFilters.merchantId) {
          formData.append('merchantId', String(searchFilters.merchantId));
        }
        if (searchFilters.outletId) {
          formData.append('outletId', String(searchFilters.outletId));
        }
        if (searchFilters.categoryId) {
          formData.append('categoryId', String(searchFilters.categoryId));
        }
        formData.append('limit', String(limit));
        formData.append('minSimilarity', String(minSimilarity));

        // Call Python /search endpoint (handles everything)
        // OPTIMIZATION: Use connection pooling to reduce network latency
        searchStartTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PYTHON_SEARCH_TIMEOUT_MS);
        
        const response = await fetchWithPooling(`${baseUrl}/search`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        const searchDuration = Date.now() - searchStartTime;
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Python Search API error (${response.status}): ${text}`);
        }

        const data: any = await response.json();
        
        if (!data?.success) {
          throw new Error('Invalid response from Python Search API');
        }

        const rawProducts = data.products || [];
        const totalDuration = Date.now() - requestStartTime;
        
        console.log(`✅ Step 3: Complete search completed in ${searchDuration}ms`);
        console.log(`   - Embedding: ${data.embeddingDuration || 0}ms`);
        console.log(`   - Vector search: ${data.searchDuration || 0}ms`);
        console.log(`   - Product fetch: ${data.fetchDuration || 0}ms`);
        console.log(`   - Total Python: ${data.totalDuration || 0}ms`);
        console.log(`⏱️ Total request time: ${totalDuration}ms`);

        if (rawProducts.length === 0) {
          return NextResponse.json(
            ResponseBuilder.success('NO_PRODUCTS_FOUND', {
              products: [],
              total: 0,
              message: 'Không tìm thấy sản phẩm tương tự. Thử tải lên hình ảnh khác hoặc điều chỉnh tiêu chí tìm kiếm.',
              debug: {
                originalSize: originalBuffer.length,
                compressedSize: compressedBuffer.length,
                compressionRatio: Math.round((1 - compressedBuffer.length / originalBuffer.length) * 100),
                minSimilarity,
                searchFilters,
                totalDuration: `${totalDuration}ms`,
                pythonTiming: {
                  embedding: data.embeddingDuration,
                  search: data.searchDuration,
                  fetch: data.fetchDuration,
                  total: data.totalDuration
                }
              }
            })
          );
        }

        // ============================================================
        // STEP 4: Normalize products (images + IDs)
        // ============================================================
        const products = rawProducts.map(normalizeProduct);
        console.log(`🖼️  Normalized ${products.length} products`);

        // ============================================================
        // STEP 5: Cache results for future queries
        // ============================================================
        cacheSearchResults(imageHash, searchFilters, products);
        
        // Record cache miss with full request duration for statistics
        const missDuration = Date.now() - requestStartTime;
        const { cacheStats } = await import('../../../../lib/image-search-cache-stats');
        cacheStats.recordMiss(missDuration);
        
        console.log(`💾 Cached search results for future queries (total: ${totalDuration}ms)`);

        return NextResponse.json(
          ResponseBuilder.success('PRODUCTS_FOUND', {
            products,
            total: products.length,
            message: `Tìm thấy ${products.length} sản phẩm tương tự`,
            debug: {
              originalSize: originalBuffer.length,
              compressedSize: compressedBuffer.length,
              compressionRatio: Math.round((1 - compressedBuffer.length / originalBuffer.length) * 100),
              minSimilarity,
              searchFilters,
              totalDuration: `${totalDuration}ms`,
              cacheHit: false,
              pythonTiming: {
                embedding: data.embeddingDuration,
                search: data.searchDuration,
                fetch: data.fetchDuration,
                total: data.totalDuration
              }
            }
          })
        );
      } catch (error: any) {
        const errorMessage = error?.message ?? String(error);
        console.error('❌ Step 3: Complete search failed:', errorMessage);
        console.error('   Error details:', {
          name: error?.name,
          message: errorMessage,
          stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        });
        
        if (error.name === 'AbortError') {
          const waitedMs = Date.now() - searchStartTime;
          console.error(`⏱️ Python /search timed out after ${waitedMs}ms (limit: ${PYTHON_SEARCH_TIMEOUT_MS}ms). Check Python logs for slow step: embedding / Qdrant / DB.`);
          return NextResponse.json(
            {
              ...ResponseBuilder.error('SEARCH_TIMEOUT'),
              ...(process.env.NODE_ENV === 'development'
                ? {
                    debug: {
                      waitedMs,
                      timeoutMs: PYTHON_SEARCH_TIMEOUT_MS,
                      technical: errorMessage,
                    },
                  }
                : {}),
            },
            { status: 503 }
          );
        }

        return NextResponse.json(
          {
            ...ResponseBuilder.error('SEARCH_FAILED'),
            ...(process.env.NODE_ENV === 'development'
              ? { debug: { technical: errorMessage } }
              : {}),
          },
          { status: 503 }
        );
      }

    } catch (error: any) {
      console.error('❌ Error in image search:', error?.message);
      return NextResponse.json(
        ResponseBuilder.error('SERVICE_UNAVAILABLE'),
        { status: 503 }
      );
    }
  }
);
