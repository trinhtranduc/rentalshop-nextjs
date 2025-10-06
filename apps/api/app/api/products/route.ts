import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { productsQuerySchema, productCreateSchema, assertPlanLimit, handleApiError } from '@rentalshop/utils';
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
        message: 'Invalid query', 
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

    return NextResponse.json({
      success: true,
      data: {
        products: result.data || [],
        total: result.total || 0,
        page: result.page || 1,
        limit: result.limit || 20,
        offset: ((result.page || 1) - 1) * (result.limit || 20),
        hasMore: result.hasMore || false,
        totalPages: Math.ceil((result.total || 0) / (result.limit || 20))
      },
      message: `Found ${result.total || 0} products`
    });

  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch products' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/products
 * Create a new product using simplified database API
 * REFACTORED: Now uses unified withAuth pattern
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
  console.log(`🔍 POST /api/products - User: ${user.email} (${user.role})`);
  
  try {
    const body = await request.json();
    const parsed = productCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid payload', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    console.log('🔍 Raw outletStock from request:', parsed.data.outletStock);
    
    // Validate that outletStock is provided (required)
    if (!parsed.data.outletStock || !Array.isArray(parsed.data.outletStock) || parsed.data.outletStock.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Product must have at least one outlet stock entry' },
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
          message: error.message || 'Plan limit exceeded for products',
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
          message: `Merchant with ID ${merchantId} not found`
        },
        { status: 404 }
      );
    }

    // Handle images - convert array to JSON string if needed
    let imagesValue = parsed.data.images;
    if (Array.isArray(imagesValue)) {
      imagesValue = JSON.stringify(imagesValue);
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
      message: 'Product created successfully'
    });

  } catch (error: any) {
    console.error('Error in POST /api/products:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

