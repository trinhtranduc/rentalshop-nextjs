import { describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('@rentalshop/utils', () => ({
  postsApi: { searchPublicPosts: async () => ({ success: false }) },
}));

import {
  PUBLIC_LOCALES,
  PUBLIC_PAGES,
  publicLocaleFromPath,
  publicPageFromPath,
  publicPagePath,
  type PublicLocale,
} from '../packages/constants/src/public-locales';
import {
  publicPageAlternates,
  publicPageMessages,
  publicPageMetadata,
} from '../apps/client/lib/public-content/public-pages';
import { publicFeaturesMessages, publicPlansMessages } from '../apps/client/lib/public-content/page-namespaces';
import { publicHref } from '../apps/client/lib/public-content/public-href';
import sitemap from '../apps/client/app/sitemap';
import enPages from '../locales/en/publicPages.json';
import enFeatures from '../locales/en/features.json';
import enPlans from '../locales/en/plans.json';

/** #1114: pricing, features, download and AI image search in all 12 public languages */
type Tree = { [key: string]: string | Tree | Tree[] | string[] };

function flatten(tree: unknown, prefix = ''): Record<string, string> {
  if (typeof tree === 'string') return { [prefix]: tree };
  if (!tree || typeof tree !== 'object') return {};
  return Object.entries(tree as Tree).reduce<Record<string, string>>((out, [key, value]) => {
    Object.assign(out, flatten(value, prefix ? `${prefix}.${key}` : key));
    return out;
  }, {});
}

/** Letters only Vietnamese uses (â, ê, ô are left out: French and others use them too) */
const VIETNAMESE = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const NOT_VI = PUBLIC_LOCALES.filter((locale) => locale !== 'vi');

/** Metadata titles are `{ absolute }` so the layout template does not add a second "| AnyRent" */
const titleOf = (title: unknown) => String((title as { absolute?: string })?.absolute ?? title);

const viPaths: Record<string, string> = {
  pricing: '/pricing',
  features: '/features',
  download: '/download',
  'image-search': '/tim-san-pham-bang-hinh-anh',
};

describe('public page paths', () => {
  it('keeps the Vietnamese URLs and prefixes the other languages', () => {
    for (const page of PUBLIC_PAGES) {
      expect(publicPagePath('vi', page)).toBe(viPaths[page]);
      for (const locale of NOT_VI) expect(publicPagePath(locale, page)).toBe(`/${locale}/${page}`);
    }
  });

  it.each(NOT_VI)('%s page paths are localized public paths', (locale) => {
    for (const page of PUBLIC_PAGES) {
      expect(publicLocaleFromPath(`/${locale}/${page}`)).toBe(locale);
      expect(publicPageFromPath(`/${locale}/${page}`)).toEqual({ locale, page });
    }
  });

  it.each(['/shop-demo/pricing', '/ru/pricing/extra', '/ru/orders', '/pricing', '/vi'])('%s is not a localized page path', (path) => {
    expect(publicPageFromPath(path)).toBeNull();
  });

  it('the middleware matcher covers every localized page and still skips app routes', () => {
    const { config } = require('../apps/client/middleware');
    const { getMiddlewareMatchers } = require('next/dist/build/analysis/get-page-static-info');
    const matchers = getMiddlewareMatchers(config.matcher, {});
    const matches = (path: string) => matchers.some((m: { regexp: string }) => new RegExp(m.regexp).test(path));
    for (const locale of PUBLIC_LOCALES) for (const page of PUBLIC_PAGES) expect(matches(`/${locale}/${page}`)).toBe(true);
    expect(matches('/ru/orders')).toBe(false);
    // #1146: the public shop pages run the middleware for their language; their sub-paths do not
    expect(matches('/shop-demo/products')).toBe(true);
    expect(matches('/shop-demo/products/12')).toBe(false);
  });
});

describe('public page translations', () => {
  const english = flatten(enPages);
  const englishFeatures = flatten(enFeatures);
  const englishPricing = flatten((enPlans as unknown as Tree).pricingPage);

  it.each(PUBLIC_LOCALES)('%s has every page key, none empty', (locale) => {
    const messages = flatten(publicPageMessages(locale));
    expect(Object.keys(english).filter((key) => !messages[key]?.trim())).toEqual([]);
    const features = flatten(publicFeaturesMessages(locale));
    expect(Object.keys(englishFeatures).filter((key) => !features[key]?.trim())).toEqual([]);
    const pricing = flatten((publicPlansMessages(locale) as unknown as Tree).pricingPage);
    expect(Object.keys(englishPricing).filter((key) => !pricing[key]?.trim())).toEqual([]);
  });

  it.each(NOT_VI)('%s has no Vietnamese text on the four pages', (locale) => {
    const all = {
      ...flatten(publicPageMessages(locale), 'pages'),
      ...flatten(publicFeaturesMessages(locale), 'features'),
      ...flatten((publicPlansMessages(locale) as unknown as Tree).pricingPage, 'pricing'),
    };
    expect(Object.entries(all).filter(([, value]) => VIETNAMESE.test(value)).map(([key]) => key)).toEqual([]);
  });

  /** Same text in that language: brand and product names, numbers */
  const SAME_AS_ENGLISH = new Set([
    'pages.download.eyebrow',
    'pages.download.webPortal',
    'pages.imageSearch.eyebrow',
    'features.navigation.home',
    'features.screens.alt',
    // Plan and badge names are product names, kept as in the app
    'pricing.planBasic',
    'pricing.planProfessional',
    'pricing.planEnterprise',
    'pricing.badgePremium',
  ]);
  const SAME_IN: Partial<Record<PublicLocale, string[]>> = {
    fr: ['features.web.badge', 'pages.download.cards.web.title', 'features.mobile.features.notifications.title'],
    de: [
      'features.web.badge', 'pages.download.cards.web.title', 'features.mobile.badge',
      'features.platforms.mobile.title', 'features.details.mobileApp', 'pricing.mobileApp', 'pages.download.cards.mobile.title',
    ],
    es: ['features.web.badge'],
    id: ['features.web.badge', 'pages.download.cards.web.title'],
  };

  it.each(['ru', 'zh-TW', 'fr', 'de', 'th', 'id', 'es'] as PublicLocale[])('%s does not fall back to the English text', (locale) => {
    const english = {
      ...flatten(enPages, 'pages'),
      ...flatten(enFeatures, 'features'),
      ...flatten((enPlans as unknown as Tree).pricingPage, 'pricing'),
    };
    const messages = {
      ...flatten(publicPageMessages(locale), 'pages'),
      ...flatten(publicFeaturesMessages(locale), 'features'),
      ...flatten((publicPlansMessages(locale) as unknown as Tree).pricingPage, 'pricing'),
    };
    const allowed = new Set([...SAME_AS_ENGLISH, ...(SAME_IN[locale] ?? [])]);
    const same = Object.keys(english).filter(
      (key) => !allowed.has(key) && messages[key] === english[key] && /[a-z]{3}/i.test(english[key]) && !/^[\d\s.,%+/:-]+$/.test(english[key]),
    );
    expect(same).toEqual([]);
  });

  it('the shared page components hold no Vietnamese literals (the copy lives in locales)', () => {
    for (const file of ['DownloadPageContent.tsx', 'ImageSearchPageContent.tsx']) {
      const source = readFileSync(join(__dirname, '../apps/client/app/components/public-pages', file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      expect(VIETNAMESE.test(source)).toBe(false);
    }
    const features = readFileSync(join(__dirname, '../apps/client/app/features/FeaturesClient.tsx'), 'utf8');
    expect(VIETNAMESE.test(features.replace(/\/\/.*$/gm, ''))).toBe(false);
  });

  it('the Vietnamese copy of the download and image search pages is the text the pages had before', () => {
    const vi = publicPageMessages('vi');
    expect(vi.download.title).toBe('Tải ứng dụng AnyRent');
    expect(vi.imageSearch.title).toBe('Tìm sản phẩm cho thuê bằng hình ảnh AI');
    expect(vi.meta.pricing.title).toBe('Bảng giá Phần mềm Quản lý Cho thuê | AnyRent');
  });
});

describe('public page SEO', () => {
  it.each(PUBLIC_PAGES)('%s: every language points at its own URL and lists the same 12 + x-default', (page) => {
    const group = publicPageAlternates(page);
    expect(Object.keys(group).sort()).toEqual([...PUBLIC_LOCALES, 'x-default'].sort());
    expect(group['x-default']).toBe(publicPagePath('vi', page));
    for (const locale of PUBLIC_LOCALES) {
      const metadata = publicPageMetadata(locale, page);
      expect(metadata.alternates?.canonical).toBe(publicPagePath(locale, page));
      expect(metadata.alternates?.languages).toEqual(group);
      expect(titleOf(metadata.title)).toContain('AnyRent');
      expect(metadata.description?.trim()).toBeTruthy();
    }
  });

  it('titles differ per language', () => {
    for (const page of PUBLIC_PAGES) {
      const titles = PUBLIC_LOCALES.map((locale) => titleOf(publicPageMetadata(locale, page).title));
      expect(new Set(titles).size).toBe(PUBLIC_LOCALES.length);
    }
  });

  it('the sitemap lists every localized page with the language group, old URLs kept', async () => {
    const entries = await sitemap();
    const urls = new Set(entries.map((entry) => entry.url));
    const base = 'https://anyrent.shop';
    for (const page of PUBLIC_PAGES) {
      for (const locale of PUBLIC_LOCALES) expect(urls.has(`${base}${publicPagePath(locale, page)}`)).toBe(true);
      const entry = entries.find((e) => e.url === `${base}/${'ru'}/${page}`);
      expect(entry?.alternates?.languages).toEqual(
        Object.fromEntries(Object.entries(publicPageAlternates(page)).map(([code, path]) => [code, `${base}${path}`])),
      );
    }
    for (const path of ['/cho-thue-ao-dai', '/blog', '/terms']) expect(urls.has(`${base}${path}`)).toBe(true);
  });
});

describe('links on localized pages', () => {
  it('keeps Vietnamese links as they are', () => {
    expect(publicHref(null, 'pricing')).toBe('/pricing');
    expect(publicHref('vi', 'image-search')).toBe('/tim-san-pham-bang-hinh-anh');
    expect(publicHref('vi', 'home')).toBe('/');
    expect(publicHref('vi', 'blog')).toBe('/blog');
    expect(publicHref('vi', 'faq')).toBe('/#faq');
    expect(publicHref('vi', 'industry:cho-thue-ao-dai')).toBe('/cho-thue-ao-dai');
  });

  it.each(NOT_VI)('%s links stay in the language', (locale) => {
    expect(publicHref(locale, 'pricing')).toBe(`/${locale}/pricing`);
    expect(publicHref(locale, 'image-search')).toBe(`/${locale}/image-search`);
    expect(publicHref(locale, 'home')).toBe(`/${locale}`);
    expect(publicHref(locale, 'blog')).toBe(`/${locale}/post`);
    expect(publicHref(locale, 'faq')).toBe(`/${locale}#faq`);
    expect(publicHref(locale, 'contact')).toBe(`/${locale}#contact`);
    expect(publicHref(locale, 'industry:cho-thue-ao-dai')).toBe(`/${locale}/features`);
  });
});

describe('#1114 legacy redirects', () => {
  it('no redirect sends a localized page to the Vietnamese page any more', async () => {
    const config = require('../apps/client/next.config.js');
    const { getMiddlewareMatchers } = require('next/dist/build/analysis/get-page-static-info');
    const redirects: Array<{ source: string; destination: string }> = await config.redirects();
    const hit = (path: string) =>
      redirects.find((r) => getMiddlewareMatchers([r.source], {}).some((m: { regexp: string }) => new RegExp(m.regexp).test(path)));
    for (const locale of NOT_VI) {
      for (const page of PUBLIC_PAGES) expect(hit(`/${locale}/${page}`)).toBeUndefined();
      expect(hit(`/${locale}/tim-san-pham-bang-hinh-anh`)?.destination).toBe('/:locale/image-search');
    }
    expect(hit('/vi/pricing')?.destination).toBe('/:page');
    expect(hit('/vi/image-search')?.destination).toBe('/tim-san-pham-bang-hinh-anh');
  });
});
