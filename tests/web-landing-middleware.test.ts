import { describe, expect, it, jest } from '@jest/globals';

const setCookie = jest.fn();
const response = { cookies: { set: setCookie } };
const next = jest.fn(() => response);
const redirect = jest.fn();
redirect.mockImplementation(() => response);
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
    expect(setCookie).toHaveBeenCalledWith('NEXT_PUBLIC_LOCALE', 'vi', expect.objectContaining({ path: '/', sameSite: 'lax' }));
  });
  it.each([['/vi?web=1', '/?web=1'], ['/vi/post?q=thue', '/post?q=thue'], ['/vi/post/gioi-thieu', '/post/gioi-thieu']])('redirects %s to prefix-free Vietnamese', (source, expected) => {
    redirect.mockClear();
    middleware({ nextUrl: new URL(`https://www.anyrent.shop${source}`) } as unknown as NextRequest);
    expect(redirect).toHaveBeenCalledWith(new URL(`https://www.anyrent.shop${expected}`), 308);
  });
  it('continues to remember ?web=1', () => {
    setCookie.mockClear();
    middleware({
      nextUrl: new URL('https://www.anyrent.shop/?web=1'),
      headers: new Headers(),
      cookies: { get: () => undefined },
    } as unknown as NextRequest);
    expect(setCookie).toHaveBeenCalledWith('anyrent_web', '1', expect.objectContaining({ path: '/', sameSite: 'lax' }));
  });

  it('redirects a first visit to the best supported browser locale and remembers it', () => {
    redirect.mockClear(); setCookie.mockClear();
    middleware({
      nextUrl: new URL('https://www.anyrent.shop/?campaign=spring'),
      headers: new Headers({ 'accept-language': 'ru-RU,ru;q=0.9,en;q=0.8' }),
      cookies: { get: () => undefined },
    } as unknown as NextRequest);
    expect(redirect).toHaveBeenCalledWith(new URL('https://www.anyrent.shop/ru?campaign=spring'));
    expect(setCookie).toHaveBeenCalledWith('NEXT_PUBLIC_LOCALE', 'ru', expect.objectContaining({ path: '/', sameSite: 'lax' }));
  });

  it('prefers a saved public locale over the browser language', () => {
    redirect.mockClear(); setCookie.mockClear();
    middleware({
      nextUrl: new URL('https://www.anyrent.shop/'),
      headers: new Headers({ 'accept-language': 'ru-RU,ru;q=0.9' }),
      cookies: { get: (name: string) => name === 'NEXT_PUBLIC_LOCALE' ? { value: 'fr' } : undefined },
    } as unknown as NextRequest);
    expect(redirect).toHaveBeenCalledWith(new URL('https://www.anyrent.shop/fr'));
  });

  it('falls back to prefix-free Vietnamese for unsupported browser languages', () => {
    redirect.mockClear(); setCookie.mockClear();
    middleware({
      nextUrl: new URL('https://www.anyrent.shop/'),
      headers: new Headers({ 'accept-language': 'pt-BR,pt;q=0.9' }),
      cookies: { get: () => undefined },
    } as unknown as NextRequest);
    expect(redirect).not.toHaveBeenCalled();
    expect(setCookie).toHaveBeenCalledWith('NEXT_PUBLIC_LOCALE', 'vi', expect.objectContaining({ path: '/', sameSite: 'lax' }));
  });

  it('keeps the saved public language separate from the POS language', () => {
    next.mockClear();
    middleware({
      nextUrl: new URL('https://www.anyrent.shop/'),
      headers: new Headers({ 'accept-language': 'ru-RU,ru;q=0.9' }),
      cookies: { get: (name: string) => name === 'NEXT_PUBLIC_LOCALE' ? { value: 'vi' } : name === 'NEXT_LOCALE' ? { value: 'en' } : undefined },
    } as unknown as NextRequest);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.objectContaining({ headers: expect.any(Headers) }),
    }));
    const calls = next.mock.calls as unknown as Array<[ { request: { headers: Headers } } ]>;
    const options = calls[calls.length - 1][0];
    expect(options.request.headers.get('x-anyrent-public-locale')).toBe('vi');
  });
});
