import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { SUBSCRIPTION_STATUS, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/subscriptions/status
 * Get subscription status for the authenticated merchant
 * 
 * **Why OUTLET_ADMIN and OUTLET_STAFF need access:**
 * - They need to know plan limits (products, users, outlets)
 * - They need to see subscription status for their outlet
 * - They work for the merchant, so should have read access
 * - Read-only access, cannot modify subscription
 */
export async function GET(request: NextRequest) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
    try {
      // For MERCHANT, OUTLET_ADMIN, OUTLET_STAFF: get their merchant's subscription
      // For ADMIN role, they can specify merchantId in query params
      const { searchParams } = new URL(request.url);
      const merchantId = user.role === USER_ROLE.ADMIN 
        ? (searchParams.get('merchantId') ? parseInt(searchParams.get('merchantId')!) : userScope.merchantId)
        : userScope.merchantId; // All outlet users have merchantId in scope

      if (!merchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ID_REQUIRED'),
          { status: 400 }
        );
      }

      // Get merchant with subscription details
      const merchant = await db.merchants.findById(merchantId);
      if (!merchant) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: 404 }
        );
      }

      // Check if merchant has a subscription
      if (!merchant.subscription) {
        return NextResponse.json(
          ResponseBuilder.error('NO_SUBSCRIPTION_FOUND'),
          { status: 404 }
        );
      }

      // Get plan details
      const plan = merchant.subscription.plan;
      const subscription = merchant.subscription;
      const now = new Date();

      // ============================================================================
      // CALCULATE SUBSCRIPTION STATUS (EXPERT LOGIC - PRIORITY-BASED)
      // ============================================================================
      
      // Normalize status to lowercase for consistent comparison
      const dbStatus = subscription.status?.toLowerCase() || '';
      
      // Get time-sensitive data
      const trialEnd = subscription.trialEnd ? new Date(subscription.trialEnd) : null;
      const periodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
      
      // Calculate expiration states
      const isPeriodExpired = periodEnd && periodEnd < now;
      const isTrialExpired = dbStatus === SUBSCRIPTION_STATUS.TRIAL.toLowerCase() && trialEnd && trialEnd <= now;
      const isTrialActive = dbStatus === SUBSCRIPTION_STATUS.TRIAL.toLowerCase() && trialEnd && trialEnd > now;
      
      // ============================================================================
      // SIMPLE STATUS: CHỈ 1 STATUS DUY NHẤT
      // ============================================================================
      // Logic đơn giản: User có thể access được không?
      // ACTIVE = Có thể dùng (dù có cancel hay không, miễn period chưa hết)
      // EXPIRED = Không thể dùng (period đã hết)
      
      let computedStatus: string;
      let statusReason: string;
      
      if (isPeriodExpired || isTrialExpired) {
        // Period đã hết → EXPIRED
        computedStatus = 'EXPIRED';
        if (isPeriodExpired) {
          const daysExpired = Math.floor((now.getTime() - periodEnd!.getTime()) / (1000 * 60 * 60 * 24));
          statusReason = `Expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago`;
        } else {
          const daysExpired = Math.floor((now.getTime() - trialEnd!.getTime()) / (1000 * 60 * 60 * 24));
          statusReason = `Trial expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago`;
        }
      } else {
        // Period chưa hết → ACTIVE (dù có cancel hay không)
        computedStatus = 'ACTIVE';
        if (periodEnd) {
          const daysLeft = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (subscription.canceledAt) {
            statusReason = `Active (${daysLeft} days left) - Canceled but access until period end`;
          } else {
            statusReason = daysLeft <= 7 
              ? `Active - Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
              : `Active (${daysLeft} days remaining)`;
          }
        } else {
          statusReason = subscription.canceledAt ? 'Active - Canceled but still accessible' : 'Active';
        }
      }
      
      // Calculate days remaining (for UI display)
      let daysRemaining: number | null = null;
      if (isTrialActive && trialEnd) {
        daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      } else if (!isPeriodExpired && periodEnd) {
        daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      // Calculate access permissions - Đơn giản!
      const hasAccess = computedStatus === 'ACTIVE';  // Chỉ cần ACTIVE
      const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;

      // ============================================================================
      // BUILD CLEAN RESPONSE STRUCTURE (EXPERT-LEVEL SIMPLICITY)
      // ============================================================================
      
      const subscriptionStatus = {
        // ============================================================================
        // MERCHANT INFO
        // ============================================================================
        merchantId: merchant.id,
        merchantName: merchant.name,
        merchantEmail: merchant.email,
        
        // ============================================================================
        // SUBSCRIPTION STATUS (SINGLE SOURCE OF TRUTH)
        // ============================================================================
        // Use computedStatus instead of multiple boolean flags
        status: computedStatus,           // CANCELED | EXPIRED | PAST_DUE | PAUSED | TRIAL | ACTIVE
        statusReason,                     // Human-readable reason
        hasAccess,                        // Can user access features?
        daysRemaining,                    // Days until expiration (null if expired)
        isExpiringSoon,                   // Expires in <= 7 days
        
        // Database status (for reference only)
        dbStatus: subscription.status,    // Original status from database
        
        // ============================================================================
        // SUBSCRIPTION DETAILS
        // ============================================================================
        subscriptionId: subscription.id,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
        
        // ============================================================================
        // PLAN INFO
        // ============================================================================
        planId: plan?.id || null,
        planName: plan?.name || 'Unknown Plan',
        planDescription: plan?.description || '',
        planPrice: plan?.basePrice || 0,
        planCurrency: plan?.currency || 'USD',
        planTrialDays: plan?.trialDays || 0,
        
        // ============================================================================
        // BILLING INFO
        // ============================================================================
        billingAmount: subscription.amount,
        billingCurrency: subscription.currency,
        billingInterval: subscription.interval,
        billingIntervalCount: subscription.intervalCount,
        
        // ============================================================================
        // CANCELLATION INFO (if applicable)
        // ============================================================================
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt,
        cancelReason: subscription.cancelReason,
        
        // ============================================================================
        // PLAN LIMITS & USAGE
        // ============================================================================
        limits: plan?.limits ? JSON.parse(plan.limits) : {},
        usage: {
          outlets: merchant._count?.outlets || 0,
          users: merchant._count?.users || 0,
          products: merchant._count?.products || 0,
          customers: merchant._count?.customers || 0
        },
        
        // ============================================================================
        // PLAN FEATURES
        // ============================================================================
        features: plan?.features ? JSON.parse(plan.features) : []
      };

      return NextResponse.json(ResponseBuilder.success('SUBSCRIPTION_STATUS_RETRIEVED', subscriptionStatus));

    } catch (error) {
      console.error('Error fetching subscription status:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}