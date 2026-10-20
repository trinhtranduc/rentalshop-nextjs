import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BookingTracking } from './BookingTracking';

interface BookingTrackingPageProps {
  params: Promise<{ tenantKey: string; code: string }>;
}

/** #1124 — the customer's tracking page for a booking request (`/{tenantKey}/booking/{code}`) */
export default async function BookingTrackingPage({ params }: BookingTrackingPageProps) {
  const { tenantKey, code } = await params;
  if (!/^[a-z0-9-]+$/i.test(tenantKey) || !/^[a-z0-9]{5}$/i.test(code)) notFound();
  return <BookingTracking tenantKey={tenantKey} code={code.toUpperCase()} />;
}

export const metadata: Metadata = {
  title: 'Booking request',
  // A personal page reached by its code: never in search results
  robots: { index: false, follow: false },
};
