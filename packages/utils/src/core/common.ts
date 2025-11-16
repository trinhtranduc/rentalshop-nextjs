import CONSTANTS from '@rentalshop/constants';
import type { User, LoginCredentials } from '@rentalshop/types';
import type { ApiResponse, ErrorCode, ErrorResponse } from './errors';
import { parseErrorResponse, isErrorResponse } from './errors';
import { analyzeError } from './errors'; // Import analyzeError for handleApiErrorForUI
import { getTenantKeyFromHost } from './tenant';

const API = CONSTANTS.API;

// formatCurrency is now exported from ./currency.ts for centralized currency management

// String utilities are now exported from ./string-utils.ts
// Function utilities are now exported from ./function-utils.ts
// This file focuses on API utilities and authentication functions

// ============================================================================
// API UTILITIES
// ============================================================================

// ApiResponse interface moved to errors.ts for unified error handling

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
    // Use centralized API URL configuration
    try {
      const { apiUrls } = require('../config/api');
      return `${apiUrls.base}/${cleanEndpoint}`;
    } catch {
      // Fallback to environment variable if centralized config not available
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      return `${baseUrl}/${cleanEndpoint}`;
    }
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

  // Multi-tenant support: infer tenantKey from browser hostname (web),
  // so all public API calls (login, register, etc.) automatically include it.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const tenantKey = getTenantKeyFromHost(host);
    if (tenantKey) {
      headers['X-Tenant-Key'] = tenantKey;
    }
  }

  // Create full URL
  const fullUrl = createApiUrl(url);

  // Merge headers
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
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
  const token = getAuthToken();
  console.log('🔍 FRONTEND: Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
  
  // TEMPORARY DEBUG: Check if token is expired or invalid
  if (token && typeof window !== 'undefined') {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const now = Math.floor(Date.now() / 1000);
        console.log('🔍 FRONTEND: Token debug:', {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          exp: payload.exp,
          now: now,
          expired: payload.exp < now,
          timeUntilExpiry: payload.exp - now
        });
        
        // If token is expired, clear it
        if (payload.exp < now) {
          console.log('🔍 FRONTEND: Token is expired, clearing auth data');
          clearAuthData();
          throw new Error('Token expired - please log in again');
        }
      }
    } catch (error) {
      console.log('🔍 FRONTEND: Token validation failed:', error);
      clearAuthData();
      throw new Error('Invalid token - please log in again');
    }
  }
  
  // Check if user is authenticated before making the request
  if (!token && typeof window !== 'undefined') {
    console.log('🔍 FRONTEND: No token found, cleaning up and redirecting to login');
    // Clean up any stale auth data
    clearAuthData();
    // Redirect to login page
    setTimeout(() => {
      // window.location.href = '/login';
    }, 100);
    throw new Error('Authentication required');
  }
  
  // Set default headers using API constants
  const headers: Record<string, string> = {
    [API.HEADERS.CONTENT_TYPE]: API.CONTENT_TYPES.JSON,
    [API.HEADERS.ACCEPT]: API.CONTENT_TYPES.JSON,
    // Platform detection headers for web clients
    'X-Client-Platform': 'web',
    'X-App-Version': '1.0.0',
    'X-Device-Type': 'browser',
    ...(options.headers as Record<string, string>),
  };

  // Multi-tenant support: infer tenantKey from browser hostname (web),
  // so all authenticated API calls automatically include it unless explicitly overridden.
  if (typeof window !== 'undefined' && !headers['X-Tenant-Key'] && !headers['x-tenant-key']) {
    const host = window.location.hostname;
    const tenantKey = getTenantKeyFromHost(host);
    if (tenantKey) {
      headers['X-Tenant-Key'] = tenantKey;
    }
  }
  
  // Add authorization header if token exists
  if (token) {
    headers[API.HEADERS.AUTHORIZATION] = `Bearer ${token}`;
    console.log('🔍 FRONTEND: Authorization header set:', `Bearer ${token.substring(0, 20)}...`);
  }
  
  console.log('🔍 FRONTEND: Final headers:', headers);
  
  // Set default options using API constants
  const defaultOptions: RequestInit = {
    method: API.METHODS.GET,
    headers,
    ...options,
  };
  
  console.log('🔍 FRONTEND: Final request options:', defaultOptions);
  
  try {
    console.log('🔍 FRONTEND: Making fetch request to:', url);
    console.log('🔍 FRONTEND: Request body:', options.body);
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
      console.log('🔍 FRONTEND: 401 Unauthorized response received');
      
      // Handle unauthorized - clean up auth data and redirect immediately
      if (typeof window !== 'undefined') {
        console.log('🔍 FRONTEND: Cleaning up auth data and redirecting to login');
        clearAuthData();
        // Immediate redirect on 401 error
        window.location.href = '/login';
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
 * 
 * Note: This function only parses responses. It does NOT handle authentication
 * errors (401) or redirects. Those should be handled by the calling layer.
 */
export const parseApiResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  if (!response.ok) {
    const errorText = await response.text();
    
    try {
      const errorData = JSON.parse(errorText);
      console.log('🔍 parseApiResponse: Raw errorData:', JSON.stringify(errorData, null, 2));
      
      // Use parseErrorResponse helper to normalize to ErrorResponse format
      const errorResponse = parseErrorResponse(errorData);
      console.log('🔍 parseApiResponse: Parsed errorResponse:', JSON.stringify(errorResponse, null, 2));
      
      if (errorResponse) {
        console.log('✅ parseApiResponse: Returning ErrorResponse with code:', errorResponse.code);
        return errorResponse;
      }
      
      // Fallback: Failed to parse as ErrorResponse - return generic error
      console.warn('⚠️ parseApiResponse: Failed to parse as ErrorResponse');
      return {
        success: false as const,
        code: 'INTERNAL_SERVER_ERROR',
        message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        error: 'INTERNAL_SERVER_ERROR',
      };
    } catch {
      // Failed to parse JSON - return generic error
      return {
        success: false as const,
        code: 'INTERNAL_SERVER_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`,
        error: 'INTERNAL_SERVER_ERROR',
      };
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
      if (parsed.token && parsed.expiresAt) {
        // Check if token is expired
        if (Date.now() > parsed.expiresAt) {
          console.log('🔍 Token is expired, clearing auth data');
          clearAuthData();
          return null;
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
      // ✅ Store merchant and outlet objects (optional)
      merchant: user.merchant || undefined,
      outlet: user.outlet || undefined,
    },
    expiresAt, // Use actual JWT expiration time
  };
  
  // CONSOLIDATED: Only store ONE item with everything
  localStorage.setItem('authData', JSON.stringify(authData));
  
  // Clean up old redundant items
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  localStorage.removeItem('userData');
  
  console.log('✅ Auth data stored in consolidated format');
};

/**
 * Clear authentication data - CONSOLIDATED APPROACH
 */
export const clearAuthData = (): void => {
  if (typeof window === 'undefined') return;
  
  console.log('🧹 Clearing auth data from localStorage');
  
  // Clear new consolidated format
  localStorage.removeItem('authData');
  
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