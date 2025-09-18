"use client"

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

// ============================================================================
// SUBSCRIPTION STATUS INFO HOOK
// ============================================================================

export interface SubscriptionStatusInfo {
  loading: boolean;
  hasActiveSubscription: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry: number | null;
  subscriptionType: string | null;
  canAccessFeature: (feature: string) => boolean;
  refreshStatus: () => Promise<void>;
}

export interface UseSubscriptionStatusInfoOptions {
  checkInterval?: number; // Check interval in milliseconds (default: 5 minutes)
}

export function useSubscriptionStatusInfo(
  options: UseSubscriptionStatusInfoOptions = {}
): SubscriptionStatusInfo {
  const { checkInterval = 5 * 60 * 1000 } = options; // Default 5 minutes
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState<number | null>(null);
  const [subscriptionType, setSubscriptionType] = useState<string | null>(null);

  // Mock subscription data - replace with actual API calls
  const fetchSubscriptionStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // TODO: Replace with actual API call
      // const response = await subscriptionApi.getUserSubscription(user.id);
      
      // Mock data for now
      const mockSubscription = {
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        type: 'premium',
        features: ['orders', 'customers', 'products', 'analytics']
      };

      const now = new Date();
      const expiryDate = new Date(mockSubscription.expiresAt);
      const daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      setHasActiveSubscription(mockSubscription.isActive);
      setIsExpired(expiryDate < now);
      setIsExpiringSoon(daysUntil <= 7 && daysUntil > 0);
      setDaysUntilExpiry(daysUntil);
      setSubscriptionType(mockSubscription.type);
      
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      setHasActiveSubscription(false);
      setIsExpired(true);
      setIsExpiringSoon(false);
      setDaysUntilExpiry(null);
      setSubscriptionType(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check if user can access a specific feature
  const canAccessFeature = useCallback((feature: string): boolean => {
    if (!hasActiveSubscription || isExpired) {
      return false;
    }
    
    // TODO: Replace with actual feature checking logic
    // For now, allow all features if subscription is active
    return true;
  }, [hasActiveSubscription, isExpired]);

  // Refresh subscription status
  const refreshStatus = useCallback(async () => {
    await fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  // Initial fetch
  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  // Set up interval for periodic checks
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(fetchSubscriptionStatus, checkInterval);
    return () => clearInterval(interval);
  }, [user, fetchSubscriptionStatus, checkInterval]);

  return {
    loading,
    hasActiveSubscription,
    isExpired,
    isExpiringSoon,
    daysUntilExpiry,
    subscriptionType,
    canAccessFeature,
    refreshStatus
  };
}
