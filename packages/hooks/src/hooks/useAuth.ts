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
      console.log('🔄 refreshUser called, token exists:', !!token);
      
      if (!token) {
        console.log('❌ No token found, setting user to null');
        setState(prev => ({ ...prev, user: null, loading: false }));
        return;
      }

      console.log('🌐 Fetching user profile from API...');
      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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
          localStorage.setItem('user', JSON.stringify(data.data));
        } else {
          console.error('❌ API returned success:false:', data);
          throw new Error('Failed to refresh user');
        }
      } else if (response.status === 401) {
        console.log('🔒 Token expired, logging out');
        // Token expired or invalid
        logout();
      } else {
        console.error('❌ API error:', response.status, response.statusText);
        // If we have a token but API fails, clear corrupted data
        if (localStorage.getItem('authToken')) {
          console.log('🧹 Clearing corrupted auth data...');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          setState(prev => ({ ...prev, user: null, loading: false }));
        }
        throw new Error('Failed to refresh user');
      }
    } catch (err) {
      console.error('💥 Error refreshing user:', err);
      // If we have a token but refresh fails, clear corrupted data
      if (localStorage.getItem('authToken')) {
        console.log('🧹 Clearing corrupted auth data due to error...');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setState(prev => ({ ...prev, user: null, loading: false }));
      }
    }
  }, [logout]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    // Check for existing auth on mount and refresh user data
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');

    console.log('🔍 useAuth useEffect - localStorage check:', {
      hasToken: !!token,
      hasStoredUser: !!storedUser,
      tokenLength: token?.length,
      storedUserLength: storedUser?.length,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'null',
      storedUserPreview: storedUser ? storedUser.substring(0, 100) + '...' : 'null'
    });

    if (token && storedUser && storedUser !== 'null') {
      try {
        const userData = JSON.parse(storedUser);
        console.log('✅ Parsed stored user data:', userData);
        setState(prev => ({ ...prev, user: userData, loading: false }));
        
        // Refresh user data from API to get latest merchant/outlet info
        console.log('🔄 Calling refreshUser...');
        refreshUser();
      } catch (error) {
        console.error('❌ Error parsing stored user data:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setState(prev => ({ ...prev, loading: false }));
      }
    } else if (token && (!storedUser || storedUser === 'null')) {
      console.log('🔄 Token exists but no user data - refreshing from API...');
      // We have a token but no user data, try to refresh from API
      refreshUser();
    } else {
      console.log('❌ No token or stored user found - user will be null');
      setState(prev => ({ ...prev, loading: false }));
    }
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
  };
}
