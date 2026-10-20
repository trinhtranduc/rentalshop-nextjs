/** Marketing/content languages, separate from POS application languages. */
export const PUBLIC_LOCALES = ['vi', 'en', 'ja', 'ko', 'zh', 'ru', 'zh-TW', 'fr', 'de', 'th', 'id', 'es'] as const;
export type PublicLocale = typeof PUBLIC_LOCALES[number];
export const PUBLIC_LOCALE_NAMES: Record<PublicLocale, string> = {
  vi: 'Tiếng Việt', en: 'English', ja: '日本語', ko: '한국어', zh: '简体中文',
  ru: 'Русский', 'zh-TW': '繁體中文', fr: 'Français', de: 'Deutsch',
  th: 'ไทย', id: 'Bahasa Indonesia', es: 'Español',
};
export function isPublicLocale(value: unknown): value is PublicLocale {
  return typeof value === 'string' && (PUBLIC_LOCALES as readonly string[]).includes(value);
}
export function publicHomePath(locale: PublicLocale): string {
  return locale === 'vi' ? '/' : `/${locale}`;
}
export function publicPostPath(locale: PublicLocale, slug?: string): string {
  return `${locale === 'vi' ? '' : `/${locale}`}/post${slug ? `/${encodeURIComponent(slug)}` : ''}`;
}
/** #1114: public marketing pages that exist in every public language */
export const PUBLIC_PAGES = ['pricing', 'features', 'download', 'image-search'] as const;
export type PublicPage = typeof PUBLIC_PAGES[number];
/** Vietnamese keeps its original URLs (no prefix; the image search page has a Vietnamese slug) */
const VI_PAGE_PATHS: Record<PublicPage, string> = {
  pricing: '/pricing',
  features: '/features',
  download: '/download',
  'image-search': '/tim-san-pham-bang-hinh-anh',
};
export function isPublicPage(value: unknown): value is PublicPage {
  return typeof value === 'string' && (PUBLIC_PAGES as readonly string[]).includes(value);
}
export function publicPagePath(locale: PublicLocale, page: PublicPage): string {
  return locale === 'vi' ? VI_PAGE_PATHS[page] : `/${locale}/${page}`;
}
/** `/{locale}/{page}` for one of the public pages, else null (the Vietnamese URLs have no prefix) */
export function publicPageFromPath(pathname: string): { locale: PublicLocale; page: PublicPage } | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 2 || !isPublicLocale(parts[0]) || !isPublicPage(parts[1])) return null;
  return { locale: parts[0], page: parts[1] };
}
/** Classify only marketing routes, never /{locale}/orders or tenant product paths. */
export function publicLocaleFromPath(pathname: string): PublicLocale | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0 || (parts[0] === 'post' && parts.length <= 2)) return 'vi';
  if (!isPublicLocale(parts[0])) return null;
  if (publicPageFromPath(pathname)) return parts[0];
  return parts.length === 1 || (parts[1] === 'post' && parts.length <= 3) ? parts[0] : null;
}
