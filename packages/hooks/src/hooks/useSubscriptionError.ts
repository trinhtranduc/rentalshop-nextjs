'use client';

// ============================================================================
// SUBSCRIPTION ERROR HANDLER HOOK
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { useToasts } from '@rentalshop/ui';

export interface SubscriptionError {
  message: string;
  subscriptionStatus?: string;
  merchantStatus?: string;
  code?: string;
}

export interface UseSubscriptionErrorReturn {
  handleSubscriptionError: (error: any) => void;
  showSubscriptionError: (error: SubscriptionError) => void;
  clearError: () => void;
  error: SubscriptionError | null;
}

/**
 * Hook for handling subscription-related errors
 * Provides centralized error handling and user feedback
 */
export function useSubscriptionError(): UseSubscriptionErrorReturn {
  const [error, setError] = useState<SubscriptionError | null>(null);
  const { addToast } = useToasts();

  // ✅ NOTE: Subscription errors are now handled by useGlobalErrorHandler()
  // This hook is still available for manual subscription error handling if needed

  const handleSubscriptionError = useCallback((error: any) => {
    const errorCode = error?.code || error?.response?.data?.code || error?.error?.code;
    
    // Extract subscription status
    const statusMap: Record<string, string> = {
      'SUBSCRIPTION_CANCELLED': 'cancelled',
      'SUBSCRIPTION_EXPIRED': 'expired',
      'SUBSCRIPTION_PAUSED': 'paused',
      'SUBSCRIPTION_PAST_DUE': 'past_due',
      'TRIAL_EXPIRED': 'expired'
    };
    
    const subscriptionStatus = statusMap[errorCode as string] || error?.subscriptionStatus || error?.details?.status;

    const subscriptionError: SubscriptionError = {
      message: error.message || error?.response?.data?.message || 'Subscription error occurred',
      subscriptionStatus,
      merchantStatus: error.merchantStatus || error?.details?.merchantStatus,
      code: errorCode
    };

    setError(subscriptionError);
    showSubscriptionError(subscriptionError);
  }, []);

  const showSubscriptionError = useCallback((error: SubscriptionError) => {
    const { subscriptionStatus, merchantStatus } = error;

    let message = error.message;
    let action = '';

    // Customize message based on status
    if (subscriptionStatus === 'paused') {
      message = 'Your subscription is paused. Some features may be limited.';
      action = 'Resume your subscription to access all features.';
    } else if (subscriptionStatus === 'expired') {
      message = 'Your subscription has expired. Please renew to continue.';
      action = 'Choose a new plan to continue using the service.';
    } else if (subscriptionStatus === 'cancelled') {
      message = 'Your subscription has been cancelled.';
      action = 'Choose a new plan to reactivate your account.';
    } else if (subscriptionStatus === 'past_due') {
      message = 'Payment is past due. Please update your payment method.';
      action = 'Update your payment information to avoid service interruption.';
    } else if (merchantStatus && !['active'].includes(merchantStatus)) {
      message = `Your merchant account is ${merchantStatus}. Please contact support.`;
      action = 'Contact support to resolve account issues.';
    }

    // Show error toast with action
    addToast('error', 'Subscription Error', action ? `${message}\n\n${action}` : message, 8000);
  }, [addToast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    handleSubscriptionError,
    showSubscriptionError,
    clearError,
    error
  };
}

export default useSubscriptionError;
