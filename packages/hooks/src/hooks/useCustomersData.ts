'use client';

import { useState, useEffect, useRef } from 'react';
import { customersApi } from '@rentalshop/utils';
import type { CustomerFilters, Customer } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomersDataResponse {
  customers: Customer[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasMore: boolean;
}

export interface UseCustomersDataOptions {
  filters: CustomerFilters;
  enabled?: boolean; // Allow disabling fetch
  debounceSearch?: boolean; // Debounce search queries
  debounceMs?: number; // Debounce delay
}

export interface UseCustomersDataReturn {
  data: CustomersDataResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * ✅ CLEAN DATA FETCHING HOOK
 * - Single responsibility: fetch customers based on filters
 * - Automatic request cancellation
 * - Debounced search
 * - No state management (that's the page's job)
 */
export function useCustomersData(options: UseCustomersDataOptions): UseCustomersDataReturn {
  const { filters, enabled = true, debounceSearch = true, debounceMs = 500 } = options;
  
  const [data, setData] = useState<CustomersDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const refetchTriggerRef = useRef(0);

  // Refetch function
  const refetch = () => {
    refetchTriggerRef.current += 1;
  };

  useEffect(() => {
    if (!enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 useCustomersData: Fetching with filters:', filters);

        const response = await customersApi.searchCustomers(filters);

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        if (response.success && response.data) {
          // API returns: { success: true, data: { customers, total, page, limit, hasMore, totalPages } }
          const apiData = response.data as any;
          const customersData = apiData.customers || [];
          const total = apiData.total || 0;
          const limit = apiData.limit || filters.limit || 25;
          const currentPage = apiData.page || filters.page || 1;
          const totalPages = apiData.totalPages || Math.ceil(total / limit);
          const hasMore = apiData.hasMore !== undefined ? apiData.hasMore : currentPage < totalPages;

          setData({
            customers: customersData as Customer[],
            total,
            totalPages,
            currentPage,
            limit,
            hasMore
          });
        } else {
          throw new Error('Failed to fetch customers');
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('🔍 useCustomersData: Error fetching customers:', err);
          setError(err as Error);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
      }
    };

    // Debounce search queries only
    if (debounceSearch && (filters.search || filters.q)) {
      console.log('🔍 useCustomersData: Debouncing search query');
      const timer = setTimeout(fetchData, debounceMs);
      return () => {
        clearTimeout(timer);
        abortControllerRef.current?.abort();
      };
    } else {
      // Immediate fetch for non-search filters
      fetchData();
      return () => {
        abortControllerRef.current?.abort();
      };
    }
  }, [
    filters, // This is now stable from parent's memoization
    enabled,
    debounceSearch,
    debounceMs,
    refetchTriggerRef.current
  ]);

  return {
    data,
    loading,
    error,
    refetch
  };
}

