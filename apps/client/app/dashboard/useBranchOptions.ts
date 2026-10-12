'use client';

import { useEffect, useState } from 'react';
import { outletsApi } from '@rentalshop/utils';
import { toBranchOptions, type BranchOption } from './branch-model';

/**
 * #827 / #852: the merchant's branches (active and inactive) for the pickers.
 * `[]` while off (not a merchant, or the user is still loading); null once on until the list arrives, so a
 * page waits for it and loads its data once with the right branches.
 */
export function useBranchOptions(enabled: boolean): BranchOption[] | null {
  const [loaded, setLoaded] = useState<BranchOption[] | null>(null);
  useEffect(() => {
    if (!enabled || loaded !== null) return;
    let cancelled = false;
    outletsApi
      .getOutlets({ isActive: 'all' as unknown as boolean, limit: 100 })
      .then((res) => {
        if (!cancelled) setLoaded(res.success && res.data ? toBranchOptions(res.data.outlets as never) : []);
      })
      .catch(() => {
        if (!cancelled) setLoaded([]);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, loaded]);
  return enabled ? loaded : [];
}
