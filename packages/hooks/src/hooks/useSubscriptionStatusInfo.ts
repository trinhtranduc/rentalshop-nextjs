"use client"

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

// ============================================================================
// SUBSCRIPTION STATUS INFO HOOK
// ============================================================================

export interface SubscriptionStatusInfo {
  // Original interface
  loading: boolean;
  hasActiveSubscription: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry: number | null;
  subscriptionType: string | null;
  canAccessFeature: (feature: string) => boolean;
  refreshStatus: () => Promise<void>;
  
  // Extended interface for UI components
  hasSubscription: boolean;
  subscription: any;
  status: string;
  isTrial: boolean;
  isActive: boolean;
  planName: string;
  error: string | null;
  
  // Additional properties for other components
  statusMessage: string;
  statusColor: string;
  hasAccess: boolean;
  accessLevel: string;
  requiresPayment: boolean;
  upgradeRequired: boolean;
  gracePeriodEnds: Date | null;
  canExportData: boolean;
  isRestricted: boolean;
  isReadOnly: boolean;
  isLimited: boolean;
  isDenied: boolean;
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
  
  // Extended state for UI components
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [status, setStatus] = useState<string>('');
  const [isTrial, setIsTrial] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [planName, setPlanName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch subscription status from API
  const fetchSubscriptionStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Import subscriptionsApi dynamically to avoid circular dependencies
      const { subscriptionsApi } = await import('@rentalshop/utils');
      const response = await subscriptionsApi.getCurrentUserSubscriptionStatus();
      
      if (response.success && response.data) {
        const { subscription: subscriptionData, status: statusData } = response.data;
        
        const isActive = statusData.isActive;
        const isExpired = statusData.isExpired;
        const isTrial = statusData.isTrial;
        
        // Calculate days until expiry
        let daysUntil = null;
        if (subscriptionData.trial?.daysRemaining) {
          daysUntil = subscriptionData.trial.daysRemaining;
        } else if (subscriptionData.currentPeriod?.end) {
          const now = new Date();
          const expiryDate = new Date(subscriptionData.currentPeriod.end);
          daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        // Set original state
        setHasActiveSubscription(isActive);
        setIsExpired(isExpired);
        setIsExpiringSoon(daysUntil !== null && daysUntil <= 7 && daysUntil > 0);
        setDaysUntilExpiry(daysUntil);
        setSubscriptionType(subscriptionData.plan?.name || subscriptionData.status);
        
        // Set extended state for UI components
        setHasSubscription(true);
        setSubscription(subscriptionData);
        setStatus(subscriptionData.status);
        setIsTrial(isTrial);
        setIsActive(isActive);
        setPlanName(subscriptionData.plan?.name || subscriptionData.status);
        setError(null);
      } else {
        // No subscription found
        setHasActiveSubscription(false);
        setIsExpired(true);
        setIsExpiringSoon(false);
        setDaysUntilExpiry(null);
        setSubscriptionType(null);
        
        // Set extended state for UI components
        setHasSubscription(false);
        setSubscription(null);
        setStatus('');
        setIsTrial(false);
        setIsActive(false);
        setPlanName('');
        setError('No subscription found');
      }
      
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      setHasActiveSubscription(false);
      setIsExpired(true);
      setIsExpiringSoon(false);
      setDaysUntilExpiry(null);
      setSubscriptionType(null);
      
      // Set extended state for UI components
      setHasSubscription(false);
      setSubscription(null);
      setStatus('');
      setIsTrial(false);
      setIsActive(false);
      setPlanName('');
      setError(error instanceof Error ? error.message : 'Failed to fetch subscription');
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

  // Calculate additional properties for other components
  const statusMessage = isExpired ? 'Subscription expired' : 
                       isExpiringSoon ? `Expires in ${daysUntilExpiry} days` :
                       isTrial ? `Trial (${daysUntilExpiry} days left)` :
                       isActive ? 'Active subscription' : 'No subscription';
  
  const statusColor = isExpired ? 'red' : 
                     isExpiringSoon ? 'orange' :
                     isTrial ? 'yellow' :
                     isActive ? 'green' : 'gray';
  
  const hasAccess = hasActiveSubscription && !isExpired;
  const accessLevel = isExpired ? 'denied' : 
                     isTrial ? 'limited' :
                     isActive ? 'full' : 'denied';
  
  const requiresPayment = isExpired || isExpiringSoon;
  const upgradeRequired = isExpired;
  const gracePeriodEnds = isExpiringSoon && daysUntilExpiry ? new Date(Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000) : null;
  const canExportData = hasAccess;
  const isRestricted = !hasAccess || isTrial;
  const isReadOnly = isExpired;
  const isLimited = isTrial;
  const isDenied = isExpired || !hasActiveSubscription;

  return {
    // Original interface
    loading,
    hasActiveSubscription,
    isExpired,
    isExpiringSoon,
    daysUntilExpiry,
    subscriptionType,
    canAccessFeature,
    refreshStatus,
    
    // Extended interface for UI components
    hasSubscription,
    subscription,
    status,
    isTrial,
    isActive,
    planName,
    error,
    
    // Additional properties for other components
    statusMessage,
    statusColor,
    hasAccess,
    accessLevel,
    requiresPayment,
    upgradeRequired,
    gracePeriodEnds,
    canExportData,
    isRestricted,
    isReadOnly,
    isLimited,
    isDenied
  };
}
