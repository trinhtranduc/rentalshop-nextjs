'use client'

import { useState, useEffect } from 'react';
import type { Subscription } from '@rentalshop/types';

interface SubscriptionStatus {
  hasSubscription: boolean;
  subscription: Subscription | null;
  status: 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED' | 'NONE';
  isTrial: boolean;
  isActive: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry: number | null;
  planName: string | null;
  planLimits: {
    maxOutlets: number;
    maxUsers: number;
    maxProducts: number;
    maxCustomers: number;
  };
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSubscriptionStatus(): SubscriptionStatus {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/subscriptions/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSubscription(data.data.subscription);
      } else {
        setError(data.message || 'Failed to fetch subscription status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const isExpired = (endDate: string | Date | null) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  const isExpiringSoon = (endDate: string | Date | null) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const getDaysUntilExpiry = (endDate: string | Date | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getPlanLimits = (subscription: Subscription | null) => {
    if (!subscription?.plan) {
      return {
        maxOutlets: 0,
        maxUsers: 0,
        maxProducts: 0,
        maxCustomers: 0
      };
    }

    return {
      maxOutlets: subscription.plan.maxOutlets,
      maxUsers: subscription.plan.maxUsers,
      maxProducts: subscription.plan.maxProducts,
      maxCustomers: subscription.plan.maxCustomers
    };
  };

  return {
    hasSubscription: !!subscription,
    subscription,
    status: subscription?.status as any || 'NONE',
    isTrial: subscription?.status === 'TRIAL',
    isActive: subscription?.status === 'ACTIVE',
    isExpired: isExpired(subscription?.endDate),
    isExpiringSoon: isExpiringSoon(subscription?.endDate),
    daysUntilExpiry: getDaysUntilExpiry(subscription?.endDate),
    planName: subscription?.plan?.name || null,
    planLimits: getPlanLimits(subscription),
    loading,
    error,
    refresh: fetchSubscription
  };
}
