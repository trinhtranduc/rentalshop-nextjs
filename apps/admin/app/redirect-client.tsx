'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RedirectClientProps {
  redirectTo: string;
}

/**
 * Client component that handles the actual redirect
 * This allows the parent page to be a server component
 * while still performing client-side navigation
 */
export function RedirectClient({ redirectTo }: RedirectClientProps) {
  const router = useRouter();

  useEffect(() => {
    router.push(redirectTo);
  }, [redirectTo, router]);

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-action-primary mx-auto mb-4"></div>
        <p className="text-text-secondary">Redirecting...</p>
      </div>
    </div>
  );
}
