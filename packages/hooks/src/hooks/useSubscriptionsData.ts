import { useDedupedApi } from '../utils/useDedupedApi';
import { subscriptionsApi } from '@rentalshop/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface SubscriptionFilters {
  search?: string;
  status?: string;
  plan?: string;
  merchant?: string;
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SubscriptionsDataResponse {
  subscriptions: any[];
  total: number;
  page: number;
  currentPage: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

export interface UseSubscriptionsDataOptions {
  filters: SubscriptionFilters;
  enabled?: boolean;
}

export interface UseSubscriptionsDataReturn {
  data: SubscriptionsDataResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * ✅ MODERN SUBSCRIPTIONS DATA HOOK
 * 
 * Clean and simple wrapper around useDedupedApi for subscriptions
 * 
 * Features:
 * - Automatic request deduplication
 * - Intelligent caching (30s stale time)
 * - Request cancellation and race condition protection
 * - Transform API response to consistent format
 * 
 * Usage:
 * ```tsx
 * const { data, loading, error } = useSubscriptionsData({ 
 *   filters: { page: 1, status: 'active' }
 * });
 * ```
 */
export function useSubscriptionsData(options: UseSubscriptionsDataOptions): UseSubscriptionsDataReturn {
  const { filters, enabled = true } = options;
  
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters: SubscriptionFilters) => {
      console.log('💳 useSubscriptionsData: Fetching with filters:', filters);
      
      const response = await subscriptionsApi.search({
        limit: filters.limit || 20,
        offset: filters.offset || (filters.page ? (filters.page - 1) * (filters.limit || 20) : 0)
      });

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch subscriptions');
      }

      // Transform API response to consistent format
      const apiData = response.data as any;
      let subscriptionsArray: any[] = [];
      let total = 0;
      
      console.log('💳 useSubscriptionsData - API Response:', {
        hasData: !!apiData,
        isArray: Array.isArray(apiData),
        hasDataProperty: apiData && Array.isArray(apiData.data)
      });
      
      if (Array.isArray(apiData)) {
        subscriptionsArray = apiData;
        total = apiData.length;
      } else if (apiData && Array.isArray(apiData.data)) {
        subscriptionsArray = apiData.data;
        total = apiData.pagination?.total || apiData.data.length;
      } else {
        console.error('Invalid subscriptions data structure:', apiData);
      }
      
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const totalPages = Math.ceil(total / limit);
      
      const transformed: SubscriptionsDataResponse = {
        subscriptions: subscriptionsArray,
        total,
        page,
        currentPage: page,
        limit,
        hasMore: page < totalPages,
        totalPages
      };
      
      console.log('✅ useSubscriptionsData: Success:', {
        subscriptionsCount: transformed.subscriptions.length,
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

