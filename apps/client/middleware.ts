import { NextResponse, type NextRequest } from 'next/server';
import {
  WEB_OPT_OUT_COOKIE,
  WEB_OPT_OUT_MAX_AGE,
  landingStoreRedirect,
} from './lib/store-redirect';

/**
 * #946 landing page `/` only: phones go to the App Store / Google Play.
 * Desktop, bots and `?web=1` (remembered in a cookie) get the page. No other path runs this.
 */
export function middleware(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const web = searchParams.get('web');
  const isPageLoad =
    request.method === 'GET' &&
    !request.headers.get('rsc') &&
    !request.headers.get('next-router-prefetch') &&
    request.headers.get('purpose') !== 'prefetch';

  const target = isPageLoad
    ? landingStoreRedirect({
        userAgent: request.headers.get('user-agent'),
        web,
        webCookie: request.cookies.get(WEB_OPT_OUT_COOKIE)?.value,
      })
    : null;

  const response = target ? NextResponse.redirect(target, 307) : NextResponse.next();
  if (target) {
    // The answer depends on the device: never let a shared cache keep it.
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Vary', 'User-Agent, Cookie');
  }
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
  matcher: '/',
};
