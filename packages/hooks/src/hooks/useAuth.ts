'use client';

import { useState, useEffect, useCallback } from 'react';
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
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data: LoginResponse = await response.json();

      if (data.success && data.data?.token) {
        // Store auth data
        localStorage.setItem('authToken', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
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
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setState({
      user: null,
      loading: false,
      error: null,
    });
    window.location.href = '/login';
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setState(prev => ({ ...prev, user: null, loading: false }));
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setState(prev => ({ 
            ...prev, 
            user: data.data,
            loading: false 
          }));
          localStorage.setItem('user', JSON.stringify(data.data));
        } else {
          throw new Error('Failed to refresh user');
        }
      } else if (response.status === 401) {
        // Token expired or invalid
        logout();
      } else {
        throw new Error('Failed to refresh user');
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
      logout();
    }
  }, [logout]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    // Check for existing auth on mount
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setState(prev => ({ ...prev, user: userData, loading: false }));
      } catch (error) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setState(prev => ({ ...prev, loading: false }));
      }
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

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
  };
}
