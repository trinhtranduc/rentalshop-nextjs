/**
 * Authentication utilities for client app
 * Handles token storage and API requests with authentication
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
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
};

/**
 * Get stored user data
 */
export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * Store authentication data
 */
export const storeAuthData = (token: string, user: User): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(user));
};

/**
 * Clear authentication data
 */
export const clearAuthData = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

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
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

/**
 * Handle API response and check for authentication errors
 */
export const handleApiResponse = async (response: Response) => {
  if (response.status === 401) {
    // Token expired or invalid
    clearAuthData();
    window.location.href = '/login';
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

/**
 * Login user
 */
export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    console.log('🔐 loginUser called with:', { email });
    
    // Get API URL from environment
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
                   (process.env.NODE_ENV === 'production' ? 'https://api.rentalshop.com' : 'http://localhost:3002');
    
    console.log('🌐 Making request to external API:', `${apiUrl}/api/auth/login`);
    
    const response = await fetch(`${apiUrl}/api/auth/login`, {
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
      storeAuthData(data.data.token, data.data.user);
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
  clearAuthData();
  window.location.href = '/login';
};

/**
 * Get authenticated user profile
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await authenticatedFetch('/api/auth/me');
    const data = await handleApiResponse(response);
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}; 