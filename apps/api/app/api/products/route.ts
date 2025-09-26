import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { authenticateRequest } from '@rentalshop/auth';
import { searchProducts, createProduct, updateProduct, deleteProduct } from '@rentalshop/database';
import { productsQuerySchema, productCreateSchema, productUpdateSchema } from '@rentalshop/utils';
import { assertAnyRole, getUserScope } from '@rentalshop/auth';
import { searchRateLimiter } from '@rentalshop/middleware';
import { captureAuditContext } from '@rentalshop/middleware';
import { createAuditHelper } from '@rentalshop/utils';
import { prisma } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

/**
 * GET /api/products
 * Get products with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/products called');
    
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;
    // Note: Subscription validation is already handled in authenticateRequest()

    console.log('User merchant ID:', user.merchant?.id);

    if (!user.merchant?.id) {
      return NextResponse.json(
        { success: false, message: 'User must be associated with a merchant' },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ success: false, message: 'Invalid query', error: parsed.error.flatten() }, { status: 400 });
    }

    const { 
      page, 
      limit, 
      offset,
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
    console.log('Parsed filters:', { page, limit, offset, q, search, categoryId, queryOutletId, available, minPrice, maxPrice, sortBy, sortOrder });

    const { merchantId, outletId: userOutletId } = getUserScope(user as any);
    console.log('Merchant ID from scope:', merchantId);
    console.log('Outlet ID from scope:', userOutletId);
    
    const filters = {
      merchantId: merchantId ? parseInt(merchantId.toString()) : undefined,
      outletId: queryOutletId || (userOutletId ? parseInt(userOutletId.toString()) : undefined), // Use query outletId or user's outletId
      categoryId: categoryId ? parseInt(categoryId.toString()) : undefined,
      search: q || search, // Use 'q' parameter first, fallback to 'search' for backward compatibility
      page,
      limit,
      offset,
      isActive: true,
      available,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder
    } as const;
    
    console.log('Final filters:', filters);

    console.log('Calling searchProducts...');
    const result = await searchProducts(filters);
    console.log('searchProducts result:', { 
      productCount: result.products?.length || 0, 
      total: result.total, 
      page: result.page, 
      hasMore: result.hasMore 
    });

    // Transform the result to match the expected API response format
    const transformedResult = {
      products: result.products,
      total: result.total,
      page: result.page,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
      totalPages: result.totalPages
    };

    // Caching headers (ETag and short-lived private cache)
    const bodyString = JSON.stringify({ success: true, data: transformedResult });
    const etag = crypto.createHash('sha1').update(bodyString).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'private, max-age=60',
        },
      });
    }

    return new NextResponse(bodyString, {
      status: API.STATUS.OK,
      headers: {
        'Content-Type': 'application/json',
        ETag: etag,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch products',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export const runtime = 'nodejs';

/**
 * POST /api/products
 * Create a new product
 */
export async function POST(request: NextRequest) {
  try {
    // Capture audit context
    const auditContext = await captureAuditContext(request);
    
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;
    // Note: Subscription validation is already handled in authenticateRequest()

    // Authorization: Only merchant-level roles can create products
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const body = await request.json();
    const parsed = productCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid payload', error: parsed.error.flatten() }, { status: 400 });
    }

    if (!user.merchant?.id) {
      return NextResponse.json(
        { success: false, message: 'User must be associated with a merchant' },
        { status: 400 }
      );
    }

    // Sanitize input depending on role
    const merchantId = (user as any).merchant?.id as number;
    const userOutletId = (user as any).outlet?.id as number | undefined;

    console.log('🔍 Raw outletStock from request:', parsed.data.outletStock);
    
    // Validate that outletStock is provided (required)
    if (!parsed.data.outletStock || !Array.isArray(parsed.data.outletStock) || parsed.data.outletStock.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Product must have at least one outlet stock entry' },
        { status: 400 }
      );
    }
    
    const outletStock: Array<{ outletId: number; stock: number }> = parsed.data.outletStock.map(os => ({
      outletId: os.outletId, // Already a number from validation
      stock: os.stock || 0, // Default to 0 if no stock specified
    }));
    
    console.log('🔍 Processed outletStock:', outletStock);

    const totalStock = outletStock.reduce((sum, os) => sum + (Number(os.stock) || 0), 0);
    console.log('🔍 Calculated totalStock:', totalStock);

    const productData = {
      merchantId: merchantId, // Already a number (id)
      categoryId: parsed.data.categoryId, // Already a number from validation
      name: parsed.data.name,
      description: parsed.data.description,
      barcode: parsed.data.barcode,
      totalStock,
      rentPrice: parsed.data.rentPrice ?? 0,
      salePrice: parsed.data.salePrice ?? undefined,
      deposit: parsed.data.deposit ?? 0,
      images: parsed.data.images,
      outletStock, // Include outlet stock data
    };

    console.log('🔍 Creating product with data:', productData);
    const product = await createProduct(productData);
    console.log('✅ Product created successfully:', product);

    // Log audit event for product creation
    try {
      const auditHelper = createAuditHelper(prisma);
      await auditHelper.logCreate({
        entityType: 'Product',
        entityId: product.id.toString(),
        entityName: product.name,
        newValues: product,
        description: `Product created: ${product.name}`,
        context: {
          ...auditContext,
          userId: user.id.toString(),
          userEmail: user.email || undefined,
          userRole: user.role || undefined,
          merchantId: user.merchant?.id?.toString() || undefined,
          outletId: user.outlet?.id?.toString() || undefined
        }
      });
    } catch (auditError) {
      console.error('Failed to log product creation audit:', auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('❌ Error in POST /api/products:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return NextResponse.json(
      { success: false, message: 'Failed to create product' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * PUT /api/products?productId=xxx
 * Update an existing product
 */
export async function PUT(request: NextRequest) {
  try {
    // Capture audit context
    const auditContext = await captureAuditContext(request);
    
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Authorization: Only merchant-level roles can update product master data
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    
    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Convert productId to number and validate
    const productIdNumber = parseInt(productId);
    if (isNaN(productIdNumber) || productIdNumber <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid product ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = productUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid payload', error: parsed.error.flatten() }, { status: 400 });
    }

    const { salePrice, ...rest } = parsed.data;
    const normalizedSalePrice: number | undefined = salePrice == null ? undefined : salePrice;
    const updateData = {
      ...rest,
      ...(normalizedSalePrice !== undefined ? { salePrice: normalizedSalePrice } : {}),
    };

    const product = await updateProduct(productIdNumber, updateData);

    // Log audit event for product update
    try {
      const auditHelper = createAuditHelper(prisma);
      await auditHelper.logUpdate({
        entityType: 'Product',
        entityId: product?.id.toString() || productIdNumber.toString(),
        entityName: product?.name || `Product ${productIdNumber}`,
        oldValues: {}, // We don't have the old values in this context
        newValues: product || {},
        description: `Product updated: ${product?.name || productIdNumber}`,
        context: {
          ...auditContext,
          userId: user.id.toString(),
          userEmail: user.email || undefined,
          userRole: user.role || undefined,
          merchantId: user.merchant?.id?.toString() || undefined,
          outletId: user.outlet?.id?.toString() || undefined
        }
      });
    } catch (auditError) {
      console.error('Failed to log product update audit:', auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error in PUT /api/products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update product' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * DELETE /api/products?productId=xxx
 * Delete a product
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Authorization: Only merchant-level roles can delete products
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    
    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Convert productId to number and validate
    const productIdNumber = parseInt(productId);
    if (isNaN(productIdNumber) || productIdNumber <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid product ID format' },
        { status: 400 }
      );
    }

    await deleteProduct(productIdNumber);

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete product' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
} 