'use client';

import { useState, useEffect, useRef } from 'react';
import { usersApi } from '@rentalshop/utils';
import type { UserFilters, User } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface UsersDataResponse {
  users: User[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasMore: boolean;
}

export interface UseUsersDataOptions {
  filters: UserFilters;
  enabled?: boolean; // Allow disabling fetch
  debounceSearch?: boolean; // Debounce search queries
  debounceMs?: number; // Debounce delay
}

export interface UseUsersDataReturn {
  data: UsersDataResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * ✅ CLEAN DATA FETCHING HOOK
 * - Single responsibility: fetch users based on filters
 * - Automatic request cancellation
 * - Debounced search
 * - No state management (that's the page's job)
 */
export function useUsersData(options: UseUsersDataOptions): UseUsersDataReturn {
  const { filters, enabled = true, debounceSearch = true, debounceMs = 500 } = options;
  
  const [data, setData] = useState<UsersDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const refetchTriggerRef = useRef(0);

  // Refetch function
  const refetch = () => {
    refetchTriggerRef.current += 1;
  };

  useEffect(() => {
    if (!enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 useUsersData: Fetching with filters:', filters);

        const response = await usersApi.searchUsers(filters);

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        if (response.success && response.data) {
          // Handle different API response structures
          const apiData = response.data as any;
          
          // Check if data is array (direct array response)
          if (Array.isArray(apiData)) {
            // Direct array: { success: true, data: [...users], pagination: {...} }
            const pagination = (response as any).pagination || {};
            const usersData = apiData;
            const total = pagination.total || apiData.length;
            const limit = pagination.limit || filters.limit || 25;
            const currentPage = pagination.page || filters.page || 1;
            const totalPages = Math.ceil(total / limit);
            const hasMore = pagination.hasMore !== undefined ? pagination.hasMore : currentPage < totalPages;

            setData({
              users: usersData as User[],
              total,
              totalPages,
              currentPage,
              limit,
              hasMore
            });
          } else {
            // Nested object: { success: true, data: { users, total, page, ... } }
            const usersData = apiData.users || [];
            const total = apiData.total || 0;
            const limit = apiData.limit || filters.limit || 25;
            const currentPage = apiData.page || filters.page || 1;
            const totalPages = apiData.totalPages || Math.ceil(total / limit);
            const hasMore = apiData.hasMore !== undefined ? apiData.hasMore : currentPage < totalPages;

            setData({
              users: usersData as User[],
              total,
              totalPages,
              currentPage,
              limit,
              hasMore
            });
          }
        } else {
          throw new Error('Failed to fetch users');
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('🔍 useUsersData: Error fetching users:', err);
          setError(err as Error);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
      }
    };

    // Debounce search queries only
    if (debounceSearch && (filters.search || filters.q)) {
      console.log('🔍 useUsersData: Debouncing search query');
      const timer = setTimeout(fetchData, debounceMs);
      return () => {
        clearTimeout(timer);
        abortControllerRef.current?.abort();
      };
    } else {
      // Immediate fetch for non-search filters
      fetchData();
      return () => {
        abortControllerRef.current?.abort();
      };
    }
  }, [
    filters, // This is now stable from parent's memoization
    enabled,
    debounceSearch,
    debounceMs,
    refetchTriggerRef.current
  ]);

  return {
    data,
    loading,
    error,
    refetch
  };
}

