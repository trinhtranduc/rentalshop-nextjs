import CONSTANTS from '@rentalshop/constants';
import type { User, LoginCredentials } from '@rentalshop/types';
import type { ApiResponse, ErrorCode } from './errors';
import { analyzeError } from './errors'; // Import analyzeError for handleApiErrorForUI

const API = CONSTANTS.API;

// formatCurrency is now exported from ./currency.ts for centralized currency management

// String utilities are now exported from ./string-utils.ts
// Function utilities are now exported from ./function-utils.ts
// This file focuses on API utilities and authentication functions

// ============================================================================
// API UTILITIES
// ============================================================================

// ApiResponse interface moved to errors.ts for unified error handling

// ============================================================================
// API UTILITIES
// ============================================================================

/**
 * Create API URL with proper base URL
 */
export const createApiUrl = (endpoint: string): string => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // Check if it's already a full URL
  if (cleanEndpoint.startsWith('http://') || cleanEndpoint.startsWith('https://')) {
    return cleanEndpoint;
  }
  
  // For relative endpoints, construct full URL
  if (cleanEndpoint.startsWith('api/')) {
    // Always use environment variable for server-side rendering compatibility
    // In server components, require() may fail, so we use env var directly
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    
    // Debug logging to track URL construction
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log('🔍 createApiUrl debug:', {
        endpoint: cleanEndpoint,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        baseUrl,
        finalUrl: `${baseUrl}/${cleanEndpoint}`
      });
    }
    
      return `${baseUrl}/${cleanEndpoint}`;
  }
  
  // Default to relative API path
  return `/api/${cleanEndpoint}`;
};

/**
 * Authenticated fetch wrapper for API calls
 * Handles authentication headers and common error cases
 */
/**
 * Public fetch wrapper for unauthenticated requests (login, register, etc.)
 * Does not require authentication token
 */
export const publicFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  console.log('🔍 FRONTEND: publicFetch called with URL:', url);
  console.log('🔍 FRONTEND: publicFetch options:', options);
  
  // Input validation
  if (!url || typeof url !== 'string') {
    console.log('🔍 FRONTEND: URL validation failed');
    throw new Error('URL is required and must be a string');
  }

  // Set default headers using API constants
  const headers: Record<string, string> = {
    [API.HEADERS.CONTENT_TYPE]: API.CONTENT_TYPES.JSON,
    [API.HEADERS.ACCEPT]: API.CONTENT_TYPES.JSON,
    // Platform detection headers for web clients
    'X-Client-Platform': 'web',
    'X-App-Version': '1.0.0',
    'X-Device-Type': 'browser',
  };

  // Create full URL
  const fullUrl = createApiUrl(url);

  // Convert options.headers to plain object if it's a Headers object
  let optionsHeaders: Record<string, string> = {};
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        optionsHeaders[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      // Handle array of [key, value] tuples
      options.headers.forEach(([key, value]) => {
        optionsHeaders[key] = value;
      });
    } else {
      optionsHeaders = options.headers as Record<string, string>;
    }
  }

  // Merge headers - ensure Content-Type is always application/json
  const mergedHeaders: Record<string, string> = {
    ...headers,
    ...optionsHeaders,
    // Force Content-Type to be application/json for JSON body
    [API.HEADERS.CONTENT_TYPE]: API.CONTENT_TYPES.JSON,
  };

  const requestOptions: RequestInit = {
    ...options,
    headers: mergedHeaders,
  };

  console.log(`🌐 PUBLIC REQUEST: ${requestOptions.method || 'GET'} ${fullUrl}`);
  
  try {
    const response = await fetch(fullUrl, requestOptions);
    console.log(`✅ PUBLIC RESPONSE: ${response.status} ${response.statusText}`);
    return response;
  } catch (error) {
    console.error(`❌ PUBLIC REQUEST FAILED:`, error);
    throw error;
  }
};

/**
 * Authenticated fetch wrapper for API calls
 * 
 * Best Practices:
 * - Proper error handling and user feedback
 * - Automatic token cleanup on auth failure
 * - Consistent header management
 * - Type-safe implementation
 */
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  console.log('🔍 FRONTEND: authenticatedFetch called with URL:', url);
  console.log('🔍 FRONTEND: authenticatedFetch options:', options);
  
  // Input validation
  if (!url || typeof url !== 'string') {
    console.log('🔍 FRONTEND: URL validation failed');
    throw new Error('URL is required and must be a string');
  }

  // Get token from localStorage (client-side only) - CONSOLIDATED APPROACH
  // getAuthToken() already handles expiration checking, no need to double-check here
  const token = getAuthToken();
  
  // Step 4: Defensive check - Improve error handling for missing token
  if (!token && typeof window !== 'undefined') {
    console.error('🚨 FRONTEND: No token found in authenticatedFetch');
    console.error('🚨 This may indicate a race condition after login');
    console.error('🚨 URL:', url);
    console.error('🚨 Check if token was stored properly after login');
    throw new Error('Authentication required - token not found. Please log in again.');
  }
  
  // Extract and convert options.headers to plain object (handle Headers, array, and object formats)
  // This prevents options.headers from overriding the Authorization header
  let optionsHeaders: Record<string, string> = {};
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        optionsHeaders[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      // Handle array of [key, value] tuples
      options.headers.forEach(([key, value]) => {
        optionsHeaders[key] = value;
      });
    } else {
      optionsHeaders = options.headers as Record<string, string>;
    }
  }
  
  // Merge headers in correct order: default headers → options.headers → Authorization header
  // This ensures Authorization header is ALWAYS preserved
  const mergedHeaders: Record<string, string> = {
    [API.HEADERS.CONTENT_TYPE]: API.CONTENT_TYPES.JSON,
    [API.HEADERS.ACCEPT]: API.CONTENT_TYPES.JSON,
    // Platform detection headers for web clients
    'X-Client-Platform': 'web',
    'X-App-Version': '1.0.0',
    'X-Device-Type': 'browser',
    ...optionsHeaders,  // User-provided headers (merged before Authorization)
  };
  
  // ALWAYS preserve Authorization header (set after merge to ensure it's never overridden)
  if (token) {
    mergedHeaders[API.HEADERS.AUTHORIZATION] = `Bearer ${token}`;
    console.log('🔍 FRONTEND: Authorization header set:', `Bearer ${token.substring(0, 20)}...`);
  }
  
  console.log('🔍 FRONTEND: Final merged headers:', mergedHeaders);
  console.log('🔍 FRONTEND: Authorization header in mergedHeaders:', mergedHeaders[API.HEADERS.AUTHORIZATION] ? 'PRESENT' : 'MISSING');
  console.log('🔍 FRONTEND: API.HEADERS.AUTHORIZATION constant:', API.HEADERS.AUTHORIZATION);
  
  // Create request options WITHOUT headers in options to prevent override
  // Remove headers from options before spreading to ensure merged headers are used
  const { headers: _unusedHeaders, ...optionsWithoutHeaders } = options;
  const defaultOptions: RequestInit = {
    method: API.METHODS.GET,
    ...optionsWithoutHeaders,  // Spread options without headers
    headers: mergedHeaders,  // Apply merged headers last (prevents override)
  };
  
  console.log('🔍 FRONTEND: Final request options:', defaultOptions);
  console.log('🔍 FRONTEND: Headers in defaultOptions:', defaultOptions.headers);
  
  // Defensive check: Verify Authorization header is present
  const finalHeaders = defaultOptions.headers as Record<string, string> | undefined;
  if (token) {
    const authHeaderKey = API.HEADERS.AUTHORIZATION;
    const authHeaderValue = finalHeaders?.[authHeaderKey];
    console.log('🔍 FRONTEND: Checking Authorization header:', {
      authHeaderKey,
      authHeaderValue: authHeaderValue ? `${authHeaderValue.substring(0, 20)}...` : 'MISSING',
      allHeaderKeys: finalHeaders ? Object.keys(finalHeaders) : 'NO HEADERS'
    });
    
    if (!finalHeaders || !authHeaderValue) {
      console.error('🚨 FRONTEND: Authorization header missing in final request options!');
      console.error('🚨 This should never happen - headers:', finalHeaders);
      console.error('🚨 Token exists:', !!token);
      console.error('🚨 Merged headers had Authorization:', !!mergedHeaders[API.HEADERS.AUTHORIZATION]);
    }
  }
  
  try {
    // SOLUTION 1: Log API URL being used for debugging
    console.log('🔍 FRONTEND: Making fetch request to:', url);
    console.log('🔍 FRONTEND: API Base URL check:', {
      url,
      isFullUrl: url.startsWith('http'),
      NEXT_PUBLIC_API_URL: typeof window !== 'undefined' ? (window as any).__NEXT_PUBLIC_API_URL__ || process.env.NEXT_PUBLIC_API_URL : process.env.NEXT_PUBLIC_API_URL
    });
    console.log('🔍 FRONTEND: Request body:', options.body);
    
    // Final verification before making request
    const requestHeadersBeforeFetch = defaultOptions.headers as Record<string, string> | undefined;
    console.log('🔍 FRONTEND: Headers right before fetch:', requestHeadersBeforeFetch);
    console.log('🔍 FRONTEND: Authorization header before fetch:', requestHeadersBeforeFetch?.[API.HEADERS.AUTHORIZATION] ? 'PRESENT' : 'MISSING');
    
    const response = await fetch(url, defaultOptions);
    console.log('🔍 FRONTEND: Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    // Handle subscription errors (402 Payment Required)
    if (response.status === API.STATUS.PAYMENT_REQUIRED) {
      console.log('🔍 FRONTEND: 402 Payment Required response received (subscription error)');
      
      try {
        const errorData = await response.clone().json();
        console.log('🔍 FRONTEND: 402 Error details:', errorData);
        
        // Don't redirect to login for subscription errors - let the app handle it
        throw new Error(errorData.message || 'Subscription issue detected');
      } catch (parseError) {
        console.log('🔍 FRONTEND: Could not parse 402 error response');
        throw new Error('Subscription issue detected');
      }
    }
    
    // Handle authentication errors (401 Unauthorized)
    if (response.status === API.STATUS.UNAUTHORIZED) {
      // Enhanced logging with stack trace to identify which API call failed
      const stackTrace = new Error().stack;
      // Get merged headers from defaultOptions (they were set earlier)
      const requestHeaders = (defaultOptions.headers as Record<string, string>) || {};
      // Enhanced error info with all debug data
      const errorInfo = {
        timestamp: new Date().toISOString(),
        url: url,
        responseUrl: response.url,
        method: options.method || 'GET',
        stackTrace: stackTrace,
        headers: requestHeaders,
        token: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
        // Additional debug info
        hasAuthorizationHeader: !!requestHeaders[API.HEADERS.AUTHORIZATION],
        authorizationHeaderValue: requestHeaders[API.HEADERS.AUTHORIZATION] ? `${requestHeaders[API.HEADERS.AUTHORIZATION].substring(0, 30)}...` : 'MISSING',
        allHeaderKeys: Object.keys(requestHeaders),
        tokenLength: token ? token.length : 0,
        // Request options debug
        requestOptions: {
          method: defaultOptions.method,
          hasHeaders: !!defaultOptions.headers,
          headersType: typeof defaultOptions.headers,
        }
      };
      
      console.error('🚨 FRONTEND: 401 Unauthorized response received');
      console.error('🚨 Request URL:', url);
      console.error('🚨 Response URL:', response.url);
      console.error('🚨 Stack trace:', stackTrace);
      console.error('🚨 Request method:', options.method || 'GET');
      console.error('🚨 Request headers:', requestHeaders);
      console.error('🚨 Token available:', !!token);
      
      // Save error to localStorage for debugging (persist across redirects)
      if (typeof window !== 'undefined') {
        try {
          const existingLogs = localStorage.getItem('auth_error_logs');
          const logs = existingLogs ? JSON.parse(existingLogs) : [];
          logs.push(errorInfo);
          // Keep only last 10 errors
          if (logs.length > 10) logs.shift();
          localStorage.setItem('auth_error_logs', JSON.stringify(logs));
          console.log('💾 Error logged to localStorage for debugging');
        } catch (e) {
          console.error('Failed to save error log:', e);
        }
        
        // Check if this is right after login (within 5 seconds - increased from 2)
        const loginTime = localStorage.getItem('last_login_time');
        const isRecentLogin = loginTime && (Date.now() - parseInt(loginTime, 10)) < 5000;
        
        if (isRecentLogin) {
          console.warn('⚠️ 401 received right after login - this might be a timing issue');
          console.warn('⚠️ Token is present but backend returned 401');
          console.warn('⚠️ This could be:');
          console.warn('   1. Backend not ready to validate token yet');
          console.warn('   2. Token format issue');
          console.warn('   3. Backend authentication service issue');
          console.warn('⚠️ Will retry once after 1 second delay');
          
          // Retry logic for recent login: wait and retry once
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Retry the request
          try {
            console.log('🔄 Retrying request after delay...');
            const retryResponse = await fetch(url, defaultOptions);
            
            if (retryResponse.status === API.STATUS.UNAUTHORIZED) {
              console.error('❌ Retry also failed with 401 - this is likely a real auth issue');
              // Still 401 after retry - treat as real error
        clearAuthData();
        window.location.href = '/login';
              throw new Error('Unauthorized access - retry failed');
            } else {
              console.log('✅ Retry successful!');
              // Retry succeeded - return the successful response
              return retryResponse;
            }
          } catch (retryError) {
            console.error('❌ Retry request failed:', retryError);
            clearAuthData();
            window.location.href = '/login';
            throw retryError;
          }
        } else {
          // Normal 401 - check if token is still valid
          const currentToken = getAuthToken();
          if (!currentToken) {
            console.error('❌ No token available, logging out');
            clearAuthData();
            window.location.href = '/login';
          } else {
            console.error('❌ Token exists but backend returned 401 - this is unusual');
            console.error('❌ This could indicate:');
            console.error('   1. Token is invalid or expired');
            console.error('   2. Backend authentication service is down');
            console.error('   3. Token was revoked');
            console.error('❌ Logging out for security');
            clearAuthData();
            window.location.href = '/login';
          }
        }
      }
      throw new Error('Unauthorized access - redirecting to login');
    }
    
    if (response.status === API.STATUS.FORBIDDEN) {
      throw new Error('Access forbidden - insufficient permissions');
    }
    
    if (response.status >= 500) {
      throw new Error('Server error - please try again later');
    }
    
    if (response.status >= API.STATUS.INTERNAL_SERVER_ERROR) {
      throw new Error('Server error occurred');
    }
    
    return response;
  } catch (error) {
    // Handle network errors using API constants
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(API.ERROR_CODES.NETWORK_ERROR);
    }
    throw error;
  }
};




/**
 * Parse API response
 * 
 * This function handles the nested API response structure:
 * API returns: { success: true, data: { ... }, message: "..." }
 * We extract: { success: true, data: { ... } }
 * 
 * This allows frontend to access user data directly via response.data
 * instead of response.data.data
 */
export const parseApiResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  console.log('🔍 DEBUG: parseApiResponse called with status:', response.status);
  console.log('🔍 DEBUG: Response OK:', response.ok);
  console.log('🔍 DEBUG: Response URL:', response.url);
  
  // Subscription status checking is now handled in authenticatedFetch
  
  if (!response.ok) {
    console.error('❌ DEBUG: parseApiResponse - Response not OK, status:', response.status);
    console.error('❌ DEBUG: parseApiResponse - Response statusText:', response.statusText);
    console.error('❌ DEBUG: parseApiResponse - Response URL:', response.url);
    
    // Handle unauthorized responses by redirecting to login
    if (response.status === API.STATUS.UNAUTHORIZED) {
      // Enhanced logging with stack trace to identify which API call failed
      const stackTrace = new Error().stack;
      console.error('🚨 parseApiResponse: 401 Unauthorized response received');
      console.error('🚨 Response URL:', response.url);
      console.error('🚨 Stack trace:', stackTrace);
      
      // Try to get response body for more details
      let responseBody = '';
      try {
        responseBody = await response.clone().text();
        console.error('🚨 Response body:', responseBody);
      } catch (e) {
        console.error('🚨 Could not read response body:', e);
      }
      
      if (typeof window !== 'undefined') {
        console.error('🚨 parseApiResponse: 401 Unauthorized - logging out user');
        console.error('🚨 This will trigger auto-redirect to login page!');
        
        clearAuthData();
        // Immediate redirect on 401 error
        console.error('🚨 DEBUG: parseApiResponse - REDIRECTING TO LOGIN PAGE NOW!');
        window.location.href = '/login';
      }
      throw new Error('Unauthorized access - redirecting to login');
    }
    
    const errorText = await response.text();
    console.log('🔍 parseApiResponse: Error response text:', errorText);
    
    try {
      const errorData = JSON.parse(errorText);
      console.log('🔍 parseApiResponse: Parsed error data:', errorData);
      
      // Handle structured error responses that include both message and error code
      if (errorData.success === false && errorData.message && errorData.error) {
        console.log('🔍 parseApiResponse: Structured error response detected');
        const result = {
          success: false as const,
          message: errorData.message, // Use the user-friendly message
          error: errorData.error as ErrorCode, // Preserve the error code for specific handling
        };
        console.log('🔍 parseApiResponse: Returning structured error:', result);
        return result;
      }
      
      // Handle API error responses with error field (most common case)
      if (errorData.success === false && errorData.error) {
        console.log('🔍 parseApiResponse: API error response detected');
        
        // Check if this is a subscription-related "Invalid token" error
        const isSubscriptionInvalidToken = (
          errorData.error === 'Invalid token' && (
            // Check for subscription-related context
            errorData.subscriptionError === true ||
            errorData.context === 'subscription' ||
            errorData.context === 'plan' ||
            errorData.subscriptionStatus === 'CANCELLED' ||
            errorData.subscriptionStatus === 'EXPIRED' ||
            // Check if this came from a subscription-related endpoint
            response.url.includes('/subscription') ||
            response.url.includes('/plan') ||
            response.url.includes('/billing') ||
            // Check for subscription-specific error codes
            errorData.errorCode === 'SUBSCRIPTION_CANCELLED' ||
            errorData.errorCode === 'PLAN_CANCELLED' ||
            errorData.errorCode === 'SUBSCRIPTION_EXPIRED'
          )
        );
        
        const result = {
          success: false as const,
          message: errorData.error, // Use the error message directly
          error: errorData.errorCode as ErrorCode || 'INTERNAL_SERVER_ERROR',
          // Add subscription context if detected
          ...(isSubscriptionInvalidToken && {
            details: 'subscription'
          })
        };
        console.log('🔍 parseApiResponse: Returning API error:', result);
        return result;
      }
      
      // Handle legacy error responses
      console.log('🔍 parseApiResponse: Legacy error response detected');
      
      // Check if this is a subscription-related "Invalid token" error using message field
      const isSubscriptionInvalidTokenMessage = (
        errorData.message === 'Invalid token' && (
          // Check for subscription-related context
          errorData.subscriptionError === true ||
          errorData.context === 'subscription' ||
          errorData.context === 'plan' ||
          errorData.subscriptionStatus === 'CANCELLED' ||
          errorData.subscriptionStatus === 'EXPIRED' ||
          // Check if this came from a subscription-related endpoint
          response.url.includes('/subscription') ||
          response.url.includes('/plan') ||
          response.url.includes('/billing') ||
          // Check for subscription-specific error codes
          errorData.errorCode === 'SUBSCRIPTION_CANCELLED' ||
          errorData.errorCode === 'PLAN_CANCELLED' ||
          errorData.errorCode === 'SUBSCRIPTION_EXPIRED'
        )
      );
      
      const result = {
        success: false as const,
        message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        error: errorData.errorCode as ErrorCode || 'INTERNAL_SERVER_ERROR',
        // Add subscription context if detected
        ...(isSubscriptionInvalidTokenMessage && {
          details: 'subscription'
        })
      };
      console.log('🔍 parseApiResponse: Returning legacy error:', result);
      return result;
    } catch {
      console.log('🔍 parseApiResponse: Failed to parse error JSON, using fallback');
      const result = {
        success: false as const,
        message: `HTTP ${response.status}: ${response.statusText}`,
        error: 'INTERNAL_SERVER_ERROR' as ErrorCode,
      };
      console.log('🔍 parseApiResponse: Returning fallback error:', result);
      return result;
    }
  }

  try {
    const responseData = await response.json();
    
    // Handle nested API response structure
    // API returns: { success: true, data: { ... }, message: "..." }
    // We extract: { success: true, data: { ... } }
    if (responseData.success && responseData.data !== undefined) {
      return {
        success: true as const,
        data: responseData.data, // Extract the nested data
      };
    }
    
    // Fallback for non-standard responses
    return {
      success: true as const,
      data: responseData,
    };
  } catch (error) {
    return {
      success: false as const,
      message: 'Failed to parse response',
      error: 'INTERNAL_SERVER_ERROR' as ErrorCode,
    };
  }
};

/**
 * Execute with data refresh
 */
export const executeWithDataRefresh = async <T>(
  operation: () => Promise<T>,
  refreshCallback?: () => void
): Promise<T> => {
  try {
    const result = await operation();
    if (refreshCallback) {
      refreshCallback();
    }
    return result;
  } catch (error) {
    console.error('Operation failed:', error);
    throw error;
  }
};

// handleApiError is now exported from ./error-handling.ts for centralized error handling

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const token = getAuthToken();
  return !!token;
};

/**
 * Redirect to login if not authenticated
 */
export const requireAuth = (): void => {
  if (!isAuthenticated()) {
    if (typeof window !== 'undefined') {
      console.log('🔒 User not authenticated, redirecting to login');
      clearAuthData();
      // window.location.href = '/login';
    }
  }
};

// ============================================================================
// AUTHENTICATION STORAGE UTILITIES (NON-DUPLICATE)
// ============================================================================

import { UserRole } from '@rentalshop/types';

export interface StoredUser {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date | string;
  emailVerified: boolean;
  updatedAt: Date | string;
  merchantId?: number;
  outletId?: number;
  token: string;
  expiresAt: number;
}

/**
 * Get stored authentication token - CONSOLIDATED APPROACH
 */
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  // Try new consolidated format first
  const authData = localStorage.getItem('authData');
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      if (parsed.token) {
        // SOLUTION 1: Decode JWT token and check exp field directly (more reliable)
        try {
          const parts = parsed.token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload.exp) {
              const now = Math.floor(Date.now() / 1000);
              if (payload.exp < now) {
                console.log('🔍 Token is expired (JWT exp check), clearing auth data');
          clearAuthData();
          return null;
        }
            }
          }
        } catch (decodeError) {
          console.warn('Failed to decode JWT for expiration check:', decodeError);
          // Fallback to expiresAt check
          if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
            console.log('🔍 Token is expired (expiresAt check), clearing auth data');
            clearAuthData();
            return null;
          }
        }
        
        return parsed.token;
      }
    } catch (error) {
      console.warn('Failed to parse authData:', error);
      clearAuthData();
      return null;
    }
  }
  
  // Fallback to old format for backward compatibility
  const token = localStorage.getItem('authToken');
  if (token) {
    // Check if token is actually expired by decoding it
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp) {
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp < now) {
            console.log('🔍 Token is expired, clearing auth data');
            clearAuthData();
            return null;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to decode JWT token for expiration check:', error);
      clearAuthData();
      return null;
    }
    return token;
  }
  
  return null;
};

/**
 * Get stored user data
 */
export const getStoredUser = (): StoredUser | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    // First try the new consolidated authData
    const authData = localStorage.getItem('authData');
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed.user) {
        // Check if token is expired
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          clearAuthData();
          return null;
        }
        return parsed.user as StoredUser;
      }
    }
    
    // Fallback to old userData for backward compatibility
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData) as StoredUser;
      
      // Check if token is expired
      if (user.expiresAt && Date.now() > user.expiresAt) {
        clearAuthData();
        return null;
      }
      
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to parse stored user data:', error);
    clearAuthData();
    return null;
  }
};

/**
 * Store authentication data - CONSOLIDATED APPROACH
 * Only stores ONE item: 'authData' with everything needed
 */
export const storeAuthData = (token: string, user: User): void => {
  if (typeof window === 'undefined') return;
  
  // Decode JWT token to get actual expiration time
  let expiresAt = Date.now() + (24 * 60 * 60 * 1000); // Default fallback
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp) {
        expiresAt = payload.exp * 1000; // Convert to milliseconds
      }
    }
  } catch (error) {
    console.warn('Failed to decode JWT token for expiration time:', error);
  }
  
  const authData = {
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
      updatedAt: user.updatedAt,
      merchantId: user.merchantId ? Number(user.merchantId) : undefined,
      outletId: user.outletId ? Number(user.outletId) : undefined,
      // ✅ Store permissions array (required for permission checks)
      permissions: (user as any).permissions || [],
      // ✅ Store merchant and outlet objects (optional)
      merchant: user.merchant || undefined,
      outlet: user.outlet || undefined,
    },
    expiresAt, // Use actual JWT expiration time
  };
  
  // CONSOLIDATED: Only store ONE item with everything
  localStorage.setItem('authData', JSON.stringify(authData));
  
  // Mark login time for grace period check
  localStorage.setItem('last_login_time', Date.now().toString());
  
  // Clean up old redundant items
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  localStorage.removeItem('userData');
  
  console.log('✅ Auth data stored in consolidated format');
  console.log('✅ Login time marked for grace period');
};

/**
 * Clear authentication data - CONSOLIDATED APPROACH
 */
export const clearAuthData = (): void => {
  if (typeof window === 'undefined') return;
  
  console.log('🧹 Clearing auth data from localStorage');
  
  // Clear new consolidated format
  localStorage.removeItem('authData');
  
  // Clear login time marker
  localStorage.removeItem('last_login_time');
  
  // Clear old redundant formats
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  localStorage.removeItem('userData');
  
  console.log('✅ All auth data cleared');
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = (): StoredUser | null => {
  return getStoredUser();
};

/**
 * Force clear all auth data and redirect to login
 * Use this when you need to force a fresh login
 */
export const forceLogout = (): void => {
  if (typeof window === 'undefined') return;
  
  console.log('🚪 Force logout - clearing all auth data');
  clearAuthData();
  
  // Immediate redirect to login page
  // window.location.href = '/login';
};

/**
 * Handle API response with proper error handling
 */
export const handleApiResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  return await parseApiResponse<T>(response);
};

/**
 * Handle 401 authentication errors - MODERN PATTERN
 * Automatically redirects to login page and clears auth data
 */
export const handleAuthError = (error: Error): void => {
  const errorMessage = error.message.toLowerCase();
  
  // Check if it's an authentication error
  if (errorMessage.includes('unauthorized') || 
      errorMessage.includes('authentication required') ||
      errorMessage.includes('token expired') ||
      errorMessage.includes('invalid token')) {
    
    console.log('🔒 Authentication error detected:', error.message);
    
    // Clear auth data
    clearAuthData();
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      console.log('🔄 Redirecting to login page...');
      window.location.href = '/login';
    }
  }
};

// ============================================================================
// TOAST UTILITIES (for UI components)
// ============================================================================

/**
 * Get toast type based on error type
 */
export const getToastType = (errorType: 'auth' | 'permission' | 'subscription' | 'network' | 'validation' | 'unknown'): 'error' | 'warning' | 'info' => {
  switch (errorType) {
    case 'auth':
      return 'error';
    case 'permission':
      return 'error';
    case 'subscription':
      return 'warning';
    case 'network':
      return 'warning';
    case 'validation':
      return 'warning';
    case 'unknown':
      return 'error';
    default:
      return 'error';
  }
};

/**
 * Wrap API call with error handling for UI
 */
export const withErrorHandlingForUI = async <T>(
  apiCall: () => Promise<T>
): Promise<{ data?: T; error?: any }> => {
  try {
    const data = await apiCall();
    return { data };
  } catch (error) {
    return { error };
  }
};

/**
 * Handle API error for UI display
 */
export const handleApiErrorForUI = (error: any): { message: string; type: string } => {
  const errorInfo = analyzeError(error);
  return {
    message: errorInfo.message,
    type: errorInfo.type
  };
}; 