'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LoginForm } from '@rentalshop/ui';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with your actual login API call
      console.log('Login data:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Handle success
      console.log('Login successful!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      setError('Invalid email or password');
    } finally {
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