// ============================================================================
// CANCEL SUBSCRIPTION API ENDPOINT
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@rentalshop/auth';
import { cancelSubscription } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Parse request body
    const body = await request.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, message: 'Reason is required for cancellation' },
        { status: 400 }
      );
    }

    // Cancel the subscription
    const subscriptionId = parseInt(params.id);
    const result = await cancelSubscription(subscriptionId, reason.trim(), user);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
