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
      
      // Check if Python API is enabled
      const usePythonAPI = process.env.USE_PYTHON_EMBEDDING_API === 'true';
      const pythonApiUrl = process.env.PYTHON_EMBEDDING_API_URL || 'http://localhost:8000';
      
      try {
        if (usePythonAPI) {
          // Use Python FastAPI service (recommended - no memory issues)
          console.log(`🔄 Step 3: Using Python API: ${pythonApiUrl}`);
          
          // Create FormData for Python API
          const formData = new FormData();
          // Convert Buffer to Uint8Array for Blob
          const uint8Array = new Uint8Array(compressedBuffer);
          const blob = new Blob([uint8Array], { type: 'image/png' });
          formData.append('file', blob, 'image.png');
          
          const embeddingStartTime = Date.now();
          const embeddingResponse = await fetch(`${pythonApiUrl}/embed`, {
            method: 'POST',
            body: formData,
          });
          
          if (!embeddingResponse.ok) {
            const errorText = await embeddingResponse.text();
            throw new Error(`Python API error (${embeddingResponse.status}): ${errorText}`);
          }
          
          const embeddingData = await embeddingResponse.json();
          
          if (!embeddingData.success || !embeddingData.embedding) {
            throw new Error('Invalid response from Python API');
          }
          
          queryEmbedding = embeddingData.embedding as number[];
          const embeddingDuration = Date.now() - embeddingStartTime;
          
          if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
            throw new Error('Invalid embedding format from Python API');
          }
          
          console.log(`✅ Step 3: Embedding generated via Python API (dimension: ${queryEmbedding.length}, duration: ${embeddingDuration}ms)`);
        } else {
          // Use local transformers.js (fallback - may have memory issues)
          console.log('🔄 Step 3: Using local transformers.js (fallback)');
          
          // Lazy load embedding service to avoid loading native deps during build
          const { getEmbeddingService } = await import('@rentalshop/database/server');
          const embeddingService = getEmbeddingService();
          
          const embeddingStartTime = Date.now();
          queryEmbedding = await embeddingService.generateEmbeddingFromBuffer(compressedBuffer);
          const embeddingDuration = Date.now() - embeddingStartTime;
          
          console.log(`✅ Step 3: Embedding generated successfully (dimension: ${queryEmbedding.length}, duration: ${embeddingDuration}ms)`);
        }
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
              compressionRatio: Math.round((1 - compressedBuffer.length / originalBuffer.length) * 100),
              usePythonAPI,
              pythonApiUrl: usePythonAPI ? pythonApiUrl : undefined
            }
          },
          { status: 503 }
        );
      }

      // ============================================================
      // TEMPORARY: Return empty results until Step 4 is ready
      // ============================================================
      console.log('⚠️ Step 4 not yet implemented - returning empty results');
      
      return NextResponse.json(
        ResponseBuilder.success('NO_PRODUCTS_FOUND', {
          products: [],
          total: 0,
          message: 'Tính năng tìm kiếm hình ảnh đang được tích hợp từng bước. Bước 1-3 (validation, compression, embedding) đã hoàn thành.',
          debug: {
            originalSize: originalBuffer.length,
            compressedSize: compressedBuffer.length,
            compressionRatio: Math.round((1 - compressedBuffer.length / originalBuffer.length) * 100),
            embeddingDimension: queryEmbedding?.length || null,
            embeddingGenerated: queryEmbedding !== null
          }
        })
      );

      /* TODO: Step 4 - Vector search
      // Step 4: Search in Qdrant
      const { getVectorStore } = await import('@rentalshop/database/server');
      const vectorStore = getVectorStore();
      const searchResults = await vectorStore.search(queryEmbedding, { ... });
      */

    } catch (error: any) {
      console.error('❌ Error in image search:', error?.message);
      return NextResponse.json(
        ResponseBuilder.error('SERVICE_UNAVAILABLE'),
        { status: 503 }
      );
    }
  }
);
