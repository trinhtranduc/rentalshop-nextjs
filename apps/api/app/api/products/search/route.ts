import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '@rentalshop/database';
import { searchRateLimiter } from '../../../../lib/middleware/rateLimit';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = searchRateLimiter(request);
  if (rateLimitResult instanceof NextResponse) {
    return rateLimitResult;
  }
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const query = searchParams.get('q') || undefined;
    const outletId = searchParams.get('outletId') || undefined;
    const merchantId = searchParams.get('merchantId') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const isActive = searchParams.get('isActive');
    const inStock = searchParams.get('inStock');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // Validate and parse boolean parameters
    const isActiveBool = isActive ? isActive === 'true' : undefined;
    const inStockBool = inStock ? inStock === 'true' : undefined;

    // Validate and parse numeric parameters
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    if (limitNum < 1 || limitNum > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (offsetNum < 0) {
      return NextResponse.json(
        { error: 'Offset must be 0 or greater' },
        { status: 400 }
      );
    }

    const filter = {
      query,
      outletId,
      merchantId,
      categoryId,
      isActive: isActiveBool,
      inStock: inStockBool,
      limit: limitNum,
      offset: offsetNum,
    };

    const result = await searchProducts(filter);

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Product Search API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 