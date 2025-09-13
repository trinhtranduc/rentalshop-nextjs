import CONSTANTS from '@rentalshop/constants';
import type { User, LoginCredentials } from '@rentalshop/types';

const API = CONSTANTS.API;

// formatCurrency is now exported from ./currency.ts for centralized currency management

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format Vietnamese phone number
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  } else if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  return phone;
};

export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// ============================================================================
// API UTILITIES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errorCode?: string; // Add error code field for specific error handling
}

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
      const { apiUrls } = require('./config/api');
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
    ...(options.headers as Record<string, string>),
  };
  
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
    
    // Handle common HTTP status codes using API constants
    if (response.status === API.STATUS.UNAUTHORIZED) {
      console.log('🔍 FRONTEND: 401 Unauthorized response received');
      // Handle unauthorized - clean up auth data and redirect immediately
      if (typeof window !== 'undefined') {
        console.log('🔍 FRONTEND: Cleaning up auth data and redirecting to login');
        clearAuthData();
        // Immediate redirect on 401 error
        // window.location.href = '/login';
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
 * Get subscription status message
 * Centralized error messages for subscription issues
 */
const getSubscriptionStatusMessage = (status: string): string => {
  const statusMessages: Record<string, string> = {
    'cancelled': 'Your subscription has been cancelled. Please contact support to reactivate your account.',
    'expired': 'Your subscription has expired. Please renew to continue using our services.',
    'suspended': 'Your subscription has been suspended. Please contact support for assistance.',
    'past_due': 'Your subscription payment is past due. Please update your payment method.'
  };
  
  return statusMessages[status.toLowerCase()] || 'There is an issue with your subscription. Please contact support.';
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
      if (typeof window !== 'undefined') {
        console.error('🚨 DEBUG: parseApiResponse - UNAUTHORIZED RESPONSE!');
        console.error('🚨 DEBUG: This will trigger auto-redirect to login page!');
        console.error('🔒 parseApiResponse: Unauthorized access - token may be expired or invalid');
        console.error('🔒 parseApiResponse: Response status:', response.status);
        console.error('🔒 parseApiResponse: Response URL:', response.url);
        
        // Try to get response body for more details
        try {
          const responseText = await response.clone().text();
          console.error('🔒 parseApiResponse - Response body:', responseText);
        } catch (e) {
          console.error('🔒 parseApiResponse - Could not read response body:', e);
        }
        
        clearAuthData();
        // Immediate redirect on 401 error
        console.error('🚨 DEBUG: parseApiResponse - REDIRECTING TO LOGIN PAGE NOW!');
        // window.location.href = '/login';
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
          success: false,
          error: errorData.message, // Use the user-friendly message
          errorCode: errorData.error, // Preserve the error code for specific handling
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
            errorData.subscriptionStatus === 'cancelled' ||
            errorData.subscriptionStatus === 'expired' ||
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
          success: false,
          error: errorData.error, // Use the error message directly
          // Add subscription context if detected
          ...(isSubscriptionInvalidToken && {
            subscriptionError: true,
            context: 'subscription',
            errorCode: errorData.errorCode || 'SUBSCRIPTION_CANCELLED'
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
          errorData.subscriptionStatus === 'cancelled' ||
          errorData.subscriptionStatus === 'expired' ||
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
        success: false,
        error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        // Add subscription context if detected
        ...(isSubscriptionInvalidTokenMessage && {
          subscriptionError: true,
          context: 'subscription',
          errorCode: errorData.errorCode || 'SUBSCRIPTION_CANCELLED'
        })
      };
      console.log('🔍 parseApiResponse: Returning legacy error:', result);
      return result;
    } catch {
      console.log('🔍 parseApiResponse: Failed to parse error JSON, using fallback');
      const result = {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
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
        success: true,
        data: responseData.data, // Extract the nested data
      };
    }
    
    // Fallback for non-standard responses
    return {
      success: true,
      data: responseData,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to parse response',
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