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
    filters: { _hook: 'useOutletsData' }, // Unique identifier to prevent cache collision
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
    filters: { _hook: 'useCategoriesData' }, // Unique identifier to prevent cache collision
    fetchFn: async () => {
      console.log('🔍 useCategoriesData: Fetching categories...');
      const response = await categoriesApi.getCategories();
      
      console.log('🔍 useCategoriesData: Raw API response:', {
        success: response.success,
        hasData: !!response.data,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        data: response.data
      });
      
      if (response.success && response.data) {
        // response.data should be an array from API
        const categoriesData = response.data;
        
        // Handle case where data might be wrapped in another object
        let finalData = categoriesData;
        if (!Array.isArray(categoriesData) && typeof categoriesData === 'object' && categoriesData !== null) {
          // Check if it's an object with array property
          if ('categories' in categoriesData && Array.isArray((categoriesData as any).categories)) {
            finalData = (categoriesData as any).categories;
            console.log('⚠️ useCategoriesData: Data was wrapped, extracted categories array');
          } else if (Array.isArray((categoriesData as any).data)) {
            finalData = (categoriesData as any).data;
            console.log('⚠️ useCategoriesData: Data was double-wrapped, extracted inner array');
          } else {
            console.error('❌ useCategoriesData: Data is not an array and no array property found:', categoriesData);
            throw new Error('Invalid categories data format');
          }
        }
        
        console.log('✅ useCategoriesData: Final categories data:', {
          isArray: Array.isArray(finalData),
          count: finalData.length,
          firstCategory: finalData[0]
        });
        
        return finalData;
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
    length: data?.length,
    dataKeys: data && typeof data === 'object' ? Object.keys(data) : null
  });

  // Ensure we always return an array
  // Handle case where data might be cached as object instead of array
  let categories: any[] = [];
  if (Array.isArray(data)) {
    categories = data;
  } else if (data && typeof data === 'object' && data !== null) {
    // Try to extract array from object
    if ('categories' in data && Array.isArray((data as any).categories)) {
      categories = (data as any).categories;
      console.log('⚠️ useCategoriesData: Extracted categories from object wrapper');
    } else if ('data' in data && Array.isArray((data as any).data)) {
      categories = (data as any).data;
      console.log('⚠️ useCategoriesData: Extracted categories from nested data property');
    } else {
      console.error('❌ useCategoriesData: Cannot extract array from data object:', data);
      categories = [];
    }
  }
  
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