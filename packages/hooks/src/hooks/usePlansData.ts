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
      
      const response = await plansApi.getPlans();

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch plans');
      }

      // Transform API response to consistent format
      const apiData = response.data as any;
      const plansArray = Array.isArray(apiData) ? apiData : apiData.plans || [];
      
      console.log('📋 usePlansData - API Response:', {
        hasData: !!apiData,
        isArray: Array.isArray(apiData),
        plansCount: plansArray.length,
        firstPlan: plansArray[0]
      });
      
      // Apply client-side filtering if needed (until backend supports it)
      let filteredPlans = plansArray;
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredPlans = filteredPlans.filter((p: any) => 
          p.name?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
        );
      }
      
      if (filters.status && filters.status !== 'all') {
        filteredPlans = filteredPlans.filter((p: any) => 
          filters.status === 'active' ? p.isActive : !p.isActive
        );
      }
      
      // Apply sorting
      if (filters.sortBy) {
        filteredPlans.sort((a: any, b: any) => {
          const aVal = a[filters.sortBy!];
          const bVal = b[filters.sortBy!];
          const order = filters.sortOrder === 'desc' ? -1 : 1;
          return (aVal > bVal ? 1 : -1) * order;
        });
      }
      
      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPlans = filteredPlans.slice(startIndex, endIndex);
      const total = filteredPlans.length;
      const totalPages = Math.ceil(total / limit);
      
      const transformed: PlansDataResponse = {
        plans: paginatedPlans,
        total,
        page,
        currentPage: page,
        limit,
        hasMore: endIndex < total,
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

