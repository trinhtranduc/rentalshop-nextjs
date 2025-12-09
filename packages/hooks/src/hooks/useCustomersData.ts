'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useDedupedApi } from '../utils/useDedupedApi';
import { customersApi } from '@rentalshop/utils';
import type { CustomerFilters, Customer } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomersDataResponse {
  customers: Customer[];
  total: number;
  page: number;
  currentPage: number; // Alias for page
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

export interface UseCustomersDataOptions {
  filters: CustomerFilters;
  enabled?: boolean;
}

export interface UseCustomersDataReturn {
  data: CustomersDataResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * ✅ MODERN CUSTOMERS DATA HOOK
 * 
 * Clean and simple wrapper around useDedupedApi for customers
 * 
 * Features:
 * - Automatic request deduplication
 * - Intelligent caching (30s stale time)
 * - Request cancellation and race condition protection
 * - Transform API response to consistent format
 * 
 * Usage:
 * ```tsx
 * const { data, loading, error } = useCustomersData({ 
 *   filters: { page: 1, search: 'john' }
 * });
 * ```
 */
export function useCustomersData(options: UseCustomersDataOptions): UseCustomersDataReturn {
  const { filters, enabled = true } = options;
  const pathname = usePathname();
  
  // Include pathname in filters to ensure refetch when navigating between pages
  // This ensures that when user navigates to /customers from another page, data is refetched
  // The pathname change will cause cacheKey to change, forcing a refetch
  const filtersWithPath = useMemo(() => ({
    ...filters,
    _pathname: pathname // Internal key to force refetch on navigation
  }), [filters, pathname]);
  
  const result = useDedupedApi({
    filters: filtersWithPath,
    fetchFn: async (filtersWithPath: CustomerFilters & { _pathname?: string }) => {
      // Remove internal _pathname before making API call
      const { _pathname, ...apiFilters } = filtersWithPath;
      console.log('👥 useCustomersData: Fetching with filters:', apiFilters);
      
      const response = await customersApi.searchCustomers(apiFilters);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch customers');
      }

      // Transform API response to consistent format
      const apiData = response.data as any;
      const transformed: CustomersDataResponse = {
        customers: apiData.customers || [],
        total: apiData.total || 0,
        page: apiData.page || 1,
        currentPage: apiData.page || 1, // Alias for compatibility
        limit: apiData.limit || 25,
        hasMore: apiData.hasMore || false,
        totalPages: apiData.totalPages || 1
      };
      
      console.log('✅ useCustomersData: Success:', {
        customersCount: transformed.customers.length,
        total: transformed.total,
        page: transformed.page
      });
      
      return transformed;
    },
    enabled,
    staleTime: 0, // ✅ Set to 0 to always refetch on navigation (no stale cache)
    cacheTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true // ✅ Force refetch when component mounts (navigating to page)
  });

  return result;
}
