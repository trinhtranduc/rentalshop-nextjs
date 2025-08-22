/**
 * Authentication utilities for client app (reusing shared package)
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

// Important: Use browser-only entrypoint to avoid bundling Prisma on the client
export {
  getAuthToken,
  getStoredUser,
  storeAuthData,
  clearAuthData,
  authenticatedFetch,
  handleApiResponse,
} from '@rentalshop/utils';

export const isAuthenticated = (): boolean => !!(typeof window !== 'undefined' && localStorage.getItem('authToken'));

export const verifyTokenWithServer = async (): Promise<boolean> => {
  try {
    const token = (await import('@rentalshop/utils')).getAuthToken();
    if (!token) return false;

    const { createApiUrl } = await import('@rentalshop/utils');
    const response = await fetch(createApiUrl('/api/auth/verify'), {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });

    if (response.status === 401) {
      (await import('@rentalshop/utils')).clearAuthData();
      return false;
    }

    if (response.ok) {
      const data = await response.json();
      if (data?.success && data?.data?.user) {
        const existingToken = (await import('@rentalshop/utils')).getAuthToken();
        if (existingToken) {
          (await import('@rentalshop/utils')).storeAuthData(existingToken, data.data.user);
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

export const isAuthenticatedWithVerification = async (): Promise<boolean> => {
  if (!isAuthenticated()) return false;
  return await verifyTokenWithServer();
};

/**
 * Login user
 */
export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    console.log('🔐 loginUser called with:', { email });
    
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
      (await import('@rentalshop/utils')).storeAuthData(data.data.token, data.data.user);
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
  (async () => (await import('@rentalshop/utils')).clearAuthData())();
  window.location.href = '/login';
};

/**
 * Get authenticated user profile
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { authenticatedFetch, handleApiResponse } = await import('@rentalshop/utils');
    const data = await handleApiResponse(await authenticatedFetch('/api/auth/me'));
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}; 