import { useDedupedApi } from '../utils/useDedupedApi';
import { authenticatedFetch, parseApiResponse } from '@rentalshop/utils';
import { apiUrls } from '@rentalshop/utils';
import type { MerchantsResponse } from '@rentalshop/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface MerchantFilters {
  search?: string;
  status?: string;
  plan?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MerchantsDataResponse {
  merchants: any[];
  total: number;
  page: number;
  currentPage: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

export interface UseMerchantsDataOptions {
  filters: MerchantFilters;
  enabled?: boolean;
}

export interface UseMerchantsDataReturn {
  data: MerchantsDataResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * ✅ MODERN MERCHANTS DATA HOOK
 * 
 * Clean and simple wrapper around useDedupedApi for merchants
 * 
 * Features:
 * - Automatic request deduplication
 * - Intelligent caching (30s stale time)
 * - Request cancellation and race condition protection
 * - Transform API response to consistent format
 * 
 * Usage:
 * ```tsx
 * const { data, loading, error } = useMerchantsData({ 
 *   filters: { page: 1, status: 'active' }
 * });
 * ```
 */
export function useMerchantsData(options: UseMerchantsDataOptions): UseMerchantsDataReturn {
  const { filters, enabled = true } = options;
  
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters: MerchantFilters) => {
      console.log('🏢 useMerchantsData: Fetching with filters:', filters);
      
      // Build query params for API
      // API now uses page parameter (consistent with client APIs)
      const limit = filters.limit || 10;
      const page = filters.page || 1;
      
      const queryParams = new URLSearchParams();
      queryParams.set('page', page.toString());
      queryParams.set('limit', limit.toString());
      if (filters.search) queryParams.set('q', filters.search);
      if (filters.status && filters.status !== 'all') queryParams.set('status', filters.status);
      if (filters.plan && filters.plan !== 'all') queryParams.set('plan', filters.plan);
      if (filters.sortBy) queryParams.set('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder);
      
      const url = queryParams.toString() 
        ? `${apiUrls.merchants.list}?${queryParams.toString()}`
        : apiUrls.merchants.list;
      
      const response = await authenticatedFetch(url);
      const result = await parseApiResponse<MerchantsResponse>(response);

      if (!result.success || !result.data) {
        throw new Error('Failed to fetch merchants');
      }

      // Use pagination data directly from API response
      const apiData = result.data;
      
      console.log('🏢 useMerchantsData - API Response:', {
        hasData: !!apiData,
        merchantsCount: apiData.merchants?.length || 0,
        total: apiData.total,
        totalPages: apiData.totalPages,
        currentPage: apiData.currentPage,
        limit: apiData.limit
      });
      
      // Use API response pagination data, fallback to filters
      const responsePage = apiData.page || apiData.currentPage || page;
      const responseLimit = apiData.limit || limit;
      const totalPages = apiData.totalPages || 1;
      const total = apiData.total || 0;
      
      const transformed: MerchantsDataResponse = {
        merchants: apiData.merchants || [],
        total,
        page: responsePage,
        currentPage: responsePage,
        limit: responseLimit,
        hasMore: (apiData as any).hasMore !== undefined ? (apiData as any).hasMore : responsePage < totalPages,
        totalPages
      };
      
      console.log('✅ useMerchantsData: Success:', {
        merchantsCount: transformed.merchants.length,
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

