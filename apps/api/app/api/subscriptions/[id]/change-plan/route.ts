import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * Handler for changing subscription plan
 */
async function handleChangePlan(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
  { user, userScope }: { user: any; userScope: any }
) {
  try {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const subscriptionId = parseInt(resolvedParams.id);
      
      if (isNaN(subscriptionId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_SUBSCRIPTION_ID'), { status: 400 });
      }

      const body = await request.json();
    // Support both 'planId' and 'newPlanId' for compatibility
    const planId = body.planId || body.newPlanId;

      if (!planId) {
        return NextResponse.json(ResponseBuilder.error('PLAN_ID_REQUIRED'), { status: 400 });
      }

      const existing = await db.subscriptions.findById(subscriptionId);
      if (!existing) {
        return NextResponse.json(ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      // Verify plan exists before updating
      const plan = await db.plans.findById(planId);
      if (!plan) {
        return NextResponse.json(ResponseBuilder.error('PLAN_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      console.log('🔍 Changing subscription plan:', {
        subscriptionId,
        merchantId: existing.merchantId,
        oldPlanId: existing.planId,
        newPlanId: planId,
        planName: plan.name
      });

      // Change subscription plan
      const updatedSubscription = await db.subscriptions.update(subscriptionId, {
        planId: planId,
        updatedAt: new Date()
      });

      console.log('✅ Subscription plan updated successfully:', {
        subscriptionId,
        newPlanId: updatedSubscription.planId,
        planName: plan.name
      });

    return NextResponse.json(
      ResponseBuilder.success('PLAN_CHANGED_SUCCESS', updatedSubscription)
    );
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
}

/**
 * POST /api/subscriptions/[id]/change-plan
 * Change subscription plan
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, context) => {
    return handleChangePlan(request, { params }, context);
  })(request);
}

/**
 * PATCH /api/subscriptions/[id]/change-plan
 * Change subscription plan (alternative method)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, context) => {
    return handleChangePlan(request, { params }, context);
  })(request);
}