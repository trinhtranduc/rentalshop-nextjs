'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ForgetPasswordForm } from '@rentalshop/ui';

export default function ForgetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with your actual password reset API call
      console.log('Reset password data:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Handle success
      console.log('Password reset email sent!');
      setSuccess(true);
    } catch (error) {
      console.error('Password reset failed:', error);
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <ForgetPasswordForm
      onResetPassword={handleResetPassword}
      onNavigate={handleNavigate}
      error={error}
      loading={loading}
      success={success}
    />
  );
} 