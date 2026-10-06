'use client';

/**
 * Loyalty points on a new order (#523): the customer's summary, the points to use and the discount
 * the API allows. Same calls as the old form's useLoyaltyRedeem; not used when editing.
 */
import { useEffect, useState } from 'react';
import { loyaltyApi } from '@rentalshop/utils';
import type { LoyaltyCustomerSummary } from '@rentalshop/types';

export function useLoyalty({
  customerId,
  orderType,
  total,
  enabled,
}: {
  customerId: number | null;
  orderType: 'RENT' | 'SALE';
  total: number;
  enabled: boolean;
}) {
  const [summary, setSummary] = useState<LoyaltyCustomerSummary | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [points, setPoints] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setSummary(null);
    setUsePoints(false);
    setPoints(0);
    setDiscount(0);
    if (!enabled || !customerId) return;
    let live = true;
    loyaltyApi
      .getCustomerSummary(customerId)
      .then((res) => {
        if (live && res.success && res.data) setSummary(res.data as LoyaltyCustomerSummary);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [customerId, enabled]);

  useEffect(() => {
    if (!enabled || !customerId || !usePoints || points <= 0 || total <= 0) {
      setDiscount(0);
      setInvalid(false);
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      loyaltyApi
        .validateRedeem({
          customerId,
          points,
          orderTotalAmount: total,
          orderType,
        })
        .then((res) => {
          if (!live || !res.success || !res.data) return;
          const data = res.data as { valid?: boolean; discount?: number };
          setDiscount(data.valid ? data.discount || 0 : 0);
          setInvalid(!data.valid);
        })
        .catch(() => undefined);
    }, 400);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [enabled, customerId, usePoints, points, total, orderType]);

  return {
    summary,
    canUse: enabled && !!summary?.canRedeem,
    max: summary?.maxRedeemPoints ?? 0,
    usePoints,
    setUsePoints,
    points,
    setPoints,
    discount: usePoints ? discount : 0,
    invalid,
    redeemPoints: usePoints && points > 0 && !invalid ? points : 0,
  };
}
