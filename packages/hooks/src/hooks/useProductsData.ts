'use client';

import { useState, useEffect, useRef } from 'react';
import { productsApi } from '@rentalshop/utils';
import type { ProductFilters, ProductWithDetails } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductsDataResponse {
  products: ProductWithDetails[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasMore: boolean;
}

export interface UseProductsDataOptions {
  filters: ProductFilters;
  enabled?: boolean; // Allow disabling fetch
  debounceSearch?: boolean; // Debounce search queries
  debounceMs?: number; // Debounce delay
}

export interface UseProductsDataReturn {
  data: ProductsDataResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * ✅ CLEAN DATA FETCHING HOOK
 * - Single responsibility: fetch products based on filters
 * - Automatic request cancellation
 * - Debounced search
 * - No state management (that's the page's job)
 */
export function useProductsData(options: UseProductsDataOptions): UseProductsDataReturn {
  const { filters, enabled = true, debounceSearch = true, debounceMs = 500 } = options;
  
  const [data, setData] = useState<ProductsDataResponse | null>(null);
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

        console.log('🔍 useProductsData: Fetching with filters:', filters);

        const response = await productsApi.searchProducts(filters);

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        if (response.success && response.data) {
          // API returns: { success: true, data: { products, total, page, limit, hasMore, totalPages } }
          const apiData = response.data as any;
          const productsData = apiData.products || [];
          const total = apiData.total || 0;
          const limit = apiData.limit || filters.limit || 25;
          const currentPage = apiData.page || filters.page || 1;
          const totalPages = apiData.totalPages || Math.ceil(total / limit);
          const hasMore = apiData.hasMore !== undefined ? apiData.hasMore : currentPage < totalPages;

          setData({
            products: productsData as ProductWithDetails[],
            total,
            totalPages,
            currentPage,
            limit,
            hasMore
          });
        } else {
          throw new Error('Failed to fetch products');
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('🔍 useProductsData: Error fetching products:', err);
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
      console.log('🔍 useProductsData: Debouncing search query');
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

