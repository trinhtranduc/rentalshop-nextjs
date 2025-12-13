'use client';

/**
 * Global Error Handler Hook
 * Tự động xử lý và hiển thị toast cho tất cả API errors
 * 
 * Flow:
 * 1. parseApiResponse() dispatch 'api-error' event cho ALL errors
 * 2. useGlobalErrorHandler() listen event và auto-translate + auto-toast
 * 3. Components không cần phải check result.success === false nữa
 */

import { useEffect } from 'react';
import { useToasts } from '@rentalshop/ui';
import { useApiError } from './useApiError';
import { useSubscriptionError } from './useSubscriptionError';

/**
 * Global Error Handler Hook
 * 
 * Tự động xử lý và hiển thị toast cho tất cả API errors từ parseApiResponse()
 * 
 * Flow:
 * 1. parseApiResponse() dispatch 'api-error' event cho ALL errors
 * 2. useGlobalErrorHandler() listen event và auto-translate + auto-toast
 * 3. Components không cần phải check result.success === false nữa
 * 
 * @example
 * // In root layout or ClientLayout
 * function App() {
 *   useGlobalErrorHandler(); // Auto-handle all errors
 *   return <YourApp />;
 * }
 * 
 * // In components - NO NEED to check errors anymore!
 * async function MyComponent() {
 *   const result = await api.createProduct(data);
 *   // ✅ Error automatically shown via global handler
 *   // ✅ No need to check result.success === false
 *   if (result.success) {
 *     // Handle success
 *   }
 * }
 */

export function useGlobalErrorHandler() {
  const { addToast } = useToasts();
  const { translateError } = useApiError();
  const subscriptionErrorHook = useSubscriptionError();

  useEffect(() => {
    const handleApiError = (event: CustomEvent) => {
      const { code, message, error: errorData, fullError } = event.detail;
      const errorCode = code || errorData;
      
      // Check if subscription error
      const isSubscriptionError = 
        errorCode === 'SUBSCRIPTION_CANCELLED' ||
        errorCode === 'SUBSCRIPTION_EXPIRED' ||
        errorCode === 'SUBSCRIPTION_PAUSED' ||
        errorCode === 'SUBSCRIPTION_PAST_DUE' ||
        errorCode === 'TRIAL_EXPIRED' ||
        errorCode === 'PLAN_LIMIT_EXCEEDED' ||
        (errorCode && typeof errorCode === 'string' && errorCode.includes('SUBSCRIPTION'));
      
      if (isSubscriptionError) {
        subscriptionErrorHook.handleSubscriptionError(fullError || { code: errorCode, message });
        return;
      }
      
      // Handle other errors
      const translatedMessage = translateError({
        code: errorCode,
        message: message || errorData,
        success: false,
        error: errorData
      });
      
      const toastType = (errorCode === 'VALIDATION_ERROR' || errorCode?.includes('INVALID')) ? 'warning' : 'error';
      addToast(toastType, 'Error', translatedMessage, 0);
    };
    
    // Listen for ALL API errors (not just subscription)
    window.addEventListener('api-error', handleApiError as EventListener);
    
    return () => {
      window.removeEventListener('api-error', handleApiError as EventListener);
    };
  }, [addToast, translateError, subscriptionErrorHook]);
}

