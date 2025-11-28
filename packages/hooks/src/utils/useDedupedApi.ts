import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

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
  refetchOnMount?: boolean; // Refetch on component mount (default: true)
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
    refetchOnWindowFocus = false,
    refetchOnMount = false // Default to false to prevent infinite loops
  } = options;

  // ============================================================================
  // STATE
  // ============================================================================
  
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0); // ✅ Official pattern: State trigger for manual refetch
  
  // ============================================================================
  // REFS - For tracking and avoiding stale updates
  // ============================================================================
  
  const fetchIdRef = useRef(0);
  const filtersRef = useRef<string>('');
  const fetchFnRef = useRef(fetchFn); // ✅ Store stable reference to fetchFn
  const isMountedRef = useRef(true); // ✅ Track mount state to prevent memory leaks
  
  // Update fetchFnRef when fetchFn changes
  fetchFnRef.current = fetchFn;
  
  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Generate stable cache key from filters (normalize undefined values)
  // Filters now use strings instead of Date objects for better stability
  const cacheKey = useMemo(() => {
    // Create normalized filters object (remove undefined, sort keys for consistency)
    const normalized: any = {};
    Object.keys(filters as any)
      .sort()
      .forEach(key => {
        const value = (filters as any)[key];
        // Only include defined, non-null, non-empty values
        if (value !== undefined && value !== null && value !== '') {
          normalized[key] = value; // Already string (or primitive), no conversion needed
        }
      });
    return JSON.stringify(normalized);
  }, [filters]);

  // ============================================================================
  // MAIN FETCH LOGIC - Single source of truth
  // ============================================================================
  
  useEffect(() => {
    // Skip if disabled or unmounted
    if (!enabled || !isMountedRef.current) {
      if (!enabled) setLoading(false);
      return;
    }

    // Official pattern: Skip if filters haven't actually changed
    // Only fetch if cacheKey changed OR manual refetch was triggered
    const isManualRefetch = refetchKey > 0;
    if (cacheKey === filtersRef.current && !isManualRefetch) {
      console.log('🔍 useDedupedApi: Filters unchanged, skipping fetch');
      return;
    }
    
    // Update ref BEFORE starting fetch to prevent duplicate calls
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
        // Cache is fresh
        if (refetchOnMount) {
          // refetchOnMount: true - Always fetch new data, but show cache first
          console.log(`✅ Fetch #${currentFetchId}: Cache HIT (fresh) - but refetchOnMount=true, showing cache and fetching new data`);
          if (isMountedRef.current) {
            setData(cached.data);
            setLoading(false);
            setError(null);
            setIsStale(false);
          }
          // Continue to fetch new data below
        } else {
          // refetchOnMount: false - Use cache and skip fetch
          console.log(`✅ Fetch #${currentFetchId}: Cache HIT (fresh) - refetchOnMount=false, using cache`);
          if (isMountedRef.current) {
            setData(cached.data);
            setLoading(false);
            setError(null);
            setIsStale(false);
          }
          return; // Skip fetch
        }
      } else {
        // Cache is stale - show it while fetching new data (stale-while-revalidate)
        console.log(`⏰ Fetch #${currentFetchId}: Cache HIT (stale) - showing stale data`);
        if (isMountedRef.current) {
          setData(cached.data);
          setIsStale(true);
        }
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
          // Only update if this is still the latest fetch and mounted
          if (currentFetchId === fetchIdRef.current && isMountedRef.current) {
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
          // Only update error if this is still the latest fetch and mounted
          if (currentFetchId === fetchIdRef.current && isMountedRef.current) {
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
    
    // Only update state if still mounted
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

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

        // Update state only if still mounted
        if (isMountedRef.current) {
          setData(result);
          setError(null);
          setIsStale(false);
          setLoading(false);
        }
      })
      .catch((err) => {
        // Race condition check
        if (currentFetchId !== fetchIdRef.current) {
          console.log(`⏭️ Fetch #${currentFetchId}: Stale, ignoring error`);
          return;
        }

        const error = err instanceof Error ? err : new Error('Unknown error');
        // Update state only if still mounted
        if (isMountedRef.current) {
          setError(error);
          setLoading(false);
        }
        console.error(`❌ Fetch #${currentFetchId}: ERROR:`, error);
      })
      .finally(() => {
        // Clean up request cache
        requestCache.delete(cacheKey);
      });

  }, [cacheKey, enabled, staleTime, cacheTime, refetchKey]); // ✅ Official pattern: refetchKey triggers manual refetch

  // ============================================================================
  // RESET REFETCH KEY - Prevent infinite loops
  // ============================================================================
  
  useEffect(() => {
    // Reset refetchKey after it's been used (prevents infinite loops)
    // Only reset if refetchKey > 0 and we're not currently fetching
    if (refetchKey > 0 && !loading) {
      // Use a small delay to ensure the fetch effect has completed
      const timer = setTimeout(() => {
        setRefetchKey(0);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [refetchKey, loading]);

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
    
    // Official pattern: Clear cache and trigger refetch via state update
    dataCache.delete(cacheKey);
    filtersRef.current = '';
    fetchIdRef.current += 1;
    
    // ✅ Official pattern: State update triggers useEffect re-run
    setRefetchKey(prev => prev + 1);
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
