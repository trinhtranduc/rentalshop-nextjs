import { MetadataRoute } from 'next'
import { postsApi } from '@rentalshop/utils'
import { sitemapLanguageAlternates } from '../lib/seo'

/** Refresh sitemap periodically so new blog posts appear without redeploying. */
export const revalidate = 3600

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

/**
 * Public marketing URLs only.
 * Cookie-based i18n → one URL per path (no /vi|/en prefixes).
 * Auth pages (/login, /register) intentionally omitted.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop').replace(/\/$/, '')

  const routes: Array<{
    path: string
    changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
    priority: number
  }> = [
    { path: '', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/features', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/pricing', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/download', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/tim-san-pham-bang-hinh-anh', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/cho-thue-ao-dai', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/cho-thue-ao-cuoi', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/cho-thue-trang-thiet-bi', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/cho-thue-trang-phuc', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/blog', changeFrequency: 'daily', priority: 0.8 },
    { path: '/affiliate', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.5 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.5 },
  ]

  const sitemapEntries: MetadataRoute.Sitemap = routes.map((route) => {
    const url = `${baseUrl}${route.path}`
    return {
      url,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: sitemapLanguageAlternates(baseUrl, route.path),
      },
    }
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
        languages: sitemapLanguageAlternates(baseUrl, path),
      },
    })
  }

  return sitemapEntries
}
