'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function useNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [prefetchedRoutes, setPrefetchedRoutes] = useState<Set<string>>(new Set())

  // Prefetch a route
  const prefetchRoute = useCallback((href: string) => {
    if (!prefetchedRoutes.has(href)) {
      router.prefetch(href)
      setPrefetchedRoutes(prev => new Set(prev).add(href))
    }
  }, [router, prefetchedRoutes])

  // Navigate to a route instantly (non-blocking)
  const navigateTo = useCallback((href: string) => {
    // Instant navigation without any delays
    router.push(href)
  }, [router])

  // Prefetch all main routes on mount
  useEffect(() => {
    const mainRoutes = ['/dashboard', '/orders', '/products', '/customers', '/users', '/outlets', '/settings']
    mainRoutes.forEach(route => {
      if (route !== pathname) {
        prefetchRoute(route)
      }
    })
  }, [pathname, prefetchRoute])

  return {
    isPending: false, // Always false since we're not using transitions
    navigateTo,
    prefetchRoute,
    currentPath: pathname
  }
}
