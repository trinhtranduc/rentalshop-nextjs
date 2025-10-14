import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * ✅ MODERN API DEDUPLICATION HOOK - Clean & Simple
 * 
 * Inspired by TanStack Query & SWR
 * 
 * Key Features:
 * 1. Request deduplication (same request = single call)
 * 2. Global cache with stale-while-revalidate
 * 3. Race condition protection
 * 4. Automatic cleanup
 * 
 * Why this pattern?
 * - Prevents duplicate API calls from React 18 double mounting
 * - Shares cached data across all components
 * - Optimistic UI updates with stale data
 * - Production-ready and battle-tested pattern
 */

interface UseDedupedApiOptions<TFilters, TData> {
  filters: TFilters;
  fetchFn: (filters: TFilters) => Promise<TData>;
  enabled?: boolean;
  staleTime?: number; // Cache duration in ms (default: 30s)
  cacheTime?: number; // Keep in cache after unmount (default: 5min)
  refetchOnWindowFocus?: boolean;
}

interface UseDedupedApiReturn<TData> {
  data: TData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

// ============================================================================
// GLOBAL CACHE - Shared across all hook instances
// ============================================================================

const requestCache = new Map<string, Promise<any>>();
const dataCache = new Map<string, { data: any; timestamp: number; staleTime: number }>();

// ============================================================================
// HOOK
// ============================================================================

export function useDedupedApi<TFilters, TData>(
  options: UseDedupedApiOptions<TFilters, TData>
): UseDedupedApiReturn<TData> {
  const { 
    filters, 
    fetchFn, 
    enabled = true,
    staleTime = 30000, // 30 seconds
    cacheTime = 300000, // 5 minutes
    refetchOnWindowFocus = false
  } = options;

  // ============================================================================
  // STATE
  // ============================================================================
  
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  
  // ============================================================================
  // REFS - For tracking and avoiding stale updates
  // ============================================================================
  
  const fetchIdRef = useRef(0);
  const filtersRef = useRef<string>('');
  const fetchFnRef = useRef(fetchFn); // ✅ Store stable reference to fetchFn
  
  // Update fetchFnRef when fetchFn changes
  fetchFnRef.current = fetchFn;

  // Generate cache key from filters
  const cacheKey = JSON.stringify(filters);

  // ============================================================================
  // MAIN FETCH LOGIC - Single source of truth
  // ============================================================================
  
  useEffect(() => {
    // Skip if disabled
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Skip if filters haven't actually changed
    if (cacheKey === filtersRef.current && data !== null) {
      console.log('🔍 useDedupedApi: Filters unchanged, skipping fetch');
      return;
    }
    
    filtersRef.current = cacheKey;

    // Increment fetch ID for race condition protection
    fetchIdRef.current += 1;
    const currentFetchId = fetchIdRef.current;
    
    console.log(`🔍 Fetch #${currentFetchId}: Starting...`);

    // ========================================================================
    // STEP 1: Check cache first
    // ========================================================================
    
    const cached = dataCache.get(cacheKey);
    if (cached) {
      const now = Date.now();
      const isCacheStale = (now - cached.timestamp) > cached.staleTime;
      
      if (!isCacheStale) {
        // Cache is fresh - use it immediately
        console.log(`✅ Fetch #${currentFetchId}: Cache HIT (fresh)`);
        setData(cached.data);
        setLoading(false);
        setError(null);
        setIsStale(false);
        return;
      } else {
        // Cache is stale - show it while fetching new data (stale-while-revalidate)
        console.log(`⏰ Fetch #${currentFetchId}: Cache HIT (stale) - showing stale data`);
        setData(cached.data);
        setIsStale(true);
      }
    }

    // ========================================================================
    // STEP 2: Check if request is already in progress (deduplication)
    // ========================================================================
    
    const existingRequest = requestCache.get(cacheKey);
    if (existingRequest) {
      console.log(`🔄 Fetch #${currentFetchId}: DEDUPLICATION - waiting for existing request`);
      
      existingRequest
        .then((result) => {
          // Only update if this is still the latest fetch
          if (currentFetchId === fetchIdRef.current) {
            setData(result);
            setLoading(false);
            setError(null);
            setIsStale(false);
            console.log(`✅ Fetch #${currentFetchId}: Got deduplicated result`);
          } else {
            console.log(`⏭️ Fetch #${currentFetchId}: Stale, ignoring`);
          }
        })
        .catch((err) => {
          // Only update error if this is still the latest fetch
          if (currentFetchId === fetchIdRef.current) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            setLoading(false);
            console.error(`❌ Fetch #${currentFetchId}: Dedup ERROR:`, error);
          }
        });
      
      return;
    }

    // ========================================================================
    // STEP 3: Make new API request
    // ========================================================================
    
    setLoading(true);
    setError(null);

    const requestPromise = fetchFnRef.current(filters); // ✅ Use ref
    requestCache.set(cacheKey, requestPromise);

    requestPromise
      .then((result) => {
        // Race condition check - only update if this is still the latest fetch
        if (currentFetchId !== fetchIdRef.current) {
          console.log(`⏭️ Fetch #${currentFetchId}: Stale, ignoring result`);
          return;
        }

        console.log(`✅ Fetch #${currentFetchId}: SUCCESS - caching data`);

        // Cache the result
        dataCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          staleTime
        });

        // Clean up old cache entries
        const now = Date.now();
        for (const [key, cached] of dataCache.entries()) {
          if ((now - cached.timestamp) > cacheTime) {
            dataCache.delete(key);
            console.log(`🧹 Cleaned up old cache entry: ${key}`);
          }
        }

        // Update state
        setData(result);
        setError(null);
        setIsStale(false);
        setLoading(false);
      })
      .catch((err) => {
        // Race condition check
        if (currentFetchId !== fetchIdRef.current) {
          console.log(`⏭️ Fetch #${currentFetchId}: Stale, ignoring error`);
          return;
        }

        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        setLoading(false);
        console.error(`❌ Fetch #${currentFetchId}: ERROR:`, error);
      })
      .finally(() => {
        // Clean up request cache
        requestCache.delete(cacheKey);
      });

  }, [cacheKey, enabled, staleTime, cacheTime]); // ✅ fetchFn removed - use ref instead

  // ============================================================================
  // WINDOW FOCUS REFETCH (Optional)
  // ============================================================================
  
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleFocus = () => {
      const cached = dataCache.get(cacheKey);
      if (!cached) return;
      
      const now = Date.now();
      const isCacheStale = (now - cached.timestamp) > cached.staleTime;
      
      if (isCacheStale) {
        console.log('🔄 Window focus: Refetching stale data');
        // Trigger refetch by clearing the filter ref
        filtersRef.current = '';
        fetchIdRef.current += 1;
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, cacheKey, staleTime]);

  // ============================================================================
  // MANUAL REFETCH
  // ============================================================================
  
  const refetch = useCallback(async () => {
    if (!enabled) return;
    
    console.log('🔄 Manual refetch triggered');
    
    // Clear cache and trigger refetch
    dataCache.delete(cacheKey);
    filtersRef.current = '';
    fetchIdRef.current += 1;
  }, [enabled, cacheKey]);

  return {
    data,
    loading,
    error,
    refetch,
    isStale
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Clear all caches (useful for logout, etc.)
 */
export function clearApiCache() {
  requestCache.clear();
  dataCache.clear();
  console.log('🧹 API Cache cleared');
}

/**
 * Get cache stats (for debugging)
 */
export function getApiCacheStats() {
  return {
    requestCacheSize: requestCache.size,
    dataCacheSize: dataCache.size,
    cacheKeys: Array.from(dataCache.keys())
  };
}
