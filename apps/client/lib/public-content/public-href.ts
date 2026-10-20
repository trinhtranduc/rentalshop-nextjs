import { PUBLIC_PAGES, isPublicLocale, isPublicPage, publicHomePath, publicPageFromPath, publicPagePath, publicPostPath, type PublicLocale, type PublicPage } from '@rentalshop/constants';

/** #1114: link targets of the public header, footer and landing */
export type PublicHrefTarget =
  | 'home' | 'pricing' | 'features' | 'download' | 'image-search' | 'blog' | 'faq' | 'contact'
  | `industry:${string}`;

/**
 * Where a public link goes. Vietnamese (or no public locale: app and legacy pages) keeps today's URLs.
 * Other languages stay in that language; industry pages are Vietnamese only, so they go to the features page.
 */
export function publicHref(locale: PublicLocale | null | undefined, target: PublicHrefTarget): string {
  const lang = locale && locale !== 'vi' ? locale : null;
  if (target.startsWith('industry:')) {
    return lang ? publicPagePath(lang, 'features') : `/${target.slice('industry:'.length)}`;
  }
  if (isPublicPage(target)) return publicPagePath(lang ?? 'vi', target);
  if (!lang) {
    return { home: '/', blog: '/blog', faq: '/#faq', contact: '/#contact' }[target as 'home' | 'blog' | 'faq' | 'contact'];
  }
  if (target === 'blog') return publicPostPath(lang);
  if (target === 'faq') return `${publicHomePath(lang)}#faq`;
  if (target === 'contact') return `${publicHomePath(lang)}#contact`;
  return publicHomePath(lang);
}

/** The public language a pathname is in: the first segment when it is a public locale other than vi */
export function publicLocaleOfPath(pathname: string | null | undefined): PublicLocale | null {
  const first = (pathname || '').split('/').filter(Boolean)[0];
  return isPublicLocale(first) && first !== 'vi' ? first : null;
}

/** The public page (and its language) a pathname shows: a Vietnamese URL or `/{locale}/{page}`, else null */
export function publicPageOfPath(pathname: string | null | undefined): { locale: PublicLocale; page: PublicPage } | null {
  const path = pathname || '';
  const vi = PUBLIC_PAGES.find((page) => publicPagePath('vi', page) === path);
  return vi ? { locale: 'vi', page: vi } : publicPageFromPath(path);
}
