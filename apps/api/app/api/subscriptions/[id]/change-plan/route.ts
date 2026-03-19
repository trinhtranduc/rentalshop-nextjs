import { NextRequest, NextResponse } from 'next/server';
import { db, changePlan } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth/server';
import { handleApiError, ResponseBuilder, normalizeBillingInterval } from '@rentalshop/utils';
import { API, SUBSCRIPTION_STATUS, USER_ROLE } from '@rentalshop/constants';

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
    const billingInterval = normalizeBillingInterval(body.billingInterval || body.interval);

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
        planName: plan.name,
        currentStatus: existing.status,
        billingInterval
      });

      // Check if allowWebAccess changed (for platform access control)
      const oldPlanLimits = existing.plan?.limits as any || {};
      const newPlanLimits = plan.limits as any || {};
      const oldAllowWebAccess = oldPlanLimits?.allowWebAccess !== undefined ? oldPlanLimits.allowWebAccess : true;
      const newAllowWebAccess = newPlanLimits?.allowWebAccess !== undefined ? newPlanLimits.allowWebAccess : true;
      const allowWebAccessChanged = oldAllowWebAccess !== newAllowWebAccess;

      // Change subscription plan using changePlan() function (includes email notification)
      const updatedSubscription = await changePlan(subscriptionId, planId, billingInterval as any);
      
      // Determine if we need to update status
      // If subscription is TRIAL and new plan is a paid plan (trialDays === 0 or null), change to ACTIVE
      const isCurrentTrial = existing.status?.toLowerCase() === SUBSCRIPTION_STATUS.TRIAL.toLowerCase();
      const isNewPlanTrial = plan.trialDays && plan.trialDays > 0;
      const shouldActivate = isCurrentTrial && !isNewPlanTrial;

      // If changing from TRIAL to paid plan, update status to ACTIVE
      if (shouldActivate) {
        await db.subscriptions.update(subscriptionId, {
          status: SUBSCRIPTION_STATUS.ACTIVE,
          updatedAt: new Date()
        });
        console.log('🔄 Updated status from TRIAL to ACTIVE for paid plan');
      }

      // Get updated subscription with status if it was changed
      const finalSubscription = shouldActivate 
        ? await db.subscriptions.findById(subscriptionId)
        : updatedSubscription;

      console.log('✅ Subscription plan updated successfully:', {
        subscriptionId,
        newPlanId: updatedSubscription.planId,
        planName: plan.name,
        newStatus: finalSubscription?.status || updatedSubscription.status,
        statusChanged: shouldActivate,
        allowWebAccessChanged,
        oldAllowWebAccess,
        newAllowWebAccess
      });

      // If allowWebAccess changed, invalidate all merchant user sessions
      // This forces users to re-login and get updated subscription data
      if (allowWebAccessChanged && existing.merchantId) {
        try {
          const invalidatedCount = await db.sessions.invalidateAllMerchantUserSessions(existing.merchantId);
          console.log(`🔄 Invalidated ${invalidatedCount} sessions for merchant ${existing.merchantId} due to allowWebAccess change`);
        } catch (error) {
          console.error('⚠️ Failed to invalidate merchant sessions:', error);
          // Don't fail the request if session invalidation fails
        }
      }

      // Log activity to database
      await db.subscriptionActivities.create({
        subscriptionId,
        type: 'subscription_plan_changed',
        description: `Subscription plan changed from ${existing.plan?.name || 'Unknown'} to ${plan.name}`,
        metadata: {
          oldPlanId: existing.planId,
          oldPlanName: existing.plan?.name,
          newPlanId: plan.id,
          newPlanName: plan.name,
          previousStatus: existing.status,
          newStatus: finalSubscription?.status || updatedSubscription.status,
          statusChanged: shouldActivate,
          performedBy: {
            userId: user.userId || user.id,
            email: user.email,
            role: user.role,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
          },
          source: user.role === USER_ROLE.ADMIN ? 'admin_panel' : 'merchant_panel',
          severity: 'info',
          category: 'billing'
        },
        performedBy: user.userId || user.id
      });

    return NextResponse.json(
      ResponseBuilder.success('PLAN_CHANGED_SUCCESS', finalSubscription || updatedSubscription)
    );
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
}

const changePlanAuth = withAuthRoles(['ADMIN', 'MERCHANT'], {
  requireActiveSubscription: false,
});

/**
 * POST /api/subscriptions/[id]/change-plan
 * Change subscription plan (allowed when expired so merchant can recover)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  return changePlanAuth(async (request, context) => {
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
  return changePlanAuth(async (request, context) => {
    return handleChangePlan(request, { params }, context);
  })(request);
}