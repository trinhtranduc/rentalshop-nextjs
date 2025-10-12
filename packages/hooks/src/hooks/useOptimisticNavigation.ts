import { useRouter } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseOptimisticNavigationOptions {
  onNavigateStart?: (path: string) => void;
  onNavigateEnd?: (path: string) => void;
}

/**
 * Hook for instant navigation with immediate UI feedback
 * 
 * Flow:
 * 1. User clicks → Highlight INSTANTLY (0ms, synchronous state update)
 * 2. Next tick → Start navigation (requestAnimationFrame for smoothness)
 * 3. Page loads → Show skeleton
 * 
 * Key: Use synchronous state update + RAF to avoid any delay
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

    // 1. INSTANT (0ms): Update UI state IMMEDIATELY (synchronous)
    // This happens in the same event loop tick as the click
    setNavigatingTo(path);
    options.onNavigateStart?.(path);

    // 2. NEXT FRAME: Navigate using RAF for smooth animation
    // RAF ensures navigation happens after the highlight is painted
    rafRef.current = requestAnimationFrame(() => {
      router.push(path);
      
      // 3. CLEANUP: Clear state after navigation
      timeoutRef.current = setTimeout(() => {
        setNavigatingTo(null);
        options.onNavigateEnd?.(path);
      }, 500);
    });
  }, [router, options]);

  return {
    navigate,
    navigatingTo,
    isNavigating: navigatingTo !== null
  };
}

