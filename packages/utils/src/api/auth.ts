import { authenticatedFetch, parseApiResponse, createApiUrl, isAuthenticated } from '../common';
import type { ApiResponse } from '../common';

// ============================================================================
// AUTH STORAGE (Browser-only)
// ============================================================================

export interface StoredUser {
  id: number;
  email: string;
  name?: string;
  role?: string;
  [key: string]: any;
}

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
};

export const getStoredUser = (): StoredUser | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  return userStr ? (JSON.parse(userStr) as StoredUser) : null;
};

export const storeAuthData = (token: string, user: StoredUser): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuthData = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

// ============================================================================
// AUTH API FUNCTIONS
// ============================================================================

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: StoredUser;
  };
  message?: string;
}

export const handleApiResponse = async (response: Response) => {
  if (response.status === 401) {
    clearAuthData();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Authentication required');
  }

  // Parse the response data first
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    // For error responses, throw an error with the API's error message
    const errorMessage = data.error || data.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
};

// isAuthenticated is now exported from ../common to avoid conflicts

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (data.success && data.data?.token) {
    storeAuthData(data.data.token, data.data.user);
  }

  return data;
};

export const logoutUser = (): void => {
  clearAuthData();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

export const verifyTokenWithServer = async (): Promise<boolean> => {
  try {
    const token = getAuthToken();
    if (!token) return false;

    const response = await fetch(createApiUrl('/api/auth/verify'), {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      }
    });

    if (response.status === 401) {
      clearAuthData();
      return false;
    }

    if (response.ok) {
      const data = await response.json();
      if (data?.success && data?.data?.user) {
        const existingToken = getAuthToken();
        if (existingToken) {
          storeAuthData(existingToken, data.data.user);
        }
      }
      return data.success === true;
    }
    return false;
  } catch (error) {
    console.error('Error verifying token:', error);
    return isAuthenticated();
  }
};

export const getCurrentUser = async (): Promise<StoredUser | null> => {
  try {
    const response = await authenticatedFetch('/api/auth/me');
    const data = await handleApiResponse(response);
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};
