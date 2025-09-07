'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RegisterForm } from '@rentalshop/ui';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.login,
          password: data.password,
          name: data.name,
          phone: data.phone,
          role: data.role || 'CLIENT',
          businessName: data.businessName,
          outletName: data.outletName,
          merchantCode: data.merchantCode,
          outletCode: data.outletCode,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }
      
      // Store token in localStorage or secure storage
      if (result.data?.token) {
        localStorage.setItem('authToken', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
      }
      
      console.log('Registration successful:', result);
      router.push('/login');
      
    } catch (error: any) {
      console.error('Registration failed:', error);
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <RegisterForm
      onRegister={handleRegister}
      onNavigate={handleNavigate}
      registrationError={error}
    />
  );
} 