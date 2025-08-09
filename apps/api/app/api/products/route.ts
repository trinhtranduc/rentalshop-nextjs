import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyTokenSimple } from '@rentalshop/auth';
import { getProducts, createProduct, updateProduct, deleteProduct } from '@rentalshop/database';
import { productsQuerySchema, productCreateSchema, productUpdateSchema } from '@rentalshop/utils';
import { assertAnyRole, getUserScope } from '@rentalshop/auth';
import { searchRateLimiter } from '../../../lib/middleware/rateLimit';

/**
 * GET /api/products
 * Get products with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/products called');
    
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    console.log('Token received:', token ? 'Yes' : 'No');
    
    if (!token) {
      console.log('No token provided');
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    console.log('User verification result:', user ? 'Success' : 'Failed');
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

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
    const parsed = productsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid query', error: parsed.error.flatten() }, { status: 400 });
    }

    const { page, limit, search, outletId, categoryId } = parsed.data;

    const { merchantId } = getUserScope(user as any);
    const filters = {
      merchantId,
      outletId,
      categoryId,
      search,
      page,
      limit,
      isActive: true
    } as const;

    const result = await getProducts(filters);

    // Caching headers (ETag and short-lived private cache)
    const bodyString = JSON.stringify({ success: true, data: result });
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
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ETag: etag,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch products' },
      { status: 500 }
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
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Authorization: Only merchant-level roles can create products
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
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
    const merchantId = (user as any).merchant?.id as string;
    const userOutletId = (user as any).outlet?.id as string | undefined;

    const outletStock: Array<{ outletId: string; stock: number }> = (parsed.data.outletStock || []).map(os => ({
      outletId: os.outletId,
      stock: os.stock,
    }));

    const totalStock = outletStock.reduce((sum, os) => sum + (Number(os.stock) || 0), 0);

    const productData = {
      merchantId,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description,
      totalStock,
      rentPrice: parsed.data.rentPrice ?? 0,
      salePrice: parsed.data.salePrice ?? undefined,
      deposit: parsed.data.deposit ?? 0,
      images: parsed.data.images,
      outletStock,
    };

    const product = await createProduct(productData);

    return NextResponse.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create product' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products?productId=xxx
 * Update an existing product
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Authorization: Only merchant-level roles can update product master data
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
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

    const product = await updateProduct(productId, updateData);

    return NextResponse.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error in PUT /api/products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update product' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products?productId=xxx
 * Delete a product
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Authorization: Only merchant-level roles can delete products
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
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

    await deleteProduct(productId);

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete product' },
      { status: 500 }
    );
  }
} 