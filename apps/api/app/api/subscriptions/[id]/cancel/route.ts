// ============================================================================
// CANCEL SUBSCRIPTION API ENDPOINT
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { cancelSubscription } from '@rentalshop/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      { status: 500 }
    );
  }
}
