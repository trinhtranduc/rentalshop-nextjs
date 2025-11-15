/**
 * useApiError Hook
 * Hook để translate API error/success messages dựa trên error codes
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

import { useErrorTranslations } from './useTranslation';

// ErrorResponse interface
type ErrorResponse = {
  success: false;
  code: string;
  message: string;
  error?: string;
  details?: any;
};

// Helper: Check if response is ErrorResponse format
function isErrorResponse(response: any): response is ErrorResponse {
  return response?.success === false && 
         typeof response?.code === 'string' && 
         typeof response?.message === 'string';
}

// Helper: Get error code from response
function getErrorCode(response: any): string | null {
  if (isErrorResponse(response)) {
    return response.code;
  }
  
  if (response?.code && typeof response.code === 'string') {
    return response.code;
  }
  
  if (response?.errorCode && typeof response.errorCode === 'string') {
    return response.errorCode;
  }
  
  if (response?.error && typeof response.error === 'string') {
    const errorStr = response.error.trim();
    if (/^[A-Z_]+$/.test(errorStr)) {
      return errorStr;
    }
  }
  
  return null;
}

interface ApiResponse {
  success: boolean;
  code?: string;
  message?: string;
  data?: any;
  error?: any;
}

export function useApiError() {
  const t = useErrorTranslations();

  /**
   * Translate error response từ API
   * Sử dụng ErrorResponse interface chuẩn để translate dựa vào code
   */
  const translateError = (response: any): string => {
    console.log('🔍 translateError: Input response:', JSON.stringify(response, null, 2));
    
    // Handle axios error response
    if (response?.response?.data) {
      return translateError(response.response.data);
    }

    // Normalize to ErrorResponse format
    const errorResponse: ErrorResponse | null = isErrorResponse(response) 
      ? response 
      : null;

    console.log('🔍 translateError: isErrorResponse?', !!errorResponse);
    console.log('🔍 translateError: errorResponse?.code:', errorResponse?.code);

    // Priority 1: Translate dựa vào code từ ErrorResponse
    if (errorResponse && errorResponse.code) {
      console.log('📝 translateError: Translating code:', errorResponse.code);
      const translated = t(errorResponse.code);
      console.log('📝 translateError: Translation result:', translated, '(original:', errorResponse.code + ')');
      
      // next-intl trả về chính key nếu không tìm thấy translation
      // Nếu translated !== code thì không tìm thấy, dùng message
      if (translated !== errorResponse.code) {
        // Translation tìm thấy - dùng translation
        console.log('✅ translateError: Using translated message:', translated);
        return translated;
      }
      
      // Translation không tìm thấy - dùng message từ ErrorResponse
      console.warn('⚠️ translateError: Translation not found, using message:', errorResponse.message);
      return errorResponse.message || errorResponse.code;
    }

    // Fallback: Try to get code from response using helper
    console.log('⚠️ translateError: Not ErrorResponse format, trying getErrorCode helper...');
    const errorCode = getErrorCode(response);
    console.log('⚠️ translateError: getErrorCode result:', errorCode);
    
    if (errorCode) {
      const translated = t(errorCode);
      console.log('📝 translateError: Translation from helper:', translated);
      if (translated !== errorCode) {
        return translated;
      }
      // Use message from response if available
      if (response?.message) {
        return response.message;
      }
      return errorCode;
    }

    // Priority 2: Dùng message nếu có
    if (response?.message) {
      console.warn('⚠️ translateError: No code found, using message:', response.message);
      return response.message;
    }

    // Priority 3: Handle string error
    if (typeof response === 'string') {
      return response;
    }

    // Priority 4: Default fallback
    return t('UNKNOWN_ERROR') || 'An unknown error occurred';
  };

  /**
   * Translate success response từ API
   * Ưu tiên dùng code để translate, fallback sang message
   */
  const translateSuccess = (response: any): string => {
    // Handle API success response với code
    if (response?.code) {
      const translated = t(response.code);
      // Nếu translation key không tồn tại, fallback sang message
      if (translated === response.code && response.message) {
        return response.message;
      }
      return translated;
    }

    // Handle success response với message
    if (response?.message) {
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
   */
  const getErrorCode = (response: any): string | null => {
    if (response?.response?.data?.code) {
      return response.response.data.code;
    }
    if (response?.code) {
      return response.code;
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

