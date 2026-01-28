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
import { ResponseBuilder } from '@rentalshop/utils';
import { VALIDATION } from '@rentalshop/constants';
import { compressImageTo1MB } from '../../../../lib/image-compression';

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
      // STEP 2: Compress image (không load transformers)
      // ============================================================
      const bytes = await file.arrayBuffer();
      const originalBuffer = Buffer.from(new Uint8Array(bytes));
      
      console.log(`🔄 Step 2: Compressing image... (original: ${(originalBuffer.length / 1024).toFixed(2)} KB)`);
      
      const compressedBuffer = await compressImageTo1MB(originalBuffer);
      
      console.log(`✅ Step 2: Image compressed successfully: ${(compressedBuffer.length / 1024).toFixed(2)} KB (${Math.round((1 - compressedBuffer.length / originalBuffer.length) * 100)}% reduction)`);

      // ============================================================
      // STEP 3: Generate embedding (with error handling)
      // ============================================================
      console.log('🔄 Step 3: Generating embedding...');
      
      let queryEmbedding: number[] | null = null;
      let embeddingError: string | null = null;

      try {
        // Always use centralized embedding service (DRY).
        // The service is Python-only when USE_PYTHON_EMBEDDING_API=true.
        const { getEmbeddingService } = await import('@rentalshop/database/server');
        const embeddingService = getEmbeddingService();
        
        const embeddingStartTime = Date.now();
        queryEmbedding = await embeddingService.generateEmbeddingFromBuffer(compressedBuffer);
        const embeddingDuration = Date.now() - embeddingStartTime;
        
        console.log(`✅ Step 3: Embedding generated successfully (dimension: ${queryEmbedding.length}, duration: ${embeddingDuration}ms)`);
      } catch (error: any) {
        embeddingError = error?.message || 'Unknown error';
        console.error('❌ Step 3: Embedding generation failed:', embeddingError);
        console.error('   Error details:', {
          name: error?.name,
          message: error?.message,
          stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        });
        
        // Return graceful error response instead of crashing
        const errorResponse = ResponseBuilder.error('EMBEDDING_GENERATION_FAILED');
        return NextResponse.json(
          {
            ...errorResponse,
            error: embeddingError, // Include detailed error for debugging
            debug: {
              originalSize: originalBuffer.length,
              compressedSize: compressedBuffer.length,
              compressionRatio: Math.round((1 - compressedBuffer.length / originalBuffer.length) * 100)
            }
          },
          { status: 503 }
        );
      }

      // ============================================================
      // STEP 4: Vector search in Qdrant
      // ============================================================
      if (!queryEmbedding) {
        return NextResponse.json(
          ResponseBuilder.error('EMBEDDING_GENERATION_FAILED'),
          { status: 503 }
        );
      }

      console.log('🔄 Step 4: Searching in Qdrant vector database...');
      
      // Build filters from user scope (role-based access control)
      const searchFilters: {
        merchantId?: number;
        outletId?: number;
        categoryId?: number;
        minSimilarity?: number;
        limit?: number;
      } = {
        minSimilarity,
        limit
      };

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

      let searchResults: Array<{
        productId: string;
        similarity: number;
        metadata: any;
      }> = [];

      try {
        const { getVectorStore } = await import('@rentalshop/database/server');
        const vectorStore = getVectorStore();

        const searchStartTime = Date.now();
        searchResults = await vectorStore.search(queryEmbedding, searchFilters);
        const searchDuration = Date.now() - searchStartTime;
        
        console.log(`✅ Step 4: Vector search completed (${searchDuration}ms, found ${searchResults.length} results)`);
      } catch (error: any) {
        console.error('❌ Step 4: Vector search failed:', error?.message);
        console.error('   Error details:', {
          name: error?.name,
          message: error?.message,
          stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        });
        
        // Return graceful error response
        return NextResponse.json(
          ResponseBuilder.error('VECTOR_SEARCH_FAILED'),
          { status: 503 }
        );
      }

      // ============================================================
      // STEP 5: Fetch product details from database
      // ============================================================
      console.log('🔄 Step 5: Fetching product details...');
      
      if (searchResults.length === 0) {
        console.log('⚠️ No similar products found in vector search');
        return NextResponse.json(
          ResponseBuilder.success('NO_PRODUCTS_FOUND', {
            products: [],
            total: 0,
            message: 'Không tìm thấy sản phẩm tương tự. Thử tải lên hình ảnh khác hoặc điều chỉnh tiêu chí tìm kiếm.',
            debug: {
              originalSize: originalBuffer.length,
              compressedSize: compressedBuffer.length,
              compressionRatio: Math.round((1 - compressedBuffer.length / originalBuffer.length) * 100),
              embeddingDimension: queryEmbedding.length,
              minSimilarity,
              searchFilters: {
                merchantId: searchFilters.merchantId,
                outletId: searchFilters.outletId,
                categoryId: searchFilters.categoryId
              }
            }
          })
        );
      }

      try {
        const { db } = await import('@rentalshop/database');
        
        // Fetch products in parallel by their IDs
        const productPromises = searchResults.map(async (result) => {
          const productId = parseInt(result.productId);
          if (isNaN(productId)) {
            console.warn(`⚠️ Invalid productId in search result: ${result.productId}`);
            return null;
          }
          
          try {
            const product = await db.products.findById(productId);
            if (!product) {
              console.warn(`⚠️ Product not found: ${productId}`);
              return null;
            }
            
            return {
              ...product,
              similarity: result.similarity,
              similarityPercent: Math.round(result.similarity * 100)
            };
          } catch (error: any) {
            console.error(`❌ Error fetching product ${productId}:`, error?.message);
            return null;
          }
        });

        const productsWithDetails = (await Promise.all(productPromises))
          .filter((p): p is NonNullable<typeof p> => p !== null)
          .sort((a, b) => b.similarity - a.similarity); // Sort by similarity (highest first)

        console.log(`✅ Step 5: Fetched ${productsWithDetails.length} product details`);

        // ============================================================
        // STEP 6: Return results
        // ============================================================
        return NextResponse.json(
          ResponseBuilder.success('PRODUCTS_FOUND', {
            products: productsWithDetails,
            total: productsWithDetails.length,
            message: `Tìm thấy ${productsWithDetails.length} sản phẩm tương tự`,
            debug: {
              originalSize: originalBuffer.length,
              compressedSize: compressedBuffer.length,
              compressionRatio: Math.round((1 - compressedBuffer.length / originalBuffer.length) * 100),
              embeddingDimension: queryEmbedding.length,
              minSimilarity,
              searchFilters: {
                merchantId: searchFilters.merchantId,
                outletId: searchFilters.outletId,
                categoryId: searchFilters.categoryId
              },
              vectorSearchResults: searchResults.length,
              productsFetched: productsWithDetails.length
            }
          })
        );
      } catch (error: any) {
        console.error('❌ Step 5: Error fetching product details:', error?.message);
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_FETCH_FAILED'),
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
