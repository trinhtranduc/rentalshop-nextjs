'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LoginForm } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (data: any) => {
    try {
      console.log('🔐 Login attempt started with:', { email: data.email });
      setLoading(true);
      setError(null);
      
      console.log('📞 Calling login function from useAuth hook...');
      const success = await login(data.email, data.password);
      console.log('📥 Login result received:', success);
      
      if (success) {
        console.log('✅ Login successful, redirecting to dashboard...');
        router.push('/dashboard');
      } else {
        console.log('❌ Login failed');
        setError('Login failed. Please check your credentials.');
      }
      
    } catch (error: any) {
      console.error('💥 Login error caught:', error);
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      console.log('🏁 Login attempt finished');
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <LoginForm
      onLogin={handleLogin}
      onNavigate={handleNavigate}
      error={error}
      loading={loading}
    />
  );
} 