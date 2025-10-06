import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, createSuccessResponse } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/subscriptions/status
 * Get subscription status for the authenticated merchant
 */
export async function GET(request: NextRequest) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      // For MERCHANT role, get their own subscription
      // For ADMIN role, they can specify merchantId in query params
      const { searchParams } = new URL(request.url);
      const merchantId = user.role === 'ADMIN' 
        ? (searchParams.get('merchantId') ? parseInt(searchParams.get('merchantId')!) : userScope.merchantId)
        : userScope.merchantId;

      if (!merchantId) {
        return NextResponse.json(
          { success: false, message: 'Merchant ID is required' },
          { status: 400 }
        );
      }

      // Get merchant with subscription details
      const merchant = await db.merchants.findById(merchantId);
      if (!merchant) {
        return NextResponse.json(
          { success: false, message: 'Merchant not found' },
          { status: 404 }
        );
      }

      // Check if merchant has a subscription
      if (!merchant.subscription) {
        return NextResponse.json(
          { success: false, message: 'No subscription found for this merchant' },
          { status: 404 }
        );
      }

      // Get plan details
      const plan = merchant.subscription.plan;
      
      // Calculate subscription status details
      const now = new Date();
      const isTrialActive = merchant.subscription.status === 'trial' && 
                           merchant.subscription.trialEnd && 
                           new Date(merchant.subscription.trialEnd) > now;
      
      const isActive = merchant.subscription.status === 'active' ||
                      (isTrialActive && merchant.subscription.status === 'trial');
      
      const isExpired = !isActive && merchant.subscription.status !== 'canceled';
      
      const daysRemaining = isTrialActive && merchant.subscription.trialEnd
        ? Math.ceil((new Date(merchant.subscription.trialEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Prepare response data
      const subscriptionStatus = {
        merchant: {
          id: merchant.id,
          name: merchant.name,
          email: merchant.email
        },
        subscription: {
          id: merchant.subscription.id,
          status: merchant.subscription.status,
          plan: {
            id: plan?.id || null,
            name: plan?.name || 'Unknown Plan',
            description: plan?.description || '',
            basePrice: plan?.basePrice || 0,
            currency: plan?.currency || 'USD',
            trialDays: plan?.trialDays || 0,
            limits: plan?.limits ? JSON.parse(plan.limits) : {},
            features: plan?.features ? JSON.parse(plan.features) : []
          },
          currentPeriod: {
            start: merchant.subscription.currentPeriodStart,
            end: merchant.subscription.currentPeriodEnd
          },
          trial: {
            start: merchant.subscription.trialStart,
            end: merchant.subscription.trialEnd,
            isActive: isTrialActive,
            daysRemaining: daysRemaining
          },
          billing: {
            amount: merchant.subscription.amount,
            currency: merchant.subscription.currency,
            interval: merchant.subscription.interval,
            intervalCount: merchant.subscription.intervalCount
          },
          cancellation: {
            cancelAtPeriodEnd: merchant.subscription.cancelAtPeriodEnd,
            canceledAt: merchant.subscription.canceledAt,
            cancelReason: merchant.subscription.cancelReason
          }
        },
        status: {
          isActive,
          isExpired,
          isTrial: merchant.subscription.status === 'trial',
          isCanceled: merchant.subscription.status === 'canceled',
          isPastDue: merchant.subscription.status === 'past_due'
        },
        limits: plan?.limits ? JSON.parse(plan.limits) : {},
        usage: {
          outlets: merchant._count?.outlets || 0,
          users: merchant._count?.users || 0,
          products: merchant._count?.products || 0,
          customers: merchant._count?.customers || 0
        }
      };

      return NextResponse.json(createSuccessResponse(subscriptionStatus, 'Subscription status retrieved successfully'));

    } catch (error) {
      console.error('Error fetching subscription status:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}