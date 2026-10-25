'use client';

/**
 * "Cách thu cọc" of the shop (#1199): GET /api/settings/deposit, any signed-in role. The last answer is kept for the
 * session so the create screen does not wait on it twice; every mount asks again. A failed call leaves `settings`
 * null, which every screen treats as "Thu cọc 1 lần" (the screens stay as they were).
 */
import { useCallback, useEffect, useState } from 'react';
import { installmentsApi, type DepositSettings } from '@rentalshop/utils';

let last: DepositSettings | null = null;

export function rememberDepositSettings(next: DepositSettings | null) {
  last = next;
}

export function useDepositSettings(enabled = true) {
  const [settings, setSettings] = useState<DepositSettings | null>(last);
  const [loading, setLoading] = useState(enabled && !last);

  const reload = useCallback(async () => {
    try {
      const res = await installmentsApi.getDepositSettings();
      if (res.success && res.data) {
        last = res.data;
        setSettings(res.data);
      }
    } catch {
      // Unknown: the screens behave as in "Thu cọc 1 lần"
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { settings, loading, reload, setSettings: (next: DepositSettings) => { last = next; setSettings(next); } };
}
