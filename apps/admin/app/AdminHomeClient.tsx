'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@rentalshop/hooks';

/**
 * Client Component for admin home page
 * Handles client-side redirects and loading states
 * 
 * @param isAuthenticated - Server-side authentication check result
 * @param redirectTo - Where to redirect (from server-side check)
 */
export default function AdminHomeClient({ 
  isAuthenticated,
  redirectTo 
}: { 
  isAuthenticated?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Use server-side redirect if available (faster)
    if (redirectTo) {
      router.push(redirectTo);
      return;
    }
    
    // Fallback to client-side auth check
    if (loading) return;
    
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [user, loading, router, redirectTo]);

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-action-primary mx-auto mb-4"></div>
        <p className="text-text-secondary">Redirecting...</p>
      </div>
    </div>
  );
}
