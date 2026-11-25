'use client';

/**
 * "Lịch giao trả" is now the Lịch view of the Orders page. This route stays so saved links keep working: it sends
 * month, year, day and branch on to `/orders?view=calendar` (#1641).
 */
import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { calendarRedirectQuery } from '../orders/orders-view-model';

function CalendarRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    router.replace(`/orders?${calendarRedirectQuery(searchParams)}`);
  }, [router, searchParams]);
  return null;
}

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarRedirect />
    </Suspense>
  );
}
