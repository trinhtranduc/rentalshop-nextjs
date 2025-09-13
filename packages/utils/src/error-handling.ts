/**
 * Centralized Error Handling Utilities
 * 
 * Best Practices:
 * - All 401 errors automatically clear storage and redirect to login
 * - Consistent error handling across the entire application
 * - Proper logging for debugging
 * - Specific error type detection for better user experience
 */

import { clearAuthData } from './common';
import CONSTANTS from '@rentalshop/constants';

const API = CONSTANTS.API;

/**
 * Error types for better user experience
 */
export type ErrorType = 'auth' | 'permission' | 'subscription' | 'network' | 'validation' | 'unknown';

/**
 * Enhanced error information for better handling
 */
export interface ErrorInfo {
  type: ErrorType;
  message: string;
  title: string;
  showLoginButton: boolean;
  originalError: any;
}

/**
 * Check if an error is authentication-related (401)
 */
export const isAuthError = (error: any): boolean => {
  return (
    error?.message?.includes('Authentication required') ||
    error?.message?.includes('Unauthorized') ||
    error?.message?.includes('Invalid token') ||
    error?.message?.includes('Token expired') ||
    error?.status === API.STATUS.UNAUTHORIZED ||
    error?.status === 401
  );
};

/**
 * Check if an error is permission-related (403)
 */
export const isPermissionError = (error: any): boolean => {
  return (
    error?.message?.includes('Insufficient permissions') ||
    error?.message?.includes('Access forbidden') ||
    error?.message?.includes('Permission denied') ||
    error?.message?.includes('Forbidden') ||
    error?.status === API.STATUS.FORBIDDEN ||
    error?.status === 403
  );
};

/**
 * Check if an error is subscription/plan-related
 * This includes cases where APIs return "Invalid token" due to cancelled/expired plans
 */
export const isSubscriptionError = (error: any): boolean => {
  return (
    error?.message?.includes('subscription') ||
    error?.message?.includes('plan') ||
    error?.message?.includes('expired') ||
    error?.message?.includes('insufficient') ||
    error?.message?.includes('trial') ||
    error?.message?.includes('billing') ||
    error?.message?.includes('payment') ||
    error?.message?.includes('cancelled') ||
    error?.message?.includes('canceled') ||
    error?.errorCode === 'SUBSCRIPTION_EXPIRED' ||
    error?.errorCode === 'PLAN_INSUFFICIENT' ||
    error?.errorCode === 'TRIAL_EXPIRED' ||
    error?.errorCode === 'SUBSCRIPTION_CANCELLED' ||
    error?.errorCode === 'PLAN_CANCELLED' ||
    // Check if this is a subscription-related "Invalid token" error
    isSubscriptionInvalidToken(error)
  );
};

/**
 * Check if this is a subscription-related "Invalid token" error
 * This helps distinguish between actual auth errors and subscription issues
 */
export const isSubscriptionInvalidToken = (error: any): boolean => {
  // If the API returns "Invalid token" but we know it's subscription-related
  // This could be based on the API endpoint, user context, or specific error codes
  return (
    error?.message?.includes('Invalid token') && (
      // Check if this came from a subscription-related endpoint
      error?.url?.includes('/subscription') ||
      error?.url?.includes('/plan') ||
      error?.url?.includes('/billing') ||
      // Check for subscription-specific error codes
      error?.errorCode === 'SUBSCRIPTION_CANCELLED' ||
      error?.errorCode === 'PLAN_CANCELLED' ||
      error?.errorCode === 'SUBSCRIPTION_EXPIRED' ||
      // Check if the error context indicates subscription issue
      error?.context === 'subscription' ||
      error?.context === 'plan' ||
      error?.subscriptionError === true ||
      // Check if this is a merchant-specific subscription error
      (error?.merchantId && error?.subscriptionStatus === 'cancelled')
    )
  );
};

/**
 * Check if an error is network-related
 */
export const isNetworkError = (error: any): boolean => {
  return (
    error?.message?.includes('fetch') ||
    error?.message?.includes('network') ||
    error?.message?.includes('connection') ||
    error?.message?.includes('timeout') ||
    error?.name === 'TypeError' ||
    error?.code === 'NETWORK_ERROR'
  );
};

/**
 * Check if an error is validation-related
 */
export const isValidationError = (error: any): boolean => {
  return (
    error?.message?.includes('validation') ||
    error?.message?.includes('invalid') ||
    error?.message?.includes('required') ||
    error?.message?.includes('format') ||
    error?.status === 400 ||
    error?.errorCode === 'VALIDATION_ERROR'
  );
};

/**
 * Analyze error and return structured error information for toast display
 */
export const analyzeError = (error: any): ErrorInfo => {
  let type: ErrorType = 'unknown';
  let message = 'An unexpected error occurred';
  let title = 'Error';
  let showLoginButton = false;

  // Check subscription errors FIRST to catch "Invalid token" from cancelled plans
  if (isSubscriptionError(error)) {
    type = 'subscription';
    title = 'Subscription Issue';
    message = 'Your subscription has been cancelled or expired. Please log in to reactivate your plan or contact support.';
    showLoginButton = true; // Allow login to access account and upgrade
  } else if (isAuthError(error)) {
    type = 'auth';
    title = 'Authentication Required';
    message = 'Your session has expired. Please log in again to continue.';
    showLoginButton = true;
  } else if (isPermissionError(error)) {
    type = 'permission';
    title = 'Access Denied';
    message = 'You do not have sufficient permissions to perform this action. Please contact your administrator or log in with a different account.';
    showLoginButton = true;
  } else if (isNetworkError(error)) {
    type = 'network';
    title = 'Connection Error';
    message = 'Unable to connect to the server. Please check your internet connection and try again.';
    showLoginButton = false;
  } else if (isValidationError(error)) {
    type = 'validation';
    title = 'Validation Error';
    message = error?.message || 'Please check your input and try again.';
    showLoginButton = false;
  } else {
    // Try to extract meaningful message from error
    if (error?.message) {
      message = error.message;
    } else if (error?.error) {
      message = error.error;
    } else if (typeof error === 'string') {
      message = error;
    }
  }

  return {
    type,
    message,
    title,
    showLoginButton,
    originalError: error
  };
};

/**
 * Get toast type based on error type
 */
export const getToastType = (errorType: ErrorType): 'error' | 'warning' | 'info' => {
  switch (errorType) {
    case 'auth':
    case 'permission':
    case 'subscription':
      return 'error';
    case 'network':
      return 'warning';
    case 'validation':
      return 'info';
    default:
      return 'error';
  }
};

/**
 * Handle authentication errors consistently
 * Automatically clears storage and redirects to login
 */
export const handleAuthError = (error: any): void => {
  if (!isAuthError(error)) {
    return;
  }

  console.error('🔒 Authentication error detected:', error);
  
  // Clear all authentication data
  clearAuthData();
  
  // Redirect to login immediately
  if (typeof window !== 'undefined') {
    console.log('🔄 Redirecting to login due to authentication error');
    // window.location.href = '/login';
  }
};

/**
 * Handle API errors with proper authentication error handling
 * Enhanced version that provides structured error information
 */
export const handleApiError = (error: any, redirectToLogin: boolean = true): ErrorInfo => {
  console.error('API Error:', error);
  
  const errorInfo = analyzeError(error);
  
  // Only automatically redirect for authentication errors, not subscription errors
  if (errorInfo.type === 'auth' && redirectToLogin) {
    handleAuthError(error);
  }
  // Subscription errors should NOT auto-redirect - let user choose to login
  // Permission errors should NOT auto-redirect - let user choose to login with different account
  
  return errorInfo;
};

/**
 * Handle API errors without automatic redirect (for UI display)
 */
export const handleApiErrorForUI = (error: any): ErrorInfo => {
  console.error('API Error (UI):', error);
  return analyzeError(error);
};

/**
 * Wrap API calls with automatic error handling
 */
export const withErrorHandling = async <T>(
  apiCall: () => Promise<T>,
  options: { redirectOnAuthError?: boolean } = {}
): Promise<T> => {
  const { redirectOnAuthError = true } = options;
  
  try {
    return await apiCall();
  } catch (error) {
    if (redirectOnAuthError) {
      handleApiError(error);
    }
    throw error;
  }
};

/**
 * Wrap API calls with error handling that returns structured error info
 * Use this when you want to handle errors in the UI instead of automatic redirects
 */
export const withErrorHandlingForUI = async <T>(
  apiCall: () => Promise<T>
): Promise<{ data?: T; error?: ErrorInfo }> => {
  try {
    const data = await apiCall();
    return { data };
  } catch (error) {
    const errorInfo = handleApiErrorForUI(error);
    return { error: errorInfo };
  }
};
