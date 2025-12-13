'use client';

import { useCallback } from 'react';
import { useToasts } from '@rentalshop/ui';

/**
 * Toast Management Hooks
 * 
 * This file contains hooks for managing toast notifications:
 * - useToastHandler: Manual UI toasts (success/warning/info/error)
 * 
 * NOTE: API error handling is done automatically by useGlobalErrorHandler.
 * Components should NOT manually handle API errors - they are auto-displayed.
 */


/**
 * Toast handler hook - For manual UI toasts only
 * 
 * NOTE: API errors are automatically handled by useGlobalErrorHandler.
 * This hook is only for manual success/warning/info/error toasts in UI.
 * 
 * @example
 * const { showSuccess, showWarning } = useToastHandler();
 * 
 * // For success toasts
 * if (result.success) {
 *   showSuccess('Success', 'Operation completed');
 * }
 * 
 * // For manual UI warnings
 * showWarning('Warning', 'Please check your input');
 */
export const useToastHandler = () => {
  const { addToast } = useToasts();

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

  return {
    showError,
    showSuccess,
    showWarning,
    showInfo
  };
};
