import type { MetadataRoute } from 'next'

/**
 * Allow marketing pages; block authenticated app shells and auth utility flows.
 * Sitemap is public marketing URLs only (see sitemap.ts).
 */
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop').replace(/\/$/, '')
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/dashboard',
        '/orders',
        '/products',
        '/customers',
        '/users',
        '/outlets',
        '/settings',
        '/authors',
        '/subscription',
        '/calendar',
        '/availability',
        '/loyalty',
        '/plans',
        '/categories',
        '/media',
        '/forget-password',
        '/reset-password',
        '/email-verification',
        '/verify-email',
        '/register/step-1',
        '/register/step-2',
        '/debug-auth-logs',
        '/test-layout',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
