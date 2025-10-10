/**
 * Custom hook for getting merchant data from user context
 * OPTIMIZED: Uses merchant data already loaded in user object (no API call)
 * 
 * **Why this is better:**
 * - User profile already includes merchant.businessType and merchant.pricingType
 * - No extra API call needed
 * - Instant data availability
 * - Reduces server load
 */

import { useMemo } from 'react';
import { useAuth } from '@rentalshop/hooks';
import type { Merchant } from '@rentalshop/types';

interface UseMerchantDataReturn {
  merchant: Merchant | null;
  loading: boolean;
  error: string | null;
}

export const useMerchantData = (): UseMerchantDataReturn => {
  const { user, loading: authLoading } = useAuth();

  // Memoize merchant data from user object
  const merchant = useMemo(() => {
    if (!user?.merchant) {
      return null;
    }

    // User object already has complete merchant data from profile API
    // Including: businessType, pricingType, and all other fields needed
    return user.merchant as Merchant;
  }, [user?.merchant]);

  // Derive error state
  const error = useMemo(() => {
    if (!authLoading && !user) {
      return 'User not logged in';
    }
    if (!authLoading && user && !user.merchant) {
      return 'No merchant associated with user';
    }
    return null;
  }, [authLoading, user]);

  console.log('✅ useMerchantData: Using merchant from user context (no API call)', {
    hasMerchant: !!merchant,
    businessType: merchant?.businessType,
    pricingType: merchant?.pricingType,
  });

  return {
    merchant,
    loading: authLoading, // Use auth loading state
    error
  };
};
