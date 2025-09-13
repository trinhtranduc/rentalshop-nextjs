'use client';

import { useState, useCallback } from 'react';
import { 
  analyzeError, 
  handleApiErrorForUI, 
  withErrorHandlingForUI,
  getToastType,
  type ErrorInfo 
} from '@rentalshop/utils';
import { useToasts } from '@rentalshop/ui';

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

  const handleError = useCallback((error: any): ErrorInfo => {
    const errorInfo = analyzeError(error);
    return errorInfo;
  }, []);

  const showErrorToast = useCallback((error: any) => {
    const errorInfo = analyzeError(error);
    const toastType = getToastType(errorInfo.type);
    
    // Create toast message with specific action guidance
    let toastMessage = errorInfo.message;
    
    if (errorInfo.showLoginButton) {
      if (errorInfo.type === 'auth') {
        toastMessage += ' Click to log in again.';
      } else if (errorInfo.type === 'permission') {
        toastMessage += ' Click to log in with a different account.';
      } else if (errorInfo.type === 'subscription') {
        toastMessage += ' Click to log in and upgrade your plan.';
      } else {
        toastMessage += ' Click to log in.';
      }
    }
    
    addToast(toastType, errorInfo.title, toastMessage, 0); // No auto-hide for errors
  }, [addToast]);

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

  const handleError = useCallback((error: any) => {
    const errorInfo = analyzeError(error);
    const toastType = getToastType(errorInfo.type);
    
    let toastMessage = errorInfo.message;
    if (errorInfo.showLoginButton) {
      if (errorInfo.type === 'auth') {
        toastMessage += ' Click to log in again.';
      } else if (errorInfo.type === 'permission') {
        toastMessage += ' Click to log in with a different account.';
      } else if (errorInfo.type === 'subscription') {
        toastMessage += ' Click to log in and upgrade your plan.';
      } else {
        toastMessage += ' Click to log in.';
      }
    }
    
    addToast(toastType, errorInfo.title, toastMessage, 0);
    return errorInfo;
  }, [addToast]);

  return {
    handleError
  };
};

/**
 * Toast handler hook that provides both error and success toast functionality
 * This is the recommended way to handle toasts in components
 */
export const useToastHandler = () => {
  const { addToast } = useToasts();

  const showError = useCallback((title: string, message?: string) => {
    addToast('error', title, message, 0); // No auto-hide for errors
  }, [addToast]);

  const showSuccess = useCallback((title: string, message?: string) => {
    addToast('success', title, message, 5000); // 5 second auto-hide for success
  }, [addToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    addToast('warning', title, message, 5000);
  }, [addToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    addToast('info', title, message, 5000);
  }, [addToast]);

  const handleError = useCallback((error: any) => {
    const errorInfo = analyzeError(error);
    const toastType = getToastType(errorInfo.type);
    
    let toastMessage = errorInfo.message;
    if (errorInfo.showLoginButton) {
      if (errorInfo.type === 'auth') {
        toastMessage += ' Click to log in again.';
      } else if (errorInfo.type === 'permission') {
        toastMessage += ' Click to log in with a different account.';
      } else if (errorInfo.type === 'subscription') {
        toastMessage += ' Click to log in and upgrade your plan.';
      } else {
        toastMessage += ' Click to log in.';
      }
    }
    
    addToast(toastType, errorInfo.title, toastMessage, 0);
    return errorInfo;
  }, [addToast]);

  return {
    showError,
    showSuccess,
    showWarning,
    showInfo,
    handleError
  };
};
