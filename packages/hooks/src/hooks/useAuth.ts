'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuthToken, getStoredUser, clearAuthData, storeAuthData, authApi } from '@rentalshop/utils';
import type { User } from '@rentalshop/types';
import { useErrorTranslations } from './useTranslation';
import { useToastHandler } from './useToast';

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
  
  // Use translation + toast helpers
  const t = useErrorTranslations();
  const { showSuccess, showError } = useToastHandler();

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

  const login = useCallback(
    async (email: string, password: string, tenantKey?: string) => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const result = await authApi.login({ email, password, tenantKey });

        if (!result.success || !result.data) {
          const message = result.message || translateError(result);
          throw new Error(message || 'Login failed');
      }

        const { token, user } = result.data;
        // Persist to local storage
        storeAuthData(token, user);

        setState({
          user,
          loading: false,
          error: null,
        });

        showSuccess(t('login.success'));
        return result;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : translateError(err);

        setState(prev => ({ ...prev, loading: false, error: message }));
        showError(t('login.failed', { defaultValue: 'Login failed' }), message);

        throw err;
    }
    },
    [showError, showSuccess, t, translateError]
  );

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
