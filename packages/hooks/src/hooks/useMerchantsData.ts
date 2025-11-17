import { useDedupedApi } from '../utils/useDedupedApi';
import { merchantsApi } from '@rentalshop/utils';

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
      
      const response = await merchantsApi.getMerchants();

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch merchants');
      }

      // Transform API response to consistent format
      const apiData = response.data as any;
      const merchantsArray = apiData.merchants || [];
      
      console.log('🏢 useMerchantsData - API Response:', {
        hasData: !!apiData,
        hasMerchantsArray: !!merchantsArray,
        merchantsCount: merchantsArray.length,
        firstMerchant: merchantsArray[0]
      });
      
      // Apply client-side filtering if needed (until backend supports it)
      let filteredMerchants = merchantsArray;
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredMerchants = filteredMerchants.filter((m: any) => 
          m.name?.toLowerCase().includes(searchLower) ||
          m.email?.toLowerCase().includes(searchLower)
        );
      }
      
      if (filters.status && filters.status !== 'all') {
        filteredMerchants = filteredMerchants.filter((m: any) => 
          filters.status === 'active' ? m.isActive : !m.isActive
        );
      }
      
      if (filters.plan && filters.plan !== 'all') {
        filteredMerchants = filteredMerchants.filter((m: any) => 
          String(m.planId) === filters.plan
        );
      }
      
      // Apply sorting
      if (filters.sortBy) {
        filteredMerchants.sort((a: any, b: any) => {
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
      const paginatedMerchants = filteredMerchants.slice(startIndex, endIndex);
      const total = filteredMerchants.length;
      const totalPages = Math.ceil(total / limit);
      
      const transformed: MerchantsDataResponse = {
        merchants: paginatedMerchants,
        total,
        page,
        currentPage: page,
        limit,
        hasMore: endIndex < total,
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

