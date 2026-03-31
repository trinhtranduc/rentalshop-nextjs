'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageLoadingIndicator } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { USER_ROLE } from '@rentalshop/constants';

/**
 * Legacy route kept for backward compatibility.
 * Subscription UI now lives under settings tab: `/settings?tab=subscription`.
 */
export default function SubscriptionRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.role !== USER_ROLE.MERCHANT) {
      router.replace('/dashboard');
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'subscription');
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  }, [authLoading, user?.id, user?.role, searchParams, router]);

  if (authLoading) {
    return (
      <div className="py-12 text-center">
        <PageLoadingIndicator loading />
      </div>
    );
  }

  return null;
}
