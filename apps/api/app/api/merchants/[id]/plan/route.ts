import { NextRequest, NextResponse } from 'next/server';
import { db, changePlan } from '@rentalshop/database';
import { withAuthRoles, validateMerchantAccess } from '@rentalshop/auth/server';
import { handleApiError, ResponseBuilder, normalizeBillingInterval } from '@rentalshop/utils';
import { API, USER_ROLE, PLATFORM_OPS_ROLES } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/plan
 * Get merchant plan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  
  return withAuthRoles([...PLATFORM_OPS_ROLES, USER_ROLE.MERCHANT])(async (request, { user, userScope }) => {
    try {
      // Validate merchant access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) {
        return validation.error!;
      }
      const merchant = validation.merchant!;

      // Get merchant's current plan and subscription
      const plan = merchant.Plan;
      const subscription = merchant.subscription;

      return NextResponse.json({
        success: true,
        data: {
          plan,
          subscription
        }
      });

    } catch (error) {
      console.error('Error fetching merchant plan:', error);
      return NextResponse.json(
        ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * PUT /api/merchants/[id]/plan
 * Update merchant plan
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  
  return withAuthRoles([...PLATFORM_OPS_ROLES, USER_ROLE.MERCHANT])(async (request, { user, userScope }) => {
    try {
      // Validate merchant access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) {
        return validation.error!;
      }
      const merchant = validation.merchant!;

      const body = await request.json();
      const { planId, billingInterval, totalPrice, duration, discount } = body;
      
      // totalPrice comes from frontend calculation
      const amount = totalPrice || 0;

      console.log('🔍 Plan Change Request:', { 
        merchantPublicId, 
        planId, 
        billingInterval, 
        amount,
        totalPrice,
        duration,
        discount,
        body 
      });

      // Update merchant plan
      const updatedMerchant = await db.merchants.update(merchantPublicId, {
        planId
        // subscriptionStatus removed - subscription status is managed via Subscription model
      });

      let planChange: Record<string, unknown> | undefined;
      // Also update the subscription record if it exists
      if (merchant.subscription) {
        // Get old plan for activity log
        const oldPlan = await db.plans.findById(merchant.subscription.planId);
        const newPlan = await db.plans.findById(planId);
        
        const normalizedBillingInterval = normalizeBillingInterval(billingInterval);
        
        // Use changePlan() function which includes email notification
        console.log('📧 Using changePlan() function to update subscription with email notification...', {
          subscriptionId: merchant.subscription.id,
          newPlanId: planId,
          billingInterval: normalizedBillingInterval
        });
        
        // The rules (who, when) and the Payment of the amount due are applied inside changePlan (#785)
        const updatedSubscription = await changePlan(
          merchant.subscription.id,
          planId,
          normalizedBillingInterval as any,
          {
            actorRole: user.role,
            payment: {
              method: body.method,
              transactionId: body.transactionId,
              reference: body.reference,
              description: body.description,
              paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
            },
          }
        );

        // The server prices the change (#779): changePlan() stores the cycle price, discount % and currency.
        // `totalPrice` / `discount` from the client are still accepted but no longer written (a client could
        // store any amount, e.g. totalPrice: 1).
        planChange = (updatedSubscription as { planChange?: Record<string, unknown> }).planChange;

        // Log activity to database
        await db.subscriptionActivities.create({
          subscriptionId: merchant.subscription.id,
          type: 'plan_changed',
          description: `Plan changed from ${oldPlan?.name} to ${newPlan?.name}`,
          reason: body.reason || 'Plan changed by admin',
          metadata: {
            previousPlan: {
              id: oldPlan?.id,
              name: oldPlan?.name,
              amount: merchant.subscription.amount
            },
            newPlan: {
              id: newPlan?.id,
              name: newPlan?.name,
              amount: updatedSubscription.amount || amount
            },
            billingInterval: normalizedBillingInterval,
            discount: updatedSubscription.discount ?? 0,
            planChange,
            effectiveDate: updatedSubscription.currentPeriodStart 
              ? (typeof updatedSubscription.currentPeriodStart === 'string' 
                  ? updatedSubscription.currentPeriodStart 
                  : updatedSubscription.currentPeriodStart.toISOString())
              : new Date().toISOString(),
            nextBillingDate: updatedSubscription.currentPeriodEnd
              ? (typeof updatedSubscription.currentPeriodEnd === 'string'
                  ? updatedSubscription.currentPeriodEnd
                  : updatedSubscription.currentPeriodEnd.toISOString())
              : new Date().toISOString(),
            performedBy: {
              userId: user.userId || user.id,
              email: user.email,
              role: user.role,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
            },
            source: user.role === USER_ROLE.ADMIN ? 'admin_panel' : 'merchant_panel',
            severity: 'info',
            category: 'plan'
          },
          performedBy: user.userId || user.id
        });
        
        console.log('✅ Updated subscription with email notification:', { 
          subscriptionId: merchant.subscription.id, 
          newPlanId: planId,
          status: updatedSubscription.status,
          amount: updatedSubscription.amount,
          interval: normalizedBillingInterval,
          periodStart: updatedSubscription.currentPeriodStart,
          periodEnd: updatedSubscription.currentPeriodEnd,
          emailSent: 'check logs above'
        });
      }

      // Fetch updated merchant with new subscription data
      const refreshedMerchant = await db.merchants.findById(merchantPublicId);

      return NextResponse.json({
        success: true,
        data: refreshedMerchant ? { ...refreshedMerchant, planChange } : refreshedMerchant,
        code: 'PLAN_UPDATED_SUCCESS',
        message: 'Plan updated successfully'
      });

    } catch (error) {
      console.error('Error updating merchant plan:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}