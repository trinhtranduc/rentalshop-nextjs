'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuthToken, getStoredUser, clearAuthData } from '../../lib/auth/auth';
import type { User } from '@rentalshop/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing authentication on mount
    const checkAuth = async () => {
      try {
        const token = getAuthToken();
        if (token) {
          const userData = getStoredUser();
          if (userData) {
            // Convert StoredUser to User type
            const user: User = {
              id: userData.id,
              firstName: userData.firstName,
              lastName: userData.lastName,
              name: userData.name,
              email: userData.email,
              phone: userData.phone,
              role: userData.role,
              isActive: userData.isActive,
              createdAt: userData.createdAt,
              emailVerified: userData.emailVerified,
              updatedAt: userData.updatedAt,
              merchantId: userData.merchantId,
              outletId: userData.outletId,
            };
            setUser(user);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData: User, token: string) => {
    setUser(userData);
  };

  const logout = () => {
    clearAuthData();
    setUser(null);
    // Redirect to login page
    window.location.href = '/login';
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
