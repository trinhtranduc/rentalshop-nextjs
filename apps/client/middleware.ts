import { publicLocaleFromPath } from '@rentalshop/constants';
import { NextResponse, type NextRequest } from 'next/server';
import {
  WEB_OPT_OUT_COOKIE,
  WEB_OPT_OUT_MAX_AGE,
} from './lib/store-redirect';

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
  if (publicLocale) {
    const headers = new Headers(request.headers);
    headers.set('x-anyrent-public-locale', publicLocale);
    response = NextResponse.next({ request: { headers } });
  }
  if (request.nextUrl.pathname !== '/') return response ?? NextResponse.next();
  const { searchParams } = request.nextUrl;
  const web = searchParams.get('web');
  response ??= NextResponse.next();
  if (web === '1') {
    response.cookies.set(WEB_OPT_OUT_COOKIE, '1', {
      maxAge: WEB_OPT_OUT_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    });
  }
  return response;
}

export const config = {
  matcher: ['/', '/:locale(vi|en|ja|ko|zh|ru|zh-TW|fr|de|th|id|es)', '/post/:path*', '/:locale(vi|en|ja|ko|zh|ru|zh-TW|fr|de|th|id|es)/post/:path*'],
};
