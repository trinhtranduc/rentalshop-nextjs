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
import { uploadToS3, commitStagingFiles, deleteFromS3, getBucketName, extractS3KeyFromUrl, createAuditHelper } from '@rentalshop/utils/server';
import { compressImageTo1MB } from '../../../../lib/image-compression';
import { softDeleteProducts, PRODUCT_HAS_OPEN_ORDERS } from '../../../../lib/product-soft-delete';
import { buildProductAuditSnapshot, safeAudit } from '../../../../lib/change-timeline';
import { API, USER_ROLE, VALIDATION, ORDER_STATUS } from '@rentalshop/constants';

function buildImageUploadErrorResponse(detail?: string) {
  const base = ResponseBuilder.error('IMAGE_UPLOAD_FAILED');
  return NextResponse.json(
    {
      ...base,
      error: detail || base.error
    },
    { status: 500 }
  );
}

function buildAuditContext(request: NextRequest, user: { id: number; email: string; role: string }, userScope: { merchantId?: number; outletId?: number }) {
  return {
    userId: String(user.id),
    userEmail: user.email,
    userRole: user.role,
    merchantId: userScope.merchantId != null ? String(userScope.merchantId) : undefined,
    outletId: userScope.outletId != null ? String(userScope.outletId) : undefined,
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    requestId: request.headers.get('x-request-id') || undefined
  };
}

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

function sniffProductImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
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
        // Set when image search last finished. null = not searchable by photo yet.
        embeddingGeneratedAt: product.embeddingGeneratedAt?.toISOString() || null,
        // Optional pricing configuration
        pricingType: product.pricingType ?? null,
        durationConfig: product.durationConfig ?? null,
        pricingOptions: (product as any).pricingOptions ?? [],
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
 * Authorization: `products.manage` OR `products.update` (OUTLET_STAFF has neither — cannot update)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  return withPermissions(['products.manage', 'products.update'])(async (request, { user, userScope }) => {
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
      const imageFiles = (formData.getAll('images') as unknown[]).filter(
        (entry): entry is File =>
          !!entry &&
          typeof entry === 'object' &&
          typeof (entry as File).arrayBuffer === 'function'
      );
      let uploadedFiles: string[] = [];
      
      if (imageFiles.length > 0) {
        console.log(`🔍 Processing ${imageFiles.length} image file(s)`);
        
        for (const raw of imageFiles) {
          const reportedSize = Number(raw.size || 0);
          if (reportedSize > 0 && reportedSize < 100) continue;

          const bytes = Buffer.from(new Uint8Array(await raw.arrayBuffer()));
          if (bytes.length < 100) continue;

          const sniffed = sniffProductImageMime(bytes);
          const name = (raw.name || 'image_0.jpg').trim() || 'image_0.jpg';
          const type =
            sniffed ||
            (raw.type === 'image/*' ? 'image/jpeg' : raw.type) ||
            'image/jpeg';
          const fakeFile = {
            name: /\.(jpe?g|png|webp)$/i.test(name) ? name : `${name}.jpg`,
            type,
            size: bytes.length,
          } as File;

          const validation = validateImage(fakeFile);
          if (!validation.isValid) {
            return NextResponse.json(
              {
                ...ResponseBuilder.error('IMAGE_VALIDATION_FAILED'),
                error: validation.error || 'Invalid image',
              },
              { status: 400 }
            );
          }
          
          const buffer = await compressImageTo1MB(bytes);
          
          if (buffer.length > VALIDATION.IMAGE_SIZES.PRODUCT) {
            return NextResponse.json(
              ResponseBuilder.error('IMAGE_TOO_LARGE'),
              { status: 400 }
            );
          }
          
          const fileName = generateFileName(fakeFile.name.replace(/\.[^/.]+$/, '') || 'product-image');
          const stagingKey = generateStagingKey(fileName);
          const { folder, fileName: finalFileName } = splitKeyIntoParts(stagingKey);
          
          const uploadResult = await uploadToS3(buffer, {
            folder,
            fileName: finalFileName,
            contentType: 'image/jpeg',
            preserveOriginalName: false
          });
          
          if (!uploadResult.success || !uploadResult.data) {
            console.error(`❌ Failed to upload ${fakeFile.name}:`, uploadResult.error);
            return buildImageUploadErrorResponse(uploadResult.error);
          }
          
          uploadedFiles.push(uploadResult.data.url);
          console.log(`✅ Uploaded: ${fakeFile.name}`);
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

      // For OUTLET_ADMIN / OUTLET_STAFF: same outlet scope as create
      if (
        (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) &&
        userScope.outletId
      ) {
        // Check if product currently has stock at user's outlet
        const hasStockAtOutlet = existingProduct.outletStock?.some(
          (os: any) => os.outlet?.id === userScope.outletId
        );
        
        // Check if user is trying to add/update stock at their outlet
        const isUpdatingOwnOutlet = outletStock && Array.isArray(outletStock) && outletStock.some(
          (os: any) => os.outletId === userScope.outletId
        );
        
        // Outlet-scoped users can only update products that:
        // 1. Already have stock at their outlet, OR
        // 2. They're adding stock to their outlet in this update
        if (!hasStockAtOutlet && !isUpdatingOwnOutlet) {
          console.log('❌ Outlet user cannot update product without stock at their outlet:', {
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

      if (
        outletStock &&
        Array.isArray(outletStock) &&
        outletStock.length > 0 &&
        (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) &&
        userScope.outletId
      ) {
        const wrongOutlet = outletStock.filter((os: any) => os.outletId !== userScope.outletId);
        if (wrongOutlet.length > 0) {
          return NextResponse.json(
            ResponseBuilder.error('CANNOT_CREATE_PRODUCT_AT_OTHER_OUTLET'),
            { status: API.STATUS.FORBIDDEN }
          );
        }
      }

      // Defense in depth: users with products.update but not products.manage must not
      // change pricing fields (rent/sale/cost/options). Default OUTLET_STAFF has no update.
      const canManagePricing = await hasPermission(user, 'products.manage');
      if (!canManagePricing) {
        const protectedPricingFields = [
          'rentPrice',
          'salePrice',
          'costPrice',
          'pricingOptions',
          'pricingType',
          'durationConfig',
        ] as const;
        const attempted = protectedPricingFields.filter(
          (field) => (productUpdateData as any)[field] !== undefined
        );
        if (attempted.length > 0) {
          console.log('🔒 Stripping product pricing fields for non-manage user:', {
            userId: user.id,
            role: user.role,
            productId,
            fields: attempted,
          });
          for (const field of attempted) {
            delete (productUpdateData as any)[field];
          }
        }
      }

      // Prepare outletStock nested write if provided
      let finalUpdateData: any = { ...productUpdateData };
      
      if (outletStock && Array.isArray(outletStock) && outletStock.length > 0) {
        console.log('🔄 Preparing outlet stock nested write:', outletStock);
        
        // Units out on rent stay rented (#359): keep each outlet's `renting`, available = stock − renting,
        // and leave outlets that are not in the payload untouched.
        const rentingByOutlet = new Map<number, number>(
          (existingProduct.outletStock || []).map((row: any) => [row.outletId, row.renting || 0])
        );
        const outletStockUpserts = [];
        for (const stock of outletStock) {
          if (stock.outletId && typeof stock.stock === 'number') {
            const outlet = await db.outlets.findById(stock.outletId);
            if (outlet) {
              const renting = rentingByOutlet.get(outlet.id) || 0;
              if (stock.stock < renting) {
                return NextResponse.json(
                  ResponseBuilder.error('STOCK_BELOW_RENTED'),
                  { status: 400 }
                );
              }
              outletStockUpserts.push({
                where: { productId_outletId: { productId, outletId: outlet.id } },
                update: { stock: stock.stock, available: stock.stock - renting },
                create: { outletId: outlet.id, stock: stock.stock, available: stock.stock, renting: 0 }
              });
            } else {
              console.log(`❌ Outlet not found for ID: ${stock.outletId}`);
            }
          } else {
            console.log(`❌ Invalid outletStock entry:`, stock);
          }
        }
        
        if (outletStockUpserts.length > 0) {
          finalUpdateData.outletStock = { upsert: outletStockUpserts };
        }
      } else {
        console.log('ℹ️ No outletStock provided or empty array');
      }

      // Update the product using the simplified database API with nested write
      const updatedProduct = await db.products.update(productId, finalUpdateData);
      // #519: snapshots with prices, pricing options, per-outlet stock and images (never costPrice)
      await safeAudit('update', () => createAuditHelper(prisma).logUpdate({
        entityType: 'Product',
        entityId: String(productId),
        entityName: existingProduct.name,
        oldValues: buildProductAuditSnapshot(existingProduct),
        newValues: buildProductAuditSnapshot(updatedProduct),
        description: `Product updated: ${existingProduct.name}`,
        context: buildAuditContext(request, user, userScope)
      }));
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
          // Mark as not searchable until the job finishes with the new photo.
          // Do NOT delete vectors here: cooldown / in-flight jobs used to skip
          // regeneration and leave the product with no image-search vectors.
          try {
            await db.products.update(productId, { embeddingGeneratedAt: null });
            (updatedProduct as any).embeddingGeneratedAt = null;
          } catch (clearError) {
            console.warn(
              `⚠️ Could not clear embeddingGeneratedAt for product ${productId}:`,
              (clearError as Error)?.message
            );
          }

          (async () => {
            try {
              await db.embeddingJobs.enqueue({
                productId,
                source: 'product-update',
                priority: 20
              });

              await db.embeddingJobs.processPending({ batchSize: 1, productId });
              console.log(`✅ Embedding regeneration queued/processed for product ${productId}`);
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
        embeddingGeneratedAt: updatedProduct.embeddingGeneratedAt?.toISOString() || null,
        pricingType: updatedProduct.pricingType ?? null,
        durationConfig: updatedProduct.durationConfig ?? null,
        pricingOptions: updatedProduct.pricingOptions ?? [],
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
 * Soft delete (#389): sets `deletedAt` and `isActive = false`. The row, its images and its order links stay, so
 * orders keep showing the product; lists, search, availability and detail hide it (404).
 * - 409 PRODUCT_HAS_OPEN_ORDERS while the product is on a RESERVED or PICKUPED order (nothing changes).
 * - Response shape unchanged: { id, name, images }, code PRODUCT_DELETED_SUCCESS.
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
      // Unknown or already deleted (findById hides soft-deleted products)
      const existingProduct = await db.products.findById(productId);
      if (!existingProduct) {
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
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
      // DELETE PRODUCT (Soft Delete, #389)
      // ============================================================================
      const { blockedIds } = await softDeleteProducts(prisma, [productId]);
      if (blockedIds.length > 0) {
        return NextResponse.json(
          ResponseBuilder.error(PRODUCT_HAS_OPEN_ORDERS),
          { status: API.STATUS.CONFLICT }
        );
      }

      const auditHelper = createAuditHelper(prisma);
      await auditHelper.logDelete({
        entityType: 'Product',
        entityId: String(productId),
        entityName: existingProduct.name,
        oldValues: buildProductAuditSnapshot(existingProduct),
        description: `Product deleted: ${existingProduct.name}`,
        context: buildAuditContext(request, user, userScope)
      }).catch((err) => console.error('Audit log delete failed:', err));

      // Image search must not find it any more; images stay in S3 for the orders that show them
      try {
        const { getVectorStore } = await import('@rentalshop/database/server');
        getVectorStore().deleteProductEmbeddings(productId).catch((error: any) => {
          console.error(`Error deleting embeddings for product ${productId}:`, error);
        });
      } catch (error) {
        console.error('Error starting embedding deletion:', error);
      }

      return NextResponse.json({
        success: true,
        data: {
          id: productId,
          name: existingProduct.name,
          images: parseProductImages(existingProduct.images),
        },
        code: 'PRODUCT_DELETED_SUCCESS',
        message: `Product "${existingProduct.name}" has been deleted.`
      });

    } catch (error) {
      console.error('❌ Error deleting product:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
