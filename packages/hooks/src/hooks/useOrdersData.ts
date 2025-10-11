'use client';

import { useState, useEffect, useRef } from 'react';
import { ordersApi } from '@rentalshop/utils';
import type { OrderFilters, OrderWithDetails, OrderStatus, OrderType } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface OrdersDataResponse {
  orders: OrderWithDetails[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasMore: boolean;
}

export interface UseOrdersDataOptions {
  filters: OrderFilters;
  enabled?: boolean; // Allow disabling fetch
  debounceSearch?: boolean; // Debounce search queries
  debounceMs?: number; // Debounce delay
}

export interface UseOrdersDataReturn {
  data: OrdersDataResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * ✅ CLEAN DATA FETCHING HOOK
 * - Single responsibility: fetch orders based on filters
 * - Automatic request cancellation
 * - Debounced search
 * - No state management (that's the page's job)
 */
export function useOrdersData(options: UseOrdersDataOptions): UseOrdersDataReturn {
  const { filters, enabled = true, debounceSearch = true, debounceMs = 500 } = options;
  
  const [data, setData] = useState<OrdersDataResponse | null>(null);
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

        console.log('🔍 useOrdersData: Fetching with filters:', filters);

        const response = await ordersApi.searchOrders(filters);

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        if (response.success && response.data) {
          const ordersData = response.data.orders || [];
          const total = response.data.total || 0;
          const limit = filters.limit || 25;
          const currentPage = filters.page || 1;
          const totalPages = Math.ceil(total / limit);

          setData({
            orders: ordersData as OrderWithDetails[],
            total,
            totalPages,
            currentPage,
            limit,
            hasMore: currentPage < totalPages
          });
        } else {
          throw new Error('Failed to fetch orders');
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('🔍 useOrdersData: Error fetching orders:', err);
          setError(err as Error);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
      }
    };

    // Debounce search queries only
    if (debounceSearch && filters.search) {
      console.log('🔍 useOrdersData: Debouncing search query');
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

