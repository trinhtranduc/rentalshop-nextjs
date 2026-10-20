import { MetadataRoute } from 'next'
import { PUBLIC_LOCALES, PUBLIC_PAGES, isPublicLocale, publicPagePath, publicPostPath, publicHomePath } from '@rentalshop/constants'
import { postsApi } from '@rentalshop/utils'
import { sitemapLanguageAlternates } from '../lib/seo'
import { publicPageAlternates } from '../lib/public-content/public-pages'

/** Refresh sitemap periodically so new blog posts appear without redeploying. */
export const revalidate = 3600

async function fetchPublishedBlogSlugs(): Promise<{ slug: string; locale: string; translationKey?: string | null; lastModified: Date }[]> {
  const editions = new Map<string, { slug: string; locale: string; translationKey?: string | null; lastModified: Date }>()
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
        if (!isPublicLocale(post.locale) || post.status !== 'PUBLISHED') continue
        const t = new Date(post.updatedAt)
        if (!Number.isFinite(t.getTime())) continue
        editions.set(`${post.locale}:${post.slug}`, { slug: post.slug, locale: post.locale, translationKey: post.translationKey, lastModified: t })
      }

      hasMore = Boolean(res.data.hasMore)
      page += 1
    }
  } catch {
    // API unreachable (offline build, misconfigured URL): omit dynamic blog URLs
  }

  return [...editions.values()]
}

/**
 * Public marketing URLs only.
 * Vietnamese has no prefix; other public content languages have a locale prefix.
 * Auth pages (/login, /register) intentionally omitted.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop').replace(/\/$/, '')

  const routes: Array<{
    path: string
    changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
    priority: number
  }> = [
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

  // #1114: pricing, features, download and AI image search in every public language
  for (const page of PUBLIC_PAGES) {
    const languages = Object.fromEntries(Object.entries(publicPageAlternates(page)).map(([code, path]) => [code, `${baseUrl}${path}`]))
    for (const locale of PUBLIC_LOCALES) {
      sitemapEntries.push({ url: `${baseUrl}${publicPagePath(locale, page)}`, changeFrequency: 'weekly', priority: 0.9, alternates: { languages } })
    }
  }

  for (const locale of PUBLIC_LOCALES) {
    for (const path of [publicHomePath(locale), publicPostPath(locale)]) {
      const isList = path.endsWith('/post')
      sitemapEntries.push({ url: `${baseUrl}${path}`, changeFrequency: isList ? 'daily' : 'weekly', priority: isList ? 0.8 : 0.9,
        alternates: { languages: Object.fromEntries(PUBLIC_LOCALES.map(code => [code, `${baseUrl}${isList ? publicPostPath(code) : publicHomePath(code)}`])) },
      })
    }
  }
  const blogPosts = await fetchPublishedBlogSlugs()
  for (const post of blogPosts) {
    if (!isPublicLocale(post.locale)) continue
    const siblings = blogPosts.filter(p => post.translationKey ? p.translationKey === post.translationKey : !p.translationKey && p.slug === post.slug)
    sitemapEntries.push({
      url: `${baseUrl}${publicPostPath(post.locale, post.slug)}`, lastModified: post.lastModified, changeFrequency: 'weekly', priority: 0.65,
      alternates: { languages: Object.fromEntries(siblings.filter(p => isPublicLocale(p.locale)).map(p => [p.locale, `${baseUrl}${publicPostPath(p.locale as typeof post.locale, p.slug)}`])) },
    })
  }

  return sitemapEntries
}
