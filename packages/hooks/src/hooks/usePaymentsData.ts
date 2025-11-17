import { useDedupedApi } from '../utils/useDedupedApi';
import { paymentsApi } from '@rentalshop/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface PaymentFilters {
  search?: string;
  status?: string;
  dateFilter?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentsDataResponse {
  payments: any[];
  total: number;
  page: number;
  currentPage: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

export interface UsePaymentsDataOptions {
  filters: PaymentFilters;
  enabled?: boolean;
}

export interface UsePaymentsDataReturn {
  data: PaymentsDataResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * ✅ MODERN PAYMENTS DATA HOOK
 * 
 * Clean and simple wrapper around useDedupedApi for payments
 * 
 * Features:
 * - Automatic request deduplication
 * - Intelligent caching (30s stale time)
 * - Request cancellation and race condition protection
 * - Transform API response to consistent format
 * 
 * Usage:
 * ```tsx
 * const { data, loading, error } = usePaymentsData({ 
 *   filters: { page: 1, status: 'completed' }
 * });
 * ```
 */
export function usePaymentsData(options: UsePaymentsDataOptions): UsePaymentsDataReturn {
  const { filters, enabled = true } = options;
  
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters: PaymentFilters) => {
      console.log('💰 usePaymentsData: Fetching with filters:', filters);
      
      const response = await paymentsApi.getPayments();

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch payments');
      }

      // Transform API response to consistent format
      const apiData = response.data as any;
      const paymentsArray = Array.isArray(apiData) ? apiData : apiData.payments || [];
      
      console.log('💰 usePaymentsData - API Response:', {
        hasData: !!apiData,
        isArray: Array.isArray(apiData),
        paymentsCount: paymentsArray.length,
        firstPayment: paymentsArray[0]
      });
      
      // Apply client-side filtering if needed (until backend supports it)
      let filteredPayments = paymentsArray;
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredPayments = filteredPayments.filter((p: any) => 
          p.subscription?.merchant?.name?.toLowerCase().includes(searchLower) ||
          p.invoiceNumber?.toLowerCase().includes(searchLower) ||
          p.transactionId?.toLowerCase().includes(searchLower)
        );
      }
      
      if (filters.status && filters.status !== 'all') {
        filteredPayments = filteredPayments.filter((p: any) => 
          p.status?.toLowerCase() === filters.status?.toLowerCase()
        );
      }
      
      if (filters.dateFilter && filters.dateFilter !== 'all') {
        const now = new Date();
        filteredPayments = filteredPayments.filter((p: any) => {
          const paymentDate = new Date(p.createdAt);
          
          if (filters.dateFilter === 'today') {
            return now.toDateString() === paymentDate.toDateString();
          } else if (filters.dateFilter === 'this_month') {
            return now.getMonth() === paymentDate.getMonth() && 
                   now.getFullYear() === paymentDate.getFullYear();
          } else if (filters.dateFilter === 'this_year') {
            return now.getFullYear() === paymentDate.getFullYear();
          }
          
          return true;
        });
      }
      
      // Apply sorting
      if (filters.sortBy) {
        filteredPayments.sort((a: any, b: any) => {
          const aVal = a[filters.sortBy!];
          const bVal = b[filters.sortBy!];
          const order = filters.sortOrder === 'desc' ? -1 : 1;
          return (aVal > bVal ? 1 : -1) * order;
        });
      }
      
      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPayments = filteredPayments.slice(startIndex, endIndex);
      const total = filteredPayments.length;
      const totalPages = Math.ceil(total / limit);
      
      const transformed: PaymentsDataResponse = {
        payments: paginatedPayments,
        total,
        page,
        currentPage: page,
        limit,
        hasMore: endIndex < total,
        totalPages
      };
      
      console.log('✅ usePaymentsData: Success:', {
        paymentsCount: transformed.payments.length,
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

