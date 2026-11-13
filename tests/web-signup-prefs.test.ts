/**
 * #1539 — sign-up "Quốc gia / Ngôn ngữ / Tiền tệ": defaults by country, the country list of the select and the value
 * sent to the API (English name, as Settings and existing shops store it).
 */
import {
  ISO_COUNTRY_CODES,
  countryEnglishName,
  countryOptions,
} from '../packages/constants/src/countries';
import { isShopLanguage, shopLanguage, signupDefaults } from '../packages/constants/src/shop-language';

describe('signupDefaults (#1539)', () => {
  it('Vietnam → Tiếng Việt + VND', () => {
    expect(signupDefaults('VN')).toEqual({ language: 'vi', currency: 'VND' });
  });

  it.each(['US', 'JP', 'KH', 'GB', 'TH'])('%s → English + USD', (code) => {
    expect(signupDefaults(code)).toEqual({ language: 'en', currency: 'USD' });
  });

  it('nothing picked yet counts as Vietnam (the default country)', () => {
    expect(signupDefaults('')).toEqual({ language: 'vi', currency: 'VND' });
    expect(signupDefaults(undefined)).toEqual({ language: 'vi', currency: 'VND' });
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
