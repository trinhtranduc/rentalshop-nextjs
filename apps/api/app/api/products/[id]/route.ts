import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withPermissions } from '@rentalshop/auth';
import { 
  productUpdateSchema, 
  handleApiError, 
  ResponseBuilder, 
  uploadToS3, 
  commitStagingFiles, 
  deleteFromS3, 
  extractS3KeyFromUrl, 
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
import { compressImageTo1MB } from '../../../../lib/image-compression';
import { API, USER_ROLE, VALIDATION } from '@rentalshop/constants';

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

      // Transform the data to match the expected format
      const transformedProduct = {
        id: product.id, // Return id directly to frontend
        name: product.name,
        description: product.description,
        barcode: product.barcode,
        categoryId: product.categoryId,
        rentPrice: product.rentPrice,
        salePrice: product.salePrice,
        costPrice: (product as any).costPrice ?? null, // Include costPrice (giá vốn)
        deposit: product.deposit,
        totalStock: product.totalStock,
        images: imageUrls,
        isActive: product.isActive,
        // Optional pricing configuration
        pricingType: (product as any).pricingType ?? null,
        durationConfig: (product as any).durationConfig ?? null,
        category: product.category,
        merchant: product.merchant,
        outletStock: product.outletStock.map((os: any) => ({
          id: os.id,
          outletId: os.outlet.id, // Use id for frontend
          stock: os.stock,
          available: os.available,
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

      // Parse and validate request body - handle both JSON and multipart form data
      const contentType = request.headers.get('content-type') || '';
      let productDataFromRequest: any = {};
      let uploadedFiles: string[] = [];

      if (contentType.includes('multipart/form-data')) {
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
              // Generate production URLs
              const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
              const productionUrls = commitResult.committedKeys.map(key => 
                cloudfrontDomain 
                  ? `https://${cloudfrontDomain}/${key}`
                  : `https://${process.env.AWS_S3_BUCKET_NAME || 'anyrent-images'}.s3.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com/${key}`
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
            } else {
              console.error('❌ Failed to commit staging files:', commitResult.errors);
              // Fallback: use staging URLs if commit fails
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
        
      } else {
        // Handle regular JSON request
        console.log('🔍 Processing JSON request');
      const body = await request.json();
        productDataFromRequest = body;
      }

      console.log('🔍 PUT /api/products/[id] - Update request body:', productDataFromRequest);

      // Validate and normalize input data
      const validatedData = productUpdateSchema.parse(productDataFromRequest);
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
            ResponseBuilder.error('BUSINESS_NAME_EXISTS'),
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
          const productModule = await import('@rentalshop/database/src/product');
          const { syncProductTotalStock } = productModule;
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

      // Transform product for response
      const transformedProduct = {
        id: updatedProduct.id,
        name: updatedProduct.name,
        description: updatedProduct.description,
        barcode: updatedProduct.barcode,
        categoryId: updatedProduct.categoryId,
        rentPrice: updatedProduct.rentPrice,
        salePrice: updatedProduct.salePrice,
        costPrice: (updatedProduct as any).costPrice ?? null,
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
 * Delete product by ID (soft delete)
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

      // Parse images from existing product to delete them from S3
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
              } else {
                console.warn(`⚠️ Failed to delete image from S3: ${s3Key}`);
              }
            } else {
              console.warn(`⚠️ Could not extract S3 key from URL: ${imageUrl}`);
            }
          } catch (error) {
            console.error(`❌ Error deleting image ${imageUrl}:`, error);
          }
        });
        await Promise.all(deletePromises);
      }

      // Soft delete by setting isActive to false
      const deletedProduct = await db.products.update(productId, { isActive: false });
      console.log('✅ Product soft deleted successfully:', deletedProduct);

      // Return product with parsed images (already parsed above)
      const responseProduct = {
        ...deletedProduct,
        images: imageUrls // Use already parsed imageUrls from above
      };

      return NextResponse.json({
        success: true,
        data: responseProduct,
        code: 'PRODUCT_DELETED_SUCCESS',
        message: 'Product deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error deleting product:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
