import { useState, useEffect, useRef } from 'react';
import { categoriesApi } from '@rentalshop/utils';
import type { CategoryFilters, Category } from '@rentalshop/types';

export interface CategoriesDataResponse {
  categories: Category[];
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  hasMore: boolean;
}

export interface UseCategoriesDataOptions {
  filters: CategoryFilters;
  enabled?: boolean;
  debounceSearch?: boolean;
  debounceMs?: number;
}

export interface UseCategoriesDataReturn {
  data: CategoriesDataResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch categories data with filters, pagination, and optional debounced search
 * Follows the same pattern as useOutletsData
 */
export function useCategoriesData(options: UseCategoriesDataOptions): UseCategoriesDataReturn {
  const { filters, enabled = true, debounceSearch = false, debounceMs = 300 } = options;
  
  const [data, setData] = useState<CategoriesDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const refetchTriggerRef = useRef<number>(0);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

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

        console.log('🔍 useCategoriesData: Fetching with filters:', filters);

        const response = await categoriesApi.searchCategories(filters);
        
        console.log('📦 useCategoriesData: API Response:', response);
        console.log('📊 useCategoriesData: Response data:', response.data);

        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        if (response.success && response.data) {
          const apiData = response.data as any;
          
          // Handle different API response structures
          if (Array.isArray(apiData)) {
            const pagination = (response as any).pagination || {};
            const categoriesData = apiData;
            const total = pagination.total || apiData.length;
            const limit = pagination.limit || filters.limit || 25;
            const currentPage = pagination.page || filters.page || 1;
            const totalPages = Math.ceil(total / limit);
            const hasMore = pagination.hasMore !== undefined ? pagination.hasMore : currentPage < totalPages;

            setData({
              categories: categoriesData as Category[],
              total,
              totalPages,
              currentPage,
              limit,
              hasMore
            });
          } else {
            const categoriesData = apiData.categories || [];
            const total = apiData.total || 0;
            const limit = apiData.limit || filters.limit || 25;
            const currentPage = apiData.page || filters.page || 1;
            const totalPages = apiData.totalPages || Math.ceil(total / limit);
            const hasMore = apiData.hasMore !== undefined ? apiData.hasMore : currentPage < totalPages;

            setData({
              categories: categoriesData as Category[],
              total,
              totalPages,
              currentPage,
              limit,
              hasMore
            });
          }
        } else {
          throw new Error(response.message || 'Failed to fetch categories');
        }
      } catch (err: any) {
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        console.error('useCategoriesData: Error fetching categories:', err);
        setError(err.message || 'Failed to fetch categories');
        setData(null);
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
      }
    };

    // Handle debounced search
    const shouldDebounce = debounceSearch && (filters.q || filters.search);
    
    if (shouldDebounce) {
      console.log('🔍 useCategoriesData: Debouncing search query');
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      searchDebounceRef.current = setTimeout(() => {
        fetchData();
      }, debounceMs);
    } else {
      fetchData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [filters, enabled, debounceSearch, debounceMs, refetchTriggerRef.current]);

  return { data, loading, error, refetch };
}

