/**
 * Consolidated Subscription Manager
 * 
 * Consolidates all subscription functionality into a single, organized class
 * following DRY principles and consistent naming conventions.
 * 
 * Consolidates:
 * - subscription-utils-consolidated.ts
 * - subscription-utils.ts
 * - subscription-renewal.ts
 * - subscription-validation.ts
 * - subscription-check.ts
 */

import { PlanLimitError, ErrorCode } from './errors';
import { db, prisma } from '@rentalshop/database';
import { API } from '@rentalshop/constants';
import type { AuthUser, Subscription, SubscriptionStatus } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface SubscriptionPeriod {
  startDate: Date;
  endDate: Date;
  duration: string;
  isActive: boolean;
  daysRemaining: number;
  nextBillingDate: Date;
  isTrial?: boolean;
}

export interface SubscriptionRenewalConfig {
  paymentGateway: {
    apiKey: string;
    webhookSecret: string;
  };
  autoRenewEnabled: boolean;
  gracePeriodDays: number;
  retryAttempts: number;
  retryDelayHours: number;
}

export interface SubscriptionRenewalResult {
  subscriptionId: number;
  success: boolean;
  status: string;
  error?: string;
  paymentId?: number;
  nextBillingDate?: Date;
}

export interface RenewalStats {
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: string[];
}

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

export interface RenewalConfig {
  paymentGateway: {
    apiKey: string;
    webhookSecret: string;
  };
  autoRenewEnabled: boolean;
  gracePeriodDays: number;
  retryAttempts: number;
  retryDelayHours: number;
}

export interface RenewalResult {
  subscriptionId: number;
  success: boolean;
  status: string;
  error?: string;
  paymentId?: number;
  nextBillingDate?: Date;
}

// ============================================================================
// SUBSCRIPTION MANAGER CLASS
// ============================================================================

export class SubscriptionManager {
  // ============================================================================
  // CORE SUBSCRIPTION CHECKING
  // ============================================================================

  /**
   * Check if user has valid subscription
   * Note: In multi-tenant system, tenant DBs are already isolated per tenant
   */
  static async checkStatus(user: any): Promise<boolean> {
    try {
      // ADMIN users bypass subscription checks
      if (user?.role === 'ADMIN') {
        return true;
      }

      const subscriptionError = await this.getError(user);
      return subscriptionError === null;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false; // Fail safe - assume subscription is invalid
    }
  }

  /**
   * Check if subscription error should be thrown
   * Note: In multi-tenant system, tenant DBs are already isolated per tenant
   */
  static async shouldThrowError(user: any): Promise<boolean> {
    try {
      // ADMIN users bypass subscription checks
      if (user?.role === 'ADMIN') {
        return false;
      }

      const subscriptionError = await this.getError(user);
      return subscriptionError !== null;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return true; // Fail safe - throw error
    }
  }

  /**
   * Get subscription error if any
   * Note: In multi-tenant system, tenant DBs are already isolated per tenant
   * No need for merchantId - just query active subscription from tenant DB
   */
  static async getError(user: any): Promise<PlanLimitError | null> {
    try {
      // ADMIN users bypass subscription checks
      if (user?.role === 'ADMIN') {
        return null;
      }

      // In multi-tenant system, tenant DBs are isolated
      // Query active subscription directly from tenant DB (no merchantId needed)
      const subscription = await db.subscriptions.findActive();
      
      console.log('🔍 SUBSCRIPTION: Subscription data:', {
        found: !!subscription,
        status: subscription?.status,
        currentPeriodEnd: subscription?.currentPeriodEnd
      });

      if (!subscription) {
        console.log('🔍 SUBSCRIPTION: No active subscription found for tenant');
        return new PlanLimitError('No active subscription found', 'SUBSCRIPTION_NOT_FOUND');
      }

      const status = subscription.status?.toLowerCase();
      const errorStatuses = ['cancelled', 'expired', 'suspended', 'past_due', 'paused'];

      if (errorStatuses.includes(status)) {
        console.log('🔍 SUBSCRIPTION: Subscription status is error status:', status);
        return new PlanLimitError(
          `Your subscription has been ${status}. Please renew to continue using our services.`,
          'SUBSCRIPTION_ACCESS_DENIED'
        );
      }

      // Additional check: Verify subscription is not actually expired by date
      if (subscription.currentPeriodEnd) {
        const currentDate = new Date();
        const endDate = new Date(subscription.currentPeriodEnd);
        
        console.log('🔍 SUBSCRIPTION: Date validation:', {
          currentDate: currentDate.toISOString(),
          endDate: endDate.toISOString(),
          isExpired: currentDate > endDate
        });
        
        if (currentDate > endDate) {
          console.log('🔍 SUBSCRIPTION: Subscription is past end date, treating as expired');
          return new PlanLimitError(
            'Your subscription has expired. Please renew to continue using our services.',
            'SUBSCRIPTION_EXPIRED'
          );
        }
      }

      console.log('🔍 SUBSCRIPTION: Subscription is valid');
      return null;
    } catch (error) {
      console.error('🔍 SUBSCRIPTION: Error checking subscription status:', error);
      return new PlanLimitError('Unable to verify subscription status', 'SUBSCRIPTION_ACCESS_DENIED');
    }
  }

  // ============================================================================
  // ADVANCED VALIDATION
  // ============================================================================

  /**
   * Comprehensive subscription validation with options
   */
  static async validateAccess(
    user: any,
    options: SubscriptionValidationOptions = {}
  ): Promise<SubscriptionValidationResult> {
    const {
      requireActiveSubscription = true,
      allowedStatuses = ['active', 'trial'],
      checkMerchantStatus = true,
      checkSubscriptionStatus = true,
      autoUpdateExpired = false
    } = options;

    try {
      // ADMIN users bypass subscription checks
      if (user?.role === 'ADMIN') {
        return {
          isValid: true,
        };
      }

      // Note: In multi-tenant system, merchant status check is not needed
      // Tenant databases are already isolated per tenant

      // Check active subscription
      if (checkSubscriptionStatus && requireActiveSubscription) {
        const subscriptionError = await this.getError(user);
        
        if (subscriptionError) {
          return {
            isValid: false,
            error: subscriptionError.message,
            statusCode: subscriptionError.statusCode,
            isExpired: subscriptionError.code === ErrorCode.TOKEN_EXPIRED
          };
        }
      }

      return {
        isValid: true,
        subscription: user.subscription,
        merchant: user.merchant
      };
    } catch (error) {
      console.error('Subscription validation error:', error);
      return {
        isValid: false,
        error: 'Unable to validate subscription access',
        statusCode: 500
      };
    }
  }

  /**
   * Check if subscription status allows specific operations
   */
  static canPerformOperation(
    subscriptionStatus: string,
    operation: 'create' | 'read' | 'update' | 'delete' | 'admin'
  ): boolean {
    const status = subscriptionStatus.toLowerCase();
    
    switch (operation) {
      case 'read':
        return ['active', 'trial', 'past_due'].includes(status);
      case 'create':
      case 'update':
        return ['active', 'trial'].includes(status);
      case 'delete':
        return status === 'active';
      case 'admin':
        return status === 'active';
      default:
        return false;
    }
  }

  /**
   * Get subscription error message for UI display
   */
  static getErrorMessage(
    subscriptionStatus: string,
    merchantStatus?: string
  ): string {
    const status = subscriptionStatus.toLowerCase();
    
    if (merchantStatus && merchantStatus !== 'active') {
      return `Merchant account is ${merchantStatus}. Please contact support.`;
    }
    
    const messages: Record<string, string> = {
      'cancelled': 'Your subscription has been cancelled. Please contact support to reactivate your account.',
      'expired': 'Your subscription has expired. Please renew to continue using our services.',
      'suspended': 'Your subscription has been suspended. Please contact support for assistance.',
      'past_due': 'Your subscription payment is past due. Please update your payment method.',
      'paused': 'Your subscription is paused. Please contact support to reactivate your account.'
    };
    
    return messages[status] || 'There is an issue with your subscription. Please contact support.';
  }

  /**
   * Get allowed operations for subscription status
   */
  static getAllowedOperations(subscriptionStatus: string): string[] {
    const operations: string[] = [];
    
    if (this.canPerformOperation(subscriptionStatus, 'read')) {
      operations.push('read');
    }
    
    if (this.canPerformOperation(subscriptionStatus, 'create')) {
      operations.push('create');
    }
    
    if (this.canPerformOperation(subscriptionStatus, 'update')) {
      operations.push('update');
    }
    
    if (this.canPerformOperation(subscriptionStatus, 'delete')) {
      operations.push('delete');
    }
    
    if (this.canPerformOperation(subscriptionStatus, 'admin')) {
      operations.push('admin');
    }
    
    return operations;
  }

  // ============================================================================
  // PERIOD UTILITIES
  // ============================================================================

  /**
   * Calculate subscription period details
   */
  static calculatePeriod(
    startDate: Date,
    endDate: Date,
    status: string,
    interval: string = 'month'
  ): SubscriptionPeriod {
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    return {
      startDate,
      endDate,
      duration: interval,
      isActive: status.toLowerCase() === 'active' || status.toLowerCase() === 'trial',
      daysRemaining,
      nextBillingDate: endDate,
      isTrial: status.toLowerCase() === 'trial'
    };
  }

  /**
   * Format subscription period for display
   */
  static formatPeriod(period: SubscriptionPeriod) {
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    };

    const formatTimeRemaining = (days: number) => {
      if (days <= 0) return 'Expired';
      if (days === 1) return '1 day remaining';
      if (days < 30) return `${days} days remaining`;
      if (days < 365) {
        const months = Math.floor(days / 30);
        return months === 1 ? '1 month remaining' : `${months} months remaining`;
      }
      const years = Math.floor(days / 365);
      return years === 1 ? '1 year remaining' : `${years} years remaining`;
    };

    return {
      period: `${formatDate(period.startDate)} - ${formatDate(period.endDate)}`,
      duration: period.duration,
      timeRemaining: formatTimeRemaining(period.daysRemaining),
      nextBilling: formatDate(period.nextBillingDate),
      isActive: period.isActive,
      isTrial: period.isTrial
    };
  }

  /**
   * Get subscription status badge
   */
  static getStatusBadge(status: string, daysRemaining: number) {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      trial: { color: 'bg-blue-100 text-blue-800', text: 'Trial' },
      expired: { color: 'bg-red-100 text-red-800', text: 'Expired' },
      cancelled: { color: 'bg-gray-100 text-gray-800', text: 'Cancelled' },
      suspended: { color: 'bg-orange-100 text-orange-800', text: 'Suspended' },
      past_due: { color: 'bg-yellow-100 text-yellow-800', text: 'Past Due' },
      paused: { color: 'bg-purple-100 text-purple-800', text: 'Paused' }
    };
    
    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || 
      { color: 'bg-gray-100 text-gray-800', text: status };
    
    return {
      color: config.color,
      text: config.text,
      daysRemaining
    };
  }

  // ============================================================================
  // RENEWAL UTILITIES
  // ============================================================================

  /**
   * Calculate new billing date based on subscription interval
   */
  static calculateNewBillingDate(subscription: any): Date {
    const currentDate = new Date();
    const interval = subscription.interval || 'month';
    const intervalCount = subscription.intervalCount || 1;
    
    const newDate = new Date(currentDate);
    
    switch (interval) {
      case 'day':
        newDate.setDate(newDate.getDate() + intervalCount);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (intervalCount * 7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + intervalCount);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + intervalCount);
        break;
      default:
        newDate.setMonth(newDate.getMonth() + intervalCount);
    }
    
    return newDate;
  }

  /**
   * Check if subscription is expired
   */
  static isExpired(subscription: any): boolean {
    if (!subscription.currentPeriodEnd) return false;
    const now = new Date();
    const endDate = new Date(subscription.currentPeriodEnd);
    return now > endDate;
  }

  /**
   * Check if grace period is exceeded
   */
  static isGracePeriodExceeded(
    subscription: any,
    gracePeriodDays: number = 7
  ): boolean {
    if (!subscription.currentPeriodEnd) return false;
    
    const now = new Date();
    const endDate = new Date(subscription.currentPeriodEnd);
    const gracePeriodEnd = new Date(endDate.getTime() + (gracePeriodDays * 24 * 60 * 60 * 1000));
    
    return now > gracePeriodEnd;
  }

  /**
   * Validate subscription for renewal
   */
  static validateForRenewal(
    subscription: any,
    gracePeriodDays: number = 7
  ): {
    canRenew: boolean;
    reason?: string;
  } {
    if (!subscription) {
      return {
        canRenew: false,
        reason: 'Subscription not found'
      };
    }
    
    if (subscription.status === 'cancelled') {
      return {
        canRenew: false,
        reason: 'Subscription is cancelled'
      };
    }
    
    if (subscription.status === 'active' && !this.isExpired(subscription)) {
      return {
        canRenew: false,
        reason: 'Subscription is still active'
      };
    }
    
    if (this.isGracePeriodExceeded(subscription, gracePeriodDays)) {
      return {
        canRenew: false,
        reason: 'Grace period exceeded'
      };
    }
    
    return {
      canRenew: true
    };
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get subscription status priority (for sorting/display)
   */
  static getStatusPriority(status: string): number {
    const priorities: Record<string, number> = {
      'active': 1,
      'trial': 2,
      'past_due': 3,
      'paused': 4,
      'suspended': 5,
      'expired': 6,
      'cancelled': 7
    };
    
    return priorities[status.toLowerCase()] || 999;
  }

  /**
   * Sort subscriptions by status priority
   */
  static sortByStatus(subscriptions: any[]): any[] {
    return [...subscriptions].sort((a, b) => {
      const priorityA = this.getStatusPriority(a.status);
      const priorityB = this.getStatusPriority(b.status);
      return priorityA - priorityB;
    });
  }

  /**
   * Check if subscription needs attention
   */
  static needsAttention(subscription: any): {
    needsAttention: boolean;
    reason?: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  } {
    if (!subscription) {
      return {
        needsAttention: false,
        urgency: 'low'
      };
    }
    
    const status = subscription.status?.toLowerCase();
    const daysRemaining = subscription.daysRemaining || 0;
    
    // Critical: Expired or cancelled
    if (status === 'expired' || status === 'cancelled') {
      return {
        needsAttention: true,
        reason: `Subscription is ${status}`,
        urgency: 'critical'
      };
    }
    
    // High: Suspended or past due
    if (status === 'suspended' || status === 'past_due') {
      return {
        needsAttention: true,
        reason: `Subscription is ${status}`,
        urgency: 'high'
      };
    }
    
    // Medium: Trial ending soon or paused
    if (status === 'trial' && daysRemaining <= 3) {
      return {
        needsAttention: true,
        reason: 'Trial ending soon',
        urgency: 'medium'
      };
    }
    
    if (status === 'paused') {
      return {
        needsAttention: true,
        reason: 'Subscription is paused',
        urgency: 'medium'
      };
    }
    
    // Low: Active but ending soon
    if (status === 'active' && daysRemaining <= 7) {
      return {
        needsAttention: true,
        reason: 'Subscription ending soon',
        urgency: 'low'
      };
    }
    
    return {
      needsAttention: false,
      urgency: 'low'
    };
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================================================

// Export individual functions for backward compatibility
export const checkSubscriptionStatus = SubscriptionManager.checkStatus;
export const shouldThrowPlanLimitError = SubscriptionManager.shouldThrowError;
export const getPlanLimitError = SubscriptionManager.getError;
export const getSubscriptionError = SubscriptionManager.getError; // Backward compatibility alias
export const validateSubscriptionAccess = SubscriptionManager.validateAccess;
export const canPerformOperation = SubscriptionManager.canPerformOperation;
export const getPlanLimitErrorMessage = SubscriptionManager.getErrorMessage;
export const getAllowedOperations = SubscriptionManager.getAllowedOperations;
export const calculateSubscriptionPeriod = SubscriptionManager.calculatePeriod;
export const formatSubscriptionPeriod = SubscriptionManager.formatPeriod;
export const getSubscriptionStatusBadge = SubscriptionManager.getStatusBadge;
export const calculateNewBillingDate = SubscriptionManager.calculateNewBillingDate;
export const isSubscriptionExpired = SubscriptionManager.isExpired;
export const isGracePeriodExceeded = SubscriptionManager.isGracePeriodExceeded;
export const validateForRenewal = SubscriptionManager.validateForRenewal;
export const getSubscriptionStatusPriority = SubscriptionManager.getStatusPriority;
export const sortSubscriptionsByStatus = SubscriptionManager.sortByStatus;
export const subscriptionNeedsAttention = SubscriptionManager.needsAttention;
