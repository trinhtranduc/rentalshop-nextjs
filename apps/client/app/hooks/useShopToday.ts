'use client';

import { useEffect, useState } from 'react';
import { SHOP_TIMEZONE } from '@rentalshop/utils';
import { shopToday } from './shop-today';

/** Re-check at least hourly too: a sleeping laptop or a changed system clock delays or skews a long timer. */
const MAX_WAIT_MS = 60 * 60 * 1000;

/**
 * The shop's day key (`YYYY-MM-DD`, Vietnam), kept current while the tab stays open (#589, WEB-2):
 * recomputed when the tab gets focus or becomes visible, and by a timer just after the next Vietnam midnight.
 * The value only changes when the day does, so dependent memos and requests rerun once per day.
 */
export function useShopToday(timeZone: string = SHOP_TIMEZONE): string {
  const [key, setKey] = useState(() => shopToday(new Date(), timeZone).key);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      const now = shopToday(new Date(), timeZone);
      setKey(now.key);
      if (timer) clearTimeout(timer);
      timer = setTimeout(refresh, Math.min(now.msToNextDay + 500, MAX_WAIT_MS));
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [timeZone]);

  return key;
}
