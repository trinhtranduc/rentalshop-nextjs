/**
 * Subscription Status Checker
 * Simplified subscription validation using status map pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { SUBSCRIPTION_STATUS, USER_ROLE } from '@rentalshop/constants';

export interface SubscriptionCheckResult {
  success: boolean;
  response?: NextResponse;
}

interface StatusCheckConfig {
  code: string;
  message: string;
  getDetails?: (subscription: any, merchant: any) => Record<string, any>;
}

/**
 * Subscription status check configurations
 * Maps each status to its error response
 */
const STATUS_CHECKS: Record<string, StatusCheckConfig> = {
  [SUBSCRIPTION_STATUS.PAUSED]: {
    code: 'SUBSCRIPTION_PAUSED',
    message: 'Your subscription is paused. Please contact support to reactivate.',
    getDetails: (subscription, merchant) => ({
      status: subscription.status,
      merchantId: merchant.id,
      merchantName: merchant.name
    })
  },
  [SUBSCRIPTION_STATUS.CANCELLED]: {
    code: 'SUBSCRIPTION_CANCELLED',
    message: 'Your subscription has been cancelled. Please contact support to reactivate.',
    getDetails: (subscription, merchant) => ({
      status: subscription.status,
      merchantId: merchant.id,
      merchantName: merchant.name,
      canceledAt: subscription.canceledAt
    })
  },
  [SUBSCRIPTION_STATUS.EXPIRED]: {
    code: 'SUBSCRIPTION_EXPIRED',
    message: 'Your subscription has expired. Please renew to continue using the service.',
    getDetails: (subscription, merchant) => ({
      status: subscription.status,
      expiredAt: subscription.currentPeriodEnd,
      merchantId: merchant.id,
      merchantName: merchant.name
    })
  },
  [SUBSCRIPTION_STATUS.PAST_DUE]: {
    code: 'SUBSCRIPTION_PAST_DUE',
    message: 'Your subscription payment is past due. Please update your payment method.',
    getDetails: (subscription, merchant) => ({
      status: subscription.status,
      merchantId: merchant.id,
      merchantName: merchant.name
    })
  }
};

/**
 * Create error response for subscription status
 */
function createSubscriptionErrorResponse(
  config: StatusCheckConfig,
  subscription: any,
  merchant: any
): NextResponse {
  const details = config.getDetails ? config.getDetails(subscription, merchant) : {};
  
  return NextResponse.json(
    {
      success: false,
      code: config.code,
      message: config.message,
      details
    },
    { status: 403 }
  );
}

/**
 * Check if a date has passed
 */
function isDatePassed(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const targetDate = new Date(date);
  const now = new Date();
  return targetDate < now;
}

/**
 * Subscription Status Checker Class
 * Simplified subscription validation logic
 */
export class SubscriptionStatusChecker {
  /**
   * Check if merchant has active subscription
   * ADMIN users bypass this check
   */
  static async check(user: any): Promise<SubscriptionCheckResult> {
    // ADMIN users bypass subscription checks
    if (user.role === USER_ROLE.ADMIN) {
      return { success: true };
    }

    // Get merchant ID from user
    const merchantId = user.merchantId || user.merchant?.id;
    
    if (!merchantId) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, message: 'No merchant associated with user', code: 'NO_MERCHANT' },
          { status: 403 }
        )
      };
    }

    // Get merchant with subscription info
    const merchant = await db.merchants.findById(merchantId);
    
    if (!merchant) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, message: 'Merchant not found', code: 'MERCHANT_NOT_FOUND' },
          { status: 404 }
        )
      };
    }

    // Get subscription object (source of truth)
    const subscription = merchant.subscription;
    
    if (!subscription) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            success: false, 
            message: 'No active subscription found. Please subscribe to continue.',
            code: 'NO_SUBSCRIPTION',
            details: {
              merchantId: merchant.id,
              merchantName: merchant.name
            }
          },
          { status: 403 }
        )
      };
    }

    // Use subscription.status (NOT merchant.subscriptionStatus which can be outdated)
    const subscriptionStatus = subscription.status;

    // Check blocked statuses using status map
    const statusCheck = STATUS_CHECKS[subscriptionStatus];
    if (statusCheck) {
      return {
        success: false,
        response: createSubscriptionErrorResponse(statusCheck, subscription, merchant)
      };
    }

    // ============================================================================
    // SIMPLIFIED RULE: Chỉ dùng currentPeriodEnd, bỏ trialEnd
    // ============================================================================
    // Bất kể merchant status là trial hay không, chỉ cần check currentPeriodEnd
    // Không cần check trialEnd nữa
    
    // Check currentPeriodEnd (duy nhất)
    if (subscription.currentPeriodEnd) {
      if (isDatePassed(subscription.currentPeriodEnd)) {
        return {
          success: false,
          response: NextResponse.json(
            { 
              success: false, 
              message: 'Your subscription period has ended. Please renew to continue.',
              code: 'SUBSCRIPTION_PERIOD_ENDED',
              details: {
                expiredAt: subscription.currentPeriodEnd,
                merchantId: merchant.id,
                merchantName: merchant.name
              }
            },
            { status: 403 }
          )
        };
      }
      // currentPeriodEnd còn valid → subscription active
      return { success: true };
    }

    // Nếu không có currentPeriodEnd → không có subscription hợp lệ
        return {
          success: false,
          response: NextResponse.json(
            { 
              success: false, 
          message: 'Subscription period end date is missing. Please contact support.',
          code: 'SUBSCRIPTION_PERIOD_MISSING',
              details: {
                merchantId: merchant.id,
                merchantName: merchant.name
              }
            },
            { status: 403 }
          )
        };
  }
}


