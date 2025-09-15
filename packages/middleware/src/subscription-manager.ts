// ============================================================================
// UNIFIED SUBSCRIPTION MANAGEMENT MIDDLEWARE
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { API } from '@rentalshop/constants';
import type { AuthUser } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

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
  autoUpdateExpired?: boolean; // New: Auto-update expired subscriptions
}

export interface SubscriptionManagerConfig {
  checkInterval: number; // Check interval in milliseconds
  gracePeriod: number;   // Grace period in days before marking as expired
  autoMarkExpired: boolean; // Whether to automatically mark expired subscriptions
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: SubscriptionManagerConfig = {
  checkInterval: 60 * 60 * 1000, // 1 hour
  gracePeriod: 0, // No grace period
  autoMarkExpired: true
};

// ============================================================================
// GLOBAL STATE
// ============================================================================

let lastExpiryCheckTime = 0;
let isCheckingExpiry = false;

// ============================================================================
// CORE SUBSCRIPTION VALIDATION
// ============================================================================

/**
 * Unified subscription validation with automatic expiry checking
 * This replaces both subscription-validation.ts and subscription-expiry.ts
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
      where: { publicId: user.merchantId },
      select: {
        id: true,
        publicId: true,
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

// ============================================================================
// BACKGROUND EXPIRY CHECKING
// ============================================================================

/**
 * Background expiry check (runs periodically)
 * This replaces the separate expiry checking logic
 */
export async function checkSubscriptionExpiry(config: SubscriptionManagerConfig = DEFAULT_CONFIG) {
  // Prevent concurrent checks
  if (isCheckingExpiry) {
    return;
  }

  const now = Date.now();
  if (now - lastExpiryCheckTime < config.checkInterval) {
    return;
  }

  try {
    isCheckingExpiry = true;
    lastExpiryCheckTime = now;

    console.log('🔍 Running background subscription expiry check...');

    // Find subscriptions that should be expired
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'paused'] },
        currentPeriodEnd: { lt: new Date() }
      },
      include: {
        merchant: {
          select: {
            id: true,
            publicId: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (expiredSubscriptions.length === 0) {
      console.log('✅ No expired subscriptions found');
      return;
    }

    console.log(`⚠️ Found ${expiredSubscriptions.length} expired subscriptions`);

    // Process each expired subscription
    for (const subscription of expiredSubscriptions) {
      try {
        if (config.autoMarkExpired) {
          // Mark as expired
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { 
              status: 'expired',
              updatedAt: new Date()
            }
          });
          
          console.log(`✅ Marked subscription ${subscription.id} as expired`);
          
          // TODO: Send notifications
          // await sendExpiryNotification(subscription);
          // await sendAdminNotification(subscription);
        }
      } catch (error) {
        console.error(`❌ Error processing expired subscription ${subscription.id}:`, error);
      }
    }

    console.log('✅ Background expiry check completed');
  } catch (error) {
    console.error('❌ Error in background expiry check:', error);
  } finally {
    isCheckingExpiry = false;
  }
}

// ============================================================================
// MIDDLEWARE WRAPPER
// ============================================================================

/**
 * Middleware wrapper for API routes that require subscription validation
 */
export function withSubscriptionValidation(
  handler: (request: NextRequest, context: any, validation: SubscriptionValidationResult) => Promise<NextResponse>,
  options: SubscriptionValidationOptions = {}
) {
  return async (request: NextRequest, context: any) => {
    try {
      // Get user from request (assuming it's already authenticated)
      const user = (request as any).user as AuthUser;
      
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'Authentication required' },
          { status: API.STATUS.UNAUTHORIZED }
        );
      }

      // Validate subscription access (includes auto-expiry checking)
      const validation = await validateSubscriptionAccess(user, options);
      
      if (!validation.isValid) {
        return NextResponse.json(
          { 
            success: false, 
            message: validation.error,
            error: 'SUBSCRIPTION_ERROR',
            subscriptionStatus: validation.subscription?.status,
            merchantStatus: validation.merchant?.subscriptionStatus,
            isExpired: validation.isExpired,
            needsStatusUpdate: validation.needsStatusUpdate
          },
          { status: validation.statusCode || API.STATUS.FORBIDDEN }
        );
      }

      // Call the original handler with validation result
      return await handler(request, context, validation);

    } catch (error) {
      console.error('Subscription validation middleware error:', error);
      return NextResponse.json(
        { success: false, message: 'Internal server error' },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

/**
 * Manual expiry check (for admin use)
 */
export async function manualExpiryCheck() {
  try {
    console.log('🔍 Running manual subscription expiry check...');
    
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'paused'] },
        currentPeriodEnd: { lt: new Date() }
      }
    });
    
    const results = {
      totalChecked: expiredSubscriptions.length,
      expiredFound: 0,
      markedAsExpired: 0,
      errors: [] as string[]
    };

    for (const subscription of expiredSubscriptions) {
      try {
        results.expiredFound++;
        
        // Mark as expired
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { 
            status: 'expired',
            updatedAt: new Date()
          }
        });
        
        results.markedAsExpired++;
        console.log(`✅ Marked subscription ${subscription.id} as expired`);
      } catch (error) {
        const errorMsg = `Failed to mark subscription ${subscription.id} as expired: ${error}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log('✅ Manual expiry check completed:', results);
    return results;
  } catch (error) {
    console.error('❌ Manual expiry check failed:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  validateSubscriptionAccess,
  checkSubscriptionExpiry,
  withSubscriptionValidation,
  canPerformOperation,
  getSubscriptionErrorMessage,
  getAllowedOperations,
  manualExpiryCheck,
  DEFAULT_CONFIG
};
