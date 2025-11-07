'use client';

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ForgetPasswordForm, LanguageSwitcher } from '@rentalshop/ui';
import { authApi } from '@rentalshop/utils';

export default function ForgetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await authApi.requestPasswordReset(data.email);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to send reset email');
      }
      
      console.log('Password reset email sent:', result);
      setSuccess(true);
      
    } catch (error: any) {
      console.error('Password reset failed:', error);
      setError(error.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 relative">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="compact" />
      </div>

      <ForgetPasswordForm
        onResetPassword={handleResetPassword}
        onNavigate={handleNavigate}
        error={error}
        loading={loading}
        success={success}
      />
    </div>
  );
} 