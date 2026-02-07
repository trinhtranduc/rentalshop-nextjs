/**
 * POST /api/products/searchByImage
 * Search products by uploading an image
 * 
 * ⚠️ TEMPORARILY SIMPLIFIED: Feature returns empty results to ensure app stability
 * TODO: Re-enable full ML functionality after fixing WASM backend initialization issues
 * 
 * Current behavior: Returns empty results without loading ML model
 * This allows frontend to work without crashing while we fix the backend
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { ResponseBuilder, parseProductImages } from '@rentalshop/utils';
import { VALIDATION } from '@rentalshop/constants';
import { compressImageTo1MB, compressImageForEmbedding } from '../../../../lib/image-compression';
import { 
  generateImageHash, 
  getCachedSearchResults,
  cacheSearchResults 
} from '../../../../lib/image-search-cache';
import { fetchWithPooling } from '../../../../lib/python-api-client';

// Force dynamic rendering to prevent Next.js from collecting page data
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Allowed image types
const ALLOWED_TYPES = VALIDATION.ALLOWED_IMAGE_TYPES;
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = VALIDATION.MAX_FILE_SIZE; // 5MB

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

/**
 * POST /api/products/searchByImage
 * Search products by image
 * 
 * ⚠️ TEMPORARILY SIMPLIFIED: Returns empty results without loading ML model
 * This allows frontend to work without crashing while we fix WASM backend
 * 
 * TODO: Re-enable full ML functionality after fixing WASM backend initialization
 */
/**
 * POST /api/products/searchByImage
 * Search products by image
 * 
 * ⚠️ STEP-BY-STEP INTEGRATION: Currently at Step 3
 * Step 1: Parse form data and validate image (✅ DONE)
 * Step 2: Compress image (✅ DONE)
 * Step 3: Generate embedding (✅ DONE - with error handling)
 * Step 4: Vector search (TODO)
 */
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
      const limit = limitParam ? parseInt(String(limitParam)) : 20;
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
      const searchFilters: {
        merchantId?: number;
        outletId?: number;
        categoryId?: number;
      } = {};

      // Apply role-based filtering (security: backend-only)
      if (userScope.merchantId) {
        searchFilters.merchantId = userScope.merchantId;
      }
      
      if (userScope.outletId) {
        searchFilters.outletId = userScope.outletId;
      }
      
      if (categoryId) {
        searchFilters.categoryId = categoryId;
      }

      // Check if we have cached search results
      const cacheCheckStart = Date.now();
      const cachedResults = getCachedSearchResults(imageHash, searchFilters);
      const cacheCheckDuration = Date.now() - cacheCheckStart;
      
      if (cachedResults) {
        const totalDuration = Date.now() - requestStartTime;
        console.log(`✅ Cache hit! Returning cached results in ${totalDuration}ms (cache check: ${cacheCheckDuration}ms)`);
        
        // Normalize cached results: if imageUrl exists, add it to images array
        const normalizedCachedResults = cachedResults.map((product: any) => {
          let images = parseProductImages(product.images);
          // If imageUrl exists and is not already in images, add it
          if (product.imageUrl && !images.includes(product.imageUrl)) {
            images = [product.imageUrl, ...images]; // Put imageUrl first
          }
          // If images is still empty but imageUrl exists, use imageUrl
          if (images.length === 0 && product.imageUrl) {
            images = [product.imageUrl];
          }
          return {
            ...product,
            images: images
          };
        });
        
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
        const searchStartTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
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
        // STEP 4: Normalize images and return results
        // ============================================================
        // Parse images to ensure consistent format (array of strings)
        // Also normalize IDs to integers (Python service may return strings from Qdrant metadata)
        const products = rawProducts.map((product: any) => {
          let images = parseProductImages(product.images);
          // If imageUrl exists and is not already in images, add it
          if (product.imageUrl && !images.includes(product.imageUrl)) {
            images = [product.imageUrl, ...images]; // Put imageUrl first
          }
          // If images is still empty but imageUrl exists, use imageUrl
          if (images.length === 0 && product.imageUrl) {
            images = [product.imageUrl];
          }
          
          const normalized: any = {
          ...product,
          images: images
          };
          
          // Convert string IDs to integers (Python service returns strings from Qdrant metadata)
          if (normalized.merchantId !== undefined && normalized.merchantId !== null) {
            normalized.merchantId = typeof normalized.merchantId === 'string' 
              ? parseInt(normalized.merchantId, 10) 
              : normalized.merchantId;
          }
          
          if (normalized.categoryId !== undefined && normalized.categoryId !== null) {
            normalized.categoryId = typeof normalized.categoryId === 'string' 
              ? parseInt(normalized.categoryId, 10) 
              : normalized.categoryId;
          }
          
          if (normalized.outletId !== undefined && normalized.outletId !== null) {
            normalized.outletId = typeof normalized.outletId === 'string' 
              ? parseInt(normalized.outletId, 10) 
              : normalized.outletId;
          }
          
          // Ensure nested objects also have integer IDs
          if (normalized.merchant && normalized.merchant.id) {
            normalized.merchant.id = typeof normalized.merchant.id === 'string'
              ? parseInt(normalized.merchant.id, 10)
              : normalized.merchant.id;
          }
          
          if (normalized.category && normalized.category.id) {
            normalized.category.id = typeof normalized.category.id === 'string'
              ? parseInt(normalized.category.id, 10)
              : normalized.category.id;
          }
          
          return normalized;
        });

        console.log(`🖼️  Normalized images for ${products.length} products`);

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
        console.error('❌ Step 3: Complete search failed:', error?.message);
        console.error('   Error details:', {
          name: error?.name,
          message: error?.message,
          stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        });
        
        if (error.name === 'AbortError') {
          return NextResponse.json(
            ResponseBuilder.error('SEARCH_TIMEOUT'),
            { status: 503 }
          );
        }
        
        return NextResponse.json(
          ResponseBuilder.error('SEARCH_FAILED'),
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
