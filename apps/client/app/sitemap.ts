import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'
  const locales = ['', 'vi', 'en', 'zh', 'ko', 'ja'] // Empty string for default locale
  
  const routes = [
    {
      path: '',
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
    {
      path: '/features',
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      path: '/pricing',
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      path: '/login',
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      path: '/register',
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      path: '/terms',
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    },
    {
      path: '/privacy',
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    },
    {
      path: '/affiliate',
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      path: '/blog',
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
  ]
  
  const sitemapEntries: MetadataRoute.Sitemap = []
  
  // Generate entries for each locale
  locales.forEach((locale) => {
    routes.forEach((route) => {
      const url = locale ? `${baseUrl}/${locale}${route.path}` : `${baseUrl}${route.path}`
      sitemapEntries.push({
        url,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: {
          languages: {
            vi: locale === 'vi' ? url : `${baseUrl}/vi${route.path}`,
            en: locale === 'en' ? url : `${baseUrl}/en${route.path}`,
            zh: locale === 'zh' ? url : `${baseUrl}/zh${route.path}`,
            ko: locale === 'ko' ? url : `${baseUrl}/ko${route.path}`,
            ja: locale === 'ja' ? url : `${baseUrl}/ja${route.path}`,
          },
        },
      })
    })
  })

  // Note: Blog posts are NOT included in sitemap.ts
  // Blog posts will be discovered and indexed by Google through:
  // 1. generateMetadata() in blog/[slug]/page.tsx (provides SEO metadata)
  // 2. Internal links from blog listing page
  // 3. Sitemap only includes main static routes
  
  return sitemapEntries
}

