'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuthToken, getStoredUser, clearAuthData, storeAuthData } from '@rentalshop/utils';
import type { User } from '@rentalshop/types';
import { useApiError } from './useApiError';

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
// USE AUTH HOOK - SIMPLE & MODERN
// ============================================================================

/**
 * ✅ SIMPLE AUTH HOOK
 * - No infinite loops
 * - No complex logic
 * - Just works
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });
  
  // Use useApiError for consistent error translation
  const { translateError } = useApiError();

  // ============================================================================
  // AUTH FUNCTIONS
  // ============================================================================

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // SOLUTION 1: Import apiUrls - it now uses Proxy to ensure consistent base URL
      const { apiUrls } = await import('@rentalshop/utils');
      // apiUrls is now a Proxy that calls getApiUrls() internally, ensuring consistent base URL
      const urls = apiUrls;
      
      // SOLUTION 1: Log API URL being used for login
      console.log('🔍 LOGIN: Using API URL:', urls.auth.login);
      console.log('🔍 LOGIN: API Base URL:', urls.base);
      console.log('🔍 LOGIN: NEXT_PUBLIC_API_URL:', typeof window !== 'undefined' ? (window as any).__NEXT_PUBLIC_API_URL__ || 'NOT SET IN WINDOW' : 'SERVER SIDE');
      
      const response = await fetch(urls.auth.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      // Handle non-200 responses
      if (!response.ok) {
        const errorData = await response.json();
        const translatedError = translateError(errorData);
        setState(prev => ({ 
          ...prev, 
          error: translatedError,
          loading: false 
        }));
        return false;
      }

      const data: LoginResponse = await response.json();

      // ✅ DEBUG: Log login response
      console.log('🔍 LOGIN RESPONSE:', {
        success: data.success,
        hasToken: !!data.data?.token,
        user: data.data?.user,
        userPermissions: (data.data?.user as any)?.permissions,
        permissionsCount: (data.data?.user as any)?.permissions?.length || 0,
      });

      if (data.success && data.data?.token) {
        // Store auth data
        storeAuthData(data.data.token, data.data.user);
        
        // ✅ DEBUG: Log after storing
        console.log('🔍 LOGIN: After storeAuthData, checking localStorage...');
        const storedAuth = localStorage.getItem('authData');
        if (storedAuth) {
          const parsed = JSON.parse(storedAuth);
          console.log('🔍 LOGIN: Stored permissions in localStorage:', {
            hasPermissions: !!parsed.user?.permissions,
            permissionsCount: parsed.user?.permissions?.length || 0,
            permissions: parsed.user?.permissions,
          });
        }
        
        // Step 3: Verify token was actually stored before proceeding
        const { getAuthToken } = await import('@rentalshop/utils');
        
        // Wait a small amount to ensure localStorage write completes (localStorage is synchronous but we want to be safe)
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Verify token is accessible
        const storedToken = getAuthToken();
        if (!storedToken) {
          console.error('❌ Login: Token was not stored properly, retrying...');
          // Retry storing token once
          storeAuthData(data.data.token, data.data.user);
          await new Promise(resolve => setTimeout(resolve, 10));
          const retryToken = getAuthToken();
          if (!retryToken) {
            console.error('❌ Login: Failed to store token after retry');
            setState(prev => ({ 
              ...prev, 
              error: 'Failed to store authentication token',
              loading: false 
            }));
            return false;
          }
        }
        
        console.log('✅ Login: Token verified and stored successfully');
        setState(prev => ({ 
          ...prev, 
          user: data.data.user, 
          loading: false,
          error: null 
        }));
        return true;
      } else {
        const translatedError = translateError(data);
        setState(prev => ({ 
          ...prev, 
          error: translatedError,
          loading: false 
        }));
        return false;
      }
    } catch (err) {
      const errorMessage = translateError(err);
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        loading: false 
      }));
      return false;
    }
  }, [translateError]);

  const logout = useCallback(() => {
    clearAuthData();
    setState({
      user: null,
      loading: false,
      error: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setState(prev => ({ ...prev, user: null, loading: false }));
        return;
      }

      const { apiUrls, authenticatedFetch } = await import('@rentalshop/utils');
      const response = await authenticatedFetch(apiUrls.settings.user);

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data) {
          // Use storeAuthData to properly save user data (maintains token and authData structure)
          const token = getAuthToken();
          if (token) {
            storeAuthData(token, data.data);
          } else {
            // Fallback: just save user if no token
            localStorage.setItem('user', JSON.stringify(data.data));
          }
          
          setState(prev => ({ 
            ...prev, 
            user: data.data,
            loading: false 
          }));
        }
      } else if (response.status === 401) {
        logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [logout]);

  // ============================================================================
  // INITIALIZATION - Standard Approach with localStorage Event Listener
  // ============================================================================

  // Helper function to sync state from localStorage
  const syncStateFromStorage = useCallback(() => {
    const token = getAuthToken();
    const storedUser = getStoredUser();

    if (token && storedUser) {
      setState(prev => {
        // Only update if state is different to avoid unnecessary re-renders
        if (prev.user?.id !== storedUser.id) {
          console.log('🔄 useAuth: Syncing user state from localStorage');
          console.log('🔍 useAuth: Stored user permissions:', (storedUser as any).permissions);
          // ✅ Ensure permissions are included when syncing from localStorage
          const userWithPermissions = {
            ...storedUser,
            permissions: (storedUser as any).permissions || [], // ✅ Preserve permissions
          } as User;
          return { 
        ...prev, 
        user: userWithPermissions, 
        loading: false 
          };
        }
        // Ensure loading is false even if user is the same
        if (prev.loading) {
          return { ...prev, loading: false };
        }
        return prev;
      });
    } else {
      setState(prev => {
        // Always set loading to false, even if user is already null
        if (prev.user !== null || prev.loading) {
          console.log('🔄 useAuth: Clearing user state (no token found)');
          return { ...prev, user: null, loading: false };
        }
        return prev;
      });
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    syncStateFromStorage();
  }, [syncStateFromStorage]);

  // Listen to localStorage changes (standard approach for cross-component sync)
  // This handles the case where login happened in another component/page
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      // Only react to authData changes
      if (e.key === 'authData' || e.key === 'authToken') {
        console.log('🔄 useAuth: localStorage changed, syncing state...');
        syncStateFromStorage();
      }
    };

    // Listen to storage events (works across tabs and components)
    window.addEventListener('storage', handleStorageChange);

    // Also listen to custom events for same-tab sync
    // (storage event only fires in other tabs, not same tab)
    const handleCustomStorageChange = () => {
      syncStateFromStorage();
    };
    window.addEventListener('auth-storage-change', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-storage-change', handleCustomStorageChange);
    };
  }, [syncStateFromStorage]);

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
