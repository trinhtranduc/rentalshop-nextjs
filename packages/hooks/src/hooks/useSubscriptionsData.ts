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
      
      const limit = filters.limit || 20;
      const page = filters.page || 1;
      
      const searchFilters: any = {
        limit,
        page,
        search: filters.search,
        status: filters.status,
        merchantId: filters.merchant ? parseInt(filters.merchant) : undefined,
        planId: filters.plan ? parseInt(filters.plan) : undefined
      };
      
      const response = await subscriptionsApi.search(searchFilters);

      if (!response.success) {
        throw new Error('Failed to fetch subscriptions');
      }

      // API returns: { success: true, data: Subscription[], pagination: { total, page, limit, totalPages, hasMore } }
      const responseData = response as any;
      let subscriptionsArray: any[] = [];
      let total = 0;
      let totalPages = 1;
      
      // Extract subscriptions array from response.data
      if (Array.isArray(responseData.data)) {
        subscriptionsArray = responseData.data;
      } else if (responseData.data?.data && Array.isArray(responseData.data.data)) {
        subscriptionsArray = responseData.data.data;
      } else if (responseData.data?.subscriptions && Array.isArray(responseData.data.subscriptions)) {
        subscriptionsArray = responseData.data.subscriptions;
      } else {
        subscriptionsArray = [];
      }
      
      // Extract pagination metadata - API returns pagination at top level
      let responsePage = page;
      let responseLimit = limit;
      
      if (responseData.pagination) {
        // Pagination is at top level: { success: true, data: [...], pagination: {...} }
        total = responseData.pagination.total || subscriptionsArray.length;
        responsePage = responseData.pagination.page || page;
        responseLimit = responseData.pagination.limit || limit;
        totalPages = responseData.pagination.totalPages || Math.ceil(total / responseLimit);
      } else if (responseData.data?.pagination) {
        // Pagination is nested in data: { success: true, data: { subscriptions: [...], pagination: {...} } }
        total = responseData.data.pagination.total || subscriptionsArray.length;
        responsePage = responseData.data.pagination.page || page;
        responseLimit = responseData.data.pagination.limit || limit;
        totalPages = responseData.data.pagination.totalPages || Math.ceil(total / responseLimit);
      } else if (responseData.data?.total !== undefined) {
        // Direct pagination fields in data
        total = responseData.data.total || subscriptionsArray.length;
        responsePage = responseData.data.page || page;
        responseLimit = responseData.data.limit || limit;
        totalPages = responseData.data.totalPages || Math.ceil(total / responseLimit);
      } else {
        // Fallback: use array length if no pagination metadata
        total = subscriptionsArray.length;
        totalPages = Math.ceil(total / limit);
      }
      
      console.log('💳 useSubscriptionsData - Parsed pagination:', {
        total,
        responsePage,
        responseLimit,
        totalPages,
        subscriptionsCount: subscriptionsArray.length
      });
      
      const transformed: SubscriptionsDataResponse = {
        subscriptions: subscriptionsArray,
        total,
        page: responsePage,
        currentPage: responsePage,
        limit: responseLimit,
        hasMore: responsePage < totalPages,
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

