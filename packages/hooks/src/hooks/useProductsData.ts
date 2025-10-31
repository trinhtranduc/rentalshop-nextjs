'use client';

import { useDedupedApi } from '../utils/useDedupedApi';
import { productsApi } from '@rentalshop/utils';
import type { ProductFilters, ProductWithDetails } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductsDataResponse {
  products: ProductWithDetails[];
  total: number;
  page: number;
  currentPage: number; // Alias for page
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

export interface UseProductsDataOptions {
  filters: ProductFilters;
  enabled?: boolean;
}

export interface UseProductsDataReturn {
  data: ProductsDataResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * ✅ MODERN PRODUCTS DATA HOOK
 * 
 * Clean and simple wrapper around useDedupedApi for products
 * 
 * Features:
 * - Automatic request deduplication
 * - Intelligent caching (30s stale time)
 * - Request cancellation and race condition protection
 * - Transform API response to consistent format
 * 
 * Usage:
 * ```tsx
 * const { data, loading, error } = useProductsData({ 
 *   filters: { page: 1, search: 'abc' }
 * });
 * ```
 */
export function useProductsData(options: UseProductsDataOptions): UseProductsDataReturn {
  const { filters, enabled = true } = options;
  
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters: ProductFilters) => {
      console.log('📦 useProductsData: Fetching with filters:', filters);
      
      const response = await productsApi.searchProducts(filters);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch products');
      }

      // Transform API response to consistent format
      const apiData = response.data as any;
      const transformed: ProductsDataResponse = {
        products: apiData.products || [],
        total: apiData.total || 0,
        page: apiData.page || 1,
        currentPage: apiData.page || 1, // Alias for compatibility
        limit: apiData.limit || 25,
        hasMore: apiData.hasMore || false,
        totalPages: apiData.totalPages || 1
      };
      
      console.log('✅ useProductsData: Success:', {
        productsCount: transformed.products.length,
        total: transformed.total,
        page: transformed.page
      });
      
      return transformed;
    },
    enabled,
    staleTime: 30000, // 30 seconds cache
    cacheTime: 300000, // 5 minutes
    refetchOnWindowFocus: false
  });

  return result;
}
