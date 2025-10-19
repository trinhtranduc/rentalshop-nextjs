import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { productsQuerySchema, productCreateSchema, assertPlanLimit, handleApiError, ResponseBuilder, deleteFromS3, commitStagingFiles, generateAccessUrl, processProductImages } from '@rentalshop/utils';
import { searchRateLimiter } from '@rentalshop/middleware';
import { API } from '@rentalshop/constants';

/**
 * GET /api/products
 * Get products with filtering and pagination using simplified database API
 * REFACTORED: Now uses unified withAuth pattern
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
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
      return NextResponse.json({ 
        success: false, 
        code: 'INVALID_QUERY', message: 'Invalid query', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    const { 
      page, 
      limit,
      q, 
      search, 
      categoryId, 
      outletId: queryOutletId,
      available,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder
    } = parsed.data;

    console.log('Parsed filters:', { 
      page, limit, q, search, categoryId, queryOutletId, 
      available, minPrice, maxPrice, sortBy, sortOrder 
    });
    
    // Use simplified database API with userScope
    const searchFilters = {
      merchantId: userScope.merchantId,
      outletId: queryOutletId || userScope.outletId,
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

    // Process product images to generate presigned URLs for thumbnail display
    const processedProducts = await Promise.all(
      (result.data || []).map(async (product) => ({
        ...product,
        images: await processProductImages(product.images, 86400 * 7) // 7 days expiration
      }))
    );

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
      code: "PRODUCTS_FOUND", message: `Found ${result.total || 0} products`
    });

  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json(
      ResponseBuilder.error('FETCH_PRODUCTS_FAILED'),
      { status: 500 }
    );
  }
});

/**
 * POST /api/products
 * Create a new product using simplified database API
 * REFACTORED: Now uses unified withAuth pattern
 * Requires active subscription
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
  console.log(`🔍 POST /api/products - User: ${user.email} (${user.role})`);
  
  // Store parsed data for potential cleanup
  let uploadedImages: string[] = [];
  
  try {
    const body = await request.json();
    const parsed = productCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        code: 'INVALID_PAYLOAD', message: 'Invalid payload', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    console.log('🔍 Raw outletStock from request:', parsed.data.outletStock);
    
    // Validate that outletStock is provided (required)
    if (!parsed.data.outletStock || !Array.isArray(parsed.data.outletStock) || parsed.data.outletStock.length === 0) {
      return NextResponse.json(
        ResponseBuilder.error('PRODUCT_NO_STOCK_ENTRY'),
        { status: 400 }
      );
    }
    
    const outletStock: Array<{ outletId: number; stock: number }> = parsed.data.outletStock.map(os => ({
      outletId: os.outletId,
      stock: os.stock || 0,
    }));
    
    console.log('🔍 Processed outletStock:', outletStock);

    const totalStock = outletStock.reduce((sum, os) => sum + (Number(os.stock) || 0), 0);
    console.log('🔍 Calculated totalStock:', totalStock);

    // Check for duplicate product name within the same merchant
    const existingProduct = await db.products.findFirst({
      name: parsed.data.name,
      merchantId: userScope.merchantId,
      isActive: true
    });

    if (existingProduct) {
      console.log('❌ Product name already exists:', parsed.data.name);
      return NextResponse.json(
        {
          success: false,
          code: 'PRODUCT_NAME_EXISTS',
          message: `A product with the name "${parsed.data.name}" already exists. Please choose a different name.`
        },
        { status: 409 }
      );
    }

    // Determine merchantId for product creation
    let merchantId = userScope.merchantId;
    
    // For ADMIN users, they need to specify merchantId in the request
    // For other roles, use their assigned merchantId
    if (user.role === 'ADMIN' && parsed.data.merchantId) {
      merchantId = parsed.data.merchantId;
    } else if (!merchantId) {
      return NextResponse.json(
        { 
          success: false, 
          code: 'MERCHANT_ID_REQUIRED',
          message: user.role === 'ADMIN' 
            ? 'MerchantId is required for ADMIN users when creating products' 
            : 'User is not associated with any merchant'
        },
        { status: 400 }
      );
    }

    console.log('🔍 Using merchantId:', merchantId, 'for user role:', user.role);

    // Check plan limits before creating product
    try {
      await assertPlanLimit(merchantId, 'products');
      console.log('✅ Plan limit check passed for products');
    } catch (error: any) {
      console.log('❌ Plan limit exceeded for products:', error.message);
      return NextResponse.json(
        { 
          success: false, 
          code: 'PLAN_LIMIT_EXCEEDED', message: error.message || 'Plan limit exceeded for products',
          error: 'PLAN_LIMIT_EXCEEDED'
        },
        { status: 403 }
      );
    }

    // Find merchant by publicId to get CUID
    const merchant = await db.merchants.findById(merchantId);

    if (!merchant) {
      return NextResponse.json(
        { 
          success: false, 
          code: 'MERCHANT_NOT_FOUND', message: `Merchant with ID ${merchantId} not found`
        },
        { status: 404 }
      );
    }

    // Handle images - Two-Phase Upload Pattern
    let imagesValue = parsed.data.images;
    let stagingKeys: string[] = [];
    let committedImageUrls: string[] = [];

    if (imagesValue) {
      // Parse images (could be array, string, or comma-separated)
      const imageUrls = Array.isArray(imagesValue) 
        ? imagesValue 
        : typeof imagesValue === 'string' 
          ? imagesValue.split(',').filter(Boolean)
          : [];

      // Extract staging keys from URLs
      stagingKeys = imageUrls
        .filter(url => url && url.includes('amazonaws.com'))
        .map(url => {
          const urlParts = url.split('amazonaws.com/');
          return urlParts.length > 1 ? urlParts[1].split('?')[0] : null;
        })
        .filter(Boolean) as string[];

      console.log('🔍 Found staging keys:', stagingKeys);

      // Commit staging files to production
      if (stagingKeys.length > 0) {
        const commitResult = await commitStagingFiles(stagingKeys, 'product');
        
        if (commitResult.success) {
          // Generate production URLs with presigned access
          committedImageUrls = await Promise.all(
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
    const productData: any = {
      merchant: { connect: { id: merchant.id } }, // Use CUID, not publicId
      name: parsed.data.name,
      description: parsed.data.description,
      barcode: parsed.data.barcode,
      totalStock,
      rentPrice: parsed.data.rentPrice ?? 0,
      salePrice: parsed.data.salePrice ?? undefined,
      deposit: parsed.data.deposit ?? 0,
      images: imagesValue,
      outletStock: {
        create: outletStock.map(os => ({
          outlet: { connect: { id: os.outletId } },
          stock: os.stock
        }))
      }
    };

    // Only add category connection if categoryId is provided
    // If not provided, simplifiedProducts.create will use default category
    if (parsed.data.categoryId) {
      productData.category = { connect: { id: parsed.data.categoryId } };
    }

    console.log('🔍 Creating product with data:', productData);
    
    // Use simplified database API
    const product = await db.products.create(productData);
    console.log('✅ Product created successfully:', product);

    return NextResponse.json({
      success: true,
      data: product,
      code: 'PRODUCT_CREATED_SUCCESS', message: 'Product created successfully'
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

