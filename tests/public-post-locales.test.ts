import { PUBLIC_LOCALES, isPublicLocale, publicHomePath, publicLocaleFromPath, publicPostPath } from '../packages/constants/src/public-locales';
import { postCreateSchema, postSearchSchema, postUpdateSchema } from '../packages/validation/src/post';
import { isPublicRoute } from '../apps/client/lib/routes';
import fs from 'fs';
import path from 'path';

describe('public content locales (#1000)', () => {
  it.each(PUBLIC_LOCALES)('%s is accepted by post create/search/update without extending POS locales', locale => {
    expect(postCreateSchema.parse({ title: 'Title', slug: 'same-post', content: '{}', locale }).locale).toBe(locale);
    expect(postSearchSchema.parse({ locale }).locale).toBe(locale);
    expect(postUpdateSchema.parse({ locale }).locale).toBe(locale);
    expect(publicLocaleFromPath(`/${locale}/post/same-post`)).toBe(locale);
    expect(isPublicRoute(`/${locale}/post/same-post`)).toBe(true);
  });
  it('uses prefix-free Vietnamese canonical routes', () => {
    expect(publicHomePath('vi')).toBe('/');
    expect(publicPostPath('vi')).toBe('/post');
    expect(publicPostPath('vi', 'gioi-thieu')).toBe('/post/gioi-thieu');
    expect(publicHomePath('en')).toBe('/en');
    expect(publicLocaleFromPath('/')).toBe('vi');
    expect(publicLocaleFromPath('/post/gioi-thieu')).toBe('vi');
    expect(publicLocaleFromPath('/post/one/extra')).toBeNull();
    expect(isPublicRoute('/post/gioi-thieu')).toBe(true);
  });
  it('keeps default vi and rejects unsupported locale/source identifiers', () => {
    expect(postCreateSchema.parse({ title: 'Title', slug: 'post', content: '{}' }).locale).toBe('vi');
    expect(postCreateSchema.safeParse({ title: 'Title', slug: 'post', content: '{}', locale: 'xx' }).success).toBe(false);
    expect(postCreateSchema.safeParse({ title: 'Title', slug: 'post', content: '{}', translationSourceId: -1 }).success).toBe(false);
    expect(postUpdateSchema.parse({ translationSourceId: 7 })).not.toHaveProperty('translationSourceId');
  });
  it.each(['/ru/orders', '/en/users/1', '/vi/post/one/extra', '/xx/post', '/admin', '/ru/settings'])('%s stays outside the localized public boundary', route => {
    expect(publicLocaleFromPath(route)).toBeNull();
    expect(isPublicRoute(route)).toBe(false);
  });
  it('retains legacy blog/tenant product routes and encodes slugs safely', () => {
    expect(isPublicRoute('/blog/old-post')).toBe(true);
    expect(isPublicRoute('/tenant-demo/products')).toBe(true);
    expect(publicPostPath('ru', 'a/b')).toBe('/ru/post/a%2Fb');
    expect(isPublicLocale('RU')).toBe(false);
  });
  it('all public dictionaries have exactly the same nonempty keys and do not silently copy Vietnamese', () => {
    const root = path.join(__dirname, '../locales');
    const vi = JSON.parse(fs.readFileSync(path.join(root, 'vi/public.json'), 'utf8'));
    for (const locale of PUBLIC_LOCALES) {
      const messages = JSON.parse(fs.readFileSync(path.join(root, locale, 'public.json'), 'utf8'));
      expect(Object.keys(messages).sort()).toEqual(Object.keys(vi).sort());
      expect(Object.values(messages).every(v => typeof v === 'string' && v.trim())).toBe(true);
      if (locale !== 'vi') expect(messages.heroTitle).not.toBe(vi.heroTitle);
    }
  });
});

it('Next 14 compiles the actual middleware matcher for every supported landing and post path', () => {
  const { config } = require('../apps/client/middleware');
  const { getMiddlewareMatchers } = require('next/dist/build/analysis/get-page-static-info');
  const matchers = getMiddlewareMatchers(config.matcher, {});
  const matches = (path: string) => matchers.some((m: { regexp: string }) => new RegExp(m.regexp).test(path));
  expect(matches('/')).toBe(true);
  for (const locale of PUBLIC_LOCALES) {
    expect(matches(`/${locale}`)).toBe(true);
    expect(matches(publicPostPath(locale, 'introduction'))).toBe(true);
  }
  expect(matches('/ru/orders')).toBe(false);
});
