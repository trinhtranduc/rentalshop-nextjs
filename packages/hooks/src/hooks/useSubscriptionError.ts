'use client';

// ============================================================================
// SUBSCRIPTION ERROR HANDLER HOOK
// ============================================================================

import { useState, useCallback } from 'react';
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

  const handleSubscriptionError = useCallback((error: any) => {
    console.error('Subscription error:', error);

    // Check if it's a subscription error
    if (error?.error === 'SUBSCRIPTION_ERROR' || error?.code === 'SUBSCRIPTION_REQUIRED') {
      const subscriptionError: SubscriptionError = {
        message: error.message || 'Subscription error occurred',
        subscriptionStatus: error.subscriptionStatus,
        merchantStatus: error.merchantStatus,
        code: error.code
      };

      setError(subscriptionError);
      showSubscriptionError(subscriptionError);
    } else {
      // Handle other errors normally
      addToast('error', 'Error', error?.message || 'An error occurred');
    }
  }, [addToast]);

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
