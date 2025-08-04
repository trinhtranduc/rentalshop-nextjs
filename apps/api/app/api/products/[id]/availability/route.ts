import { NextRequest, NextResponse } from 'next/server';
import { checkProductAvailability } from '@rentalshop/database';

/**
 * GET /api/products/[id]/availability
 * Check if a product is available for rent
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const isAvailable = await checkProductAvailability(id);

    return NextResponse.json({
      success: true,
      data: {
        productId: id,
        isAvailable,
      },
    });
  } catch (error) {
    console.error('Error checking product availability:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check product availability',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 