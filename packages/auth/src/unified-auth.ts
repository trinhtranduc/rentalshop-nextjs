// ============================================================================
// UNIFIED AUTH WRAPPER - STANDARDIZED PATTERN
// ============================================================================
// This replaces all the scattered auth middleware with one consistent pattern
// Goal: Replace 14+ auth wrappers with 1 unified approach

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getUserScope, hasAnyRole } from './core';
import { db } from '@rentalshop/database';
import { SUBSCRIPTION_STATUS, USER_ROLE, type UserRole } from '@rentalshop/constants';

// ============================================================================
// TYPES
// ============================================================================

// Re-export UserRole from constants for convenience
export type { UserRole } from '@rentalshop/constants';

export interface AuthContext {
  user: any;
  userScope: any;
}

export interface AuthOptions {
  /** Allowed roles for this route */
  roles?: UserRole[];
  /** Require active subscription (default: true for non-ADMIN users) */
  requireActiveSubscription?: boolean;
}

export type AuthenticatedHandler = (
  request: NextRequest,
  context: AuthContext
) => Promise<NextResponse>;

// Higher-order function type
export type AuthWrapper = (handler: AuthenticatedHandler) => (request: NextRequest) => Promise<NextResponse>;

// ============================================================================
// SUBSCRIPTION CHECK HELPER
// ============================================================================

/**
 * Check if merchant has active subscription
 * ADMIN users bypass this check
 */
async function checkSubscriptionStatus(user: any): Promise<{ success: boolean; response?: NextResponse }> {
  // ADMIN users bypass subscription checks
  if (user.role === 'ADMIN') {
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

  // Block if subscription is PAUSED
  if (subscriptionStatus === SUBSCRIPTION_STATUS.PAUSED) {
    return {
      success: false,
      response: NextResponse.json(
        { 
          success: false, 
          message: 'Your subscription is paused. Please contact support to reactivate.',
          code: 'SUBSCRIPTION_PAUSED',
          details: {
            status: subscriptionStatus,
            merchantId: merchant.id,
            merchantName: merchant.name
          }
        },
        { status: 403 }
      )
    };
  }

  // Block if subscription is CANCELLED
  if (subscriptionStatus === SUBSCRIPTION_STATUS.CANCELLED) {
    return {
      success: false,
      response: NextResponse.json(
        { 
          success: false, 
          message: 'Your subscription has been cancelled. Please contact support to reactivate.',
          code: 'SUBSCRIPTION_CANCELLED',
          details: {
            status: subscriptionStatus,
            merchantId: merchant.id,
            merchantName: merchant.name,
            canceledAt: subscription.canceledAt
          }
        },
        { status: 403 }
      )
    };
  }

  // Block if subscription is EXPIRED
  if (subscriptionStatus === SUBSCRIPTION_STATUS.EXPIRED) {
    return {
      success: false,
      response: NextResponse.json(
        { 
          success: false, 
          message: 'Your subscription has expired. Please renew to continue using the service.',
          code: 'SUBSCRIPTION_EXPIRED',
          details: {
            status: subscriptionStatus,
            expiredAt: subscription.currentPeriodEnd,
            merchantId: merchant.id,
            merchantName: merchant.name
          }
        },
        { status: 403 }
      )
    };
  }

  // Block if subscription is PAST_DUE
  if (subscriptionStatus === SUBSCRIPTION_STATUS.PAST_DUE) {
    return {
      success: false,
      response: NextResponse.json(
        { 
          success: false, 
          message: 'Your subscription payment is past due. Please update your payment method.',
          code: 'SUBSCRIPTION_PAST_DUE',
          details: {
            status: subscriptionStatus,
            merchantId: merchant.id,
            merchantName: merchant.name
          }
        },
        { status: 403 }
      )
    };
  }

  // Check if period has ended for active subscriptions
  if (subscriptionStatus === SUBSCRIPTION_STATUS.ACTIVE && subscription.currentPeriodEnd) {
    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);
    
    if (periodEnd < now) {
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
  }

  // Check trial expiration
  if (subscriptionStatus === SUBSCRIPTION_STATUS.TRIAL && subscription.trialEnd) {
    const now = new Date();
    const trialEnd = new Date(subscription.trialEnd);
    
    if (trialEnd < now) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            success: false, 
            message: 'Your trial period has ended. Please upgrade to a paid plan to continue.',
            code: 'TRIAL_EXPIRED',
            details: {
              trialEndedAt: subscription.trialEnd,
              merchantId: merchant.id,
              merchantName: merchant.name
            }
          },
          { status: 403 }
        )
      };
    }
  }

  // Subscription is active (TRIAL or ACTIVE with valid period)
  return { success: true };
}

// ============================================================================
// UNIFIED AUTH WRAPPER
// ============================================================================

/**
 * Unified authentication wrapper for all API routes
 * Replaces withUserManagementAuth, withOrderViewAuth, withProductManagementAuth, etc.
 * 
 * Usage:
 * // With role check and subscription check (default)
 * export const POST = withAuthRoles(['ADMIN', 'MERCHANT'])(async (req, { user }) => {
 *   // Your route logic here
 * });
 * 
 * // Without subscription check (for read-only operations)
 * export const GET = withAuthRoles(['ADMIN', 'MERCHANT'], { requireActiveSubscription: false })(async (req, { user }) => {
 *   // Read-only operation
 * });
 * 
 * // Any authenticated user
 * export const GET = withAuthRoles()(async (req, { user }) => {
 *   // Any authenticated user can access
 * });
 */
export function withAuthRoles(allowedRoles?: UserRole[], options?: { requireActiveSubscription?: boolean }): AuthWrapper {
  const requireSubscription = options?.requireActiveSubscription !== false; // Default to true
  return function (handler: AuthenticatedHandler) {
    return async function (request: NextRequest): Promise<NextResponse> {
      console.log(`🔐 Auth check for ${request.method} ${request.url}`);
      
      try {
        // Step 1: Authenticate request
        const authResult = await authenticateRequest(request);
        if (!authResult.success) {
          console.log('❌ Authentication failed');
          return authResult.response;
        }

        const user = authResult.user;
        console.log(`✅ User authenticated: ${user.email} (${user.role})`);

        // Step 2: Check role permissions if specified
        if (allowedRoles && allowedRoles.length > 0) {
          if (!hasAnyRole(user, allowedRoles)) {
            console.log(`❌ Insufficient permissions: ${user.role} not in [${allowedRoles.join(', ')}]`);
            return NextResponse.json(
              { 
                success: false,
                code: 'INSUFFICIENT_PERMISSIONS',
                message: 'Insufficient permissions',
                required: allowedRoles,
                current: user.role
              }, 
              { status: 403 }
            );
          }
          console.log(`✅ Role authorized: ${user.role}`);
        }

        // Step 3: Check subscription status if required
        if (requireSubscription) {
          console.log('🔍 Checking subscription status...');
          const subscriptionCheck = await checkSubscriptionStatus(user);
          if (!subscriptionCheck.success && subscriptionCheck.response) {
            console.log('❌ Subscription check failed');
            return subscriptionCheck.response;
          }
          console.log('✅ Subscription is active');
        }

        // Step 4: Get user scope for context
        const userScope = getUserScope(user);

        // Step 5: Call the handler with authenticated context
        const context: AuthContext = { user, userScope };
        return await handler(request, context);

      } catch (error) {
        console.error('🚨 Auth wrapper error:', error);
        return NextResponse.json(
          { error: 'Authentication error' },
          { status: 500 }
        );
      }
    };
  };
}

// ============================================================================
// CONVENIENCE EXPORTS (for common patterns)
// ============================================================================

/**
 * Admin-only routes (System-wide access)
 */
export const withAdminAuth = withAuthRoles(['ADMIN']);

/**
 * Admin and Merchant routes (Organization-level access)
 */
export const withMerchantAuth = withAuthRoles(['ADMIN', 'MERCHANT']);

/**
 * All management roles (Admin, Merchant, Outlet Admin - excluding Outlet Staff)
 */
export const withManagementAuth = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);

/**
 * Outlet-level access (Outlet Admin + Outlet Staff)
 */
export const withOutletAuth = withAuthRoles(['OUTLET_ADMIN', 'OUTLET_STAFF']);

/**
 * Any authenticated user (No role restrictions)
 */
export const withAnyAuth = withAuthRoles();

/**
 * Read-only access (No subscription required)
 */
export const withReadOnlyAuth = withAuthRoles(undefined, { requireActiveSubscription: false });

/**
 * Admin + Read-only for non-admin users
 */
export const withAdminOrReadOnlyAuth = withAuthRoles(['ADMIN'], { requireActiveSubscription: false });

// ============================================================================
// MAIN EXPORT - Use this in API routes
// ============================================================================

/**
 * Main unified auth function - replaces all other auth wrappers
 * Use this instead of withUserManagementAuth, withOrderViewAuth, etc.
 */
export const withAuth = withAuthRoles;

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Temporary aliases for backward compatibility during migration
 * TODO: Remove these after all routes are migrated
 */
export const withUserManagementAuth = withManagementAuth;
export const withProductManagementAuth = withManagementAuth;
export const withOrderManagementAuth = withManagementAuth;
export const withOrderViewAuth = withAnyAuth;
export const withOrderCreateAuth = withManagementAuth;
export const withProductExportAuth = withManagementAuth;
export const withCustomerManagementAuth = withManagementAuth;