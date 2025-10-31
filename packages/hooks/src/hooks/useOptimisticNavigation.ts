import { useRouter } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseOptimisticNavigationOptions {
  onNavigateStart?: (path: string) => void;
  onNavigateEnd?: (path: string) => void;
}

/**
 * Hook for instant navigation with immediate page transition
 * 
 * Flow:
 * 1. User clicks → Navigate IMMEDIATELY (0ms, synchronous router.push)
 * 2. Page transitions → Next.js loading.tsx shows skeleton
 * 3. Data loads → Real content displays
 * 
 * Key: Direct router.push for instant transitions, no overlay blocking
 */
export function useOptimisticNavigation(options: UseOptimisticNavigationOptions = {}) {
  const router = useRouter();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const navigate = useCallback((path: string) => {
    // Clear any existing timers
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 1. INSTANT (0ms): Navigate IMMEDIATELY - no delay, no overlay
    // Direct router.push for instant page transition
    options.onNavigateStart?.(path);
    router.push(path);
    
    // 2. CLEANUP: Clear state after brief moment
    timeoutRef.current = setTimeout(() => {
      setNavigatingTo(null);
      options.onNavigateEnd?.(path);
    }, 100); // Short timeout since we're not showing overlay
  }, [router, options]);

  return {
    navigate,
    navigatingTo,
    isNavigating: navigatingTo !== null
  };
}

