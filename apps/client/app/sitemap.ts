import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'
  const locales = ['', 'vi', 'en', 'zh', 'ko', 'ja'] // Empty string for default locale
  
  const routes = [
    {
      path: '',
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      path: '/login',
      changeFrequency: 'monthly' as const,
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
  
  return sitemapEntries
}

