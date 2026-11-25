/**
 * #1648 the language of the emails to a shop follows its COUNTRY (no more "Ngôn ngữ email" row).
 * Pure rule `emailLanguageFor`: Việt Nam → vi, Nhật Bản → ja, any other country → en; no country → the stored language
 * (empty → vi, the shops before #1539).
 */
import { emailLanguageFor } from '../packages/constants/src/shop-language';

describe('emailLanguageFor (#1648)', () => {
  it.each([
    ['Vietnam', 'vi'],
    ['Việt Nam', 'vi'],
    ['viet nam', 'vi'],
    ['VN', 'vi'],
    [' Vietnam ', 'vi'],
    ['Japan', 'ja'],
    ['Nhật Bản', 'ja'],
    ['JP', 'ja'],
    ['United States', 'en'],
    ['Thailand', 'en'],
    ['Korea, Republic of', 'en'],
    ['Singapore', 'en'],
  ])('country %s → %s, whatever the stored language says', (country, expected) => {
    for (const language of ['vi', 'en', 'ja', null, undefined, 'xx']) {
      expect(emailLanguageFor({ country, language })).toBe(expected);
    }
  });

  it('no country (empty, blank, missing): the stored language, empty or unknown → vi', () => {
    expect(emailLanguageFor({ country: '', language: 'en' })).toBe('en');
    expect(emailLanguageFor({ country: '   ', language: 'ja' })).toBe('ja');
    expect(emailLanguageFor({ language: 'en' })).toBe('en');
    expect(emailLanguageFor({ country: null, language: undefined })).toBe('vi');
    expect(emailLanguageFor({ country: undefined, language: 'xx' })).toBe('vi');
  });

  it('no shop at all: Vietnamese, as before', () => {
    expect(emailLanguageFor(null)).toBe('vi');
    expect(emailLanguageFor(undefined)).toBe('vi');
  });

  it('a shop that changes its country gets the new language with nothing else changed', () => {
    const shop = { country: 'Vietnam', language: 'en' as const };
    expect(emailLanguageFor(shop)).toBe('vi');
    expect(emailLanguageFor({ ...shop, country: 'United States' })).toBe('en');
  });
});
