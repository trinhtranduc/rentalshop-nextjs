import { NextRequest, NextResponse } from 'next/server';
import { withPermissions, hasPermission } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { productsQuerySchema, productCreateSchema, checkPlanLimitIfNeeded, handleApiError, ResponseBuilder, deleteFromS3, commitStagingFiles, generateAccessUrl, processProductImages, uploadToS3, generateStagingKey, generateProductImageKey, generateFileName, splitKeyIntoParts, extractStagingKeysFromUrls, mapStagingUrlsToProductionUrls, combineProductImages, normalizeImagesInput, parseProductImages, getBucketName } from '@rentalshop/utils';
import { compressImageTo1MB } from '../../../lib/image-compression';
import { searchRateLimiter } from '@rentalshop/middleware';
import { API, USER_ROLE, VALIDATION } from '@rentalshop/constants';
import { z } from 'zod';
import { withApiLogging } from '../../../lib/api-logging-wrapper';

/**
 * GET /api/products
 * Get products with filtering and pagination using simplified database API
 * REFACTORED: Now uses permission-based auth (reads from ROLE_PERMISSIONS)
 * 
 * Authorization: All roles with 'products.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const GET = withApiLogging(
  withPermissions(['products.view'])(async (request, { user, userScope }) => {
    try {
      // Apply rate limiting
      const rateLimitResult = searchRateLimiter(request);
      if (rateLimitResult) {
        return rateLimitResult;
      }

      const { searchParams } = new URL(request.url);
      
      const parsed = productsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

    const { 
      page, 
      limit,
      q, 
      search, 
      merchantId: queryMerchantId,
      categoryId, 
      outletId: queryOutletId,
      available,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder
    } = parsed.data;

    // Role-based merchant filtering:
    // - ADMIN role: Can see products from all merchants (unless queryMerchantId is specified)
    // - MERCHANT role: Can only see products from their own merchant
    // - OUTLET_ADMIN/OUTLET_STAFF: Can only see products from their merchant
    let filterMerchantId = userScope.merchantId;
    if (user.role === USER_ROLE.ADMIN) {
      // Admins can see all merchants unless specifically filtering by merchant
      filterMerchantId = queryMerchantId || userScope.merchantId;
    }

    // Role-based outlet filtering:
    // - MERCHANT role: Should see ALL products of merchant (outletId only for viewing stock, NOT filtering)
    // - OUTLET_ADMIN/OUTLET_STAFF: Can only see products from their assigned outlet
    // - ADMIN: No outlet filtering unless specified
    let filterOutletId: number | undefined = undefined;
    
    if (user.role === USER_ROLE.MERCHANT) {
      // MERCHANT: Don't filter by outlet - they should see ALL products of their merchant
      // outletId parameter is only for viewing stock at specific outlet, not for filtering products
      filterOutletId = undefined; // Always show all products for merchant
    } else if (user.role === USER_ROLE.ADMIN) {
      // Admins can see all products (no outlet filtering unless specified)
      filterOutletId = queryOutletId;
    } else {
      // OUTLET_ADMIN/OUTLET_STAFF: Always filter by their assigned outlet
      filterOutletId = userScope.outletId;
    }

    // Use simplified database API with role-based filtering
    const searchFilters = {
      merchantId: filterMerchantId,
      outletId: filterOutletId,
      categoryId,
      search: q || search,
      available,
      minPrice,
      maxPrice,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      page: page || 1,
      limit: limit || 20
    };

    const result = await db.products.search(searchFilters);

    // Check if user has permission to view costPrice
    const canViewCostPrice = await hasPermission(user, 'products.manage');

    // Process product images and filter outletStock based on queryOutletId
    // For MERCHANT role: queryOutletId is only for viewing stock at specific outlet, NOT filtering products
    const processedProducts = result.data?.map((product: any) => {
      // Parse images using shared helper function for consistency
      const imageUrls = parseProductImages(product.images);
      
      // For MERCHANT role: if queryOutletId is provided, filter outletStock to show only that outlet
      // This allows merchant to see ALL products but view stock at specific outlet
      let outletStock = product.outletStock || [];
      if (user.role === USER_ROLE.MERCHANT && queryOutletId && outletStock.length > 0) {
        outletStock = outletStock.filter((stock: any) => stock.outlet?.id === queryOutletId);
      }
      
      // Build product object, excluding costPrice if user doesn't have permission
      const productData: any = {
        ...product,
        images: imageUrls,
        outletStock: outletStock // Show stock filtered by outletId (if provided)
      };
      
      // Only include costPrice if user has products.manage permission
      if (canViewCostPrice) {
        productData.costPrice = product.costPrice ?? null;
      } else {
        // Explicitly exclude costPrice for users without permission
        delete productData.costPrice;
      }
      
      return productData;
    }) || [];

    return NextResponse.json({
      success: true,
      data: {
        products: processedProducts,
        total: result.total || 0,
        page: result.page || 1,
        limit: result.limit || 20,
        offset: ((result.page || 1) - 1) * (result.limit || 20),
        hasMore: result.hasMore || false,
        totalPages: Math.ceil((result.total || 0) / (result.limit || 20))
      },
      code: "PRODUCTS_FOUND",
      message: `Found ${result.total || 0} products`
    });

  } catch (error) {
    // Use unified error handling system
    // Error will be automatically logged by withApiLogging wrapper
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
  })
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function validateImage(file: File): { isValid: boolean; error?: string } {
  const ALLOWED_TYPES = VALIDATION.ALLOWED_IMAGE_TYPES;
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
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
 * Upload images to S3 staging folder
 * Returns: { stagingKeys: string[], urls: string[] }
 */
async function uploadProductImages(imageFiles: File[]): Promise<{ stagingKeys: string[]; urls: string[] }> {
  const stagingKeys: string[] = [];
  const urls: string[] = [];

  for (const file of imageFiles) {
    if (!file || file.size === 0) continue;

    const validation = validateImage(file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'IMAGE_VALIDATION_FAILED');
    }

    const bytes = await file.arrayBuffer();
    const buffer = await compressImageTo1MB(Buffer.from(new Uint8Array(bytes)));

    if (buffer.length > VALIDATION.IMAGE_SIZES.PRODUCT) {
      throw new Error('IMAGE_TOO_LARGE');
    }

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
      throw new Error('IMAGE_UPLOAD_FAILED');
    }

    stagingKeys.push(uploadResult.data.key);
    urls.push(uploadResult.data.url);
  }

  return { stagingKeys, urls };
}

/**
 * Commit staging images to production and return production URLs
 */
async function commitProductImages(
  imageUrls: string[],
  uploadedStagingKeys: string[],
  merchantId: number
): Promise<string[]> {
  if (!imageUrls || imageUrls.length === 0) return [];

  const extractedStagingKeys = extractStagingKeysFromUrls(imageUrls);
  const stagingKeys = [
    ...uploadedStagingKeys,
    ...extractedStagingKeys.filter(key => !uploadedStagingKeys.includes(key))
  ];

  if (stagingKeys.length === 0) return imageUrls;

  const fileName = generateFileName('product-image');
  const productionKey = generateProductImageKey(merchantId, fileName);
  const { folder: targetFolder } = splitKeyIntoParts(productionKey);

  const commitResult = await commitStagingFiles(stagingKeys, targetFolder);

  if (!commitResult.success) {
    // Error will be logged by withApiLogging if needed
    return imageUrls; // Fallback to original URLs
  }

  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  if (!cloudfrontDomain) {
    // Error will be logged by withApiLogging if needed
    return imageUrls;
  }

  const productionUrls = commitResult.committedKeys.map(key => 
    `https://${cloudfrontDomain}/${key}`
  );

  return mapStagingUrlsToProductionUrls(imageUrls, commitResult.committedKeys, productionUrls);
}

/**
 * Validate and verify outlet stock entries
 */
async function validateOutletStock(
  outletStock: any[],
  merchantId: number
): Promise<Array<{ outletId: number; stock: number }>> {
  if (!outletStock || !Array.isArray(outletStock) || outletStock.length === 0) {
    throw new Error('OUTLET_STOCK_REQUIRED');
  }

  const merchant = await db.merchants.findById(merchantId);
  if (!merchant) {
    throw new Error('MERCHANT_NOT_FOUND');
  }

  const validOutletStock = [];

  for (const stock of outletStock) {
    if (!stock.outletId || typeof stock.stock !== 'number') {
      throw new Error('INVALID_OUTLET_STOCK');
    }

    const outlet = await db.outlets.findById(stock.outletId);
    if (!outlet) {
      throw new Error('OUTLET_NOT_FOUND');
    }

    const outletMerchantId = outlet.merchant?.id || (outlet as any).merchantId;
    if (outletMerchantId !== merchant.id) {
      throw new Error('FORBIDDEN');
    }

    validOutletStock.push({
      outletId: outlet.id,
      stock: stock.stock || 0,
    });
  }

  return validOutletStock;
}

/**
 * POST /api/products
 * Create a new product using simplified database API
 * UNIFIED FORMAT: Always expects multipart FormData (consistent between mobile and frontend)
 * - Product data: JSON string in 'data' field
 * - Files (optional): File objects in 'images' field
 * REFACTORED: Now uses permission-based auth (reads from ROLE_PERMISSIONS)
 * 
 * Authorization: All roles with 'products.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * Requires active subscription
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 * Note: Some console.log kept for background job tracking (embedding generation)
 */
export const POST = withApiLogging(
  withPermissions(['products.manage'])(async (request, { user, userScope }) => {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const jsonDataStr = formData.get('data') as string;
    
    if (!jsonDataStr) {
      return NextResponse.json(
        ResponseBuilder.error('MISSING_PRODUCT_DATA'),
        { status: 400 }
      );
    }

    let productData: any;
    try {
      productData = JSON.parse(jsonDataStr);
    } catch {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_JSON_DATA'),
        { status: 400 }
      );
    }

    // Upload images to staging (if any)
    const imageFiles = formData.getAll('images') as File[];
    let uploadedStagingKeys: string[] = [];
    let uploadedUrls: string[] = [];

    if (imageFiles.length > 0) {
      const uploadResult = await uploadProductImages(imageFiles);
      uploadedStagingKeys = uploadResult.stagingKeys;
      uploadedUrls = uploadResult.urls;
      productData.images = combineProductImages(productData.images, uploadedUrls);
    }

    // Validate product data
    const parsed = productCreateSchema.safeParse(productData);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    // Check duplicate name
    const existingProduct = await db.products.findFirst({
      name: parsed.data.name,
      merchantId: userScope.merchantId,
      isActive: true
    });

    if (existingProduct) {
      return NextResponse.json(
        ResponseBuilder.error('PRODUCT_NAME_EXISTS'),
        { status: 409 }
      );
    }

    // Determine merchantId
    let merchantId = userScope.merchantId;
    if (user.role === USER_ROLE.ADMIN && parsed.data.merchantId) {
      merchantId = parsed.data.merchantId;
    } else if (!merchantId) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
        { status: 400 }
      );
    }

    // Check plan limits
    const planLimitError = await checkPlanLimitIfNeeded(user, merchantId, 'products');
    if (planLimitError) return planLimitError;

    // Validate outlet stock
    const outletStock = await validateOutletStock(parsed.data.outletStock || [], merchantId);
    const totalStock = outletStock.reduce((sum, os) => sum + (Number(os.stock) || 0), 0);

    // Commit images to production
    // Use productData.images (after combine) instead of parsed.data.images
    // because Zod validation may transform/coerce the data
    const imageUrls = Array.isArray(productData.images)
      ? productData.images
      : typeof productData.images === 'string'
        ? productData.images.split(',').filter(Boolean)
        : uploadedUrls.length > 0 ? uploadedUrls : []; // Fallback to uploadedUrls if productData.images is missing

    const committedImageUrls = await commitProductImages(imageUrls, uploadedStagingKeys, merchantId);
    
    // Always store as comma-separated string for database consistency
    const imagesValue = committedImageUrls.length > 0 
      ? committedImageUrls.join(',')
      : '';

    // Get merchant CUID
    const merchant = await db.merchants.findById(merchantId);
    if (!merchant) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Create product
    const product = await db.products.create({
      merchant: { connect: { id: merchant.id } },
      name: parsed.data.name,
      description: parsed.data.description,
      barcode: parsed.data.barcode,
      totalStock,
      rentPrice: parsed.data.rentPrice ?? 0,
      salePrice: parsed.data.salePrice ?? 0,
      costPrice: parsed.data.costPrice ?? 0,
      deposit: parsed.data.deposit ?? 0,
      images: imagesValue,
      pricingType: parsed.data.pricingType || null,
      durationConfig: parsed.data.durationConfig || null,
      ...(parsed.data.categoryId && { category: { connect: { id: parsed.data.categoryId } } }),
      outletStock: {
        create: outletStock.map(os => ({
          outlet: { connect: { id: os.outletId } },
          stock: os.stock,
          available: os.stock,
          renting: 0
        }))
      }
    });

    // Sync totalStock
    try {
      const { syncProductTotalStock } = await import('@rentalshop/database');
      if (syncProductTotalStock) {
        await syncProductTotalStock(product.id);
      }
    } catch (error) {
      // Error will be logged by withApiLogging if needed
    }

    // Generate embedding for image search (background job)
    // Note: Keeping console.log for background job tracking (not part of request/response logging)
    if (committedImageUrls.length > 0) {
      try {
        const { generateProductEmbedding } = await import('@rentalshop/database/server');
        // Run in background (don't block response)
        generateProductEmbedding(product.id)
          .then(() => {
            // Background job success - log for monitoring
            console.log(`✅ Embedding generation completed for product ${product.id}`);
          })
          .catch((error: any) => {
            // Background job error - log for monitoring
            console.error(`❌ Error generating embedding for product ${product.id}:`, error);
          });
      } catch (error: any) {
        // Don't fail the request if embedding generation fails
        console.error('❌ Error starting embedding generation:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        images: parseProductImages(product.images)
      },
      code: 'PRODUCT_CREATED_SUCCESS',
      message: 'Product created successfully'
    });

  } catch (error: any) {
    // Error will be automatically logged by withApiLogging wrapper
    // Map common errors to API responses
    if (error.message === 'IMAGE_VALIDATION_FAILED' || error.message === 'IMAGE_TOO_LARGE') {
      return NextResponse.json(
        ResponseBuilder.error(error.message),
        { status: 400 }
      );
    }
    
    if (error.message === 'IMAGE_UPLOAD_FAILED') {
      return NextResponse.json(
        ResponseBuilder.error(error.message),
        { status: 500 }
      );
    }

    if (error.message === 'OUTLET_STOCK_REQUIRED' || 
        error.message === 'INVALID_OUTLET_STOCK' ||
        error.message === 'OUTLET_NOT_FOUND' ||
        error.message === 'FORBIDDEN' ||
        error.message === 'MERCHANT_NOT_FOUND') {
      return NextResponse.json(
        ResponseBuilder.error(error.message),
        { status: error.message === 'FORBIDDEN' ? 403 : 
                 error.message === 'MERCHANT_NOT_FOUND' ? 404 : 400 }
      );
    }

    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
  })
);

