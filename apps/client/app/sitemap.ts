import { MetadataRoute } from 'next'
import { postsApi } from '@rentalshop/utils'

/** Refresh sitemap periodically so new blog posts appear without redeploying. */
export const revalidate = 3600

function languageAlternates(
  baseUrl: string,
  routePath: string
): NonNullable<MetadataRoute.Sitemap[number]['alternates']>['languages'] {
  const xDefault = `${baseUrl}${routePath}`
  return {
    'x-default': xDefault,
    vi: `${baseUrl}/vi${routePath}`,
    en: `${baseUrl}/en${routePath}`,
    zh: `${baseUrl}/zh${routePath}`,
    ko: `${baseUrl}/ko${routePath}`,
    ja: `${baseUrl}/ja${routePath}`,
  }
}

async function fetchPublishedBlogSlugs(): Promise<{ slug: string; lastModified: Date }[]> {
  const slugToTime = new Map<string, number>()
  try {
    let page = 1
    const limit = 100
    let hasMore = true
    const maxPages = 50

    while (hasMore && page <= maxPages) {
      const res = await postsApi.searchPublicPosts({
        page,
        limit,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      })
      if (!res.success || !res.data?.data?.length) break

      for (const post of res.data.data) {
        if (!post.slug) continue
        const t = new Date(post.updatedAt).getTime()
        const prev = slugToTime.get(post.slug)
        if (prev === undefined || t > prev) slugToTime.set(post.slug, t)
      }

      hasMore = Boolean(res.data.hasMore)
      page += 1
    }
  } catch {
    // API unreachable (offline build, misconfigured URL): omit dynamic blog URLs
  }

  return [...slugToTime.entries()].map(([slug, ts]) => ({
    slug,
    lastModified: new Date(ts),
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop').replace(/\/$/, '')
  const locales = ['', 'vi', 'en', 'zh', 'ko', 'ja']

  const routes: Array<{
    path: string
    changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
    priority: number
  }> = [
    { path: '', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/features', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/pricing', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/login', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/register', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.5 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.5 },
    { path: '/affiliate', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/blog', changeFrequency: 'daily', priority: 0.8 },
  ]

  const sitemapEntries: MetadataRoute.Sitemap = []

  locales.forEach((locale) => {
    routes.forEach((route) => {
      const url = locale ? `${baseUrl}/${locale}${route.path}` : `${baseUrl}${route.path}`
      sitemapEntries.push({
        url,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: {
          languages: languageAlternates(baseUrl, route.path),
        },
      })
    })
  })

  const blogPosts = await fetchPublishedBlogSlugs()
  for (const { slug, lastModified } of blogPosts) {
    const path = `/blog/${encodeURIComponent(slug)}`
    const url = `${baseUrl}${path}`
    sitemapEntries.push({
      url,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.65,
      alternates: {
        languages: {
          'x-default': url,
          vi: url,
          en: url,
          zh: url,
          ko: url,
          ja: url,
        },
      },
    })
  }

  return sitemapEntries
}
