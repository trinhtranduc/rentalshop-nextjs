'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LoginForm } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, error: authError, loading: authLoading, clearError } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

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

  const handleLogin = async (data: any) => {
    try {
      console.log('🔐 Login attempt started with:', { email: data.email });
      setLocalError(null);
      // Note: Don't clear authError here - let useAuth handle it
      
      console.log('📞 Calling login function from useAuth hook...');
      const success = await login(data.email, data.password);
      console.log('📥 Login result received:', success);
      
      if (success) {
        console.log('✅ Login successful');
        // Don't redirect here - useAuth will update user state
        // useEffect will handle the redirect when user state updates
      } else {
        console.log('❌ Login failed');
        // Don't set local error - let authError from useAuth handle it
      }
      
    } catch (error: any) {
      console.error('💥 Login error caught:', error);
      setLocalError(error.message || 'Login failed. Please try again.');
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <LoginForm
      onLogin={handleLogin}
      onNavigate={handleNavigate}
      error={authError || localError}
      loading={authLoading}
      onInputChange={() => {
        clearError();
        setLocalError(null);
      }}
    />
  );
} 