'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LoginForm } from '@rentalshop/ui';
import { loginUser } from '../../lib/auth/auth';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (data: any) => {
    try {
      console.log('🔐 Login attempt started with:', { email: data.email });
      setLoading(true);
      setError(null);
      
      console.log('📞 Calling loginUser function...');
      const result = await loginUser(data.email, data.password);
      console.log('📥 Login result received:', result);
      
      if (result.success) {
        console.log('✅ Login successful:', result);
        console.log('🔄 Redirecting to dashboard...');
        // Small delay to ensure token is stored
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
      } else {
        console.log('❌ Login failed:', result.message);
        throw new Error(result.message || 'Login failed');
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