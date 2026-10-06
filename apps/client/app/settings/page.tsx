'use client';

/**
 * Cài đặt now opens as a dialog over the current page (#539). This route stays for old links,
 * `/subscription` and the Lemon Squeezy return: `/settings?tab=x&…` → `/dashboard?settings=x&…`.
 */
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { legacySettingsRedirect } from './settings-model';

export default function SettingsRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Loyalty left Settings in #528.
    if (searchParams.get('tab') === 'loyalty') router.replace('/loyalty');
    else router.replace(legacySettingsRedirect(searchParams.toString()));
  }, [searchParams, router]);

  return null;
}
