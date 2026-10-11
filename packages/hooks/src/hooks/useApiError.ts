/**
 * useApiError Hook
 * Simple hook để translate API error/success messages dựa trên error codes
 * 
 * Flow: API returns error code -> translate code -> show translated message
 * 
 * @example
 * const { translateError, translateSuccess } = useApiError();
 * 
 * try {
 *   const response = await api.createCustomer(data);
 *   toast.success(translateSuccess(response));
 * } catch (error) {
 *   toast.error(translateError(error));
 * }
 */

import { lookupErrorTranslation, looksLikeErrorCode } from '@rentalshop/utils';
import { useErrorTranslations } from './useTranslation';

export function useApiError() {
  const t = useErrorTranslations();

  /**
   * Translate error response từ API
   * 
   * STANDARD FORMAT: { success: false, code: "...", message: "...", error: "..." }
   * Single source of truth: ResponseBuilder.error() format
   * 
   * Flow: code -> translate -> done
   */
  const translateError = (response: any): string => {
    console.log('🔍 translateError called with:', {
      type: typeof response,
      isError: response instanceof Error,
      hasCode: !!response?.code,
      code: response?.code,
      hasMessage: !!response?.message,
      message: response?.message,
      hasResponse: !!response?.response,
      responseData: response?.response?.data,
      fullResponse: response
    });

    // Handle nested axios error response
    if (response?.response?.data) {
      console.log('🔍 translateError: Handling nested axios error response');
      return translateError(response.response.data);
    }

    // #740: a code with no translation never reaches the user, not as the code and not as `errors.<CODE>`, and
    // not as the API's English sentence either: the localized generic message is shown and the code is logged
    const unknown = (code?: string): string => {
      console.warn('translateError: no translation for error code', code);
      return t('UNKNOWN_ERROR');
    };

    // ✅ PRIORITY 1: Standard API error format
    // Format: { success: false, code: "PLAN_LIMIT_EXCEEDED", message: "...", error: "..." }
    if (response?.code && typeof response.code === 'string') {
      return lookupErrorTranslation(t, response.code) ?? unknown(response.code);
    }

    // ✅ PRIORITY 2: Error object with code attached (from authenticatedFetch)
    // Format: Error { code: "PLAN_LIMIT_EXCEEDED", message: "...", response: { data: {...} } }
    if (response instanceof Error && (response as any).code) {
      const code = (response as any).code;
      return lookupErrorTranslation(t, code) ?? unknown(code);
    }

    // ✅ PRIORITY 3: The message is itself an error code (legacy support)
    if (response?.message && typeof response.message === 'string' && looksLikeErrorCode(response.message)) {
      return lookupErrorTranslation(t, response.message) ?? unknown(response.message);
    }

    // ✅ PRIORITY 4: Use message as plain text
    if (response?.message) {
      return response.message;
    }

    // ✅ PRIORITY 5: Handle string errors
    if (typeof response === 'string') {
      if (looksLikeErrorCode(response)) {
        return lookupErrorTranslation(t, response) ?? unknown(response);
      }
      return response;
    }

    // Default fallback
    return t('UNKNOWN_ERROR');
  };

  /**
   * Translate success response từ API
   * Priority: code -> message -> UNKNOWN_ERROR
   */
  const translateSuccess = (response: any): string => {
    // Priority 1: Use code field
    const translated = lookupErrorTranslation(t, response?.code);
    if (translated) return translated;

    // Priority 2: Use message if available (not a bare code)
    if (response?.message && !looksLikeErrorCode(response.message)) {
      return response.message;
    }

    // Default fallback
    return t('UNKNOWN_ERROR');
  };

  /**
   * Translate response (auto-detect error/success)
   */
  const translateResponse = (response: any): string => {
    if (response?.success === false) {
      return translateError(response);
    }
    return translateSuccess(response);
  };

  /**
   * Check if response is error
   */
  const isError = (response: any): boolean => {
    return response?.success === false || !!response?.error || !!response?.response?.data?.error;
  };

  /**
   * Extract error code từ response
   * Returns the error code for programmatic checks
   */
  const getErrorCode = (response: any): string | null => {
    // Handle nested axios error response
    if (response?.response?.data?.code) {
      return response.response.data.code;
    }
    // Check direct code property (API response format)
    if (response?.code && typeof response.code === 'string') {
      return response.code;
    }
    // Check if message is an error code
    if (response?.message && typeof response.message === 'string' && /^[A-Z_]+$/.test(response.message)) {
      return response.message;
    }
    return null;
  };

  return {
    translateError,
    translateSuccess,
    translateResponse,
    isError,
    getErrorCode,
  };
}

/**
 * Standalone helper functions (không cần hook)
 * Hữu ích khi sử dụng ngoài React components
 */

/**
 * Extract error message từ API response hoặc error object
 * @param error - API response hoặc error object
 * @returns Error message string
 */
export function extractErrorMessage(error: any): string {
  // Axios error response
  if (error?.response?.data) {
    const data = error.response.data;
    return data.message || data.error || 'An error occurred';
  }

  // API error response
  if (error?.message) {
    return error.message;
  }

  // String error
  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}

/**
 * Extract error code từ API response
 * @param error - API response hoặc error object
 * @returns Error code string hoặc null
 */
export function extractErrorCode(error: any): string | null {
  // Axios error response
  if (error?.response?.data?.code) {
    return error.response.data.code;
  }

  // API error response
  if (error?.code) {
    return error.code;
  }

  return null;
}

/**
 * Check if error is specific type
 * @param error - API response hoặc error object
 * @param code - Error code to check
 * @returns Boolean
 */
export function isErrorCode(error: any, code: string): boolean {
  return extractErrorCode(error) === code;
}

/**
 * Common error code checkers
 */
export const ErrorCheckers = {
  isUnauthorized: (error: any) => isErrorCode(error, 'UNAUTHORIZED') || isErrorCode(error, 'INVALID_TOKEN'),
  isForbidden: (error: any) => isErrorCode(error, 'FORBIDDEN'),
  isNotFound: (error: any) => isErrorCode(error, 'NOT_FOUND') || extractErrorCode(error)?.includes('_NOT_FOUND'),
  isValidationError: (error: any) => isErrorCode(error, 'VALIDATION_ERROR'),
  isDuplicateEntry: (error: any) => isErrorCode(error, 'DUPLICATE_ENTRY') || extractErrorCode(error)?.includes('_EXISTS'),
  isNetworkError: (error: any) => isErrorCode(error, 'NETWORK_ERROR') || error?.message?.includes('Network'),
};

