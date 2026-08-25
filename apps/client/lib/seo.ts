/**
 * SEO helpers for cookie-based i18n (NEXT_LOCALE).
 * There is no `/vi|/en/...` App Router segment — do not advertise those URLs.
 */

export const SEO_LOCALES = ['vi', 'en', 'zh', 'ko', 'ja'] as const

/** Canonical + hreflang that all point at the same real path. */
export function selfReferencingAlternates(path: string) {
  const canonical = path === '' ? '/' : path.startsWith('/') ? path : `/${path}`
  const languages: Record<string, string> = {
    'x-default': canonical,
  }
  for (const locale of SEO_LOCALES) {
    languages[locale] = canonical
  }
  return { canonical, languages }
}

/** Absolute language map for sitemap.xml entries. */
export function sitemapLanguageAlternates(baseUrl: string, routePath: string) {
  const path = routePath === '' ? '' : routePath.startsWith('/') ? routePath : `/${routePath}`
  const url = `${baseUrl}${path || ''}`
  const languages: Record<string, string> = {
    'x-default': url || baseUrl,
  }
  for (const locale of SEO_LOCALES) {
    languages[locale] = url || baseUrl
  }
  return languages
}
