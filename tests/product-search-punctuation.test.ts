/**
 * #1009: product search misses a word that follows punctuation.
 * "Mẫu (Xanh Ngọc)" was not found by "xanh ngọc": a word start was only the value start or
 * a spot after a space, and "xanh" follows "(". A query typed with punctuation ("(xanh")
 * found nothing, and `_` / `%` in the query acted as LIKE wildcards.
 *
 * Tests the real rules in packages/database/src/product-search-words.ts (used by
 * findMatchingProductIds in product.ts). The SQL twin is checked for the same separators.
 */
import { describe, expect, it, jest } from '@jest/globals';

// The utils barrel pulls browser/API config; the search rules only need the diacritics helper.
jest.mock('@rentalshop/utils', () => jest.requireActual('../packages/utils/src/core/string-utils'));

import {
  buildSearchWordTerm,
  productTextMatches,
  projectSearchColumnSql,
  SEARCH_SEPARATOR_SQL_REGEX,
  splitSearchWords,
} from '../packages/database/src/product-search-words';

const mau = { name: 'Mẫu (Xanh Ngọc)', description: null };

describe('#1009 product search: a word after punctuation is a word start', () => {
  it('"xanh" finds "Mẫu (Xanh Ngọc)"', () => {
    expect(productTextMatches(mau, 'xanh')).toBe(true);
  });

  it('"Xanh ngọc" finds "Mẫu (Xanh Ngọc)"', () => {
    expect(productTextMatches(mau, 'Xanh ngọc')).toBe(true);
  });

  it('"mau xanh ngoc" (no accents) finds it', () => {
    expect(productTextMatches(mau, 'mau xanh ngoc')).toBe(true);
  });

  it('query words with punctuation: "(xanh", "ngọc)", "(Xanh Ngọc)"', () => {
    expect(productTextMatches(mau, '(xanh')).toBe(true);
    expect(productTextMatches(mau, 'ngọc)')).toBe(true);
    expect(productTextMatches(mau, '(Xanh Ngọc)')).toBe(true);
    // no space before "(": the query "(xanh" must still find it
    expect(productTextMatches({ name: 'Mẫu(Xanh Ngọc)' }, '(xanh')).toBe(true);
  });

  it('other separators: "-", "/", ",", "."', () => {
    expect(productTextMatches({ name: 'Váy-xòe hồng' }, 'xoe')).toBe(true);
    expect(productTextMatches({ name: 'Áo trắng/đen' }, 'đen')).toBe(true);
    expect(productTextMatches({ name: 'Size S,M,L' }, 'm')).toBe(true);
    expect(productTextMatches({ name: 'Bộ vest v.2' }, '2')).toBe(true);
  });

  it('a word that is only in the description does not match', () => {
    expect(productTextMatches({ name: 'Áo dài', description: 'Màu (đỏ)' }, 'do')).toBe(false);
  });

  it('splits the query on punctuation and drops empty words', () => {
    expect(splitSearchWords('(xanh  ngọc)')).toEqual(['xanh', 'ngọc']);
    expect(splitSearchWords(' ( ) ')).toEqual([]);
    expect(productTextMatches(mau, '( )')).toBe(false);
  });

  it('`_` and `%` are not wildcards', () => {
    expect(productTextMatches({ name: 'abc' }, 'a_c')).toBe(false);
    expect(productTextMatches({ name: 'abc' }, 'a%c')).toBe(false);
    expect(buildSearchWordTerm('a_c').pattern).not.toMatch(/(^|[^\\])_/);
  });

  it('SQL projection turns separators into spaces with the same list', () => {
    // Column given by name: tests/ has its own @prisma/client without a generated client.
    const sql = projectSearchColumnSql('name');
    expect(sql.sql).toContain('regexp_replace');
    expect(sql.values).toContain(SEARCH_SEPARATOR_SQL_REGEX);
    const sqlAccent = projectSearchColumnSql('description');
    expect(sqlAccent.sql).toContain('regexp_replace');
    expect(sqlAccent.values).toContain(SEARCH_SEPARATOR_SQL_REGEX);
  });
});

describe('#1009 existing rules stay', () => {
  it('no mid-word match: "anh" does not find "Xanh"', () => {
    expect(productTextMatches(mau, 'anh')).toBe(false);
    expect(productTextMatches(mau, 'gọc')).toBe(false);
  });

  it('accent-insensitive both ways (#1250): "xánh" finds "Xanh"', () => {
    expect(productTextMatches(mau, 'xánh')).toBe(true);
    expect(productTextMatches({ name: 'Ao thun' }, 'áo')).toBe(true);
  });

  it('all words must match', () => {
    expect(productTextMatches(mau, 'xanh đỏ')).toBe(false);
  });

  it('value start and after a space still match', () => {
    expect(productTextMatches(mau, 'mẫu')).toBe(true);
    expect(productTextMatches({ name: 'Áo dài đỏ' }, 'dai')).toBe(true);
  });
});
