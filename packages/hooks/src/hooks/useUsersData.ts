'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useDedupedApi } from '../utils/useDedupedApi';
import { usersApi } from '@rentalshop/utils';
import type { UserFilters, User } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface UsersDataResponse {
  users: User[];
  total: number;
  page: number;
  currentPage: number; // Alias for page
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

export interface UseUsersDataOptions {
  filters: UserFilters;
  enabled?: boolean;
}

export interface UseUsersDataReturn {
  data: UsersDataResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * ✅ MODERN USERS DATA HOOK
 * 
 * Clean and simple wrapper around useDedupedApi for users
 * 
 * Features:
 * - Automatic request deduplication
 * - Intelligent caching (30s stale time)
 * - Request cancellation and race condition protection
 * - Transform API response to consistent format
 * 
 * Usage:
 * ```tsx
 * const { data, loading, error } = useUsersData({ 
 *   filters: { page: 1, role: 'OUTLET_ADMIN' }
 * });
 * ```
 */
export function useUsersData(options: UseUsersDataOptions): UseUsersDataReturn {
  const { filters, enabled = true } = options;
  const pathname = usePathname();
  
  // Include pathname in filters to ensure refetch when navigating between pages
  // This ensures that when user navigates to /users from another page, data is refetched
  // The pathname change will cause cacheKey to change, forcing a refetch
  const filtersWithPath = useMemo(() => ({
    ...filters,
    _pathname: pathname // Internal key to force refetch on navigation
  }), [filters, pathname]);
  
  const result = useDedupedApi({
    filters: filtersWithPath,
    fetchFn: async (filtersWithPath: UserFilters & { _pathname?: string }) => {
      // Remove internal _pathname before making API call
      const { _pathname, ...apiFilters } = filtersWithPath;
      console.log('👤 useUsersData: Fetching with filters:', apiFilters);
      
      const response = await usersApi.searchUsers(apiFilters);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch users');
      }

      // Transform API response to consistent format
      const apiData = response.data as any;
      
      // Handle both array and object responses
      let usersData: User[];
      let total: number;
      let page: number;
      let limit: number;
      let hasMore: boolean;
      let totalPages: number;

      if (Array.isArray(apiData)) {
        // Direct array: { success: true, data: [...users], pagination: {...} }
        const pagination = (response as any).pagination || {};
        usersData = apiData;
        total = pagination.total || apiData.length;
        page = pagination.page || 1;
        limit = pagination.limit || 25;
        totalPages = Math.ceil(total / limit);
        hasMore = pagination.hasMore !== undefined ? pagination.hasMore : page < totalPages;
      } else {
        // Nested object: { success: true, data: { users, total, page, ... } }
        usersData = apiData.users || [];
        total = apiData.total || 0;
        page = apiData.page || 1;
        limit = apiData.limit || 25;
        totalPages = apiData.totalPages || Math.ceil(total / limit);
        hasMore = apiData.hasMore !== undefined ? apiData.hasMore : page < totalPages;
      }

      const transformed: UsersDataResponse = {
        users: usersData,
        total,
        page,
        currentPage: page, // Alias for compatibility
        limit,
        hasMore,
        totalPages
      };
      
      console.log('✅ useUsersData: Success:', {
        usersCount: transformed.users.length,
        total: transformed.total,
        page: transformed.page
      });
      
      return transformed;
    },
    enabled,
    staleTime: 0, // ✅ Set to 0 to always refetch on navigation (no stale cache)
    cacheTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true // ✅ Force refetch when component mounts (navigating to page)
  });

  return result;
}
