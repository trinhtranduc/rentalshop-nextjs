'use client';

import { useEffect, useRef, useState } from 'react';
import { productsApi } from '@rentalshop/utils';
import type { DerivedAvailabilityResult } from './types';
import { deriveAvailabilityResult } from './utils';
import { shopDayRangeIso } from './availability-days';

const DEBOUNCE_MS = 350;

export type ProductCheckState =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'done'; result: DerivedAvailabilityResult };

interface Item {
  productId: number;
  quantity: number;
}

/**
 * Checks every selected product for the same period at once, so each product row can say
 * "Còn 21/23" or "Thiếu 1" without clicking it. One request per product, in parallel.
 */
export function useAvailabilityResults(items: Item[], pickup: string, returnDate: string, outletId?: number) {
  const [results, setResults] = useState<Map<number, ProductCheckState>>(new Map());
  const [nonce, setNonce] = useState(0);
  const abortRef = useRef(0);
  const key = items.map((i) => `${i.productId}x${i.quantity}`).join(',');
  const ready = Boolean(pickup && returnDate && outletId && pickup <= returnDate && items.length);

  useEffect(() => {
    if (!ready) {
      setResults(new Map());
      return;
    }
    const run = ++abortRef.current;
    setResults(new Map(items.map((i) => [i.productId, { state: 'loading' } as ProductCheckState])));
    const timer = setTimeout(() => {
      const range = shopDayRangeIso(pickup, returnDate);
      items.forEach(async ({ productId, quantity }) => {
        let next: ProductCheckState;
        try {
          const response = await productsApi.checkProductAvailability(productId, {
            ...range,
            quantity,
            outletId,
            includeTimePrecision: true,
            timeZone: 'Asia/Ho_Chi_Minh',
          });
          next =
            response.success && response.data
              ? { state: 'done', result: { ...deriveAvailabilityResult(response.data, quantity, outletId), raw: response.data } }
              : { state: 'error' };
        } catch {
          next = { state: 'error' };
        }
        if (run !== abortRef.current) return; // a newer period or list replaced this run
        setResults((prev) => new Map(prev).set(productId, next));
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for `items`
  }, [key, pickup, returnDate, outletId, ready, nonce]);

  return { results, ready, retry: () => setNonce((n) => n + 1) };
}
