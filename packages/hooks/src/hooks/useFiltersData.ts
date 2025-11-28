'use client';

import { useDedupedApi } from '../utils/useDedupedApi';
import { outletsApi, categoriesApi } from '@rentalshop/utils';
import type { OutletFilters, CategoryFilters, Outlet, Category } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

// Simple version (no filters)
export interface OutletsResponse {
  outlets: Outlet[];
}

export interface CategoriesResponse extends Array<Category> {}

// Full version (with filters and pagination)
export interface OutletsDataResponse {
  outlets: Outlet[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasMore: boolean;
}

export interface CategoriesDataResponse {
  categories: Category[];
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  hasMore: boolean;
}

export interface UseOutletsDataOptions {
  filters: OutletFilters;
  enabled?: boolean;
  debounceSearch?: boolean;
  debounceMs?: number;
}

export interface UseCategoriesDataOptions {
  filters: CategoryFilters;
  enabled?: boolean;
  debounceSearch?: boolean;
  debounceMs?: number;
}

// ============================================================================
// SIMPLE HOOKS (No Filters - For Dropdowns)
// ============================================================================

/**
 * ✅ MODERN OUTLETS DATA HOOK (Simple)
 * - For dropdown filters
 * - No filters, just fetch all outlets
 * - Long cache time (5 minutes)
 */
export function useOutletsData() {
  const { data, loading, error } = useDedupedApi({
    filters: {}, // No filters needed for outlets
    fetchFn: async () => {
      console.log('🔍 useOutletsData: Fetching outlets...');
      const response = await outletsApi.getOutlets();
      
      if (response.success && response.data) {
        // Handle response structure
        const outletsData = (response.data as any).outlets || [];
        
        console.log('✅ useOutletsData: Transformed data:', {
          isArray: Array.isArray(outletsData),
          count: outletsData.length
        });
        
        return { outlets: outletsData };
      }
      
      throw new Error('Failed to fetch outlets');
    },
    enabled: true,
    staleTime: 300000, // 5 minutes - outlets don't change often
    cacheTime: 600000, // 10 minutes
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnWindowFocus: false
  });

  return {
    outlets: data?.outlets || [],
    loading,
    error
  };
}

/**
 * ✅ MODERN CATEGORIES DATA HOOK (Simple)
 * - For dropdown filters
 * - No filters, just fetch all categories
 * - Long cache time (5 minutes)
 */
export function useCategoriesData() {
  const { data, loading, error } = useDedupedApi({
    filters: {}, // No filters needed for categories
    fetchFn: async () => {
      console.log('🔍 useCategoriesData: Fetching categories...');
      const response = await categoriesApi.getCategories();
      
      if (response.success && response.data) {
        // response.data is already an array from API
        const categoriesData = response.data;
        
        console.log('✅ useCategoriesData: API response data:', {
          isArray: Array.isArray(categoriesData),
          count: categoriesData.length
        });
        
        return categoriesData;
      }
      
      throw new Error('Failed to fetch categories');
    },
    enabled: true,
    staleTime: 300000, // 5 minutes - categories don't change often
    cacheTime: 600000, // 10 minutes
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnWindowFocus: false
  });

  console.log('🔍 useCategoriesData return:', {
    data,
    isArray: Array.isArray(data),
    type: typeof data,
    length: data?.length
  });

  // Ensure we always return an array
  const categories = Array.isArray(data) ? data : [];
  
  return {
    categories,
    loading,
    error
  };
}

// ============================================================================
// FULL HOOKS (With Filters - For Pages)
// ============================================================================

/**
 * ✅ MODERN OUTLETS DATA HOOK (Full)
 * - For outlets page with filters
 * - Pagination, search, sorting
 */
export function useOutletsWithFilters(options: UseOutletsDataOptions) {
  const { filters, enabled = true, debounceSearch = true, debounceMs = 500 } = options;

  const { data, loading, error, refetch } = useDedupedApi({
    filters,
    fetchFn: async (filters: OutletFilters) => {
      console.log('🔍 useOutletsWithFilters: Fetching with filters:', filters);
      const response = await outletsApi.getOutlets(filters);
      
      if (response.success && response.data) {
        const apiData = response.data as any;
        
        return {
          outlets: apiData.outlets || [],
          total: apiData.total || 0,
          totalPages: apiData.totalPages || 1,
          currentPage: apiData.page || 1,
          limit: apiData.limit || 25,
          hasMore: apiData.hasMore || false
        };
      }
      
      throw new Error('Failed to fetch outlets');
    },
    enabled,
    staleTime: debounceSearch ? 5000 : 30000,
    cacheTime: 300000,
    refetchOnMount: false, // ✅ Changed to false to prevent unnecessary refetches
    refetchOnWindowFocus: false
  });

  return {
    data,
    loading,
    error,
    refetch
  };
}

/**
 * ✅ MODERN CATEGORIES DATA HOOK (Full)
 * - For categories page with filters
 * - Pagination, search, sorting
 */
export function useCategoriesWithFilters(options: UseCategoriesDataOptions) {
  const { filters, enabled = true, debounceSearch = false, debounceMs = 0 } = options;

  const { data, loading, error, refetch } = useDedupedApi({
    filters,
    fetchFn: async (filters: CategoryFilters) => {
      console.log('🔍 useCategoriesWithFilters: Fetching with filters:', filters);
      const response = await categoriesApi.searchCategories(filters);
      
      if (response.success && response.data) {
        const apiData = response.data as any;
        
        return {
          categories: apiData.categories || [],
          total: apiData.total || 0,
          currentPage: apiData.page || 1,
          totalPages: apiData.totalPages || 1,
          limit: apiData.limit || 25,
          hasMore: apiData.hasMore || false
        };
      }
      
      throw new Error('Failed to fetch categories');
    },
    enabled,
    staleTime: debounceSearch ? 5000 : 30000,
    cacheTime: 300000,
    refetchOnMount: false, // ✅ Changed to false to prevent unnecessary refetches
    refetchOnWindowFocus: false
  });

  return {
    data,
    loading,
    error,
    refetch
  };
}