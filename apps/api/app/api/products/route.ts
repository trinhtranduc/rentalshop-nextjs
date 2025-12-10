import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { productsQuerySchema, productCreateSchema, checkPlanLimitIfNeeded, handleApiError, ResponseBuilder, deleteFromS3, commitStagingFiles, generateAccessUrl, processProductImages, uploadToS3, generateStagingKey, generateProductImageKey, generateFileName, splitKeyIntoParts, compressImageTo1MB } from '@rentalshop/utils';
import { searchRateLimiter } from '@rentalshop/middleware';
import { API, USER_ROLE, VALIDATION } from '@rentalshop/constants';
import { z } from 'zod';

/**
 * GET /api/products
 * Get products with filtering and pagination using simplified database API
 * REFACTORED: Now uses permission-based auth (reads from ROLE_PERMISSIONS)
 * 
 * Authorization: All roles with 'products.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const GET = withPermissions(['products.view'])(async (request, { user, userScope }) => {
  console.log(`🔍 GET /api/products - User: ${user.email} (${user.role})`);
  
  try {
    // Apply rate limiting
    const rateLimitResult = searchRateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const { searchParams } = new URL(request.url);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    const parsed = productsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      console.log('Validation error:', parsed.error.flatten());
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

    console.log('Parsed filters:', { 
      page, limit, q, search, queryMerchantId, categoryId, queryOutletId, 
      available, minPrice, maxPrice, sortBy, sortOrder 
    });
    
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

    console.log('🔍 Using simplified db.products.search with filters:', searchFilters);
    
    const result = await db.products.search(searchFilters);
    console.log('✅ Search completed, found:', result.data?.length || 0, 'products');

    // Process product images and filter outletStock based on queryOutletId
    // For MERCHANT role: queryOutletId is only for viewing stock at specific outlet, NOT filtering products
    const processedProducts = result.data?.map((product: any) => {
      let imageUrls: string[] = [];
      
      // Images are stored as JSON string in database
      if (typeof product.images === 'string') {
        try {
          const parsed = JSON.parse(product.images);
          // Handle both cases: JSON array string or already parsed
          imageUrls = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // Not JSON, treat as comma-separated
          imageUrls = product.images.split(',').filter(Boolean);
        }
      } else if (Array.isArray(product.images)) {
        imageUrls = product.images;
      }
      
      // For MERCHANT role: if queryOutletId is provided, filter outletStock to show only that outlet
      // This allows merchant to see ALL products but view stock at specific outlet
      let outletStock = product.outletStock || [];
      if (user.role === USER_ROLE.MERCHANT && queryOutletId && outletStock.length > 0) {
        outletStock = outletStock.filter((stock: any) => stock.outlet?.id === queryOutletId);
      }
      
      return {
        ...product,
        images: imageUrls,
        outletStock: outletStock // Show stock filtered by outletId (if provided)
      };
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
    console.error('❌ Error in GET /api/products:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userScope,
      userRole: user.role
    });
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

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
 * POST /api/products
 * Create a new product using simplified database API
 * SUPPORTS: Both JSON payload and multipart FormData with file uploads
 * REFACTORED: Now uses permission-based auth (reads from ROLE_PERMISSIONS)
 * 
 * Authorization: All roles with 'products.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * Requires active subscription
 */
export const POST = withPermissions(['products.manage'])(async (request, { user, userScope }) => {
  console.log(`🔍 POST /api/products - User: ${user.email} (${user.role})`);
  
  // Store parsed data for potential cleanup
  let uploadedImages: string[] = [];
  
  try {
    const contentType = request.headers.get('content-type') || '';
    let parsedResult: any;
    let productDataFromRequest: any = {};
    let uploadedFiles: string[] = [];

    // Check if request contains multipart form data
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
      } catch (parseError) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_JSON_DATA'),
          { status: 400 }
        );
      }

      // Handle file uploads
      const imageFiles = formData.getAll('images') as File[];
      console.log(`🔍 Found ${imageFiles.length} image files`);
      
      for (const file of imageFiles) {
        if (file && file.size > 0) {
          const validation = validateImage(file);
          if (!validation.isValid) {
            return NextResponse.json(
              ResponseBuilder.error('IMAGE_VALIDATION_FAILED'),
              { status: 400 }
            );
          }
          
          // Convert file to buffer and compress
          const bytes = await file.arrayBuffer();
          const buffer = await compressImageTo1MB(Buffer.from(new Uint8Array(bytes)));
          
          // Final check - reject if still too large after compression
          const MAX_SIZE = VALIDATION.IMAGE_SIZES.PRODUCT;
          if (buffer.length > MAX_SIZE) {
            return NextResponse.json(
              ResponseBuilder.error('IMAGE_TOO_LARGE'),
              { status: 400 }
            );
          }
          
          // Generate filename and staging key using new structure
          const fileName = generateFileName(
            file.name.replace(/\.[^/.]+$/, '') || 'product-image'
          );
          const stagingKey = generateStagingKey(fileName);
          const { folder, fileName: finalFileName } = splitKeyIntoParts(stagingKey);
          
          // Upload compressed image to S3 staging folder with new structure
          const uploadResult = await uploadToS3(buffer, {
            folder,
            fileName: finalFileName,
            contentType: 'image/jpeg', // Always JPEG after compression
            preserveOriginalName: false
          });
          
          if (uploadResult.success && uploadResult.data) {
            // Use CloudFront URL if available, otherwise fallback to S3 URL
            const accessUrl = uploadResult.data.url; // Already uses CloudFront if configured
            uploadedFiles.push(accessUrl);
            console.log(`✅ Uploaded image: ${file.name} -> ${accessUrl}`);
          } else {
            console.error(`❌ Failed to upload ${file.name}:`, uploadResult.error);
            return NextResponse.json(
              ResponseBuilder.error('IMAGE_UPLOAD_FAILED'),
              { status: 500 }
            );
          }
        }
      }
      
      // Combine uploaded files with existing images
      const existingImages = productDataFromRequest.images || [];
      const allImages = [
        ...(Array.isArray(existingImages) ? existingImages : existingImages ? [existingImages] : []),
        ...uploadedFiles
      ];
      // Ensure allImages is properly normalized (not stringified JSON)
      productDataFromRequest.images = allImages.map(img => {
        if (typeof img === 'string' && img.trim().startsWith('[') && img.trim().endsWith(']')) {
          try {
            const parsed = JSON.parse(img);
            return Array.isArray(parsed) ? parsed[0] : img;
          } catch {
            return img;
          }
        }
        return img;
      }).flat().filter(Boolean);
      
    } else {
      // Handle regular JSON request
      console.log('🔍 Processing JSON request');
      const body = await request.json();
      productDataFromRequest = body;
      
      // Normalize images to array of strings
      if (productDataFromRequest.images !== undefined) {
        if (Array.isArray(productDataFromRequest.images)) {
          productDataFromRequest.images = productDataFromRequest.images.filter(Boolean);
        } else if (typeof productDataFromRequest.images === 'string') {
          productDataFromRequest.images = productDataFromRequest.images
            .split(',')
            .filter(Boolean)
            .map((url: string) => url.trim());
        }
        
        if (productDataFromRequest.images.length === 0) {
          delete productDataFromRequest.images;
        }
      }
    }

    // Validate product data
    parsedResult = productCreateSchema.safeParse(productDataFromRequest);
    if (!parsedResult.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsedResult.error.flatten()),
        { status: 400 }
      );
    }
    
    const parsed = parsedResult;

    console.log('🔍 Raw outletStock from request:', parsed.data.outletStock);
    
    let outletStock: Array<{ outletId: number; stock: number }>;
    let totalStock: number;
    
    // This will be handled after merchant is determined

    // Check for duplicate product name within the same merchant
    const existingProduct = await db.products.findFirst({
      name: parsed.data.name,
      merchantId: userScope.merchantId,
      isActive: true
    });

    if (existingProduct) {
      console.log('❌ Product name already exists:', parsed.data.name);
      return NextResponse.json(
        ResponseBuilder.error('BUSINESS_NAME_EXISTS'),
        { status: 409 }
      );
    }

    // Determine merchantId for product creation
    let merchantId = userScope.merchantId;
    
    // For ADMIN users, they need to specify merchantId in the request
    // For other roles, use their assigned merchantId
    if (user.role === USER_ROLE.ADMIN && parsed.data.merchantId) {
      merchantId = parsed.data.merchantId;
    } else if (!merchantId) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
        { status: 400 }
      );
    }

    console.log('🔍 Using merchantId:', merchantId, 'for user role:', user.role);

    // Check plan limits before creating product (ADMIN bypass)
    const planLimitError = await checkPlanLimitIfNeeded(user, merchantId, 'products');
    if (planLimitError) return planLimitError;

    // Find merchant by publicId to get CUID
    const merchant = await db.merchants.findById(merchantId);

    if (!merchant) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Handle outletStock after merchant is determined
    // outletStock is REQUIRED - mobile must provide it
    if (!parsed.data.outletStock || !Array.isArray(parsed.data.outletStock) || parsed.data.outletStock.length === 0) {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_STOCK_REQUIRED'),
        { status: 400 }
      );
    }

    // Verify all outlets exist and belong to the merchant
    console.log('🔍 Verifying outletStock outlets...');
    const validOutletStock = [];
    for (const stock of parsed.data.outletStock) {
      if (stock.outletId && typeof stock.stock === 'number') {
        console.log(`🔍 Verifying outlet ID: ${stock.outletId}`);
        // Find outlet by id (number) - db.outlets.findById expects id (number)
        const outlet = await db.outlets.findById(stock.outletId);
        if (outlet) {
          // Verify outlet belongs to the merchant (security check)
          const outletMerchantId = outlet.merchant?.id || (outlet as any).merchantId;
          if (outletMerchantId !== merchant.id) {
            console.log(`❌ Outlet ${stock.outletId} does not belong to merchant ${merchant.id}`);
            return NextResponse.json(
              ResponseBuilder.error('FORBIDDEN'),
              { status: 403 }
            );
          }
          console.log(`✅ Found outlet:`, { id: outlet.id, name: outlet.name, merchantId: outletMerchantId });
          // Use outlet's id (number) for Prisma connect
          validOutletStock.push({
            outletId: outlet.id, // Use id (number) for Prisma connect
            stock: stock.stock || 0,
          });
        } else {
          console.log(`❌ Outlet not found for ID: ${stock.outletId}`);
          return NextResponse.json(
            ResponseBuilder.error('OUTLET_NOT_FOUND'),
            { status: 404 }
          );
        }
      } else {
        console.log(`❌ Invalid outletStock entry:`, stock);
        return NextResponse.json(
          ResponseBuilder.error('INVALID_OUTLET_STOCK'),
          { status: 400 }
        );
      }
    }
    outletStock = validOutletStock;
    console.log('✅ Verified outletStock:', outletStock);
    
    totalStock = outletStock.reduce((sum, os) => sum + (Number(os.stock) || 0), 0);
    console.log('🔍 Final outletStock:', outletStock);
    console.log('🔍 Calculated totalStock:', totalStock);

    // Handle images - Support both uploaded files and staging files
    let imagesValue = parsed.data.images;
    let stagingKeys: string[] = [];
    let committedImageUrls: string[] = [];

    if (imagesValue && imagesValue.length > 0) {
      // Parse images (could be array, string, or comma-separated)
      const imageUrls = Array.isArray(imagesValue) 
        ? imagesValue 
        : typeof imagesValue === 'string' 
          ? imagesValue.split(',').filter(Boolean)
          : [];

      // Extract staging keys from URLs (both uploaded files and existing staging files)
      stagingKeys = imageUrls
        .filter(url => url && url.includes('amazonaws.com'))
        .map(url => {
          const urlParts = url.split('amazonaws.com/');
          return urlParts.length > 1 ? urlParts[1].split('?')[0] : null;
        })
        .filter((key): key is string => key !== null && key.startsWith('staging/'));

      console.log('🔍 Found staging keys to commit:', stagingKeys);
      console.log('🔍 All image URLs:', imageUrls);

      // Commit staging files to production (including newly uploaded files)
      if (stagingKeys.length > 0) {
        // Use new structure: env/prod/products/merchant-{id}/outlet-{id}
        const outletId = userScope.outletId || undefined;
        const fileName = generateFileName('product-image');
        
        // Generate production key to get target folder
        const productionKey = generateProductImageKey(merchantId, fileName, outletId);
        const { folder: targetFolder } = splitKeyIntoParts(productionKey);
        
        const commitResult = await commitStagingFiles(stagingKeys, targetFolder);
        
        if (commitResult.success) {
          // Generate production URLs with presigned access
          const productionUrls = await Promise.all(
            commitResult.committedKeys.map(async (key) => {
              const presignedUrl = await generateAccessUrl(key, 86400 * 365); // 1 year expiration
              if (presignedUrl) {
                return presignedUrl;
              }
              // Fallback to direct URL if presigned fails
              const region = process.env.AWS_REGION || 'ap-southeast-1';
              const bucketName = process.env.AWS_S3_BUCKET_NAME || 'anyrent-images';
              return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
            })
          );
          
          // Map staging URLs to production URLs
          committedImageUrls = imageUrls.map(url => {
            const urlParts = url.split('amazonaws.com/');
            if (urlParts.length > 1) {
              const key = urlParts[1].split('?')[0];
              const committedKey = commitResult.committedKeys.find(ck => 
                ck.replace('product/', '') === key.replace('staging/', '')
              );
              if (committedKey) {
                return productionUrls[commitResult.committedKeys.indexOf(committedKey)];
              }
            }
            return url; // Keep original URL if not found in staging
          });
          
          console.log('✅ Committed staging files with presigned URLs:', committedImageUrls);
        } else {
          console.error('❌ Failed to commit staging files:', commitResult.errors);
          // Continue with original URLs if commit fails
          committedImageUrls = imageUrls;
        }
      } else {
        // No staging files, but ensure URLs have presigned access if they're S3 URLs
        committedImageUrls = await Promise.all(
          imageUrls.map(async (url) => {
            // If it's already a presigned URL or external URL, keep it as is
            if (url.includes('?') || !url.includes('amazonaws.com')) {
              return url;
            }
            
            // Extract key from S3 URL and generate presigned URL
            const urlParts = url.split('amazonaws.com/');
            if (urlParts.length > 1) {
              const key = urlParts[1];
              const presignedUrl = await generateAccessUrl(key, 86400 * 365);
              return presignedUrl || url;
            }
            
            return url;
          })
        );
      }
    }

    // Use committed URLs for product data
    if (Array.isArray(imagesValue)) {
      imagesValue = JSON.stringify(committedImageUrls);
    } else if (typeof imagesValue === 'string') {
      imagesValue = committedImageUrls.join(',');
    }

    // Use Prisma relation syntax with CUID
    const finalProductData: any = {
      merchant: { connect: { id: merchant.id } }, // Use CUID, not publicId
      name: parsed.data.name,
      description: parsed.data.description,
      barcode: parsed.data.barcode,
      totalStock,
      rentPrice: parsed.data.rentPrice ?? 0,
      salePrice: parsed.data.salePrice ?? 0,
      costPrice: parsed.data.costPrice ?? 0, // Include costPrice (giá vốn)
      deposit: parsed.data.deposit ?? 0,
      images: imagesValue,
      // Optional pricing configuration (default FIXED if null)
      pricingType: parsed.data.pricingType || null,
      durationConfig: parsed.data.durationConfig || null,
      outletStock: {
        create: outletStock.map(os => ({
          outlet: { connect: { id: os.outletId } },
          stock: os.stock,
          available: os.stock, // available = stock when creating new product (no items rented yet)
          renting: 0 // No items rented when creating product
        }))
      }
    };

    // Only add category connection if categoryId is provided
    // If not provided, simplifiedProducts.create will use default category
    if (parsed.data.categoryId) {
      finalProductData.category = { connect: { id: parsed.data.categoryId } };
    }

    console.log('🔍 Creating product with data:', finalProductData);
    
    // Use simplified database API
    const product = await db.products.create(finalProductData);
    console.log('✅ Product created successfully:', product);

    // Sync Product.totalStock = sum of all OutletStock.stock
    // This ensures totalStock always equals the sum of all outlet stocks
    if (outletStock && outletStock.length > 0) {
      try {
        const productModule = await import('@rentalshop/database/src/product');
        const { syncProductTotalStock } = productModule;
        if (syncProductTotalStock) {
          await syncProductTotalStock(product.id);
        }
      } catch (error) {
        console.error('❌ Error syncing Product.totalStock after creation:', error);
        // Don't throw - product creation succeeded, sync failed
      }
    }

    // Parse images from database response to return array
    let imageUrls: string[] = [];
    if (typeof product.images === 'string') {
      try {
        const parsed = JSON.parse(product.images);
        imageUrls = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        imageUrls = product.images.split(',').filter(Boolean);
      }
    } else if (Array.isArray(product.images)) {
      imageUrls = product.images.map(String).filter(Boolean);
    }

    // Return product with parsed images
    const responseProduct = {
      ...product,
      images: imageUrls
    };

    return NextResponse.json({
      success: true,
      data: responseProduct,
      code: 'PRODUCT_CREATED_SUCCESS',
      message: 'Product created successfully'
    });

  } catch (error: any) {
    console.error('Error in POST /api/products:', error);
    
    // Note: With Two-Phase Upload Pattern, staging files remain in staging/
    // They will be cleaned up by background job or TTL policy
    // No manual cleanup needed on product creation failure
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

