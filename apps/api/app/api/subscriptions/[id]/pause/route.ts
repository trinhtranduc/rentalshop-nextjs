// ============================================================================
// PAUSE SUBSCRIPTION API ENDPOINT
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@rentalshop/auth';
import { pauseSubscription } from '@rentalshop/database';
import { API } from '@rentalshop/constants';

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

    // Check permissions - only ADMIN and MERCHANT can pause subscriptions
    if (!['ADMIN', 'MERCHANT'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to pause subscription' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Parse request body for optional reason
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Pause the subscription
    const subscriptionId = parseInt(params.id);
    if (isNaN(subscriptionId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid subscription ID' },
        { status: 400 }
      );
    }

    const result = await pauseSubscription(subscriptionId);

    return NextResponse.json({
      success: true,
      message: 'Subscription paused successfully',
      data: result
    });

  } catch (error) {
    console.error('Error pausing subscription:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to pause subscription' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
