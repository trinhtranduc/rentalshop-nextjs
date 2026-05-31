'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { AvailabilityCheckPage, PageLoadingIndicator } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { outletsApi } from '@rentalshop/utils';
import type { CurrencyCode } from '@rentalshop/types';

function AvailabilityPageContent() {
  const { user, loading: authLoading } = useAuth();
  const [outlets, setOutlets] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(true);

  const merchantId = user?.merchant?.id ?? user?.merchantId;

  useEffect(() => {
    if (authLoading) return;

    const loadOutlets = async () => {
      try {
        if (user?.outletId && user?.outlet) {
          setOutlets([
            {
              id: user.outletId,
              name: (user.outlet as { name?: string }).name || `Outlet ${user.outletId}`,
            },
          ]);
          return;
        }

        if (!merchantId) {
          setOutlets([]);
          return;
        }

        const response = await outletsApi.getOutletsByMerchant(Number(merchantId));
        if (response.success && response.data?.outlets) {
          setOutlets(
            response.data.outlets.map((o: { id: number; name: string }) => ({
              id: o.id,
              name: o.name,
            }))
          );
        }
      } catch (error) {
        console.error('Failed to load outlets for availability page:', error);
      } finally {
        setLoadingOutlets(false);
      }
    };

    void loadOutlets();
  }, [authLoading, user, merchantId]);

  if (authLoading || loadingOutlets) {
    return <PageLoadingIndicator />;
  }

  const currency: CurrencyCode =
    ((user?.merchant as { currency?: CurrencyCode })?.currency as CurrencyCode) || 'USD';

  return (
    <AvailabilityCheckPage
      user={user}
      outlets={outlets}
      currency={currency}
    />
  );
}

export default function AvailabilityPage() {
  return (
    <Suspense fallback={<PageLoadingIndicator />}>
      <AvailabilityPageContent />
    </Suspense>
  );
}
