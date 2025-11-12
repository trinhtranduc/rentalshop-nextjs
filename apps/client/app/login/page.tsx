'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoginForm } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, error: authError, loading: authLoading, clearError } = useAuth();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (user) {
      console.log('✅ User already logged in, redirecting to dashboard...');
      console.log('📍 Current pathname:', window.location.pathname);
      
      // Use setTimeout to ensure state is fully synced
      setTimeout(() => {
        console.log('🚀 Executing redirect to /dashboard');
        window.location.href = '/dashboard';
      }, 100);
    }
  }, [user]);

  const handleLogin = async (data: { email: string; password: string; tenantKey: string }) => {
    try {
      console.log('🔐 Login attempt started with:', { email: data.email });
      console.log('📞 Calling login function from useAuth hook...');
      const loginWithTenant = login as (
        email: string,
        password: string,
        tenantKey?: string
      ) => Promise<any>;
      const success = await loginWithTenant(
        data.email,
        data.password,
        data.tenantKey || undefined
      );
      console.log('📥 Login result received:', success);
      
      if (success) {
        console.log('✅ Login successful');
        // Redirect immediately to avoid accidental extra keypress triggering other links
        router.replace('/dashboard');
        return;
      } else {
        console.log('❌ Login failed');
        // Don't set local error - let authError from useAuth handle it
      }
      
    } catch (error: any) {
      console.error('💥 Login error caught:', error);
      // Error state handled inside useAuth
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <LoginForm
      onLogin={handleLogin}
      onNavigate={handleNavigate}
      error={authError}
      loading={authLoading}
      onInputChange={() => {
        clearError();
      }}
    />
  );
} 