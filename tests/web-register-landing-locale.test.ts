/**
 * #1551 — the sign-up page opens in the language the visitor picked on the landing page.
 * Landing `vi` → Vietnamese, any other landing language → English (the app speaks VI / EN), saved as NEXT_LOCALE.
 * A visitor who already picked an app language (NEXT_LOCALE) keeps it; no landing cookie keeps Vietnamese.
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const setCookie = jest.fn();
const response = { cookies: { set: setCookie } };
const next = jest.fn((..._args: unknown[]) => response);
const redirect = jest.fn(() => response);
jest.mock('next/server', () => ({ NextResponse: { next: (...args: unknown[]) => next(...args), redirect } }));

import { middleware, config } from '../apps/client/middleware';
import { registerLocaleFromLanding } from '../apps/client/lib/public-content/shop-locale';
import type { NextRequest } from 'next/server';

type Cookies = Record<string, string>;

function visit(path: string, cookies: Cookies = {}) {
  const cookieHeader = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  middleware({
    nextUrl: new URL(`https://www.anyrent.shop${path}`),
    method: 'GET',
    headers: new Headers(cookieHeader ? { cookie: cookieHeader, accept: 'text/html' } : { accept: 'text/html' }),
    cookies: { get: (name: string) => (name in cookies ? { value: cookies[name] } : undefined) },
  } as unknown as NextRequest);
}

/** The cookie header the page (root layout) will read for this request */
function forwardedCookie(): string | null {
  const arg = next.mock.calls.at(-1)?.[0] as { request?: { headers?: Headers } } | undefined;
  return arg?.request?.headers?.get('cookie') ?? null;
}

beforeEach(() => {
  next.mockClear();
  redirect.mockClear();
  setCookie.mockClear();
});

describe('registerLocaleFromLanding (#1551)', () => {
  it('Vietnamese landing → vi', () => {
    expect(registerLocaleFromLanding(undefined, 'vi')).toBe('vi');
  });

  it.each(['en', 'ja', 'ko', 'zh', 'zh-TW', 'ru', 'fr', 'de', 'th', 'id', 'es'])('landing %s → en', (landing) => {
    expect(registerLocaleFromLanding(undefined, landing)).toBe('en');
  });

  it('an app language already picked wins', () => {
    expect(registerLocaleFromLanding('vi', 'en')).toBeNull();
    expect(registerLocaleFromLanding('en', 'vi')).toBeNull();
  });

  it('no landing choice (or not a language) changes nothing', () => {
    expect(registerLocaleFromLanding(undefined, undefined)).toBeNull();
    expect(registerLocaleFromLanding(null, '')).toBeNull();
    expect(registerLocaleFromLanding(undefined, 'xx')).toBeNull();
  });
});

describe('middleware on the sign-up pages (#1551)', () => {
  it.each(['/register', '/register/', '/register/step-1', '/register/step-2'])(
    '%s after an English landing opens in English and remembers it',
    (path) => {
      visit(path, { NEXT_PUBLIC_LOCALE: 'en' });
      expect(next).toHaveBeenCalledTimes(1);
      expect(redirect).not.toHaveBeenCalled();
      expect(forwardedCookie()).toContain('NEXT_LOCALE=en');
      expect(setCookie).toHaveBeenCalledWith(
        'NEXT_LOCALE',
        'en',
        expect.objectContaining({ path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 })
      );
    }
  );

  it('a Japanese landing opens the sign-up page in English', () => {
    visit('/register', { NEXT_PUBLIC_LOCALE: 'ja', other: '1' });
    expect(forwardedCookie()).toBe('NEXT_PUBLIC_LOCALE=ja; other=1; NEXT_LOCALE=en');
    expect(setCookie).toHaveBeenCalledWith('NEXT_LOCALE', 'en', expect.anything());
  });

  it('a Vietnamese landing keeps Vietnamese and remembers it', () => {
    visit('/register', { NEXT_PUBLIC_LOCALE: 'vi' });
    expect(forwardedCookie()).toContain('NEXT_LOCALE=vi');
    expect(setCookie).toHaveBeenCalledWith('NEXT_LOCALE', 'vi', expect.anything());
  });

  it('an app language the visitor picked is kept', () => {
    visit('/register', { NEXT_PUBLIC_LOCALE: 'en', NEXT_LOCALE: 'vi' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(setCookie).not.toHaveBeenCalled();
    expect(forwardedCookie()).toBeNull();
  });

  it('no landing cookie: nothing changes (Vietnamese default)', () => {
    visit('/register');
    expect(next).toHaveBeenCalledTimes(1);
    expect(setCookie).not.toHaveBeenCalled();
  });

  it.each(['/login', '/registered', '/register-shop', '/dashboard'])('%s is not touched', (path) => {
    visit(path, { NEXT_PUBLIC_LOCALE: 'en' });
    expect(setCookie).not.toHaveBeenCalledWith('NEXT_LOCALE', expect.anything(), expect.anything());
  });

  it('the middleware runs on the sign-up pages', () => {
    expect(config.matcher).toEqual(expect.arrayContaining(['/register', '/register/:path*']));
  });
});
