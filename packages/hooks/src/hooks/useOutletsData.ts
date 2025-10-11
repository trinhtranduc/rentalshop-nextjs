'use client';

import { useState, useEffect, useRef } from 'react';
import { outletsApi } from '@rentalshop/utils';
import type { OutletFilters, Outlet } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface OutletsDataResponse {
  outlets: Outlet[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasMore: boolean;
}

export interface UseOutletsDataOptions {
  filters: OutletFilters;
  enabled?: boolean;
  debounceSearch?: boolean;
  debounceMs?: number;
}

export interface UseOutletsDataReturn {
  data: OutletsDataResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * ✅ CLEAN DATA FETCHING HOOK
 * - Single responsibility: fetch outlets based on filters
 * - Automatic request cancellation
 * - Debounced search
 * - No state management (that's the page's job)
 */
export function useOutletsData(options: UseOutletsDataOptions): UseOutletsDataReturn {
  const { filters, enabled = true, debounceSearch = true, debounceMs = 500 } = options;
  
  const [data, setData] = useState<OutletsDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const refetchTriggerRef = useRef(0);

  const refetch = () => {
    refetchTriggerRef.current += 1;
  };

  useEffect(() => {
    if (!enabled) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 useOutletsData: Fetching with filters:', filters);

        const response = await outletsApi.searchOutlets(filters);
        
        console.log('📦 useOutletsData: API Response:', response);
        console.log('📊 useOutletsData: Response data:', response.data);

        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        if (response.success && response.data) {
          const apiData = response.data as any;
          
          // Handle different API response structures
          if (Array.isArray(apiData)) {
            const pagination = (response as any).pagination || {};
            const outletsData = apiData;
            const total = pagination.total || apiData.length;
            const limit = pagination.limit || filters.limit || 25;
            const currentPage = pagination.page || filters.page || 1;
            const totalPages = Math.ceil(total / limit);
            const hasMore = pagination.hasMore !== undefined ? pagination.hasMore : currentPage < totalPages;

            setData({
              outlets: outletsData as Outlet[],
              total,
              totalPages,
              currentPage,
              limit,
              hasMore
            });
          } else {
            const outletsData = apiData.outlets || [];
            const total = apiData.total || 0;
            const limit = apiData.limit || filters.limit || 25;
            const currentPage = apiData.page || filters.page || 1;
            const totalPages = apiData.totalPages || Math.ceil(total / limit);
            const hasMore = apiData.hasMore !== undefined ? apiData.hasMore : currentPage < totalPages;

            setData({
              outlets: outletsData as Outlet[],
              total,
              totalPages,
              currentPage,
              limit,
              hasMore
            });
          }
        } else {
          throw new Error('Failed to fetch outlets');
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('🔍 useOutletsData: Error fetching outlets:', err);
          setError(err as Error);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
      }
    };

    if (debounceSearch && (filters.search || filters.q)) {
      console.log('🔍 useOutletsData: Debouncing search query');
      const timer = setTimeout(fetchData, debounceMs);
      return () => {
        clearTimeout(timer);
        abortControllerRef.current?.abort();
      };
    } else {
      fetchData();
      return () => {
        abortControllerRef.current?.abort();
      };
    }
  }, [
    filters,
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

