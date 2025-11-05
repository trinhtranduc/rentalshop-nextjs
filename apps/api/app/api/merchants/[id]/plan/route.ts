import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/plan
 * Get merchant plan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const merchantPublicId = parseInt(params.id);
      if (isNaN(merchantPublicId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_MERCHANT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

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
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const merchantPublicId = parseInt(params.id);
      if (isNaN(merchantPublicId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_MERCHANT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

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
        planId,
        subscriptionStatus: 'active' // Change from trial to active when upgrading
      });

      // Also update the subscription record if it exists
      if (merchant.subscription) {
        // Get old plan for activity log
        const oldPlan = await db.plans.findById(merchant.subscription.planId);
        const newPlan = await db.plans.findById(planId);
        
        // Calculate new period end date based on billing interval
        const currentStart = new Date();
        const months = duration || 1;
        const newPeriodEnd = new Date(currentStart);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + months);
        
        await db.subscriptions.update(merchant.subscription.id, {
          planId,
          interval: billingInterval || 'month',
          amount: amount,
          discount: discount || 0,
          status: 'ACTIVE', // Update status to ACTIVE (UPPERCASE)
          currentPeriodStart: currentStart,
          currentPeriodEnd: newPeriodEnd,
          // Clear trial dates when upgrading from trial
          trialStart: null,
          trialEnd: null
        });

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
              amount: amount
            },
            billingInterval: billingInterval || 'month',
            discount: discount || 0,
            effectiveDate: currentStart.toISOString(),
            nextBillingDate: newPeriodEnd.toISOString(),
            performedBy: {
              userId: user.userId || user.id,
              email: user.email,
              role: user.role,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
            },
            source: user.role === 'ADMIN' ? 'admin_panel' : 'merchant_panel',
            severity: 'info',
            category: 'plan'
          },
          performedBy: user.userId || user.id
        });
        
        console.log('✅ Updated subscription:', { 
          subscriptionId: merchant.subscription.id, 
          newPlanId: planId,
          status: 'ACTIVE',
          amount,
          interval: billingInterval,
          periodStart: currentStart,
          periodEnd: newPeriodEnd
        });
      }

      // Fetch updated merchant with new subscription data
      const refreshedMerchant = await db.merchants.findById(merchantPublicId);

      return NextResponse.json({
        success: true,
        data: refreshedMerchant,
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