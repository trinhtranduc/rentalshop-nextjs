'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@rentalshop/hooks';

export default function AdminHomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Don't redirect while loading to avoid race conditions
    if (loading) {
      console.log('⏳ Admin Home: Auth still loading, waiting...');
      return;
    }
    
    // Check if user is already authenticated
    if (user) {
      console.log('✅ Admin Home: User authenticated, redirecting to dashboard...');
      // Redirect to dashboard if already logged in
      router.push('/dashboard');
    } else {
      console.log('❌ Admin Home: User not authenticated, redirecting to login...');
      // Redirect to login if not authenticated
      router.push('/login');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-action-primary mx-auto mb-4"></div>
        <p className="text-text-secondary">Redirecting...</p>
      </div>
    </div>
  );
} 