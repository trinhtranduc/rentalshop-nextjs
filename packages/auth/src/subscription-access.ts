// ============================================================================
// SUBSCRIPTION ACCESS CONTROL
// ============================================================================

import { AuthUser } from './types';
import { getSubscriptionByMerchantId } from '@rentalshop/database';

export type SubscriptionAccessLevel = 'full' | 'readonly' | 'limited' | 'denied';

export interface SubscriptionAccessResult {
  hasAccess: boolean;
  accessLevel: SubscriptionAccessLevel;
  reason?: string;
  gracePeriodEnds?: Date;
  canExportData?: boolean;
  requiresPayment?: boolean;
  upgradeRequired?: boolean;
}

export interface SubscriptionRestrictions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canView: boolean;
  canExport: boolean;
  canManageUsers: boolean;
  canManageOutlets: boolean;
  canManageProducts: boolean;
  canProcessOrders: boolean;
  maxOutlets?: number;
  maxUsers?: number;
  maxProducts?: number;
  maxOrders?: number;
}

// ============================================================================
// SUBSCRIPTION STATUS DEFINITIONS
// ============================================================================

import { SUBSCRIPTION_STATUS, type SubscriptionStatus } from '@rentalshop/constants';

// Re-export only the constant, not the type
export { SUBSCRIPTION_STATUS };

// ============================================================================
// ACCESS CONTROL FUNCTIONS
// ============================================================================

/**
 * Check subscription access for a merchant
 */
export async function checkSubscriptionAccess(
  user: AuthUser,
  feature?: string
): Promise<SubscriptionAccessResult> {
  // Admin users always have full access
  if (user.role === 'ADMIN') {
    return {
      hasAccess: true,
      accessLevel: 'full'
    };
  }

  // Users without merchant access have no access
  if (!user.merchant?.id) {
    return {
      hasAccess: false,
      accessLevel: 'denied',
      reason: 'No merchant access'
    };
  }

  try {
    // Get merchant's subscription
    const subscription = await getSubscriptionByMerchantId(user.merchant?.id || 0);
    
    if (!subscription) {
      return {
        hasAccess: false,
        accessLevel: 'denied',
        reason: 'No active subscription found'
      };
    }

    const now = new Date();
    const status = subscription.status as SubscriptionStatus;

    // Check subscription status and determine access level
    switch (status) {
      case SUBSCRIPTION_STATUS.ACTIVE:
        return {
          hasAccess: true,
          accessLevel: 'full'
        };

      case SUBSCRIPTION_STATUS.TRIAL:
        // Check if trial has expired
        if (subscription.trialEnd && new Date(subscription.trialEnd) < now) {
          return {
            hasAccess: false,
            accessLevel: 'denied',
            reason: 'Trial period has expired',
            upgradeRequired: true
          };
        }
        return {
          hasAccess: true,
          accessLevel: 'full'
        };

      case SUBSCRIPTION_STATUS.PAST_DUE:
        // Limited access with payment required
        return {
          hasAccess: true,
          accessLevel: 'limited',
          reason: 'Payment is past due',
          requiresPayment: true,
          gracePeriodEnds: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : undefined
        };

      case SUBSCRIPTION_STATUS.CANCELLED:
        // Check if cancellation is at period end
        if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd) {
          const periodEnd = new Date(subscription.currentPeriodEnd);
          if (periodEnd > now) {
            // Grace period - limited access
            return {
              hasAccess: true,
              accessLevel: 'limited',
              reason: 'Subscription cancelled - access until period end',
              gracePeriodEnds: periodEnd,
              canExportData: true
            };
          }
        }
        // No grace period or period has ended
        return {
          hasAccess: false,
          accessLevel: 'denied',
          reason: 'Subscription has been cancelled',
          canExportData: true
        };

      case SUBSCRIPTION_STATUS.PAUSED:
        // Read-only access
        return {
          hasAccess: true,
          accessLevel: 'readonly',
          reason: 'Subscription is paused',
          canExportData: true
        };

      case SUBSCRIPTION_STATUS.DISABLED:
      case SUBSCRIPTION_STATUS.DELETED:
        // No access
        return {
          hasAccess: false,
          accessLevel: 'denied',
          reason: 'Subscription has been disabled',
          canExportData: true
        };

      default:
        return {
          hasAccess: false,
          accessLevel: 'denied',
          reason: 'Unknown subscription status'
        };
    }
  } catch (error) {
    console.error('Error checking subscription access:', error);
    return {
      hasAccess: false,
      accessLevel: 'denied',
      reason: 'Error checking subscription status'
    };
  }
}

/**
 * Get feature restrictions based on subscription access level
 */
export function getSubscriptionRestrictions(
  accessResult: SubscriptionAccessResult,
  planLimits?: {
    maxOutlets?: number;
    maxUsers?: number;
    maxProducts?: number;
    maxOrders?: number;
  }
): SubscriptionRestrictions {
  const { accessLevel } = accessResult;

  switch (accessLevel) {
    case 'full':
      return {
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canView: true,
        canExport: true,
        canManageUsers: true,
        canManageOutlets: true,
        canManageProducts: true,
        canProcessOrders: true,
        ...planLimits
      };

    case 'readonly':
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canView: true,
        canExport: accessResult.canExportData || false,
        canManageUsers: false,
        canManageOutlets: false,
        canManageProducts: false,
        canProcessOrders: false
      };

    case 'limited':
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canView: true,
        canExport: accessResult.canExportData || false,
        canManageUsers: false,
        canManageOutlets: false,
        canManageProducts: false,
        canProcessOrders: false
      };

    case 'denied':
    default:
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canView: false,
        canExport: accessResult.canExportData || false,
        canManageUsers: false,
        canManageOutlets: false,
        canManageProducts: false,
        canProcessOrders: false
      };
  }
}

/**
 * Check if user can perform a specific action
 */
export async function canPerformAction(
  user: AuthUser,
  action: keyof SubscriptionRestrictions
): Promise<boolean> {
  const accessResult = await checkSubscriptionAccess(user);
  const restrictions = getSubscriptionRestrictions(accessResult);
  
  return Boolean(restrictions[action]);
}

/**
 * Get subscription status message for UI display
 */
export function getSubscriptionStatusMessage(accessResult: SubscriptionAccessResult): string {
  const { accessLevel, reason, gracePeriodEnds, requiresPayment, upgradeRequired } = accessResult;

  if (upgradeRequired) {
    return 'Your trial has expired. Please upgrade to continue using the service.';
  }

  if (requiresPayment) {
    return 'Payment is required to continue using the service.';
  }

  if (gracePeriodEnds) {
    const daysLeft = Math.ceil((gracePeriodEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return `${reason} Access will end in ${daysLeft} days.`;
  }

  switch (accessLevel) {
    case 'readonly':
      return 'Your subscription is paused. You have read-only access.';
    case 'limited':
      return reason || 'Your access is limited.';
    case 'denied':
      return reason || 'Access denied due to subscription status.';
    default:
      return '';
  }
}

/**
 * Get subscription status color for UI display
 */
export function getSubscriptionStatusColor(accessResult: SubscriptionAccessResult): string {
  const { accessLevel, requiresPayment, upgradeRequired } = accessResult;

  if (upgradeRequired || accessLevel === 'denied') {
    return 'red';
  }

  if (requiresPayment || accessLevel === 'limited') {
    return 'orange';
  }

  if (accessLevel === 'readonly') {
    return 'yellow';
  }

  return 'green';
}

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Middleware to check subscription access before API operations
 */
export async function requireSubscriptionAccess(
  user: AuthUser,
  action: keyof SubscriptionRestrictions = 'canView'
): Promise<void> {
  const canPerform = await canPerformAction(user, action);
  
  if (!canPerform) {
    const accessResult = await checkSubscriptionAccess(user);
    const message = getSubscriptionStatusMessage(accessResult);
    
    throw new Error(`Access denied: ${message}`);
  }
}

/**
 * Middleware to check if user has any access at all
 */
export async function requireAnyAccess(user: AuthUser): Promise<void> {
  const accessResult = await checkSubscriptionAccess(user);
  
  if (!accessResult.hasAccess) {
    const message = getSubscriptionStatusMessage(accessResult);
    throw new Error(`Access denied: ${message}`);
  }
}
