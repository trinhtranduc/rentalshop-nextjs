'use client';

// ============================================================================
// SUBSCRIPTION ACCESS HOOKS
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  checkSubscriptionAccess, 
  getSubscriptionRestrictions,
  getSubscriptionStatusMessage,
  getSubscriptionStatusColor,
  type SubscriptionAccessResult,
  type SubscriptionRestrictions
} from '@rentalshop/auth';

export interface UseSubscriptionAccessReturn {
  // Access control
  hasAccess: boolean;
  accessLevel: 'full' | 'readonly' | 'limited' | 'denied';
  restrictions: SubscriptionRestrictions;
  
  // Status information
  statusMessage: string;
  statusColor: string;
  reason?: string;
  gracePeriodEnds?: Date;
  canExportData?: boolean;
  requiresPayment?: boolean;
  upgradeRequired?: boolean;
  
  // Actions
  canPerform: (action: keyof SubscriptionRestrictions) => boolean;
  refresh: () => Promise<void>;
  
  // Loading states
  loading: boolean;
  error: string | null;
}

/**
 * Hook to manage subscription access control
 */
export function useSubscriptionAccess(): UseSubscriptionAccessReturn {
  const { user, loading: authLoading } = useAuth();
  const [accessResult, setAccessResult] = useState<SubscriptionAccessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = useCallback(async () => {
    if (!user || authLoading) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Convert User to AuthUser format
      const authUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        merchantId: typeof user.merchantId === 'string' ? parseInt(user.merchantId) : user.merchantId,
        outletId: typeof user.outletId === 'string' ? parseInt(user.outletId) : user.outletId
      };
      
      const result = await checkSubscriptionAccess(authUser);
      setAccessResult(result);
    } catch (err) {
      console.error('Error checking subscription access:', err);
      setError(err instanceof Error ? err.message : 'Failed to check subscription access');
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  const canPerform = useCallback((action: keyof SubscriptionRestrictions): boolean => {
    if (!accessResult) return false;
    
    const restrictions = getSubscriptionRestrictions(accessResult);
    return Boolean(restrictions[action]);
  }, [accessResult]);

  const refresh = useCallback(async () => {
    await checkAccess();
  }, [checkAccess]);

  const restrictions = accessResult ? getSubscriptionRestrictions(accessResult) : {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canView: false,
    canExport: false,
    canManageUsers: false,
    canManageOutlets: false,
    canManageProducts: false,
    canProcessOrders: false
  };

  const statusMessage = accessResult ? getSubscriptionStatusMessage(accessResult) : '';
  const statusColor = accessResult ? getSubscriptionStatusColor(accessResult) : 'gray';

  return {
    hasAccess: accessResult?.hasAccess || false,
    accessLevel: accessResult?.accessLevel || 'denied',
    restrictions,
    statusMessage,
    statusColor,
    reason: accessResult?.reason,
    gracePeriodEnds: accessResult?.gracePeriodEnds,
    canExportData: accessResult?.canExportData,
    requiresPayment: accessResult?.requiresPayment,
    upgradeRequired: accessResult?.upgradeRequired,
    canPerform,
    refresh,
    loading: loading || authLoading,
    error
  };
}

/**
 * Hook to check if user can perform a specific action
 */
export function useCanPerform(action: keyof SubscriptionRestrictions): boolean {
  const { canPerform } = useSubscriptionAccess();
  return canPerform(action);
}

/**
 * Hook to get subscription status information for UI display
 */
export function useSubscriptionStatusInfo() {
  const { 
    statusMessage, 
    statusColor, 
    hasAccess, 
    accessLevel,
    requiresPayment,
    upgradeRequired,
    gracePeriodEnds,
    canExportData
  } = useSubscriptionAccess();

  return {
    statusMessage,
    statusColor,
    hasAccess,
    accessLevel,
    requiresPayment,
    upgradeRequired,
    gracePeriodEnds,
    canExportData,
    isRestricted: accessLevel !== 'full',
    isReadOnly: accessLevel === 'readonly',
    isLimited: accessLevel === 'limited',
    isDenied: accessLevel === 'denied'
  };
}
