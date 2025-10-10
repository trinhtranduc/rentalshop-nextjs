import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';

/**
 * GET /api/plans/public
 * Get all active plans for public display (no authentication required)
 */
export async function GET(request: NextRequest) {
  try {
    // Get active plans using database function
    const result = await db.plans.search({ status: 'ACTIVE' });
    const plans = result.data;

    return NextResponse.json({
      success: true,
      data: plans
    });

  } catch (error) {
    console.error('Error fetching public plans:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}