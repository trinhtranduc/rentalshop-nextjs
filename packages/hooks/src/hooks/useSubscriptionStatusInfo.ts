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
        const data = response.data;
        
        // ============================================================================
        // MAP NEW FLAT RESPONSE STRUCTURE
        // ============================================================================
        // Response structure:
        // {
        //   status: "CANCELED" | "EXPIRED" | "PAST_DUE" | "PAUSED" | "TRIAL" | "ACTIVE",
        //   statusReason: "Canceled on 10/7/2025",
        //   hasAccess: false,
        //   daysRemaining: 31,
        //   isExpiringSoon: false,
        //   planName: "Basic",
        //   ...other flat fields
        // }
        
        // Map computed status flags from API
        const computedStatus = data.status || 'UNKNOWN'; // CANCELED | EXPIRED | PAST_DUE | PAUSED | TRIAL | ACTIVE
        const apiHasAccess = data.hasAccess ?? false;
        const apiDaysRemaining = data.daysRemaining ?? null;
        const apiIsExpiringSoon = data.isExpiringSoon ?? false;
        
        // Derive boolean flags from computed status
        const isActive = computedStatus === 'ACTIVE';
        const isExpired = computedStatus === 'EXPIRED';
        const isTrial = computedStatus === 'TRIAL';
        const isCanceled = computedStatus === 'CANCELED';
        const isPastDue = computedStatus === 'PAST_DUE';
        const isPaused = computedStatus === 'PAUSED';
        
        // Determine if subscription is active for access (ACTIVE or TRIAL)
        const hasActive = apiHasAccess; // API already calculated this
        
        // Set original state (for backward compatibility)
        setHasActiveSubscription(hasActive);
        setIsExpired(isExpired);
        setIsExpiringSoon(apiIsExpiringSoon);
        setDaysUntilExpiry(apiDaysRemaining);
        setSubscriptionType(data.planName || computedStatus);
        
        // Set extended state for UI components
        setHasSubscription(true);
        setSubscription(data); // Store full response data
        setStatus(computedStatus);
        setIsTrial(isTrial);
        setIsActive(isActive);
        setPlanName(data.planName || 'Unknown Plan');
        setError(null);
        
        console.log('✅ Subscription status mapped:', {
          computedStatus,
          hasAccess: apiHasAccess,
          daysRemaining: apiDaysRemaining,
          isExpiringSoon: apiIsExpiringSoon,
          statusReason: data.statusReason
        });
        
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
        setStatus('NO_SUBSCRIPTION');
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
      setStatus('ERROR');
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
  // Use subscription.statusReason if available (from API), otherwise fallback to computed message
  const statusMessage = subscription?.statusReason || 
                       (isExpired ? 'Subscription expired' : 
                        isExpiringSoon ? `Expires in ${daysUntilExpiry} days` :
                        isTrial ? `Trial (${daysUntilExpiry} days left)` :
                        isActive ? 'Active subscription' : 'No subscription');
  
  // Map status to color
  const statusColor = status === 'EXPIRED' ? 'red' :
                     status === 'CANCELED' ? 'red' :
                     status === 'PAST_DUE' ? 'orange' :
                     status === 'PAUSED' ? 'yellow' :
                     isExpiringSoon ? 'orange' :
                     status === 'TRIAL' ? 'yellow' :
                     status === 'ACTIVE' ? 'green' : 'gray';
  
  // Use hasAccess from API (already calculated there)
  const hasAccess = subscription?.hasAccess ?? (hasActiveSubscription && !isExpired);
  
  const accessLevel = status === 'EXPIRED' || status === 'CANCELED' ? 'denied' : 
                     status === 'PAST_DUE' ? 'readonly' :
                     status === 'PAUSED' ? 'readonly' :
                     status === 'TRIAL' ? 'limited' :
                     status === 'ACTIVE' ? 'full' : 'denied';
  
  const requiresPayment = status === 'EXPIRED' || status === 'PAST_DUE' || isExpiringSoon;
  const upgradeRequired = status === 'EXPIRED' || status === 'CANCELED';
  const gracePeriodEnds = isExpiringSoon && daysUntilExpiry ? new Date(Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000) : null;
  const canExportData = hasAccess;
  const isRestricted = !hasAccess || status === 'TRIAL' || status === 'PAUSED';
  const isReadOnly = status === 'EXPIRED' || status === 'PAST_DUE' || status === 'PAUSED';
  const isLimited = status === 'TRIAL';
  const isDenied = status === 'EXPIRED' || status === 'CANCELED' || !hasActiveSubscription;

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
