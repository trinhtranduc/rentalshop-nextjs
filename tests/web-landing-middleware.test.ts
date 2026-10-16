import { describe, expect, it, jest } from '@jest/globals';

const setCookie = jest.fn();
const next = jest.fn(() => ({ cookies: { set: setCookie } }));
const redirect = jest.fn();
jest.mock('next/server', () => ({ NextResponse: { next: (...args: unknown[]) => next(...args as []), redirect } }));

import { middleware } from '../apps/client/middleware';
import type { NextRequest } from 'next/server';

describe('landing middleware serves HTML before a mobile store navigation', () => {
  it.each(['iPhone', 'Android', 'iPad', 'Macintosh'])('%s is passed through', userAgent => {
    next.mockClear(); redirect.mockClear(); setCookie.mockClear();
    middleware({
      nextUrl: new URL('https://www.anyrent.shop/'), method: 'GET',
      headers: new Headers({ 'user-agent': userAgent, accept: 'text/html' }),
      cookies: { get: () => undefined },
    } as unknown as NextRequest);
    expect(next).toHaveBeenCalledTimes(1); expect(redirect).not.toHaveBeenCalled();
    expect(setCookie).not.toHaveBeenCalled();
  });
  it.each([['/vi?web=1', '/?web=1'], ['/vi/post?q=thue', '/post?q=thue'], ['/vi/post/gioi-thieu', '/post/gioi-thieu']])('redirects %s to prefix-free Vietnamese', (source, expected) => {
    redirect.mockClear();
    middleware({ nextUrl: new URL(`https://www.anyrent.shop${source}`) } as unknown as NextRequest);
    expect(redirect).toHaveBeenCalledWith(new URL(`https://www.anyrent.shop${expected}`), 308);
  });
  it('continues to remember ?web=1', () => {
    setCookie.mockClear();
    middleware({ nextUrl: new URL('https://www.anyrent.shop/?web=1') } as unknown as NextRequest);
    expect(setCookie).toHaveBeenCalledWith('anyrent_web', '1', expect.objectContaining({ path: '/', sameSite: 'lax' }));
  });
});
