/**
 * Custom hook for fetching merchant data with pricing configuration
 * Used in CreateOrderForm to get merchant pricing rules for RentalPeriodSelector
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@rentalshop/hooks';
import { merchantsApi } from '@rentalshop/utils';
import type { Merchant } from '@rentalshop/types';

interface UseMerchantDataReturn {
  merchant: Merchant | null;
  loading: boolean;
  error: string | null;
}

export const useMerchantData = (): UseMerchantDataReturn => {
  const { user } = useAuth();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    const fetchMerchantData = async () => {
      // Get merchantId from user or props
      const merchantId = user?.merchantId;
      
      if (!merchantId) {
        setError('No merchant ID available');
        return;
      }

      // Prevent duplicate requests
      if (fetchingRef.current) {
        return;
      }

      console.log('🔄 useMerchantData: Fetching merchant data for merchantId:', merchantId);
      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const result = await merchantsApi.getMerchantById(merchantId);
        console.log('🔍 useMerchantData: Merchant API response:', result);

        if (result.success && result.data) {
          setMerchant(result.data);
          console.log('✅ useMerchantData: Merchant data loaded:', result.data);
        } else {
          setError('Failed to fetch merchant data');
          console.error('❌ useMerchantData: Failed to fetch merchant data:', result);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('💥 useMerchantData: Error fetching merchant data:', err);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchMerchantData();

    // Cleanup function
    return () => {
      fetchingRef.current = false;
    };
  }, [user?.merchantId]);

  return {
    merchant,
    loading,
    error
  };
};
