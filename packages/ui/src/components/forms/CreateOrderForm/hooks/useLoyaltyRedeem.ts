/**
 * Hook for loyalty redeem state in CreateOrderForm
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loyaltyApi } from '@rentalshop/utils';
import type { LoyaltyCustomerSummary } from '@rentalshop/types';

interface UseLoyaltyRedeemOptions {
  customerId?: number;
  orderType: 'RENT' | 'SALE';
  orderTotalAmount: number;
  enabled?: boolean;
}

export function useLoyaltyRedeem({
  customerId,
  orderType,
  orderTotalAmount,
  enabled = true,
}: UseLoyaltyRedeemOptions) {
  const [summary, setSummary] = useState<LoyaltyCustomerSummary | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [earnPreview, setEarnPreview] = useState<number | null>(null);
  const earnDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !customerId) {
      setSummary(null);
      setUsePoints(false);
      setRedeemPoints(0);
      setLoyaltyDiscount(0);
      setEarnPreview(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    loyaltyApi
      .getCustomerSummary(customerId)
      .then((response) => {
        if (cancelled) return;
        if (response.success && response.data) {
          setSummary(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customerId, enabled]);

  // Earn preview calculation (debounced)
  useEffect(() => {
    if (!enabled || !customerId || orderTotalAmount <= 0) {
      setEarnPreview(null);
      return;
    }

    if (earnDebounceRef.current) {
      clearTimeout(earnDebounceRef.current);
    }

    earnDebounceRef.current = setTimeout(() => {
      loyaltyApi
        .calculateEarn({
          customerId,
          orderType,
          orderTotalAmount,
          loyaltyDiscount: loyaltyDiscount || undefined,
        })
        .then((response) => {
          if (response.success && response.data) {
            setEarnPreview((response.data as any).estimatedPoints ?? null);
          } else {
            setEarnPreview(null);
          }
        })
        .catch(() => {
          setEarnPreview(null);
        });
    }, 500);

    return () => {
      if (earnDebounceRef.current) {
        clearTimeout(earnDebounceRef.current);
      }
    };
  }, [enabled, customerId, orderType, orderTotalAmount, loyaltyDiscount]);

  const validateRedeem = useCallback(async () => {
    if (!enabled || !customerId || !usePoints || redeemPoints <= 0) {
      setLoyaltyDiscount(0);
      setValidationError(null);
      return;
    }

    const response = await loyaltyApi.validateRedeem({
      customerId,
      points: redeemPoints,
      orderTotalAmount,
      orderType,
    });

    if (response.success && response.data) {
      const data = response.data as any;
      if (data.valid) {
        setLoyaltyDiscount(data.discount || 0);
        setValidationError(null);
      } else {
        setLoyaltyDiscount(0);
        setValidationError(data.reason || 'LOYALTY_REDEEM_INVALID');
      }
    }
  }, [customerId, enabled, orderTotalAmount, orderType, redeemPoints, usePoints]);

  useEffect(() => {
    validateRedeem().catch(() => undefined);
  }, [validateRedeem]);

  const amountDue = useMemo(
    () => Math.max(0, orderTotalAmount - loyaltyDiscount),
    [loyaltyDiscount, orderTotalAmount]
  );

  return {
    summary,
    usePoints,
    setUsePoints,
    redeemPoints,
    setRedeemPoints,
    loyaltyDiscount,
    amountDue,
    loading,
    validationError,
    canUseLoyalty: enabled && !!summary?.canRedeem,
    maxRedeemPoints: summary?.maxRedeemPoints ?? 0,
    earnPreview,
  };
}
