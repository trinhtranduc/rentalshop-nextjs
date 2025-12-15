'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useDedupedApi } from '../utils/useDedupedApi';
import { ordersApi } from '@rentalshop/utils';
import type { OrderFilters, OrderWithDetails } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface OrdersDataResponse {
  orders: OrderWithDetails[];
  total: number;
  page: number;
  currentPage: number; // Alias for page
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

export interface UseOrdersDataOptions {
  filters: OrderFilters;
  enabled?: boolean;
}

export interface UseOrdersDataReturn {
  data: OrdersDataResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * ✅ MODERN ORDERS DATA HOOK
 * 
 * Clean and simple wrapper around useDedupedApi for orders
 * 
 * Features:
 * - Automatic request deduplication
 * - Intelligent caching (30s stale time)
 * - Request cancellation and race condition protection
 * - Transform API response to consistent format
 * 
 * Usage:
 * ```tsx
 * const { data, loading, error } = useOrdersData({ 
 *   filters: { page: 1, status: 'RESERVED' }
 * });
 * ```
 */
export function useOrdersData(options: UseOrdersDataOptions): UseOrdersDataReturn {
  const { filters, enabled = true } = options;
  const pathname = usePathname();
  
  // Include pathname in filters to ensure refetch when navigating between pages
  // This ensures that when user navigates to /orders from another page, data is refetched
  // The pathname change will cause cacheKey to change, forcing a refetch
  const filtersWithPath = useMemo(() => ({
    ...filters,
    _pathname: pathname // Internal key to force refetch on navigation
  }), [filters, pathname]);
  
  const result = useDedupedApi({
    filters: filtersWithPath,
    fetchFn: async (filtersWithPath: OrderFilters & { _pathname?: string }) => {
      // Remove internal _pathname before making API call
      const { _pathname, ...apiFilters } = filtersWithPath;
      console.log('📦 useOrdersData: Fetching with filters:', apiFilters);
      
      const response = await ordersApi.searchOrders(apiFilters);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch orders');
      }

      // Transform API response to consistent format
      const apiData = response.data as any;
      const transformed: OrdersDataResponse = {
        orders: apiData.orders || [],
        total: apiData.total || 0,
        page: apiData.page || 1,
        currentPage: apiData.page || 1, // Alias for compatibility
        limit: apiData.limit || 25,
        hasMore: apiData.hasMore || false,
        totalPages: apiData.totalPages || 1
      };
      
      console.log('✅ useOrdersData: Success:', {
        ordersCount: transformed.orders.length,
        total: transformed.total,
        page: transformed.page
      });
      
      return transformed;
    },
    enabled,
    staleTime: 30000, // ✅ 30 seconds cache to prevent duplicate calls
    cacheTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false // ✅ Don't force refetch if filters haven't changed (prevent duplicate calls)
  });

  return result;
}
