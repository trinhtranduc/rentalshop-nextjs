'use client';

/**
 * Active modules of the signed-in merchant (#908): `merchant.modules` from the stored login, refreshed once
 * per page load from GET /api/users/profile so a module turned on / off by AnyRent shows without a new login.
 */
import { useEffect, useState } from 'react';
import { profileApi } from '@rentalshop/utils';
import { modulesOf } from './attendance-model';

let profileModules: Promise<string[] | null> | null = null;

function loadProfileModules(): Promise<string[] | null> {
  if (!profileModules) {
    profileModules = profileApi
      .getProfile()
      .then((res) => {
        const merchant = (res?.data as { merchant?: { modules?: unknown } } | undefined)?.merchant;
        return res?.success && merchant && Array.isArray(merchant.modules) ? modulesOf(res.data) : null;
      })
      .catch(() => null);
  }
  return profileModules;
}

export function useMerchantModules(user: unknown): string[] {
  const stored = modulesOf(user);
  const [fresh, setFresh] = useState<string[] | null>(null);
  const signedIn = !!(user as { merchant?: unknown } | null)?.merchant;
  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    loadProfileModules().then((m) => {
      if (alive && m) setFresh(m);
    });
    return () => {
      alive = false;
    };
  }, [signedIn]);
  return fresh ?? stored;
}
