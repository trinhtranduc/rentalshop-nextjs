import { MetadataRoute } from 'next'
import { db } from '@rentalshop/database'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  // Add blog posts to sitemap
  try {
    // Fetch all published posts for all locales
    const allLocales: ('en' | 'vi' | 'zh' | 'ko' | 'ja')[] = ['en', 'vi', 'zh', 'ko', 'ja']
    
    for (const locale of allLocales) {
      const postsResult = await db.posts.search({
        status: 'PUBLISHED',
        locale,
        limit: 1000, // Get all published posts
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      })

      if (postsResult.data && postsResult.data.length > 0) {
        postsResult.data.forEach((post) => {
          // Only add posts with publishedAt date
          if (post.publishedAt) {
            const localePrefix = locale === 'vi' ? '' : `/${locale}` // Default locale is vi
            const url = `${baseUrl}${localePrefix}/blog/${post.slug}`
            
            sitemapEntries.push({
              url,
              lastModified: post.updatedAt || post.publishedAt || post.createdAt,
              changeFrequency: 'weekly' as const,
              priority: 0.7,
              alternates: {
                languages: {
                  vi: locale === 'vi' ? url : `${baseUrl}/blog/${post.slug}`,
                  en: locale === 'en' ? url : `${baseUrl}/en/blog/${post.slug}`,
                  zh: locale === 'zh' ? url : `${baseUrl}/zh/blog/${post.slug}`,
                  ko: locale === 'ko' ? url : `${baseUrl}/ko/blog/${post.slug}`,
                  ja: locale === 'ja' ? url : `${baseUrl}/ja/blog/${post.slug}`,
                },
              },
            })
          }
        })
      }
    }
  } catch (error) {
    console.error('Error fetching blog posts for sitemap:', error)
    // Continue without blog posts if there's an error
  }
  
  return sitemapEntries
}

