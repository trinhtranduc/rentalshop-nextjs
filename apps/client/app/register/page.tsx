'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RegisterForm, ToastContainer, useToasts } from '@rentalshop/ui';
import { authApi } from '@rentalshop/utils';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toasts, showSuccess, showError, removeToast } = useToasts();

  const handleRegister = async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare registration data for the centralized API
      const registrationData = {
        email: data.login,
        password: data.password,
        name: data.name,
        phone: data.phone,
        role: data.role || 'MERCHANT', // Default to MERCHANT for public registration
        businessName: data.businessName,
        // Default outlet name to business name
        outletName: data.businessName,
      };
      
      // Use centralized API client
      const result = await authApi.register(registrationData);
      
      if (!result.success) {
        throw new Error(result.message || 'Registration failed');
      }
      
      // Store token in localStorage or secure storage
      if (result.data?.token) {
        localStorage.setItem('authToken', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
      }
      
      console.log('Registration successful:', result);
      
      // Show success toast
      showSuccess(
        "Registration Successful! 🎉",
        "Your merchant account has been created. Redirecting to login..."
      );
      
      // Navigate to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      
    } catch (error: any) {
      console.error('Registration failed:', error);
      setError(error.message || 'Registration failed. Please try again.');
      
      // Show error toast
      showError(
        "Registration Failed",
        error.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <RegisterForm
        onRegister={handleRegister}
        onNavigate={handleNavigate}
        registrationError={error}
      />
    </>
  );
} 