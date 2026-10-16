import { isPublicLocale, publicLocaleFromPath, type PublicLocale } from '@rentalshop/constants';
import { NextResponse, type NextRequest } from 'next/server';
import {
  WEB_OPT_OUT_COOKIE,
  WEB_OPT_OUT_MAX_AGE,
} from './lib/store-redirect';

const PUBLIC_LOCALE_COOKIE = 'NEXT_PUBLIC_LOCALE';
const PUBLIC_LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

function localeFromAcceptLanguage(header: string | null): PublicLocale {
  const supported: PublicLocale[] = ['vi', 'en', 'ja', 'ko', 'zh', 'ru', 'zh-TW', 'fr', 'de', 'th', 'id', 'es'];
  const requested = (header || '')
    .split(',')
    .map((part, index) => {
      const [tag, quality = 'q=1'] = part.trim().split(';');
      const q = Number(quality.trim().replace(/^q=/, ''));
      return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0, index };
    })
    .filter(({ tag, q }) => tag && tag !== '*' && q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);

  for (const { tag } of requested) {
    const normalized = tag.toLowerCase();
    const exact = supported.find((locale) => locale.toLowerCase() === normalized);
    if (exact) return exact;
    if (normalized.startsWith('zh-') && (normalized.includes('tw') || normalized.includes('hant'))) return 'zh-TW';
    const base = normalized.split('-')[0];
    if (isPublicLocale(base)) return base;
  }
  return 'vi';
}

function savePublicLocale(response: NextResponse, locale: PublicLocale) {
  response.cookies.set(PUBLIC_LOCALE_COOKIE, locale, {
    maxAge: PUBLIC_LOCALE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  });
  return response;
}

function saveWebOptOut(response: NextResponse) {
  response.cookies.set(WEB_OPT_OUT_COOKIE, '1', {
    maxAge: WEB_OPT_OUT_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  });
  return response;
}

function nextForPublicLocale(request: NextRequest, locale: PublicLocale) {
  const headers = new Headers(request.headers);
  headers.set('x-anyrent-public-locale', locale);
  return NextResponse.next({ request: { headers } });
}

/**
 * #992 always serve the landing page first; client navigation waits for document load.
 * Keep the #946 web opt-out cookie. No other path runs this.
 */
export function middleware(request: NextRequest) {
  const publicLocale = publicLocaleFromPath(request.nextUrl.pathname);
  if (publicLocale === 'vi' && request.nextUrl.pathname.startsWith('/vi')) {
    const destination = new URL(request.nextUrl.toString());
    destination.pathname = destination.pathname.slice(3) || '/';
    return NextResponse.redirect(destination, 308);
  }
  let response;
  if (publicLocale && request.nextUrl.pathname !== '/') {
    response = nextForPublicLocale(request, publicLocale);
  }
  if (request.nextUrl.pathname !== '/') return response ?? NextResponse.next();
  const { searchParams } = request.nextUrl;
  const web = searchParams.get('web');
  const continueInLocale = (locale: PublicLocale) => {
    const localizedResponse = nextForPublicLocale(request, locale);
    if (web === '1') saveWebOptOut(localizedResponse);
    return savePublicLocale(localizedResponse, locale);
  };

  const savedLocale = request.cookies.get(PUBLIC_LOCALE_COOKIE)?.value;
  if (savedLocale && isPublicLocale(savedLocale)) {
    if (savedLocale === 'vi') return continueInLocale(savedLocale);
    const destination = new URL(request.nextUrl.toString());
    destination.pathname = `/${savedLocale}`;
    const redirect = savePublicLocale(NextResponse.redirect(destination), savedLocale);
    return web === '1' ? saveWebOptOut(redirect) : redirect;
  }

  const preferredLocale = localeFromAcceptLanguage(request.headers.get('accept-language'));
  if (preferredLocale === 'vi') return continueInLocale(preferredLocale);

  const destination = new URL(request.nextUrl.toString());
  destination.pathname = `/${preferredLocale}`;
  const redirect = savePublicLocale(NextResponse.redirect(destination), preferredLocale);
  return web === '1' ? saveWebOptOut(redirect) : redirect;
}

export const config = {
  matcher: ['/', '/:locale(vi|en|ja|ko|zh|ru|zh-TW|fr|de|th|id|es)', '/post/:path*', '/:locale(vi|en|ja|ko|zh|ru|zh-TW|fr|de|th|id|es)/post/:path*'],
};
