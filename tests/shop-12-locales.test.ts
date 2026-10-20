/**
 * #1146: the public shop page (catalog, booking sheet, image search, tracking page) speaks the 12 public languages.
 * The logged-in app keeps its 5; a public-only language in NEXT_LOCALE falls back to an app one.
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const next = jest.fn((init?: { request?: { headers?: Headers } }) => ({ init, cookies: { set: jest.fn() } }));
jest.mock('next/server', () => ({ NextResponse: { next: (...args: unknown[]) => next(...(args as [])), redirect: jest.fn() } }));

import { PUBLIC_LOCALES } from '../packages/constants/src/public-locales';
import { appLocaleFor, isShopPath, shopLocale } from '../apps/client/lib/public-content/shop-locale';
import { shopMessages } from '../apps/client/lib/public-content/shop-messages';
import { formatShopMoney } from '../apps/client/app/[tenantKey]/products/lib/public-shop';
import { formatDayKey, formatShopTime, monthLabel, weekdayLabels } from '../apps/client/app/[tenantKey]/products/lib/booking';
import { middleware } from '../apps/client/middleware';
import type { NextRequest } from 'next/server';

const root = path.join(__dirname, '..');
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const flat = (o: unknown, p = ''): Record<string, string> =>
  Object.entries((o ?? {}) as Record<string, unknown>).reduce((acc, [k, v]) => {
    const key = p ? `${p}.${k}` : k;
    return typeof v === 'object' && v !== null ? { ...acc, ...flat(v, key) } : { ...acc, [key]: String(v) };
  }, {} as Record<string, string>);
const args = (s: string) => [...s.matchAll(/\{(\w+)(?=[,}])/g)].map((m) => m[1]).sort().join(',');
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;

const SHOP_KEYS = [
  'uncategorized', 'productsPlural', 'noProductsFound', 'noProducts', 'tryDifferentSearch', 'checkBackLater',
  'clearFilters', 'storeNotFound', 'storeNotFoundMessage', 'goToHomepage',
];
const PAGINATION_KEYS = ['showing', 'to', 'of', 'itemsPerPage', 'apply'];
const APP = ['vi', 'en', 'ja', 'ko', 'zh'];
const NEW = PUBLIC_LOCALES.filter((l) => !APP.includes(l));

const shopStrings = (products: Record<string, unknown>) => {
  const picked: Record<string, unknown> = { public: products.public };
  for (const k of SHOP_KEYS) picked[k] = products[k];
  return flat(picked);
};
const enProducts = read('locales/en/products.json');
const enCommon = read('locales/en/common.json');
const en = shopStrings(enProducts);

/** The `products` messages a locale gets on the shop page (new locales: merged over English) */
const productsFor = (locale: string) =>
  APP.includes(locale)
    ? read(`locales/${locale}/products.json`)
    : shopMessages(locale as never, { products: enProducts, common: enCommon }).products;

describe('#1146 locale helpers', () => {
  it('app locale: the 5 app languages stay, zh-TW → zh, other public languages → en, anything else → vi', () => {
    for (const l of APP) expect(appLocaleFor(l)).toBe(l);
    expect(appLocaleFor('zh-TW')).toBe('zh');
    for (const l of ['ru', 'fr', 'de', 'th', 'id', 'es']) expect(appLocaleFor(l)).toBe('en');
    expect(appLocaleFor(undefined)).toBe('vi');
    expect(appLocaleFor('')).toBe('vi');
    expect(appLocaleFor('xx')).toBe('vi');
  });

  it('shop locale: the public choice, else the app cookie, else Vietnamese', () => {
    expect(shopLocale('ru', 'en')).toBe('ru');
    expect(shopLocale(undefined, 'en')).toBe('en');
    expect(shopLocale('bogus', 'ja')).toBe('ja');
    expect(shopLocale('th', undefined)).toBe('th');
    expect(shopLocale(undefined, undefined)).toBe('vi');
    expect(shopLocale(null, 'xx')).toBe('vi');
  });

  it('shop paths are /{tenantKey}/products and /{tenantKey}/booking/{code} only', () => {
    expect(isShopPath('/lan-anh-bridal/products')).toBe(true);
    expect(isShopPath('/lan-anh-bridal/booking/AB12C')).toBe(true);
    for (const p of ['/', '/ru', '/ru/pricing', '/orders', '/products', '/a/products/1', '/a/booking/TOOLONG', '/a/b/products']) {
      expect(isShopPath(p)).toBe(false);
    }
  });

  it('the middleware passes the shop language to the page', () => {
    const run = (cookies: Record<string, string>) => {
      next.mockClear();
      middleware({
        nextUrl: new URL('https://anyrent.shop/lan-anh/products?page=2'),
        headers: new Headers(),
        cookies: { get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined) },
      } as unknown as NextRequest);
      const headers = next.mock.calls[0]?.[0]?.request?.headers as Headers;
      return [headers.get('x-anyrent-public-locale'), headers.get('x-anyrent-shop-page')];
    };
    expect(run({ NEXT_PUBLIC_LOCALE: 'ru', NEXT_LOCALE: 'en' })).toEqual(['ru', '1']);
    expect(run({ NEXT_LOCALE: 'en' })).toEqual(['en', '1']);
    expect(run({})).toEqual(['vi', '1']);
  });
});

describe.each(PUBLIC_LOCALES.filter((l) => l !== 'en'))('%s shop strings (#1146)', (locale) => {
  it('every shop key is translated, with the same ICU arguments as English', () => {
    const tr = shopStrings(productsFor(locale));
    const problems: string[] = [];
    for (const key of Object.keys(en)) {
      const v = tr[key];
      if (!v || !v.trim()) { problems.push(`${key}: missing`); continue; }
      if (args(v) !== args(en[key])) problems.push(`${key}: arguments ${args(v)} != ${args(en[key])}`);
      if (locale !== 'vi' && VI.test(v)) problems.push(`${key}: Vietnamese left`);
      if (v === en[key] && !/^[\d\s/{}#,.:-]*$/.test(v)) problems.push(`${key}: same as English`);
    }
    expect(problems).toEqual([]);
  });

  it('no key that English does not have', () => {
    const tr = shopStrings(productsFor(locale));
    expect(Object.keys(tr).filter((k) => !(k in en))).toEqual([]);
  });
});

describe.each(NEW)('%s pagination and files (#1146)', (locale) => {
  it('common.pagination is translated', () => {
    const pagination = read(`locales/${locale}/common.json`).pagination;
    for (const k of PAGINATION_KEYS) {
      expect(typeof pagination[k]).toBe('string');
      expect(pagination[k]).not.toBe(enCommon.pagination[k]);
    }
  });

  it('the shop messages keep the other English keys', () => {
    const { products, common } = shopMessages(locale, { products: enProducts, common: enCommon });
    expect((products as typeof enProducts).title).toBe(enProducts.title);
    expect((common as typeof enCommon).pagination.first).toBe(enCommon.pagination.first);
  });
});

describe('#1146 formats', () => {
  it('Vietnamese output is unchanged', () => {
    expect(formatShopMoney(500000, 'VND')).toBe('500.000đ');
    expect(formatShopMoney(500000, 'VND', 'vi')).toBe('500.000đ');
    expect(formatShopMoney(12.5, 'USD', 'vi')).toBe('$12.5');
    expect(formatDayKey('2026-10-05', 'vi')).toBe('05/10/2026');
    expect(weekdayLabels('vi')).toEqual(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);
    expect(monthLabel('2026-10', 'vi')).toBe('10/2026');
    expect(formatShopTime('2026-10-20T02:05:00Z', 'vi')).toBe('09:05 20/10/2026');
  });

  it('other languages format numbers and dates their way, money stays in the shop currency', () => {
    const sp = (v: string) => v.replace(/\s/g, ' ');
    const ru = formatShopMoney(500000, 'VND', 'ru');
    expect(ru).toContain('₫');
    expect(ru).not.toContain('đ');
    expect(sp(ru)).toBe('500 000 ₫');
    expect(sp(formatShopMoney(1200000, null, 'de'))).toBe('1.200.000 ₫');
    expect(sp(formatShopMoney(12.5, 'USD', 'fr'))).toBe('12,5 $US');
    expect(formatDayKey('2026-10-05', 'de')).toBe('05.10.2026');
    expect(formatDayKey('2026-10-05', 'en')).toBe('05/10/2026');
    expect(weekdayLabels('ru')).toHaveLength(7);
    expect(weekdayLabels('de')[0]).toMatch(/^Mo/);
    expect(sp(monthLabel('2026-10', 'fr'))).toBe('octobre 2026');
    // The shop's Vietnam time whatever the visitor's machine zone
    expect(sp(formatShopTime('2026-10-20T02:05:00Z', 'de'))).toBe('20.10.2026, 09:05');
  });
});
