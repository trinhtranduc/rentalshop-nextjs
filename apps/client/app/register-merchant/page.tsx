'use client';

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * @deprecated This page has been merged with /register
 * Redirects to the unified registration page
 */
export default function RegisterMerchantPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the unified registration page
    router.replace('/register');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to registration...</p>
      </div>
    </div>
  );
}
