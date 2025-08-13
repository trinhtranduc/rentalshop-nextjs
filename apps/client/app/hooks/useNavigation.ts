'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function useNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [prefetchedRoutes, setPrefetchedRoutes] = useState<Set<string>>(new Set())

  // Prefetch a route
  const prefetchRoute = useCallback((href: string) => {
    if (!prefetchedRoutes.has(href)) {
      router.prefetch(href)
      setPrefetchedRoutes(prev => new Set(prev).add(href))
    }
  }, [router, prefetchedRoutes])

  // Navigate to a route with transition
  const navigateTo = useCallback((href: string) => {
    startTransition(() => {
      router.push(href)
    })
  }, [router, startTransition])

  // Prefetch all main routes on mount
  useEffect(() => {
    const mainRoutes = ['/dashboard', '/orders', '/products', '/customers', '/users', '/shops', '/settings']
    mainRoutes.forEach(route => {
      if (route !== pathname) {
        prefetchRoute(route)
      }
    })
  }, [pathname, prefetchRoute])

  return {
    isPending,
    navigateTo,
    prefetchRoute,
    currentPath: pathname
  }
}
