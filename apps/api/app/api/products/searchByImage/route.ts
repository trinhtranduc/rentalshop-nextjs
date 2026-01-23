/**
 * POST /api/products/searchByImage
 * Search products by uploading an image
 * 
 * Uses FashionCLIP model to generate embedding and search in Qdrant vector database
 * 
 * Authorization: All roles with 'products.view' permission can access
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { 
  handleApiError, 
  ResponseBuilder, 
  uploadToS3, 
  generateFileName, 
  generateStagingKey, 
  splitKeyIntoParts 
} from '@rentalshop/utils';
import { compressImageTo1MB } from '../../../../lib/image-compression';
import { VALIDATION } from '@rentalshop/constants';

// Force dynamic rendering to prevent Next.js from collecting page data
// This prevents Next.js from trying to load native dependencies (onnxruntime-node) during build
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
 * Request (FormData):
 * - image: File (required) - Image file to search
 * - limit: number (optional, default: 20) - Number of results
 * - minSimilarity: number (optional, default: 0.7) - Minimum similarity threshold
 * - categoryId: number (optional) - Filter by category
 */
export const POST = withPermissions(['products.view'])(
  async (request: NextRequest, { user, userScope }) => {
    try {
      console.log(`🔍 POST /api/products/searchByImage - User: ${user.email} (${user.role})`);

      // Parse form data
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
        : parseFloat(process.env.IMAGE_SEARCH_MIN_SIMILARITY || '0.7');
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

      console.log('📸 Processing image search:', {
        fileName: file.name,
        fileSize: file.size,
        limit,
        minSimilarity,
        categoryId
      });

      // Step 1: Upload image to S3 (temp folder for processing)
      const bytes = await file.arrayBuffer();
      const buffer = await compressImageTo1MB(Buffer.from(new Uint8Array(bytes)));

      const fileName = generateFileName('search-query');
      const stagingKey = generateStagingKey(fileName);
      const { folder, fileName: finalFileName } = splitKeyIntoParts(stagingKey);

      // Upload to temp folder
      const uploadResult = await uploadToS3(buffer, {
        folder: `temp/search/${folder}`,
        fileName: finalFileName,
        contentType: 'image/jpeg',
        preserveOriginalName: false
      });

      if (!uploadResult.success || !uploadResult.data) {
        console.error('❌ Failed to upload image:', uploadResult.error);
        return NextResponse.json(
          ResponseBuilder.error('IMAGE_UPLOAD_FAILED'),
          { status: 500 }
        );
      }

      const imageUrl = uploadResult.data.url;
      console.log('✅ Image uploaded to S3:', imageUrl);

      // Step 2: Generate embedding (lazy load to avoid loading native deps during build)
      console.log('🔄 Generating embedding...');
      const { getEmbeddingService } = await import('@rentalshop/database/server');
      const embeddingService = getEmbeddingService();
      const queryEmbedding = await embeddingService.generateEmbedding(imageUrl);
      console.log('✅ Embedding generated (dimension:', queryEmbedding.length, ')');

      // Step 3: Search in Qdrant (lazy load to avoid loading native deps during build)
      console.log('🔍 Searching in Qdrant...');
      const { getVectorStore } = await import('@rentalshop/database/server');
      const vectorStore = getVectorStore();
      
      // Build filters from userScope
      const filters: any = {
        limit,
        minSimilarity
      };

      // Apply role-based filtering
      if (userScope.merchantId) {
        filters.merchantId = userScope.merchantId;
      }

      if (userScope.outletId) {
        filters.outletId = userScope.outletId;
      }

      if (categoryId) {
        filters.categoryId = categoryId;
      }

      const searchResults = await vectorStore.search(queryEmbedding, filters);
      console.log(`✅ Found ${searchResults.length} similar products`);

      // Step 4: Get product details
      if (searchResults.length === 0) {
        return NextResponse.json(
          ResponseBuilder.success('NO_PRODUCTS_FOUND', {
            products: [],
            total: 0,
            queryImage: imageUrl
          })
        );
      }

      // Fetch product details
      const productIds = searchResults.map(r => parseInt(r.productId));
      const products = await Promise.all(
        productIds.map(async (id) => {
          try {
            return await db.products.findById(id);
          } catch (error) {
            console.error(`Error fetching product ${id}:`, error);
            return null;
          }
        })
      );

      // Filter out nulls and combine with similarity scores
      const productsWithSimilarity = products
        .filter((p, index) => p !== null)
        .map((product, index) => {
          const searchResult = searchResults.find(r => parseInt(r.productId) === product!.id);
          return {
            ...product,
            similarity: searchResult?.similarity || 0,
            _debug: {
              imageUrl: searchResult?.metadata?.imageUrl,
              similarityScore: searchResult?.similarity
            }
          };
        })
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0)); // Sort by similarity

      console.log(`✅ Returning ${productsWithSimilarity.length} products`);

      // Step 5: Return results
      return NextResponse.json(
        ResponseBuilder.success('PRODUCTS_FOUND', {
          products: productsWithSimilarity,
          total: productsWithSimilarity.length,
          queryImage: imageUrl
        })
      );

    } catch (error) {
      console.error('❌ Error in image search:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);
