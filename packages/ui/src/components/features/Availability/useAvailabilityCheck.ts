'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { productsApi } from '@rentalshop/utils';
import type { ProductWithStock } from '@rentalshop/types';
import type { AvailabilityCheckParams, DerivedAvailabilityResult } from './types';
import { deriveAvailabilityResult } from './utils';

const DEBOUNCE_MS = 400;

export interface UseAvailabilityCheckOptions {
  params: AvailabilityCheckParams;
  enabled: boolean;
}

export function useAvailabilityCheck({ params, enabled }: UseAvailabilityCheckOptions) {
  const [result, setResult] = useState<DerivedAvailabilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canCheck = useMemo(() => {
    if (!enabled) return false;
    if (!params.productId || !params.pickup || !params.returnDate) return false;
    if (!params.outletId) return false;
    if (params.pickup > params.returnDate) return false;
    return params.quantity >= 1;
  }, [enabled, params]);

  const runCheck = useCallback(async () => {
    if (!canCheck || !params.productId || !params.pickup || !params.returnDate || !params.outletId) {
      setResult(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const response = await productsApi.checkProductAvailability(params.productId, {
        startDate: new Date(`${params.pickup}T00:00:00`).toISOString(),
        endDate: new Date(`${params.returnDate}T23:59:59`).toISOString(),
        quantity: params.quantity,
        outletId: params.outletId,
        includeTimePrecision: true,
        timeZone: 'UTC',
      });

      if (controller.signal.aborted) return;

      if (response.success && response.data) {
        const derived = {
          ...deriveAvailabilityResult(response.data, params.quantity, params.outletId),
          raw: response.data,
        };
        setResult(derived);
      } else {
        setResult(null);
        setError('checkFailed');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setResult(null);
      setError('checkFailed');
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [canCheck, params]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!canCheck) {
      setResult(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    debounceRef.current = setTimeout(() => void runCheck(), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [canCheck, runCheck]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const retry = useCallback(() => void runCheck(), [runCheck]);

  const displayStatus = !canCheck ? 'idle' : isLoading ? 'loading' : result?.status ?? (error ? 'error' : 'idle');

  return { result, error, isLoading, canCheck, retry, displayStatus };
}

export async function loadProductById(productId: number): Promise<ProductWithStock | null> {
  const response = await productsApi.getProduct(productId);
  if (response.success && response.data) return response.data as ProductWithStock;
  return null;
}
