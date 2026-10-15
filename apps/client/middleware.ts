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
  const { searchParams } = request.nextUrl;
  const web = searchParams.get('web');
  const response = NextResponse.next();
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
