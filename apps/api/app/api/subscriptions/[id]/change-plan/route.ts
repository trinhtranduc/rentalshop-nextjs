// ============================================================================
// CHANGE SUBSCRIPTION PLAN API ENDPOINT
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { changePlan } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

/**
 * PATCH /api/subscriptions/[id]/change-plan - Change subscription plan
 * Requires: ADMIN or MERCHANT role
 */
async function handleChangeSubscriptionPlan(
  request: NextRequest,
  { user }: { user: any; userScope: any },
  params: { id: string }
) {
  try {

    // Parse request body
    const body = await request.json();
    const { newPlanId, billingInterval } = body;

    if (!newPlanId) {
      return NextResponse.json(
        { success: false, message: 'New plan ID is required' },
        { status: 400 }
      );
    }

    // Change the subscription plan
    const subscriptionId = parseInt(params.id);
    const result = await changePlan(subscriptionId, newPlanId, billingInterval || 'month');

    return NextResponse.json({
      success: true,
      message: 'Subscription plan changed successfully',
      data: result
    });

  } catch (error) {
    console.error('Error changing subscription plan:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleChangeSubscriptionPlan(req, context, params)
  );
  return authenticatedHandler(request);
}
