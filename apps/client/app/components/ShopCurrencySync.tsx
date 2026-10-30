'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useCurrency } from '@rentalshop/ui';
import { settingsApi } from '@rentalshop/utils';
import { shouldRefreshShopCurrency } from '../settings/settings-model';

interface ShopCurrencySyncProps {
  userId?: number | string | null;
  role?: string | null;
  hasMerchant: boolean;
}

/** Put the shop currency into the stored user, so a reload and the other `useAuth()` instances keep it. */
function storeShopCurrency(currency: string) {
  try {
    const raw = window.localStorage.getItem('authData');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data?.user?.merchant) return;
    data.user.merchant.currency = currency;
    window.localStorage.setItem('authData', JSON.stringify(data));
    window.dispatchEvent(new Event('auth-storage-change'));
  } catch {
    // Storage blocked: the next read of the currency fixes the screen.
  }
}

/**
 * #1321 The shop currency is chosen by the owner (phone or another web), but the web took it only from the login.
 * Read `GET /api/settings/currency` (every role) on load and when the tab comes back, at most once a minute, and
 * redraw the prices through the currency context. Renders nothing; mount it inside `CurrencyProvider`.
 */
export function ShopCurrencySync({ userId, role, hasMerchant }: ShopCurrencySyncProps) {
  const { currency, setCurrency } = useCurrency();
  const shown = useRef(currency);
  shown.current = currency;
  const lastRefreshAt = useRef<number | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    const now = Date.now();
    if (inFlight.current || !shouldRefreshShopCurrency({ now, role, hasMerchant, lastRefreshAt: lastRefreshAt.current })) return;
    inFlight.current = true;
    const previous = lastRefreshAt.current;
    lastRefreshAt.current = now;
    try {
      const res = await settingsApi.getMerchantCurrency();
      const next = String(res.success ? res.data?.currency ?? '' : '').trim().toUpperCase();
      if (next !== 'VND' && next !== 'USD') {
        lastRefreshAt.current = previous; // failed read: try again at the next trigger
        return;
      }
      if (next !== shown.current) {
        setCurrency(next);
        storeShopCurrency(next);
      }
    } catch {
      lastRefreshAt.current = previous;
    } finally {
      inFlight.current = false;
    }
  }, [role, hasMerchant, setCurrency]);

  // Page load (and a different user logging in). Effects run twice in dev; only a changed user clears the clock.
  const readFor = useRef<ShopCurrencySyncProps['userId']>(undefined);
  useEffect(() => {
    if (readFor.current !== userId) {
      readFor.current = userId;
      lastRefreshAt.current = null;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Tab back in front
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [refresh]);

  return null;
}

export default ShopCurrencySync;
