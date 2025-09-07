// ============================================================================
// SUBSCRIPTION STATUS HOOK
// ============================================================================
"use client"

import { useState, useEffect, useCallback } from 'react';
import { Subscription, SubscriptionStatus } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface SubscriptionStatusData {
  hasSubscription: boolean;
  subscription?: Subscription;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry: number | null;
  message: string;
  loading: boolean;
  error: string | null;
}

export interface SubscriptionStatusOptions {
  checkInterval?: number; // Check interval in milliseconds (default: 5 minutes)
  autoRefresh?: boolean;  // Auto refresh on focus (default: true)
}

// ============================================================================
// HOOK
// ============================================================================

export const useSubscriptionStatus = (options: SubscriptionStatusOptions = {}) => {
  const {
    checkInterval = 5 * 60 * 1000, // 5 minutes
    autoRefresh = true
  } = options;

  const [status, setStatus] = useState<SubscriptionStatusData>({
    hasSubscription: false,
    isExpired: false,
    isExpiringSoon: false,
    daysUntilExpiry: null,
    message: '',
    loading: true,
    error: null
  });

  // ============================================================================
  // FETCH SUBSCRIPTION STATUS
  // ============================================================================

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, loading: true, error: null }));

      const token = localStorage.getItem('token');
      if (!token) {
        setStatus(prev => ({
          ...prev,
          loading: false,
          hasSubscription: false,
          message: 'No authentication token found'
        }));
        return;
      }

      const response = await fetch('/api/subscriptions/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }

      const data = await response.json();
      if (data.success) {
        setStatus(prev => ({
          ...prev,
          ...data.data,
          loading: false
        }));
      } else {
        throw new Error(data.message || 'Failed to fetch subscription status');
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initial fetch
  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  // Auto refresh on interval
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchSubscriptionStatus, checkInterval);
    return () => clearInterval(interval);
  }, [fetchSubscriptionStatus, checkInterval, autoRefresh]);

  // Auto refresh on window focus
  useEffect(() => {
    if (!autoRefresh) return;

    const handleFocus = () => {
      fetchSubscriptionStatus();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchSubscriptionStatus, autoRefresh]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const refresh = useCallback(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  const isSubscriptionActive = useCallback(() => {
    return status.hasSubscription && 
           !status.isExpired && 
           status.subscription?.status === 'active';
  }, [status]);

  const isSubscriptionExpired = useCallback(() => {
    return status.isExpired || status.subscription?.status === 'cancelled';
  }, [status]);

  const isSubscriptionExpiringSoon = useCallback(() => {
    return status.isExpiringSoon;
  }, [status]);

  const needsRenewal = useCallback(() => {
    return status.isExpired || status.isExpiringSoon;
  }, [status]);

  const getSubscriptionStatus = useCallback((): SubscriptionStatus | 'NO_SUBSCRIPTION' => {
    if (!status.hasSubscription) return 'NO_SUBSCRIPTION';
    return status.subscription?.status || 'NO_SUBSCRIPTION';
  }, [status]);

  const getDaysUntilExpiry = useCallback(() => {
    return status.daysUntilExpiry;
  }, [status]);

  const getStatusMessage = useCallback(() => {
    return status.message;
  }, [status]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Status data
    ...status,
    
    // Utility functions
    refresh,
    isSubscriptionActive,
    isSubscriptionExpired,
    isSubscriptionExpiringSoon,
    needsRenewal,
    getSubscriptionStatus,
    getDaysUntilExpiry,
    getStatusMessage
  };
};
