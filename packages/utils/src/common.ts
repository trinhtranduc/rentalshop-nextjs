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
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  console.log('🔍 DEBUG: authenticatedFetch called with URL:', url);
  console.log('🔍 DEBUG: Request options:', options);
  
  // Get token from localStorage or other storage
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  console.log('🔍 DEBUG: Token found:', token ? `${token.substring(0, 50)}...` : 'null');
  
  // Check if user is authenticated before making the request
  if (!token && typeof window !== 'undefined') {
    console.error('🚨 DEBUG: No auth token found, redirecting to login');
    console.error('🚨 DEBUG: This will cause auto-redirect to login page!');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    // window.location.href = '/login';
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
  }
  
  
  // Set default options using API constants
  const defaultOptions: RequestInit = {
    method: API.METHODS.GET,
    headers,
    ...options,
  };
  
  try {
    console.log('🔍 DEBUG: Making fetch request to:', url);
    const response = await fetch(url, defaultOptions);
    console.log('🔍 DEBUG: Response received, status:', response.status);
    console.log('🔍 DEBUG: Response statusText:', response.statusText);
    console.log('🔍 DEBUG: Response headers:', [...response.headers.entries()]);
    
    // Handle common HTTP status codes using API constants
    if (response.status === API.STATUS.UNAUTHORIZED) {
      // Handle unauthorized - redirect to login or refresh token
      if (typeof window !== 'undefined') {
        console.error('🚨 DEBUG: UNAUTHORIZED RESPONSE DETECTED!');
        console.error('🚨 DEBUG: This will trigger auto-redirect to login page!');
        console.error('🔒 Unauthorized access - token may be expired or invalid');
        console.error('🔒 Response status:', response.status);
        console.error('🔒 Response URL:', url);
        console.error('🔒 Response statusText:', response.statusText);
        
        // Try to get response body for more details
        try {
          const responseText = await response.clone().text();
          console.error('🔒 Response body:', responseText);
        } catch (e) {
          console.error('🔒 Could not read response body:', e);
        }
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        // Add a small delay to allow console logs to be seen before redirect
        setTimeout(() => {
          console.error('🚨 DEBUG: REDIRECTING TO LOGIN PAGE NOW!');
          // window.location.href = '/login';
        }, 1000);
      }
      throw new Error('Unauthorized access');
    }
    
    if (response.status === API.STATUS.FORBIDDEN) {
      throw new Error('Access forbidden');
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
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        // Add a small delay to allow console logs to be seen before redirect
        setTimeout(() => {
          console.error('🚨 DEBUG: parseApiResponse - REDIRECTING TO LOGIN PAGE NOW!');
          // window.location.href = '/login';
        }, 1000);
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
        const result = {
          success: false,
          error: errorData.error, // Use the error message directly
        };
        console.log('🔍 parseApiResponse: Returning API error:', result);
        return result;
      }
      
      // Handle legacy error responses
      console.log('🔍 parseApiResponse: Legacy error response detected');
      const result = {
        success: false,
        error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
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

/**
 * Handle API errors and redirect to login if unauthorized
 */
export const handleApiError = (error: any, redirectToLogin: boolean = true) => {
  console.error('API Error:', error);
  
  // Check if it's an unauthorized error
  if (error?.message?.includes('Unauthorized') || 
      error?.error === 'Unauthorized' ||
      error?.status === 401) {
    
    if (redirectToLogin && typeof window !== 'undefined') {
      console.log('🔄 Redirecting to login due to unauthorized access');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      // window.location.href = '/login';
      return;
    }
  }
  
  // Re-throw the error for other handling
  throw error;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('authToken');
  return !!token;
};

/**
 * Redirect to login if not authenticated
 */
export const requireAuth = (): void => {
  if (!isAuthenticated()) {
    if (typeof window !== 'undefined') {
      console.log('🔒 User not authenticated, redirecting to login');
      // window.location.href = '/login';
    }
  }
};

// ============================================================================
// AUTHENTICATION STORAGE UTILITIES (NON-DUPLICATE)
// ============================================================================

export interface StoredUser {
  id: number;
  email: string;
  name: string;
  role: string;
  merchantId?: number;
  outletId?: number;
  token: string;
  expiresAt: number;
}

/**
 * Get stored authentication token
 */
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
};

/**
 * Get stored user data
 */
export const getStoredUser = (): StoredUser | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userData = localStorage.getItem('userData');
    if (!userData) return null;
    
    const user = JSON.parse(userData) as StoredUser;
    
    // Check if token is expired
    if (user.expiresAt && Date.now() > user.expiresAt) {
      clearAuthData();
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Failed to parse stored user data:', error);
    clearAuthData();
    return null;
  }
};

/**
 * Store authentication data
 */
export const storeAuthData = (token: string, user: User): void => {
  if (typeof window === 'undefined') return;
  
  const storedUser: StoredUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    merchantId: user.merchantId ? Number(user.merchantId) : undefined,
    outletId: user.outletId ? Number(user.outletId) : undefined,
    token,
    expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
  };
  
  localStorage.setItem('authToken', token);
  localStorage.setItem('userData', JSON.stringify(storedUser));
};

/**
 * Clear authentication data
 */
export const clearAuthData = (): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('authToken');
  localStorage.removeItem('userData');
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = (): StoredUser | null => {
  return getStoredUser();
};

/**
 * Handle API response with proper error handling
 */
export const handleApiResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  return await parseApiResponse<T>(response);
}; 