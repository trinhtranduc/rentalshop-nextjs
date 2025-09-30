// ============================================================================
// PAUSE SUBSCRIPTION API ENDPOINT
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { pauseSubscription } from '@rentalshop/database';
import { API } from '@rentalshop/constants';

/**
 * POST /api/subscriptions/[id]/pause - Pause subscription
 * Requires: ADMIN or MERCHANT role
 */
async function handlePauseSubscription(
  request: NextRequest,
  { user }: { user: any; userScope: any },
  params: { id: string }
) {
  try {

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT']);
  const authenticatedHandler = authWrapper((req, context) => 
    handlePauseSubscription(req, context, params)
  );
  return authenticatedHandler(request);
}
