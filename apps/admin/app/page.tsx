'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../lib/auth/auth';

export default function AdminHomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already authenticated
    if (isAuthenticated()) {
      // Redirect to dashboard if already logged in
      router.push('/dashboard');
    } else {
      // Redirect to login if not authenticated
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-action-primary mx-auto mb-4"></div>
        <p className="text-text-secondary">Redirecting...</p>
      </div>
    </div>
  );
} 