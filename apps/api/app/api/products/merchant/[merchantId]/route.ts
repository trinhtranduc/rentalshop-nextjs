import { NextRequest, NextResponse } from 'next/server';
import { getProductsByMerchant } from '@rentalshop/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { merchantId: string } }
) {
  try {
    const { merchantId } = params;
    const { searchParams } = new URL(request.url);

    if (!merchantId || merchantId.trim() === '') {
      return NextResponse.json(
        { error: 'Merchant ID is required' },
        { status: 400 }
      );
    }

    // Parse query parameters
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

    const options = {
      categoryId,
      isActive: isActiveBool,
      inStock: inStockBool,
      limit: limitNum,
      offset: offsetNum,
    };

    const result = await getProductsByMerchant(merchantId.trim(), options);

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Products by Merchant API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 