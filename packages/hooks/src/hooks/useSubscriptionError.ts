'use client';

// ============================================================================
// SUBSCRIPTION ERROR HANDLER HOOK
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { useToasts } from '@rentalshop/ui';
import { useSubscriptionTranslations, useErrorTranslations } from './useTranslation';

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
  const t = useSubscriptionTranslations();
  const te = useErrorTranslations();

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

    // Get translated error message
    const errorMessage = error.message || error?.response?.data?.message;
    let translatedMessage = errorMessage || t('errors.generic');
    
    // Translate specific error codes
    if (errorCode === 'PLAN_LIMIT_EXCEEDED') {
      translatedMessage = te('PLAN_LIMIT_EXCEEDED');
    } else if (errorCode === 'SUBSCRIPTION_PERIOD_ENDED') {
      translatedMessage = te('SUBSCRIPTION_PERIOD_ENDED');
    } else if (errorCode === 'SUBSCRIPTION_PERIOD_MISSING') {
      translatedMessage = te('SUBSCRIPTION_PERIOD_MISSING');
    } else if (errorCode && typeof errorCode === 'string' && errorCode.includes('SUBSCRIPTION')) {
      // Try to translate any subscription error code
      const translated = te(errorCode);
      if (translated !== errorCode) {
        translatedMessage = translated;
      }
    }
    
    const subscriptionError: SubscriptionError = {
      message: translatedMessage,
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

    // Customize message based on status with translations
    if (subscriptionStatus === 'paused') {
      message = t('errors.paused');
      action = t('errors.pausedAction');
    } else if (subscriptionStatus === 'expired') {
      message = t('errors.expired');
      action = t('errors.expiredAction');
    } else if (subscriptionStatus === 'cancelled') {
      message = t('errors.cancelled');
      action = t('errors.cancelledAction');
    } else if (subscriptionStatus === 'past_due') {
      message = t('errors.pastDue');
      action = t('errors.pastDueAction');
    } else if (merchantStatus && !['active'].includes(merchantStatus)) {
      message = t('errors.merchantAccount', { status: merchantStatus });
      action = t('errors.merchantAccountAction');
    } else if (error.code === 'PLAN_LIMIT_EXCEEDED') {
      message = te('PLAN_LIMIT_EXCEEDED');
    } else if (error.code === 'SUBSCRIPTION_PERIOD_ENDED') {
      message = te('SUBSCRIPTION_PERIOD_ENDED');
      action = t('errors.expiredAction') || 'Choose a new plan to continue using the service.';
    } else if (error.code === 'SUBSCRIPTION_PERIOD_MISSING') {
      message = te('SUBSCRIPTION_PERIOD_MISSING');
      action = t('errors.merchantAccountAction') || 'Contact support to resolve account issues.';
    }

    // Show error toast with action
    const errorTitle = t('errors.title');
    addToast('error', errorTitle, action ? `${message}\n\n${action}` : message, 8000);
  }, [addToast, t, te]);

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
