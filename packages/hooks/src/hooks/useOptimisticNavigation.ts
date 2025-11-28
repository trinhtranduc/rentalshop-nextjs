import { useState, useCallback, useEffect, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * ✅ STANDARDIZED OPTIMISTIC NAVIGATION HOOK
 * 
 * Based on Next.js App Router + React 18+ best practices:
 * - Uses React's useTransition for non-blocking navigation
 * - Provides immediate visual feedback (optimistic UI)
 * - Auto-prefetches routes on hover
 * - Works seamlessly with Next.js Link component
 * 
 * Pattern inspired by:
 * - Next.js App Router navigation patterns
 * - Remix optimistic UI patterns
 * - React 18 concurrent features
 * 
 * Usage:
 * ```typescript
 * const { navigate, navigatingTo, isPending } = useOptimisticNavigation();
 * 
 * // Option 1: Use with Link (recommended - Next.js handles prefetch)
 * <Link
 *   href="/page"
 *   onClick={(e) => {
 *     e.preventDefault();
 *     navigate('/page');
 *   }}
 *   className={navigatingTo === '/page' ? 'navigating' : ''}
 * >
 * 
 * // Option 2: Use with button/custom element
 * <button onClick={() => navigate('/page')}>
 *   {isPending && navigatingTo === '/page' ? 'Loading...' : 'Go'}
 * </button>
 * ```
 */
export interface UseOptimisticNavigationReturn {
  /** Navigate to a path with optimistic UI feedback */
  navigate: (path: string) => void;
  /** Currently navigating to this path (null if not navigating) */
  navigatingTo: string | null;
  /** Whether any navigation is pending (from React useTransition) */
  isPending: boolean;
  /** Prefetch a route for instant navigation */
  prefetch: (path: string) => void;
}

export function useOptimisticNavigation(): UseOptimisticNavigationReturn {
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();

  // Auto-clear navigation state when pathname changes (navigation completed)
  useEffect(() => {
    if (navigatingTo && pathname === navigatingTo) {
      // Navigation completed, clear state after a short delay for smooth transition
      const timer = setTimeout(() => {
        setNavigatingTo(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pathname, navigatingTo]);

  // Navigate with optimistic UI - instant navigation
  const navigate = useCallback((path: string) => {
    // 1. Immediate visual feedback (optimistic UI) - happens instantly
    setNavigatingTo(path);
    
    // 2. Navigate immediately - Next.js router is already non-blocking
    // Use scroll: false to prevent scroll blocking and make navigation instant
    router.push(path, { scroll: false });
  }, [router]);

  // Prefetch route for instant navigation (call on hover)
  const prefetch = useCallback((path: string) => {
    router.prefetch(path);
  }, [router]);

  return {
    navigate,
    navigatingTo,
    isPending,
    prefetch
  };
}
