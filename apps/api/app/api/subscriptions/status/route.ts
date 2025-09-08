// ============================================================================
// SUBSCRIPTION STATUS API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionByMerchantId } from '@rentalshop/database';
import { verifyTokenSimple } from '@rentalshop/auth';

// ============================================================================
// GET /api/subscriptions/status - Get current user's subscription status
// ============================================================================
export async function GET(request: NextRequest) {
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

    // Get user's subscription
    const subscription = await getSubscriptionByMerchantId(Number(user.merchantId) || 0);
    
    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: {
          hasSubscription: false,
          status: 'NO_SUBSCRIPTION',
          message: 'No subscription found'
        }
      });
    }

    // Check if subscription is expired
    const now = new Date();
    const isExpired = subscription.status === 'cancelled' || 
      (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < now);
    
    const isExpiringSoon = subscription.status === 'active' && 
      subscription.currentPeriodEnd && 
      new Date(subscription.currentPeriodEnd) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Calculate days until expiry
    const daysUntilExpiry = subscription.currentPeriodEnd ? 
      Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

    return NextResponse.json({
      success: true,
      data: {
        hasSubscription: true,
        subscription: {
          id: subscription.id,
          publicId: subscription.publicId,
          merchantId: subscription.merchantId,
          planId: subscription.planId,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          trialStart: subscription.trialStart,
          trialEnd: subscription.trialEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          canceledAt: subscription.canceledAt,
          cancelReason: subscription.cancelReason,
          amount: subscription.amount,
          currency: subscription.currency,
          interval: subscription.interval,
          intervalCount: subscription.intervalCount,
          period: subscription.period,
          discount: subscription.discount,
          savings: subscription.savings,
          createdAt: subscription.createdAt,
          updatedAt: subscription.updatedAt,
          merchant: subscription.merchant,
          plan: subscription.plan
        },
        isExpired,
        isExpiringSoon,
        daysUntilExpiry,
        message: isExpired ? 
          'Your subscription has expired. Please renew to continue using the service.' :
          isExpiringSoon ? 
          `Your subscription expires in ${daysUntilExpiry} days. Consider renewing soon.` :
          'Your subscription is active.'
      }
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}
