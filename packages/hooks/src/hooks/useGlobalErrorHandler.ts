'use client';

import { useEffect, useRef } from 'react';
import { useToasts } from '@rentalshop/ui';
import { useApiError } from './useApiError';
import { useSubscriptionError } from './useSubscriptionError';

// Simple debounce: Track last shown error
let lastErrorCode: string | null = null;
let lastErrorTime = 0;
const DEBOUNCE_MS = 1000;

/**
 * Global Error Handler Hook
 * 
 * Tự động xử lý và hiển thị toast cho tất cả API errors
 * 
 * Flow:
 * 1. parseApiResponse() dispatch 'api-error' event cho ALL errors
 * 2. useGlobalErrorHandler() listen event và auto-translate + auto-toast
 * 3. Components không cần phải check result.success === false nữa
 */
export function useGlobalErrorHandler() {
  const { addToast } = useToasts();
  const { translateError } = useApiError();
  const subscriptionErrorHook = useSubscriptionError();
  
  // Store stable references
  const addToastRef = useRef(addToast);
  const translateErrorRef = useRef(translateError);
  const subscriptionErrorHookRef = useRef(subscriptionErrorHook);
  
  // Update refs when values change
  useEffect(() => {
    addToastRef.current = addToast;
    translateErrorRef.current = translateError;
    subscriptionErrorHookRef.current = subscriptionErrorHook;
  }, [addToast, translateError, subscriptionErrorHook]);

  useEffect(() => {
    const handleApiError = (event: CustomEvent) => {
      const { code, message, error: errorData, fullError } = event.detail;
      const errorCode = code || errorData;
      
      // Debounce: Skip duplicate error trong 1 giây
      const now = Date.now();
      if (errorCode === lastErrorCode && (now - lastErrorTime) < DEBOUNCE_MS) {
        return;
      }
      lastErrorCode = errorCode;
      lastErrorTime = now;
      
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
        subscriptionErrorHookRef.current.handleSubscriptionError(fullError || { code: errorCode, message });
        return;
      }
      
      // Handle other errors
      const translatedMessage = translateErrorRef.current({
        code: errorCode,
        message: message || errorData,
        success: false,
        error: errorData
      });
      
      const toastType = (errorCode === 'VALIDATION_ERROR' || errorCode?.includes('INVALID')) ? 'warning' : 'error';
      addToastRef.current(toastType, 'Error', translatedMessage, 0);
    };
    
    window.addEventListener('api-error', handleApiError as EventListener);
    
    return () => {
      window.removeEventListener('api-error', handleApiError as EventListener);
    };
  }, []); // ✅ Empty deps: Chỉ đăng ký 1 lần, dùng refs để access latest values
}

