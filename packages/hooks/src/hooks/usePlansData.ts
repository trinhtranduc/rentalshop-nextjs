import { useDedupedApi } from '../utils/useDedupedApi';
import { plansApi } from '@rentalshop/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface PlanFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PlansDataResponse {
  plans: any[];
  total: number;
  page: number;
  currentPage: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

export interface UsePlansDataOptions {
  filters: PlanFilters;
  enabled?: boolean;
}

export interface UsePlansDataReturn {
  data: PlansDataResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * ✅ MODERN PLANS DATA HOOK
 * 
 * Clean and simple wrapper around useDedupedApi for plans
 * 
 * Features:
 * - Automatic request deduplication
 * - Intelligent caching (30s stale time)
 * - Request cancellation and race condition protection
 * - Transform API response to consistent format
 * 
 * Usage:
 * ```tsx
 * const { data, loading, error } = usePlansData({ 
 *   filters: { page: 1, status: 'active' }
 * });
 * ```
 */
export function usePlansData(options: UsePlansDataOptions): UsePlansDataReturn {
  const { filters, enabled = true } = options;
  
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters: PlanFilters) => {
      console.log('📋 usePlansData: Fetching with filters:', filters);
      
      const response = await plansApi.getPlans({
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
        isActive: filters.status === 'active' ? true : filters.status === 'inactive' ? false : undefined
      });

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch plans');
      }

      // Transform API response to consistent format
      const apiData = response.data as any;
      const plansArray = Array.isArray(apiData) ? apiData : (apiData.plans || []);
      
      console.log('📋 usePlansData - API Response:', {
        hasData: !!apiData,
        isArray: Array.isArray(apiData),
        plansCount: plansArray.length,
        total: apiData.total,
        page: apiData.page,
        totalPages: apiData.totalPages
      });
      
      // Extract pagination metadata from API response
      const page = apiData.page || filters.page || 1;
      const limit = apiData.limit || filters.limit || 10;
      const total = apiData.total || plansArray.length;
      const totalPages = apiData.totalPages || Math.ceil(total / limit);
      
      const transformed: PlansDataResponse = {
        plans: plansArray,
        total,
        page,
        currentPage: page,
        limit,
        hasMore: apiData.hasMore !== undefined ? apiData.hasMore : page < totalPages,
        totalPages
      };
      
      console.log('✅ usePlansData: Success:', {
        plansCount: transformed.plans.length,
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

