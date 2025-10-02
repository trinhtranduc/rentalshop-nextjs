'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuthToken, getStoredUser, clearAuthData, storeAuthData } from '@rentalshop/utils';
import type { User } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
  message?: string;
}

// ============================================================================
// USE AUTH HOOK
// ============================================================================

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // ============================================================================
  // AUTH FUNCTIONS
  // ============================================================================

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      // Use centralized API URL configuration
      const { apiUrls } = await import('@rentalshop/utils');
      const response = await fetch(apiUrls.auth.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      // Handle subscription errors (402 Payment Required)
      if (response.status === 402) {
        const errorData = await response.json();
        setState(prev => ({ 
          ...prev, 
          error: errorData.message || 'Subscription issue detected',
          loading: false 
        }));
        return false;
      }

      // Handle authentication errors (401 Unauthorized)
      if (response.status === 401) {
        const errorData = await response.json();
        setState(prev => ({ 
          ...prev, 
          error: errorData.message || 'Invalid credentials',
          loading: false 
        }));
        return false;
      }

      const data: LoginResponse = await response.json();

      if (data.success && data.data?.token) {
        // Store auth data using consolidated function
        storeAuthData(data.data.token, data.data.user);
        
        setState(prev => ({ 
          ...prev, 
          user: data.data.user, 
          loading: false 
        }));
        return true;
      } else {
        setState(prev => ({ 
          ...prev, 
          error: data.message || 'Login failed',
          loading: false 
        }));
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        loading: false 
      }));
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    // Use consolidated clearAuthData function
    clearAuthData();
    setState({
      user: null,
      loading: false,
      error: null,
    });
    // window.location.href = '/login';
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      // Use consolidated getAuthToken function
      const token = getAuthToken();
      console.log('🔄 refreshUser called, token exists:', !!token);
      
      if (!token) {
        console.log('❌ No token found, setting user to null');
        setState(prev => ({ ...prev, user: null, loading: false }));
        return;
      }

      console.log('🌐 Fetching user profile from API...');
      // Use centralized API URL and authenticatedFetch
      const { apiUrls, authenticatedFetch } = await import('@rentalshop/utils');
      const response = await authenticatedFetch(apiUrls.settings.user);

      console.log('📥 Profile API response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Profile API data:', data);
        
        if (data.success && data.data) {
          console.log('✅ Setting user data:', data.data);
          setState(prev => ({ 
            ...prev, 
            user: data.data,
            loading: false 
          }));
          // Don't set localStorage here - it's already handled by storeAuthData
        } else {
          console.error('❌ API returned success:false:', data);
          throw new Error('Failed to refresh user');
        }
      } else if (response.status === 402) {
        // Handle subscription errors (402 Payment Required)
        try {
          const errorData = await response.clone().json();
          console.log('⚠️ Subscription error detected, not logging out');
          // Don't logout for subscription errors - just show error
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: errorData.message || 'Subscription issue detected' 
          }));
          return;
        } catch (parseError) {
          console.log('🔍 Could not parse 402 error response');
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Subscription issue detected' 
          }));
          return;
        }
      } else if (response.status === 401) {
        // Handle authentication errors (401 Unauthorized)
        console.log('🔒 Token expired, logging out and redirecting to login');
        // Token expired or invalid - logout will clear data
        logout();
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } else {
        console.error('❌ API error:', response.status, response.statusText);
        // If we have a token but API fails, clear corrupted data
        if (getAuthToken()) {
          console.log('🧹 Clearing corrupted auth data...');
          clearAuthData();
          setState(prev => ({ ...prev, user: null, loading: false }));
        }
        throw new Error('Failed to refresh user');
      }
    } catch (err) {
      console.error('💥 Error refreshing user:', err);
      // If we have a token but refresh fails, clear corrupted data
      if (getAuthToken()) {
        console.log('🧹 Clearing corrupted auth data due to error...');
        clearAuthData();
        setState(prev => ({ ...prev, user: null, loading: false }));
      }
    }
  }, [logout]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    // Check for existing auth on mount using consolidated approach
    const token = getAuthToken();
    const storedUser = getStoredUser();

    console.log('🔍 useAuth useEffect - localStorage check:', {
      hasToken: !!token,
      hasStoredUser: !!storedUser,
      tokenLength: token?.length,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'null',
      storedUserPreview: storedUser ? JSON.stringify(storedUser).substring(0, 100) + '...' : 'null',
      storedUserFirstName: storedUser?.firstName,
      storedUserLastName: storedUser?.lastName,
      storedUserPhone: storedUser?.phone
    });

    if (token && storedUser) {
      console.log('✅ Found stored user data:', storedUser);
      setState(prev => ({ ...prev, user: {
        ...storedUser,
        id: storedUser.id, // Keep as number
      } as User, loading: false }));
      
      // Only refresh user data if we don't have complete user info
      // This prevents unnecessary API calls that might fail
      if (!storedUser.merchantId && !storedUser.outletId) {
        console.log('🔄 User data incomplete (missing merchant/outlet IDs) - refreshing from API...');
        refreshUser();
      } else if (!storedUser.firstName || !storedUser.lastName) {
        console.log('🔄 User data incomplete (missing firstName/lastName) - refreshing from API...');
        refreshUser();
      } else {
        console.log('✅ User data complete - no need to refresh');
      }
    } else if (token && !storedUser) {
      console.log('🔄 Token exists but no user data - refreshing from API...');
      // We have a token but no user data, try to refresh from API
      refreshUser();
    } else {
      console.log('❌ No auth data found - user not authenticated');
      setState(prev => ({ ...prev, user: null, loading: false }));
    }
  }, [refreshUser]);

  // ============================================================================
  // MODERN PATTERN: Automatic Token Refresh
  // ============================================================================
  
  useEffect(() => {
    // Modern pattern: Auto-refresh tokens before they expire
    const checkTokenExpiry = () => {
      const token = getAuthToken();
      if (!token) return;

      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = payload.exp - now;
          
          // Refresh token if it expires in less than 5 minutes
          if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
            console.log('🔄 Token expires soon, refreshing...');
            refreshUser();
          }
        }
      } catch (error) {
        console.warn('Failed to check token expiry:', error);
      }
    };

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60000);
    
    // Initial check
    checkTokenExpiry();

    return () => clearInterval(interval);
  }, [refreshUser]);

  // ============================================================================
  // RETURN VALUES
  // ============================================================================

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    login,
    logout,
    refreshUser,
    clearError,
  };
}
