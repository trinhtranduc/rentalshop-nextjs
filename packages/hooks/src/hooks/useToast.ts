'use client';

import { useState, useCallback } from 'react';
import { 
  handleApiErrorForUI, 
  withErrorHandlingForUI,
  type ErrorInfo 
} from '@rentalshop/utils';
import { useToasts } from '@rentalshop/ui';
import { useApiError } from './useApiError';
import { useCommonTranslations } from './useTranslation';

/**
 * Toast Management Hooks
 * 
 * This file contains hooks for managing toast notifications and error handling:
 * - useErrorHandler: Full-featured error handling with retry and login functionality
 * - useSimpleErrorHandler: Basic error handling with toast notifications
 * - useToastHandler: General toast functionality for both errors and success messages
 */

export interface UseErrorHandlerOptions {
  onLogin?: () => void;
  onRetry?: () => void;
  onDismiss?: () => void;
  autoHandleAuth?: boolean;
}

export interface UseErrorHandlerReturn {
  isLoading: boolean;
  handleError: (error: any) => ErrorInfo;
  handleApiCall: <T>(apiCall: () => Promise<T>) => Promise<{ data?: T; error?: ErrorInfo }>;
  retry: () => void;
  login: () => void;
  showErrorToast: (error: any) => void;
}

/**
 * Hook for handling errors with toast notifications and user actions
 * 
 * Features:
 * - Automatic error analysis and categorization
 * - Toast notifications for all error types
 * - Built-in retry and login functionality
 * - Loading state management
 * - Easy integration with API calls
 */
export const useErrorHandler = (options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn => {
  const {
    onLogin,
    onRetry,
    onDismiss,
    autoHandleAuth = true
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToasts();
  const { translateError } = useApiError();

  const handleError = useCallback((error: any): ErrorInfo => {
    // ✅ SIMPLE: Return basic error info
    const errorCode = error?.code || error?.response?.data?.code;
    return {
      type: 'unknown',
      message: errorCode || 'UNKNOWN_ERROR',
      title: 'Error',
      showLoginButton: false,
      originalError: error
    };
  }, []);

  const showErrorToast = useCallback((error: any) => {
    // ✅ SIMPLE: Translate error code và show toast
    const translatedMessage = translateError(error);
    const errorCode = error?.code || error?.response?.data?.code;
    
    let toastType: 'error' | 'warning' = 'error';
    if (errorCode === 'PLAN_LIMIT_EXCEEDED' || errorCode?.includes('SUBSCRIPTION')) {
      toastType = 'warning';
    }
    
    addToast(toastType, 'Lỗi', translatedMessage, 0);
  }, [addToast, translateError]);

  const handleApiCall = useCallback(async <T>(apiCall: () => Promise<T>) => {
    setIsLoading(true);
    
    try {
      const result = await withErrorHandlingForUI(apiCall);
      
      if (result.error) {
        showErrorToast(result.error);
      }
      
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [showErrorToast]);

  const retry = useCallback(() => {
    if (onRetry) {
      onRetry();
    }
  }, [onRetry]);

  const login = useCallback(() => {
    if (onLogin) {
      onLogin();
    } else if (typeof window !== 'undefined') {
      // Default login behavior - redirect to login page
    //   window.location.href = '/login';
    }
  }, [onLogin]);

  return {
    isLoading,
    handleError,
    handleApiCall,
    retry,
    login,
    showErrorToast
  };
};

/**
 * Simplified hook for basic error handling with toasts
 */
export const useSimpleErrorHandler = () => {
  const { addToast } = useToasts();
  const { translateError } = useApiError();

  const handleError = useCallback((error: any) => {
    // ✅ SIMPLE: Translate error code và show toast
    const translatedMessage = translateError(error);
    const errorCode = error?.code || error?.response?.data?.code;
    
    let toastType: 'error' | 'warning' = 'error';
    if (errorCode === 'PLAN_LIMIT_EXCEEDED' || errorCode?.includes('SUBSCRIPTION')) {
      toastType = 'warning';
    }
    
    addToast(toastType, 'Lỗi', translatedMessage, 0);
    return {
      type: toastType,
      message: translatedMessage,
      code: errorCode,
    };
  }, [addToast, translateError]);

  return {
    handleError
  };
};

/**
 * Toast handler hook - SIMPLE & CLEAN
 * Recommended way to handle toasts in components
 * 
 * Flow: error -> translateError(code) -> showToast(translated message)
 */
export const useToastHandler = () => {
  const { addToast } = useToasts();
  const { translateError } = useApiError();
  const t = useCommonTranslations();

  const showError = useCallback((title: string, message?: string) => {
    addToast('error', title, message, 0);
  }, [addToast]);

  const showSuccess = useCallback((title: string, message?: string) => {
    addToast('success', title, message, 5000);
  }, [addToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    addToast('warning', title, message, 5000);
  }, [addToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    addToast('info', title, message, 5000);
  }, [addToast]);

  /**
   * Handle error và show toast với translated message
   * SIMPLE: error -> translateError(code) -> showToast
   */
  const handleError = useCallback((error: any) => {
    console.log('🔍 useToastHandler.handleError called with:', {
      type: typeof error,
      isError: error instanceof Error,
      hasCode: !!error?.code,
      code: error?.code,
      hasMessage: !!error?.message,
      message: error?.message,
      hasSuccess: error?.success !== undefined,
      success: error?.success,
      fullError: error
    });

    // ✅ SIMPLE: Chỉ cần translate error code và show toast
    const translatedMessage = translateError(error);
    console.log('🔍 useToastHandler.handleError: Translated message:', translatedMessage);
    
    // Determine toast type from error code
    const errorCode = error?.code || error?.response?.data?.code;
    let toastType: 'error' | 'warning' = 'error';
    let title = t('labels.error');
    
    console.log('🔍 useToastHandler.handleError: Showing toast:', { type: toastType, title, message: translatedMessage, code: errorCode });
    addToast(toastType, title, translatedMessage, 0);
    
    return {
      type: toastType,
      message: translatedMessage,
      code: errorCode,
    };
  }, [addToast, translateError, t]);

  return {
    showError,
    showSuccess,
    showWarning,
    showInfo,
    handleError
  };
};
