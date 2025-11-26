'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuthToken, getStoredUser, clearAuthData, storeAuthData } from '@rentalshop/utils';
import type { User } from '@rentalshop/types';
import { useErrorTranslations } from './useTranslation';

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
  
  // Use translation hook for error messages
  const t = useErrorTranslations();

  // Helper function to translate error from API response
  const translateError = useCallback((errorData: any): string => {
    // If error has a code, use it for translation
    if (errorData?.code) {
      const translated = t(errorData.code);
      // If translation exists (not the same as code), use it
      if (translated !== errorData.code) {
        return translated;
      }
    }
    
    // Fallback to message if available
    if (errorData?.message) {
      // Check if message is an error code (all caps)
      if (typeof errorData.message === 'string' && /^[A-Z_]+$/.test(errorData.message)) {
        const translated = t(errorData.message);
        if (translated !== errorData.message) {
          return translated;
        }
      }
      return errorData.message;
    }
    
    // Default fallback
    return t('UNKNOWN_ERROR');
  }, [t]);

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

      if (data.success && data.data?.token) {
        // Store auth data
        storeAuthData(data.data.token, data.data.user);
        
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
      const errorMessage = err instanceof Error ? err.message : t('UNKNOWN_ERROR');
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        loading: false 
      }));
      return false;
    }
  }, [translateError, t]);

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
          // Save to localStorage
          localStorage.setItem('user', JSON.stringify(data.data));
          
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
  // INITIALIZATION - Simple & Clean
  // ============================================================================

  useEffect(() => {
    const token = getAuthToken();
    const storedUser = getStoredUser();

    if (token && storedUser) {
      // ✅ SIMPLE: Just use stored user, no validation needed
      setState(prev => ({ 
        ...prev, 
        user: storedUser as User, 
        loading: false 
      }));
    } else {
      setState(prev => ({ ...prev, user: null, loading: false }));
    }
  }, []); // Run once on mount

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
