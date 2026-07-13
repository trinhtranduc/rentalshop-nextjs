/**
 * Vietnamese diacritics removal tests
 *
 * Regression coverage for the mobile order-search bug where iOS sends
 * decomposed (NFD) Unicode. "kiều" typed on iOS arrives as
 * 'k' 'i' 'e'(U+0065) U+0302 U+0300 'u' instead of the precomposed
 * 'k' 'i' U+1EC1 'u', so the char-by-char VNMAP lookup missed the
 * combining marks and returned "kie◌̂◌̀u" instead of "kieu".
 *
 * To run: yarn vitest packages/utils/src/core/__tests__/remove-diacritics.test.ts
 *
 * @ts-nocheck - Test framework types available when vitest is installed
 */

import { describe, it, expect } from 'vitest';
import { removeVietnameseDiacritics } from '../string-utils';

describe('removeVietnameseDiacritics', () => {
  const cases: Array<[string, string]> = [
    ['kiều', 'kieu'],
    ['Hồng Ánh', 'Hong Anh'],
    ['Nguyễn', 'Nguyen'],
    ['Đặng', 'Dang'],
    ['Trần Thị Kiều', 'Tran Thi Kieu'],
  ];

  it('strips diacritics from precomposed (NFC) input', () => {
    for (const [input, expected] of cases) {
      expect(removeVietnameseDiacritics(input.normalize('NFC'))).toBe(expected);
    }
  });

  it('strips diacritics from decomposed (NFD) input — the iOS case', () => {
    for (const [input, expected] of cases) {
      expect(removeVietnameseDiacritics(input.normalize('NFD'))).toBe(expected);
    }
  });

  it('leaves no residual combining marks (U+0300–U+036F)', () => {
    const out = removeVietnameseDiacritics('kiều'.normalize('NFD'));
    expect(/[\u0300-\u036f]/.test(out)).toBe(false);
  });

  it('handles empty and non-string input safely', () => {
    expect(removeVietnameseDiacritics('')).toBe('');
    // @ts-expect-error runtime guard for null/undefined
    expect(removeVietnameseDiacritics(null)).toBe('');
  });
});
