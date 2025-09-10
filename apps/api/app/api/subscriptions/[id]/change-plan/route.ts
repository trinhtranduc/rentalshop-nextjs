// ============================================================================
// CHANGE SUBSCRIPTION PLAN API ENDPOINT
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@rentalshop/auth';
import { changePlan } from '@rentalshop/database';

export async function PATCH(
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

    // Check permissions - only ADMIN and MERCHANT can change plans
    if (!['ADMIN', 'MERCHANT'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { newPlanId, period, reason } = body;

    if (!newPlanId) {
      return NextResponse.json(
        { success: false, message: 'New plan ID is required' },
        { status: 400 }
      );
    }

    // Change the subscription plan
    const subscriptionId = parseInt(params.id);
    const result = await changePlan(subscriptionId, newPlanId, period || 1, reason);

    return NextResponse.json({
      success: true,
      message: 'Subscription plan changed successfully',
      data: result
    });

  } catch (error) {
    console.error('Error changing subscription plan:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
