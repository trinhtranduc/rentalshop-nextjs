import { NextRequest, NextResponse } from 'next/server';
import { getMainDb } from '@rentalshop/database';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/subscriptions/status
 * Get subscription status for the tenant
 * MULTI-TENANT: Uses subdomain-based tenant DB
 * Note: Plans are stored in Main DB, but subscriptions are in tenant DB
 */
export async function GET(request: NextRequest) {
  return withManagementAuth(async (request, { user }) => {
    try {
      const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;

      // Get the most recent active subscription for the tenant
      const subscription = await db.subscription.findFirst({
        where: {
          status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'PAUSED'] }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!subscription) {
        return NextResponse.json(
          ResponseBuilder.error('NO_SUBSCRIPTION_FOUND', 'No active subscription found for this tenant'),
          { status: 404 }
        );
      }

      // Get plan details from Main DB
      const mainDb = await getMainDb();
      let plan = null;
      try {
        const planResult = await mainDb.query(
          'SELECT name, description, "basePrice", currency, "trialDays", limits, features FROM "Plan" WHERE "publicId" = $1',
          [subscription.planId]
        );
        if (planResult.rows.length > 0) {
          plan = planResult.rows[0];
        }
        mainDb.end();
      } catch (error) {
        console.error('Error fetching plan from Main DB:', error);
        mainDb.end();
      }

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
      const isTrialExpired = dbStatus === 'trial' && trialEnd && trialEnd <= now;
      const isTrialActive = dbStatus === 'trial' && trialEnd && trialEnd > now;
      
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

      // Get usage statistics from tenant DB
      const [outletCount, userCount, productCount, customerCount] = await Promise.all([
        db.outlet.count({ where: { isActive: true } }),
        db.user.count({ where: { isActive: true } }),
        db.product.count({ where: { isActive: true } }),
        db.customer.count()
      ]);

      // ============================================================================
      // BUILD CLEAN RESPONSE STRUCTURE
      // ============================================================================
      
      const subscriptionStatus = {
        // ============================================================================
        // SUBSCRIPTION STATUS (SINGLE SOURCE OF TRUTH)
        // ============================================================================
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
        // PLAN INFO (from Main DB)
        // ============================================================================
        planId: subscription.planId,
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
        limits: plan?.limits ? JSON.parse(plan.limits as string) : {},
        usage: {
          outlets: outletCount,
          users: userCount,
          products: productCount,
          customers: customerCount
        },
        
        // ============================================================================
        // PLAN FEATURES
        // ============================================================================
        features: plan?.features ? JSON.parse(plan.features as string) : []
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