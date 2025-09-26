// ============================================================================
// SUBSCRIPTION VALIDATION UTILITIES
// ============================================================================

import { prisma } from '@rentalshop/database';
import { API } from '@rentalshop/constants';
import type { AuthUser } from '@rentalshop/types';

export interface SubscriptionValidationResult {
  isValid: boolean;
  error?: string;
  statusCode?: number;
  subscription?: any;
  merchant?: any;
  isExpired?: boolean;
  needsStatusUpdate?: boolean;
}

export interface SubscriptionValidationOptions {
  requireActiveSubscription?: boolean;
  allowedStatuses?: string[];
  checkMerchantStatus?: boolean;
  checkSubscriptionStatus?: boolean;
  autoUpdateExpired?: boolean;
}

/**
 * Validate subscription access for API routes
 * This runs in Node.js runtime (not Edge Runtime)
 */
export async function validateSubscriptionAccess(
  user: AuthUser,
  options: SubscriptionValidationOptions = {}
): Promise<SubscriptionValidationResult> {
  const {
    requireActiveSubscription = true,
    allowedStatuses = ['active'],
    checkMerchantStatus = true,
    checkSubscriptionStatus = true,
    autoUpdateExpired = true
  } = options;

  try {
    // Get merchant information with subscription
    const merchant = await prisma.merchant.findUnique({
      where: { id: user.merchantId },
      select: {
        id: true,
        id: true,
        name: true,
        email: true,
        subscriptionStatus: true,
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });

    if (!merchant) {
      return {
        isValid: false,
        error: 'Merchant not found',
        statusCode: API.STATUS.NOT_FOUND
      };
    }

    // Check merchant subscription status
    if (checkMerchantStatus) {
      const merchantStatus = merchant.subscriptionStatus?.toLowerCase();
      if (merchantStatus && !allowedStatuses.includes(merchantStatus)) {
        return {
          isValid: false,
          error: `Merchant subscription is ${merchantStatus}. Access denied.`,
          statusCode: API.STATUS.FORBIDDEN,
          merchant
        };
      }
    }

    // Check active subscription
    if (checkSubscriptionStatus && requireActiveSubscription) {
      const subscription = merchant.subscription;
      
      if (!subscription) {
        return {
          isValid: false,
          error: 'No active subscription found. Please subscribe to a plan.',
          statusCode: API.STATUS.FORBIDDEN,
          merchant
        };
      }

      // Check if subscription is expired (real-time check)
      const now = new Date();
      const isExpired = subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < now;
      
      if (isExpired && autoUpdateExpired) {
        // Auto-update expired subscription status
        try {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { 
              status: 'expired',
              updatedAt: now
            }
          });
          
          console.log(`🔄 Auto-updated expired subscription ${subscription.id}`);
          
          // Update the subscription object for response
          subscription.status = 'expired';
        } catch (error) {
          console.error(`❌ Failed to update expired subscription ${subscription.id}:`, error);
        }
      }

      const subscriptionStatus = subscription.status?.toLowerCase();
      
      // Check if subscription is expired (after potential update)
      if (isExpired) {
        return {
          isValid: false,
          error: 'Subscription has expired. Please renew to continue.',
          statusCode: API.STATUS.FORBIDDEN,
          subscription,
          merchant,
          isExpired: true,
          needsStatusUpdate: true
        };
      }

      if (!allowedStatuses.includes(subscriptionStatus)) {
        return {
          isValid: false,
          error: `Subscription is ${subscriptionStatus}. Access denied.`,
          statusCode: API.STATUS.FORBIDDEN,
          subscription,
          merchant
        };
      }
    }

    return {
      isValid: true,
      subscription: merchant.subscription,
      merchant
    };

  } catch (error) {
    console.error('Subscription validation error:', error);
    return {
      isValid: false,
      error: 'Failed to validate subscription',
      statusCode: API.STATUS.INTERNAL_SERVER_ERROR
    };
  }
}

/**
 * Check if subscription status allows specific operations
 */
export function canPerformOperation(
  subscriptionStatus: string,
  operation: 'create' | 'read' | 'update' | 'delete' | 'admin'
): boolean {
  const status = subscriptionStatus.toLowerCase();
  
  switch (status) {
    case 'active':
      return true; // All operations allowed
    case 'paused':
      return ['read'].includes(operation); // Only read operations
    case 'expired':
    case 'cancelled':
    case 'past_due':
      return false; // No operations allowed
    default:
      return false;
  }
}

/**
 * Get subscription error message for frontend display
 */
export function getSubscriptionErrorMessage(
  subscriptionStatus: string,
  merchantStatus?: string
): string {
  const status = subscriptionStatus.toLowerCase();
  const merchant = merchantStatus?.toLowerCase();

  if (merchant && !['active'].includes(merchant)) {
    return `Merchant account is ${merchant}. Please contact support.`;
  }

  switch (status) {
    case 'paused':
      return 'Your subscription is paused. Some features may be limited.';
    case 'expired':
      return 'Your subscription has expired. Please renew to continue.';
    case 'cancelled':
      return 'Your subscription has been cancelled. Please choose a new plan.';
    case 'past_due':
      return 'Payment is past due. Please update your payment method.';
    default:
      return 'Subscription status error. Please contact support.';
  }
}

/**
 * Get allowed operations for current subscription status
 */
export function getAllowedOperations(subscriptionStatus: string): string[] {
  const status = subscriptionStatus.toLowerCase();
  
  switch (status) {
    case 'active':
      return ['create', 'read', 'update', 'delete', 'admin'];
    case 'paused':
      return ['read'];
    case 'expired':
    case 'cancelled':
    case 'past_due':
      return [];
    default:
      return [];
  }
}

export default {
  validateSubscriptionAccess,
  canPerformOperation,
  getSubscriptionErrorMessage,
  getAllowedOperations
};
