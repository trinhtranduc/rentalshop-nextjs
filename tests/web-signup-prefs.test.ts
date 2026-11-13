/**
 * #1539 — sign-up country list and the value sent to the API (English name, as Settings and existing shops store it).
 * #1545 — the form asks only the country: the shop language follows the page language, the currency follows the country.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ISO_COUNTRY_CODES,
  countryEnglishName,
  countryOptions,
} from '../packages/constants/src/countries';
import { isShopLanguage, shopLanguage, signupShopPrefs } from '../packages/constants/src/shop-language';

describe('signupShopPrefs (#1545): language = page language, currency = country', () => {
  it.each([
    ['vi', 'VN', 'vi', 'VND'],
    ['en', 'VN', 'en', 'VND'],
    ['vi', 'US', 'vi', 'USD'],
    ['en', 'US', 'en', 'USD'],
    ['ja', 'JP', 'en', 'USD'],
    ['zh', 'VN', 'en', 'VND'],
  ])('page %s + country %s → %s + %s', (page, country, language, currency) => {
    expect(signupShopPrefs(page, country)).toEqual({ language, currency });
  });

  it('no page language counts as Vietnamese (the web default); no country counts as Vietnam', () => {
    expect(signupShopPrefs(undefined, undefined)).toEqual({ language: 'vi', currency: 'VND' });
    expect(signupShopPrefs('', '')).toEqual({ language: 'vi', currency: 'VND' });
    expect(signupShopPrefs('vi-VN', ' vn ')).toEqual({ language: 'vi', currency: 'VND' });
    expect(signupShopPrefs('en-US', 'kh')).toEqual({ language: 'en', currency: 'USD' });
  });
});

describe('shopLanguage (#1539)', () => {
  it('en only when stored en; everything else is vi (shops before #1539)', () => {
    expect(shopLanguage('en')).toBe('en');
    for (const v of ['vi', null, undefined, '', 'EN', 'fr', 1, {}]) expect(shopLanguage(v)).toBe('vi');
  });

  it('isShopLanguage accepts exactly vi and en', () => {
    expect(isShopLanguage('vi')).toBe(true);
    expect(isShopLanguage('en')).toBe(true);
    for (const v of ['VI', 'en-US', '', null, 2]) expect(isShopLanguage(v)).toBe(false);
  });
});

describe('country list (#1539)', () => {
  it('the ISO 3166-1 countries, no regions or placeholders', () => {
    expect(ISO_COUNTRY_CODES).toHaveLength(249);
    expect(new Set(ISO_COUNTRY_CODES).size).toBe(249);
    for (const code of ['VN', 'US', 'KH', 'LA', 'MM', 'JP', 'KR', 'FR']) expect(ISO_COUNTRY_CODES).toContain(code);
    for (const code of ['EU', 'UN', 'ZZ', 'XK', 'QO', 'UK', 'AN']) expect(ISO_COUNTRY_CODES).not.toContain(code);
  });

  it('Vietnamese page: Việt Nam first, the rest by Vietnamese name', () => {
    const list = countryOptions('vi');
    expect(list).toHaveLength(249);
    expect(list[0]).toEqual({ code: 'VN', label: 'Việt Nam' });
    expect(list.find((c) => c.code === 'US')?.label).toBe('Hoa Kỳ');
    const rest = list.slice(1).map((c) => c.label);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, 'vi')));
  });

  it('English page: Vietnam first, names in English', () => {
    const list = countryOptions('en');
    expect(list[0]).toEqual({ code: 'VN', label: 'Vietnam' });
    expect(list.find((c) => c.code === 'KH')?.label).toBe('Cambodia');
  });

  it('a page language Intl does not know still gives a list', () => {
    const list = countryOptions('not-a-locale!!');
    expect(list).toHaveLength(249);
    expect(list[0].code).toBe('VN');
  });

  it('the API gets the English name, the same text Settings and existing shops use', () => {
    expect(countryEnglishName('VN')).toBe('Vietnam');
    expect(countryEnglishName('US')).toBe('United States');
    expect(countryEnglishName('HK')).toBe('Hong Kong');
    expect(countryEnglishName('KH')).toBe('Cambodia');
    expect(countryEnglishName('vn')).toBe('Vietnam');
  });
});

describe('sign-up form asks only the country (#1545)', () => {
  const root = join(__dirname, '..');
  const form = readFileSync(join(root, 'packages/ui/src/components/forms/RegisterForm.tsx'), 'utf8');
  const shell = readFileSync(join(root, 'packages/ui/src/components/forms/auth-shop.tsx'), 'utf8');

  it('no language or currency select, one hint under the country', () => {
    expect(form).toContain('data-signup-country');
    expect(form).not.toContain('data-signup-language');
    expect(form).not.toContain('data-signup-currency');
    expect(form).not.toContain('languageCurrencyHint');
    expect(form).toContain('data-signup-country-hint');
    expect(form).toMatch(/t\('register\.countryHint', \{ currency: /);
  });

  it('both sign-up calls send the prefs of the page language and the country', () => {
    expect(form).toContain('signupShopPrefs(locale, values.countryCode)');
    expect(form.match(/language: prefs\.language/g)).toHaveLength(2);
    expect(form.match(/currency: prefs\.currency/g)).toHaveLength(2);
  });

  it('after sign-up the web keeps the page language: no NEXT_LOCALE write, no full reload', () => {
    expect(form).not.toContain('NEXT_LOCALE');
    expect(form).not.toContain('user_language_preference');
    expect(form).not.toContain('window.location.assign');
  });

  it('the sign-up page keeps a language switch at every width (desktop top right, phone footer)', () => {
    const wrappers = shell
      .split('\n')
      .map((l, i, all) => (l.includes('<LanguageSwitcher') ? all[i - 1] : null))
      .filter((l): l is string => l !== null);
    expect(wrappers).toHaveLength(2);
    expect(wrappers.some((l) => l.includes('lg:block'))).toBe(true);
    expect(wrappers.some((l) => l.includes('lg:hidden'))).toBe(true);
  });

  it.each(['vi', 'en', 'ja', 'ko', 'zh'])('%s: register.countryHint has {currency}; the removed keys are gone', (lang) => {
    const auth = JSON.parse(readFileSync(join(root, `locales/${lang}/auth.json`), 'utf8'));
    expect(auth.register.countryHint).toContain('{currency}');
    expect(auth.register.languageCurrencyHint).toBeUndefined();
    expect(auth.register.language).toBeUndefined();
    expect(auth.register.currency).toBeUndefined();
  });

  it('the hint text the owner approved', () => {
    const vi = JSON.parse(readFileSync(join(root, 'locales/vi/auth.json'), 'utf8'));
    const en = JSON.parse(readFileSync(join(root, 'locales/en/auth.json'), 'utf8'));
    expect(vi.register.countryHint).toBe('Tiền tệ {currency} · Email tiếng Việt · đổi được trong Cài đặt.');
    expect(en.register.countryHint).toBe('Currency {currency} · Emails in English · change in Settings.');
  });
});
