import { NextRequest, NextResponse } from 'next/server';
import { db, prisma } from '@rentalshop/database';
import { withPermissions, hasPermission } from '@rentalshop/auth/server';
import { 
  productUpdateSchema, 
  handleApiError, 
  ResponseBuilder, 
  generateStagingKey, 
  generateProductImageKey, 
  generateFileName, 
  splitKeyIntoParts,
  parseProductImages,
  normalizeImagesInput,
  combineProductImages,
  extractStagingKeysFromUrls,
  mapStagingUrlsToProductionUrls
} from '@rentalshop/utils';
import { uploadToS3, commitStagingFiles, deleteFromS3, getBucketName, extractS3KeyFromUrl } from '@rentalshop/utils/server';
import { compressImageTo1MB } from '../../../../lib/image-compression';
import { API, USER_ROLE, VALIDATION, ORDER_STATUS } from '@rentalshop/constants';

/**
 * Helper function to validate image file
 */
function validateImage(file: File): { isValid: boolean; error?: string } {
  const ALLOWED_TYPES = VALIDATION.ALLOWED_IMAGE_TYPES;
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
  // Allow larger initial upload (5MB), will be compressed to 400KB
  const MAX_FILE_SIZE = VALIDATION.MAX_FILE_SIZE;
  
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
      error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')} or extensions: ${ALLOWED_EXTENSIONS.join(',')}. File type: "${file.type}", File name: "${file.name}"`
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
 * GET /api/products/[id]
 * Get product by ID
 * 
 * Authorization: All roles with 'products.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  return withPermissions(['products.view'])(async (request, { user, userScope }) => {
    try {
      console.log('🔍 GET /api/products/[id] - Looking for product with ID:', id);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PRODUCT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const productId = parseInt(id);
      
      // Validate that non-admin users have merchant association
      const userMerchantId = userScope.merchantId;
      if (user.role !== 'ADMIN' && !userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 403 }
        );
      }
      
      // Get product using the simplified database API
      const product = await db.products.findById(productId);

      if (!product) {
        console.log('❌ Product not found in database for productId:', productId);
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Verify product belongs to user's merchant (security check)
      // Use product.merchant.id (public ID) for comparison, not product.merchantId (CUID)
      const productMerchantId = product.merchant?.id;
      if (user.role !== 'ADMIN' && productMerchantId !== userMerchantId) {
        console.log('❌ Product does not belong to user\'s merchant:', {
          productMerchantId: productMerchantId,
          userMerchantId: userMerchantId
        });
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_NOT_FOUND'), // Return NOT_FOUND for security (don't reveal product exists)
          { status: API.STATUS.NOT_FOUND }
        );
      }

      console.log('✅ Product found, transforming data...');

      // Parse images from database
      const imageUrls = parseProductImages(product.images);

      // Check if user has products.manage permission to view cost price
      const canViewCostPrice = await hasPermission(user, 'products.manage');

      // Calculate total renting from all outlets
      const totalRenting = product.outletStock.reduce((sum: number, os: any) => sum + (os.renting || 0), 0);
      // Calculate available at product level: totalStock - totalRenting
      const available = Math.max(0, (product.totalStock || 0) - totalRenting);
      
      // Transform the data to match the expected format
      const transformedProduct = {
        id: product.id, // Return id directly to frontend
        name: product.name,
        description: product.description,
        barcode: product.barcode,
        categoryId: product.categoryId,
        rentPrice: product.rentPrice,
        salePrice: product.salePrice,
        // Only include costPrice if user has products.manage permission
        ...(canViewCostPrice ? { costPrice: product.costPrice ?? null } : {}),
        deposit: product.deposit,
        totalStock: product.totalStock,
        available: available, // Product-level available = totalStock - sum(renting from all outlets)
        images: imageUrls,
        isActive: product.isActive,
        // Optional pricing configuration
        pricingType: product.pricingType ?? null,
        durationConfig: product.durationConfig ?? null,
        category: product.category,
        merchant: product.merchant,
        outletStock: product.outletStock.map((os: any) => ({
          id: os.id,
          outletId: os.outlet.id, // Use id for frontend
          stock: os.stock,
          // Calculate available = stock - renting (ensure it's always correct)
          available: Math.max(0, (os.stock || 0) - (os.renting || 0)),
          renting: os.renting,
          outlet: {
            id: os.outlet.id, // Use id for frontend
            name: os.outlet.name,
            address: os.outlet.address || null // Include address if available
          }
        })),
        createdAt: product.createdAt?.toISOString() || null,
        updatedAt: product.updatedAt?.toISOString() || null
      };

      console.log('✅ Transformed product data:', transformedProduct);

      return NextResponse.json({
        success: true,
        data: transformedProduct,
        code: 'PRODUCT_RETRIEVED_SUCCESS',
        message: 'Product retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error fetching product:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/products/[id]
 * Update product by ID
 * UNIFIED FORMAT: Always expects multipart FormData (consistent with POST)
 * - Product data: JSON string in 'data' field
 * - Files (optional): File objects in 'images' field
 * 
 * Authorization: All roles with 'products.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  return withPermissions(['products.manage'])(async (request, { user, userScope }) => {
    try {

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PRODUCT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const productId = parseInt(id);

      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      // ADMIN users can update products without merchantId (they have system-wide access)
      // Non-admin users need merchantId
      if (user.role !== USER_ROLE.ADMIN && !userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 400 }
        );
      }

      // Parse multipart form data - UNIFIED FORMAT: Always expects FormData (consistent with POST)
      // - Product data: JSON string in 'data' field
      // - Files (optional): File objects in 'images' field
      console.log('🔍 Processing multipart form data with file uploads');
      
      const formData = await request.formData();
      
      // Extract JSON data from form fields
      const jsonDataStr = formData.get('data') as string;
      if (!jsonDataStr) {
        return NextResponse.json(
          ResponseBuilder.error('MISSING_PRODUCT_DATA'),
          { status: 400 }
        );
      }
      
      let productDataFromRequest: any;
      try {
        productDataFromRequest = JSON.parse(jsonDataStr);
        
        // Fix outletStock if it's a string (mobile app compatibility)
        if (productDataFromRequest.outletStock && typeof productDataFromRequest.outletStock === 'string') {
          try {
            productDataFromRequest.outletStock = JSON.parse(productDataFromRequest.outletStock);
          } catch (parseError) {
            console.log('⚠️ Failed to parse outletStock string:', productDataFromRequest.outletStock);
          }
        }
        
        // Normalize images to array of strings
        if (productDataFromRequest.images !== undefined) {
          const normalized = normalizeImagesInput(productDataFromRequest.images);
          productDataFromRequest.images = normalized.length > 0 ? normalized : undefined;
          if (!productDataFromRequest.images) {
            delete productDataFromRequest.images;
          }
        }
      } catch (parseError) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_JSON_DATA'),
          { status: 400 }
        );
      }

      // Upload image files
      const imageFiles = formData.getAll('images') as File[];
      let uploadedFiles: string[] = [];
      
      if (imageFiles.length > 0) {
        console.log(`🔍 Processing ${imageFiles.length} image file(s)`);
        
        for (const file of imageFiles) {
          if (!file || file.size === 0) continue;
          
          // Validate image
          const validation = validateImage(file);
          if (!validation.isValid) {
            return NextResponse.json(
              ResponseBuilder.error('IMAGE_VALIDATION_FAILED'),
              { status: 400 }
            );
          }
          
          // Compress image
          const bytes = await file.arrayBuffer();
          const buffer = await compressImageTo1MB(Buffer.from(new Uint8Array(bytes)));
          
          // Verify size after compression
          if (buffer.length > VALIDATION.IMAGE_SIZES.PRODUCT) {
            return NextResponse.json(
              ResponseBuilder.error('IMAGE_TOO_LARGE'),
              { status: 400 }
            );
          }
          
          // Upload to S3 staging
          const fileName = generateFileName(file.name.replace(/\.[^/.]+$/, '') || 'product-image');
          const stagingKey = generateStagingKey(fileName);
          const { folder, fileName: finalFileName } = splitKeyIntoParts(stagingKey);
          
          const uploadResult = await uploadToS3(buffer, {
            folder,
            fileName: finalFileName,
            contentType: 'image/jpeg',
            preserveOriginalName: false
          });
          
          if (!uploadResult.success || !uploadResult.data) {
            console.error(`❌ Failed to upload ${file.name}:`, uploadResult.error);
            return NextResponse.json(
              ResponseBuilder.error('IMAGE_UPLOAD_FAILED'),
              { status: 500 }
            );
          }
          
          uploadedFiles.push(uploadResult.data.url);
          console.log(`✅ Uploaded: ${file.name}`);
        }
      }
      
      // Commit staging files to production (if any uploaded)
      if (uploadedFiles.length > 0) {
        const stagingKeys = extractStagingKeysFromUrls(uploadedFiles);
        
        if (stagingKeys.length > 0) {
          console.log('🔍 Committing staging files to production:', stagingKeys.length);
          
          // Structure: products/merchant-{id} (simplified, no env prefix, no outlet level)
          const fileName = generateFileName('product-image');
          const productionKey = generateProductImageKey(userMerchantId, fileName);
          const { folder: targetFolder } = splitKeyIntoParts(productionKey);
          
          // Commit staging files to production
          const commitResult = await commitStagingFiles(stagingKeys, targetFolder);
          
          if (commitResult.success) {
            // Generate production URLs using CloudFront custom domain
            // Uses AWS_CLOUDFRONT_DOMAIN (images.anyrent.shop for prod, dev-images.anyrent.shop for dev)
            const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
            if (!cloudfrontDomain) {
              console.error('❌ AWS_CLOUDFRONT_DOMAIN not configured');
              // Continue with original URLs if CloudFront not configured
              productDataFromRequest.images = combineProductImages(
                productDataFromRequest.images,
                uploadedFiles
              );
            } else {
              const productionUrls = commitResult.committedKeys.map(key => 
                `https://${cloudfrontDomain}/${key}`
              );
            
              // Map staging URLs to production URLs
              const productionImageUrls = mapStagingUrlsToProductionUrls(
                uploadedFiles,
                commitResult.committedKeys,
                productionUrls
              );
              
              // Combine with existing images
              productDataFromRequest.images = combineProductImages(
                productDataFromRequest.images,
                productionImageUrls
              );
              
              console.log('✅ Committed staging files to production');
            }
          } else {
            console.error('❌ Failed to commit staging files:', commitResult.errors);
            // Continue with staging URLs if commit fails
            productDataFromRequest.images = combineProductImages(
              productDataFromRequest.images,
              uploadedFiles
            );
          }
        } else {
          // No staging keys found, just combine uploaded files as-is
          productDataFromRequest.images = combineProductImages(
            productDataFromRequest.images,
            uploadedFiles
          );
        }
      }

      console.log('🔍 PUT /api/products/[id] - Update request body:', productDataFromRequest);

      // Add productId from URL params to request body for validation
      // Schema requires 'id' field for validation, but it's in URL params, not request body
      const productDataWithId = {
        ...productDataFromRequest,
        id: productId
      };

      // Validate and normalize input data
      const validatedData = productUpdateSchema.parse(productDataWithId);
      const { outletStock, ...productUpdateData } = validatedData;
      
      // Normalize images to array format
      if (productUpdateData.images !== undefined) {
        productUpdateData.images = normalizeImagesInput(productUpdateData.images);
      }

      // Check if product exists and user has access to it
      const existingProduct = await db.products.findById(productId);
      if (!existingProduct) {
        throw new Error('Product not found');
      }

      // ============================================================================
      // AUTHORIZATION: Check merchant and outlet scope
      // ============================================================================
      // Verify product belongs to user's merchant (security check)
      // Use product.merchant.id (public ID) for comparison, not product.merchantId (CUID)
      const productMerchantId = existingProduct.merchant?.id;
      if (user.role !== USER_ROLE.ADMIN && productMerchantId !== userMerchantId) {
        console.log('❌ Product does not belong to user\'s merchant:', {
          productMerchantId: productMerchantId,
          userMerchantId: userMerchantId
        });
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_ACCESS_DENIED'),
          { status: API.STATUS.FORBIDDEN }
        );
      }

      // For OUTLET_ADMIN: Verify product has stock at their outlet (or allow updating if they're adding stock to their outlet)
      if (user.role === USER_ROLE.OUTLET_ADMIN && userScope.outletId) {
        // Check if product currently has stock at user's outlet
        const hasStockAtOutlet = existingProduct.outletStock?.some(
          (os: any) => os.outlet?.id === userScope.outletId
        );
        
        // Check if user is trying to add/update stock at their outlet
        const isUpdatingOwnOutlet = outletStock && Array.isArray(outletStock) && outletStock.some(
          (os: any) => os.outletId === userScope.outletId
        );
        
        // OUTLET_ADMIN can only update products that:
        // 1. Already have stock at their outlet, OR
        // 2. They're adding stock to their outlet in this update
        if (!hasStockAtOutlet && !isUpdatingOwnOutlet) {
          console.log('❌ OUTLET_ADMIN cannot update product without stock at their outlet:', {
            productId: productId,
            userOutletId: userScope.outletId,
            hasStockAtOutlet: hasStockAtOutlet,
            isUpdatingOwnOutlet: isUpdatingOwnOutlet,
            availableOutlets: existingProduct.outletStock?.map((os: any) => os.outlet?.id) || []
          });
          return NextResponse.json(
            ResponseBuilder.error('PRODUCT_NOT_AVAILABLE_AT_OUTLET'),
            { status: API.STATUS.FORBIDDEN }
          );
        }
      }

      // Check for duplicate product name if name is being updated
      if (productUpdateData.name && productUpdateData.name !== existingProduct.name) {
        const duplicateProduct = await db.products.findFirst({
          name: productUpdateData.name,
          merchantId: userMerchantId,
          isActive: true,
          id: { not: productId }
        });

        if (duplicateProduct) {
          console.log('❌ Product name already exists:', productUpdateData.name);
          return NextResponse.json(
            ResponseBuilder.error('PRODUCT_NAME_EXISTS'),
            { status: 409 }
          );
        }
      }

      // Prepare outletStock nested write if provided
      let finalUpdateData: any = { ...productUpdateData };
      
      if (outletStock && Array.isArray(outletStock) && outletStock.length > 0) {
        console.log('🔄 Preparing outlet stock nested write:', outletStock);
        
        // Verify all outlets exist first using db API
        const validOutletStock = [];
        for (const stock of outletStock) {
          if (stock.outletId && typeof stock.stock === 'number') {
            console.log(`🔍 Verifying outlet ID: ${stock.outletId}`);
            const outlet = await db.outlets.findById(stock.outletId);
            if (outlet) {
              console.log(`✅ Found outlet:`, { id: outlet.id, name: outlet.name });
              // For nested write, we need to use outlet's database ID (number)
              validOutletStock.push({
                outletId: outlet.id, // Use id (number) for nested write
                stock: stock.stock,
                available: stock.stock,
                renting: 0
              });
            } else {
              console.log(`❌ Outlet not found for ID: ${stock.outletId}`);
            }
          } else {
            console.log(`❌ Invalid outletStock entry:`, stock);
          }
        }
        
        if (validOutletStock.length > 0) {
          // Use nested write to replace all outlet stock
          finalUpdateData.outletStock = {
            deleteMany: {}, // Delete all existing outlet stock
            create: validOutletStock // Create new ones
          };
          console.log('✅ Prepared outletStock nested write:', finalUpdateData.outletStock);
        }
      } else {
        console.log('ℹ️ No outletStock provided or empty array');
      }

      // Update the product using the simplified database API with nested write
      const updatedProduct = await db.products.update(productId, finalUpdateData);
      console.log('✅ Product updated successfully with outletStock:', updatedProduct);

      // Sync Product.totalStock = sum of all OutletStock.stock
      // This ensures totalStock always equals the sum of all outlet stocks
      if (outletStock && Array.isArray(outletStock) && outletStock.length > 0) {
        try {
          const { syncProductTotalStock } = await import('@rentalshop/database');
          if (syncProductTotalStock) {
            await syncProductTotalStock(productId);
            // Re-fetch product to get updated totalStock
            const refreshedProduct = await db.products.findById(productId);
            if (refreshedProduct) {
              Object.assign(updatedProduct, { totalStock: refreshedProduct.totalStock });
            }
          }
        } catch (error) {
          console.error('❌ Error syncing Product.totalStock after update:', error);
          // Don't throw - product update succeeded, sync failed
        }
      }

      // Cleanup old images that are no longer in the new images list
      // IMPORTANT: This ensures orphaned images are deleted from S3 when updating product images
      if (productUpdateData.images !== undefined) {
        try {
          // Parse existing images before update
          const existingImageUrls = parseProductImages(existingProduct.images);
          // Parse new images after update
          const newImageUrls = parseProductImages(updatedProduct.images);
          
          console.log(`🔍 Image cleanup check for product ${productId}:`, {
            existingCount: existingImageUrls.length,
            newCount: newImageUrls.length
          });
          
          // Find images that existed before but are not in the new list
          const imagesToDelete = existingImageUrls.filter(existingUrl => {
            // Normalize URLs for comparison (remove query params, trailing slashes)
            const normalizedExisting = existingUrl.split('?')[0].replace(/\/$/, '').toLowerCase();
            return !newImageUrls.some(newUrl => {
              const normalizedNew = newUrl.split('?')[0].replace(/\/$/, '').toLowerCase();
              return normalizedExisting === normalizedNew;
            });
          });
          
          // Delete orphaned images from S3
          if (imagesToDelete.length > 0) {
            console.log(`🗑️ Deleting ${imagesToDelete.length} orphaned image(s) from S3 for product ${productId}`);
            const deletePromises = imagesToDelete.map(async (imageUrl) => {
              try {
                const s3Key = extractS3KeyFromUrl(imageUrl);
                if (s3Key) {
                  const deleted = await deleteFromS3(s3Key);
                  if (deleted) {
                    console.log(`✅ Deleted orphaned image from S3: ${s3Key}`);
                    return { success: true, key: s3Key };
                  } else {
                    console.warn(`⚠️ Failed to delete orphaned image from S3: ${s3Key}`);
                    return { success: false, key: s3Key, error: 'Delete failed' };
                  }
                } else {
                  console.warn(`⚠️ Could not extract S3 key from URL: ${imageUrl}`);
                  return { success: false, key: null, error: 'Could not extract S3 key' };
                }
              } catch (error) {
                console.error(`❌ Error deleting orphaned image ${imageUrl}:`, error);
                return { success: false, key: imageUrl, error: error instanceof Error ? error.message : 'Unknown error' };
              }
            });
            
            const results = await Promise.all(deletePromises);
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;
            
            console.log(`📊 Image cleanup summary for product ${productId}: ${successCount} deleted, ${failCount} failed`);
          } else {
            console.log('ℹ️ No orphaned images to delete - all existing images are still in use');
          }
        } catch (error) {
          console.error('❌ Error cleaning up old images:', error);
          // Don't throw - product update succeeded, cleanup failed (images will remain in S3)
          // This is acceptable as orphaned images don't affect functionality, just storage cost
        }
      }

      // Regenerate embeddings for image search if images were updated (background job)
      // Delete old embeddings first, then generate new ones
      // Check if images actually changed by comparing existing vs new
      const existingImageUrls = parseProductImages(existingProduct.images);
      const newImageUrls = productUpdateData.images !== undefined 
        ? parseProductImages(productUpdateData.images)
        : imageFiles.length > 0
          ? parseProductImages(updatedProduct.images) // Use updated product images if files were uploaded
          : existingImageUrls;
      
      // Normalize URLs for comparison (remove query params, trailing slashes)
      const normalizeUrl = (url: string) => url.split('?')[0].replace(/\/$/, '').toLowerCase();
      const existingNormalized = existingImageUrls.map(normalizeUrl).sort().join(',');
      const newNormalized = newImageUrls.map(normalizeUrl).sort().join(',');
      const imagesChanged = existingNormalized !== newNormalized;
      
      console.log(`🔍 Embedding regeneration check for product ${productId}:`, {
        imageFilesCount: imageFiles.length,
        productUpdateDataImages: productUpdateData.images !== undefined ? 'provided' : 'not provided',
        existingImagesCount: existingImageUrls.length,
        newImagesCount: newImageUrls.length,
        imagesChanged,
        existingNormalized: existingNormalized.substring(0, 100),
        newNormalized: newNormalized.substring(0, 100)
      });
      
      if (imageFiles.length > 0 || imagesChanged) {
        console.log(`🔄 Triggering embedding regeneration for product ${productId}...`);
        try {
          const { generateProductEmbedding } = await import('@rentalshop/database/server');
          const { getVectorStore } = await import('@rentalshop/database/server');
          
          // Delete old embeddings first, then generate new ones (sequential to avoid race condition)
          // Run in background, don't block API response
          (async () => {
            try {
          const vectorStore = getVectorStore();
              
              // Step 1: Delete old embeddings first
              await vectorStore.deleteProductEmbeddings(productId);
              console.log(`✅ Deleted old embeddings for product ${productId}`);
          
              // Step 2: Generate new embeddings after delete completes
              await generateProductEmbedding(productId);
              console.log(`✅ Embedding regeneration completed for product ${productId}`);
            } catch (error: any) {
              console.error(`❌ Error in embedding regeneration for product ${productId}:`, error);
              console.error('Stack:', error.stack);
              // Don't fail the request if embedding generation fails
            }
          })();
        } catch (error: any) {
          console.error('❌ Error starting embedding regeneration:', error);
          console.error('Stack:', error.stack);
          // Don't fail the request if embedding generation fails
        }
      } else {
        console.log(`ℹ️ Images unchanged for product ${productId}, skipping embedding regeneration`);
      }

      // Check if user has products.manage permission to view cost price
      const canViewCostPrice = await hasPermission(user, 'products.manage');

      // Transform product for response
      const transformedProduct = {
        id: updatedProduct.id,
        name: updatedProduct.name,
        description: updatedProduct.description,
        barcode: updatedProduct.barcode,
        categoryId: updatedProduct.categoryId,
        rentPrice: updatedProduct.rentPrice,
        salePrice: updatedProduct.salePrice,
        // Only include costPrice if user has products.manage permission
        ...(canViewCostPrice ? { costPrice: updatedProduct.costPrice ?? null } : {}),
        deposit: updatedProduct.deposit,
        totalStock: updatedProduct.totalStock,
        images: parseProductImages(updatedProduct.images),
        isActive: updatedProduct.isActive,
        category: updatedProduct.category,
        merchant: updatedProduct.merchant,
        createdAt: updatedProduct.createdAt.toISOString(),
        updatedAt: updatedProduct.updatedAt.toISOString()
      };

      return NextResponse.json({
        success: true,
        data: transformedProduct,
        code: 'PRODUCT_UPDATED_SUCCESS',
        message: 'Product updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating product:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * DELETE /api/products/[id]
 * Delete product by ID (hard delete)
 * - Always hard delete products (permanently remove, including S3 images and Qdrant embeddings)
 * - Order items store product info separately (productId, productName, productBarcode, productImages)
 *   so product records can be safely deleted without losing order history
 * 
 * Authorization: All roles with 'products.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  return withPermissions(['products.manage'])(async (request, { user, userScope }) => {
    try {

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PRODUCT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const productId = parseInt(id);

      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      // ADMIN users can delete products without merchantId (they have system-wide access)
      // Non-admin users need merchantId
      if (user.role !== USER_ROLE.ADMIN && !userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 400 }
        );
      }

      // Check if product exists and user has access to it
      const existingProduct = await db.products.findById(productId);
      if (!existingProduct) {
        throw new Error('Product not found');
      }

      // ============================================================================
      // AUTHORIZATION: Check merchant and outlet scope
      // ============================================================================
      // Verify product belongs to user's merchant (security check)
      // Use product.merchant.id (public ID) for comparison, not product.merchantId (CUID)
      const productMerchantId = existingProduct.merchant?.id;
      if (user.role !== USER_ROLE.ADMIN && productMerchantId !== userMerchantId) {
        console.log('❌ Product does not belong to user\'s merchant:', {
          productMerchantId: productMerchantId,
          userMerchantId: userMerchantId
        });
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_ACCESS_DENIED'),
          { status: API.STATUS.FORBIDDEN }
        );
      }

      // For OUTLET_ADMIN: Verify product has stock at their outlet
      if (user.role === USER_ROLE.OUTLET_ADMIN && userScope.outletId) {
        const hasStockAtOutlet = existingProduct.outletStock?.some(
          (os: any) => os.outlet?.id === userScope.outletId
        );
        if (!hasStockAtOutlet) {
          console.log('❌ Product does not have stock at user\'s outlet:', {
          productId: productId,
            userOutletId: userScope.outletId,
            availableOutlets: existingProduct.outletStock?.map((os: any) => os.outlet?.id) || []
          });
          return NextResponse.json(
            ResponseBuilder.error('PRODUCT_NOT_AVAILABLE_AT_OUTLET'),
            { status: API.STATUS.FORBIDDEN }
          );
        }
      }

      // ============================================================================
      // DELETE PRODUCT (Hard Delete)
      // ============================================================================
      // Note: Order items store product info separately (productId, productName, productBarcode, productImages)
      // so product records can be safely deleted without losing order history
      
      // Get product info before deletion for response
      const productInfo = {
        id: productId, // publicId from route params
        name: existingProduct.name,
        images: existingProduct.images,
      };

      // Always hard delete (order items store product info separately)
      const imageUrls = parseProductImages(existingProduct.images);

      // Delete all product images from S3 storage
      if (imageUrls.length > 0) {
        console.log(`🗑️ Deleting ${imageUrls.length} image(s) from S3 for product ${productId}`);
        const deletePromises = imageUrls.map(async (imageUrl) => {
          try {
            const s3Key = extractS3KeyFromUrl(imageUrl);
            if (s3Key) {
              const deleted = await deleteFromS3(s3Key);
              if (deleted) {
                console.log(`✅ Deleted image from S3: ${s3Key}`);
                return { success: true, key: s3Key };
              } else {
                console.warn(`⚠️ Failed to delete image from S3: ${s3Key}`);
                return { success: false, key: s3Key, error: 'Delete failed' };
              }
            } else {
              console.warn(`⚠️ Could not extract S3 key from URL: ${imageUrl}`);
              return { success: false, key: null, error: 'Could not extract S3 key' };
            }
          } catch (error) {
            console.error(`❌ Error deleting image ${imageUrl}:`, error);
            return { success: false, key: imageUrl, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        });
        
        const results = await Promise.all(deletePromises);
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        console.log(`📊 Image deletion summary for product ${productId}: ${successCount} deleted, ${failCount} failed`);
        
        if (failCount > 0) {
          console.warn(`⚠️ Warning: ${failCount} image(s) failed to delete from S3. Product will still be deleted.`);
        }
      }

      // Delete embeddings from Qdrant
      try {
        const { getVectorStore } = await import('@rentalshop/database/server');
        const vectorStore = getVectorStore();
        vectorStore.deleteProductEmbeddings(productId).catch((error: any) => {
          console.error(`Error deleting embeddings for product ${productId}:`, error);
        });
      } catch (error) {
        console.error('Error starting embedding deletion:', error);
        // Don't fail the request if embedding deletion fails
      }

      // Hard delete: permanently remove product from database
      await prisma.product.delete({
        where: { id: productId },
      });
      
      console.log('✅ Product hard deleted successfully:', productInfo);

      // Return product info (without dates since it's deleted)
      const responseProduct = {
        id: productInfo.id,
        name: productInfo.name,
        images: imageUrls
      };

      return NextResponse.json({
        success: true,
        data: responseProduct,
        code: 'PRODUCT_DELETED_SUCCESS',
        message: `Product "${existingProduct.name}" has been permanently deleted from the system.`
      });

    } catch (error) {
      console.error('❌ Error deleting product:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
