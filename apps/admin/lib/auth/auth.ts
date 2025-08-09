/**
 * Authentication utilities for admin app (reusing shared package)
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
  message?: string;
}

/**
 * Get stored authentication token
 */
import { getAuthToken, getStoredUser, storeAuthData, clearAuthData, authenticatedFetch, handleApiResponse } from '@rentalshop/auth';
export { getAuthToken, getStoredUser, storeAuthData, clearAuthData, authenticatedFetch, handleApiResponse };

// getStoredUser re-exported from @rentalshop/auth

/**
 * Store authentication data
 */
// storeAuthData re-exported from @rentalshop/auth

/**
 * Clear authentication data
 */
// clearAuthData re-exported from @rentalshop/auth

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  return !!token;
};

/**
 * Verify token with server
 */
export const verifyTokenWithServer = async (): Promise<boolean> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return false;
    }

    const { createApiUrl } = await import('@rentalshop/utils');
    const response = await fetch(createApiUrl('/api/auth/verify'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      // Token is invalid or expired
      clearAuthData();
      return false;
    }

    if (response.ok) {
      const data = await response.json();
      return data.success === true;
    }

    return false;
  } catch (error) {
    console.error('Error verifying token:', error);
    // On network error, fall back to local check
    return isAuthenticated();
  }
};

/**
 * Check if user is authenticated with server verification
 */
export const isAuthenticatedWithVerification = async (): Promise<boolean> => {
  const localAuth = isAuthenticated();
  if (!localAuth) {
    return false;
  }

  // Verify with server
  return await verifyTokenWithServer();
};

/**
 * Create authenticated fetch request
 */
// authenticatedFetch re-exported from @rentalshop/auth

/**
 * Handle API response and check for authentication errors
 */
// handleApiResponse re-exported from @rentalshop/auth

/**
 * Login user
 */
export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    console.log('🔐 loginUser called with:', { email });
    
    // Use relative path; Next.js rewrites route to API server
    console.log('🌐 Making request to API: /api/auth/login');
    
    const response = await fetch(`/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('📥 Login API response status:', response.status);
    
    const data = await response.json();
    console.log('📥 Login API response data:', data);

    if (data.success && data.data?.token) {
      console.log('✅ Login successful, storing auth data...');
      (await import('@rentalshop/auth')).storeAuthData(data.data.token, data.data.user);
      console.log('💾 Auth data stored successfully');
    } else {
      console.log('❌ Login failed:', data.message);
    }

    return data;
  } catch (error) {
    console.error('💥 loginUser error:', error);
    throw error;
  }
};

/**
 * Logout user
 */
export const logoutUser = (): void => {
  (async () => (await import('@rentalshop/auth')).clearAuthData())();
  window.location.href = '/login';
};

/**
 * Get authenticated user profile
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { authenticatedFetch, handleApiResponse } = await import('@rentalshop/auth');
    const data = await handleApiResponse(await authenticatedFetch('/api/auth/me'));
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}; 