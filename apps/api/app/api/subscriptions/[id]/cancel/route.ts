// ============================================================================
// CANCEL SUBSCRIPTION API ENDPOINT
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { cancelSubscription } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

/**
 * POST /api/subscriptions/[id]/cancel - Cancel subscription
 * Requires: Any authenticated user
 */
async function handleCancelSubscription(
  request: NextRequest,
  { user }: { user: any; userScope: any },
  params: { id: string }
) {
  try {

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
    const result = await cancelSubscription(subscriptionId);

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles();
  const authenticatedHandler = authWrapper((req, context) => 
    handleCancelSubscription(req, context, params)
  );
  return authenticatedHandler(request);
}
