'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LoginForm } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';

export default function LoginPage() {
  const router = useRouter();
  const { login, error: authError, loading: authLoading, clearError } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleLogin = async (data: any) => {
    try {
      console.log('🔐 Login attempt started with:', { email: data.email });
      setLocalError(null);
      // Note: Don't clear authError here - let useAuth handle it
      
      console.log('📞 Calling login function from useAuth hook...');
      const success = await login(data.email, data.password);
      console.log('📥 Login result received:', success);
      
      if (success) {
        console.log('✅ Login successful, redirecting to dashboard...');
        // Use window.location.href for hard redirect to ensure localStorage is fully written
        // This prevents race condition where router.push reads localStorage before write completes
        window.location.href = '/dashboard';
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