// ============================================================================
// SUBSCRIPTION EXPIRY CHECK API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { manualExpiryCheck } from '@rentalshop/middleware';
import { withAdminAuth } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

// ============================================================================
// POST /api/subscriptions/check-expiry - Manual expiry check (Admin only)
// ============================================================================
export const POST = withAdminAuth(async (authorizedRequest) => {
  try {
    // User is already authenticated and authorized as ADMIN
    const { user, request } = authorizedRequest;

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
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});
