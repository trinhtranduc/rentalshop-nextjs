'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ResetPasswordForm } from '@rentalshop/ui';
import { authApi } from '@rentalshop/utils';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setError('Invalid reset link. Please request a new password reset.');
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const handleResetPassword = async (data: { password: string; confirmPassword: string; token: string }) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await authApi.resetPassword(data.token, data.password, data.confirmPassword);
      
      if (!result.success) {
        // Handle specific error codes
        if (result.code === 'PASSWORD_RESET_TOKEN_INVALID' || result.code === 'PASSWORD_RESET_TOKEN_EXPIRED') {
          throw new Error('Reset link is invalid or has expired. Please request a new password reset.');
        } else if (result.code === 'PASSWORD_RESET_TOKEN_USED') {
          throw new Error('This reset link has already been used. Please request a new password reset.');
        }
        throw new Error(result.message || 'Failed to reset password');
      }
      
      console.log('Password reset successful:', result);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      
    } catch (error: any) {
      console.error('Password reset failed:', error);
      setError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error || 'Invalid reset link. Please request a new password reset.'}</p>
            <button
              onClick={() => router.push('/forget-password')}
              className="mt-4 text-red-700 underline"
            >
              Request new password reset
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ResetPasswordForm
      token={token}
      onResetPassword={handleResetPassword}
      onNavigate={handleNavigate}
      error={error}
      loading={loading}
      success={success}
    />
  );
}

