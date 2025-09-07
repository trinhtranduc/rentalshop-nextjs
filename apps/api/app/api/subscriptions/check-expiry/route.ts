// ============================================================================
// SUBSCRIPTION EXPIRY CHECK API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { manualExpiryCheck } from '@rentalshop/middleware';
import { verifyTokenSimple } from '@rentalshop/auth';

// ============================================================================
// POST /api/subscriptions/check-expiry - Manual expiry check (Admin only)
// ============================================================================
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

    // Only ADMIN can run manual expiry checks
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Run manual expiry check
    const results = await manualExpiryCheck();

    return NextResponse.json({
      success: true,
      data: results,
      message: `Expiry check completed. Found ${results.expiredFound} expired subscriptions, marked ${results.markedAsExpired} as expired.`
    });
  } catch (error) {
    console.error('Error running manual expiry check:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to run expiry check' },
      { status: 500 }
    );
  }
}
