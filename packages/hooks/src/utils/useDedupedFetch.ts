import { useState, useEffect, useRef } from 'react';

/**
 * Modern Hook Pattern: Deduped API Fetching
 * 
 * Prevents duplicate API calls caused by:
 * 1. React 18 double mounting (development)
 * 2. Rapid state changes
 * 3. Multiple re-renders
 * 
 * Pattern used by:
 * - TanStack Query (React Query)
 * - SWR
 * - Apollo Client
 */

export interface UseDedupedFetchOptions<TFilters, TData> {
  filters: TFilters;
  fetchFn: (filters: TFilters) => Promise<TData>;
  enabled?: boolean;
  debounce?: boolean;
  debounceMs?: number;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

export interface UseDedupedFetchReturn<TData> {
  data: TData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDedupedFetch<TFilters, TData>(
  options: UseDedupedFetchOptions<TFilters, TData>
): UseDedupedFetchReturn<TData> {
  const { 
    filters, 
    fetchFn, 
    enabled = true, 
    debounce = false, 
    debounceMs = 500,
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Refs for deduplication and cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchCounterRef = useRef(0);
  const lastFiltersRef = useRef<string>('');
  const refetchTriggerRef = useRef(0);

  const refetch = () => {
    refetchTriggerRef.current += 1;
    lastFiltersRef.current = ''; // Force refetch
  };

  useEffect(() => {
    if (!enabled) return;

    // 🔑 KEY #1: Deduplication - Skip if filters unchanged
    const filtersString = JSON.stringify(filters);
    if (filtersString === lastFiltersRef.current && data !== null) {
      console.log('✅ Dedup: Filters unchanged, skipping fetch');
      return;
    }
    lastFiltersRef.current = filtersString;

    // 🔑 KEY #2: Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // 🔑 KEY #3: Track fetch ID for stale check
    fetchCounterRef.current += 1;
    const currentFetchId = fetchCounterRef.current;

    const executeFetch = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(`📡 Fetch #${currentFetchId}: Starting...`);

        const result = await fetchFn(filters);

        // 🔑 KEY #4: Abort check
        if (abortControllerRef.current?.signal.aborted) {
          console.log(`📡 Fetch #${currentFetchId}: Aborted`);
          return;
        }

        // 🔑 KEY #5: Stale check
        if (currentFetchId !== fetchCounterRef.current) {
          console.log(`📡 Fetch #${currentFetchId}: Stale, ignoring`);
          return;
        }

        console.log(`✅ Fetch #${currentFetchId}: Success`);
        setData(result);
        onSuccess?.(result);
      } catch (err) {
        // Skip abort errors
        if ((err as Error).name === 'AbortError') {
          console.log(`📡 Fetch #${currentFetchId}: Aborted via error`);
          return;
        }

        // Check if stale before setting error
        if (currentFetchId !== fetchCounterRef.current) {
          return;
        }

        console.error(`❌ Fetch #${currentFetchId}: Error`, err);
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        onError?.(error);
      } finally {
        // Only update loading if not aborted and not stale
        if (
          !abortControllerRef.current?.signal.aborted &&
          currentFetchId === fetchCounterRef.current
        ) {
          setLoading(false);
        }
      }
    };

    // 🔑 KEY #6: Debounce for search queries
    if (debounce) {
      console.log(`⏱️  Fetch #${currentFetchId}: Debouncing ${debounceMs}ms`);
      const timer = setTimeout(executeFetch, debounceMs);
      return () => {
        clearTimeout(timer);
        abortControllerRef.current?.abort();
      };
    } else {
      // Immediate fetch
      executeFetch();
      return () => {
        abortControllerRef.current?.abort();
      };
    }
  }, [filters, enabled, debounce, debounceMs, refetchTriggerRef.current]);

  return { data, loading, error, refetch };
}
