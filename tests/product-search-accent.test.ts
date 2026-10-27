/**
 * #1250: product search must ignore diacritics, wherever the tone mark sits.
 * A product stored as "Hoạ tiết" was not found by "Họa" (and the other way round) because a query
 * word WITH diacritics was compared exact-accent. Now every query word and every name is folded the
 * same way: NFC, strip marks, đ -> d, lower case.
 *
 * Rules: packages/database/src/product-search-words.ts. The SQL twin runs against a real Postgres
 * (with the `unaccent` extension) when TEST_PG_DB names a database, e.g.
 *   createdb anyrent_search && psql anyrent_search -c 'CREATE EXTENSION unaccent'
 *   TEST_PG_DB=anyrent_search yarn test product-search-accent
 */
import { describe, expect, it, jest } from '@jest/globals';
import { execFileSync } from 'child_process';

// The utils barrel pulls browser/API config; the search rules only need the diacritics helper.
jest.mock('@rentalshop/utils', () => jest.requireActual('../packages/utils/src/core/string-utils'));

import {
  buildSearchWordTerm,
  productTextMatches,
  projectSearchColumnSql,
  splitSearchWords,
} from '../packages/database/src/product-search-words';

const nfc = (s: string) => s.normalize('NFC');
const nfd = (s: string) => s.normalize('NFD');

// Same word, tone mark on "o" (họa) and on "a" (hoạ), stored as NFC and as NFD.
const names = [
  'Hoạ tiết', // tone on a
  'Họa tiết', // tone on o
  nfd('Hoạ tiết'),
  nfd('Họa tiết'),
];
const queries = [
  'Họa', 'Hoạ', 'họa', 'hoạ', 'HỌA', 'HOẠ', 'hoa', 'Hoa', 'HOA',
  nfd('Họa'), nfd('Hoạ'), nfd('họa'),
  'Hoạ t', 'Họa t', 'hoa tiet', 'Hoa Tiết', nfd('Hoạ tiết'),
];

describe('#1250 product search ignores diacritics (JS rules)', () => {
  for (const name of names) {
    for (const q of queries) {
      it(`${JSON.stringify(nfc(name))} (${name === nfc(name) ? 'NFC' : 'NFD'}) is found by ${JSON.stringify(q)}`, () => {
        expect(productTextMatches({ name }, q)).toBe(true);
      });
    }
  }

  it('a query with a mark finds a name without it, and the other way round', () => {
    expect(productTextMatches({ name: 'Ao thun' }, 'áo')).toBe(true);
    expect(productTextMatches({ name: 'Xanh' }, 'xánh')).toBe(true);
    expect(productTextMatches({ name: 'Áo dài' }, 'ào')).toBe(true);
  });

  it('đ and Đ fold to d', () => {
    expect(productTextMatches({ name: 'Đầm dạ hội' }, 'dam')).toBe(true);
    expect(productTextMatches({ name: 'Dam da hoi' }, 'Đầm')).toBe(true);
    expect(productTextMatches({ name: 'Đầm' }, 'đầm')).toBe(true);
  });

  it('every Vietnamese vowel with any tone matches its bare letter', () => {
    const marks = ['̀', '́', '̃', '̉', '̣'];
    for (const base of ['a', 'ă', 'â', 'e', 'ê', 'i', 'o', 'ô', 'ơ', 'u', 'ư', 'y']) {
      const bare = base.normalize('NFD')[0];
      for (const m of marks) {
        const withTone = nfc(nfd(base) + m);
        expect(productTextMatches({ name: withTone + 'x' }, bare + 'x')).toBe(true);
        expect(productTextMatches({ name: bare + 'x' }, withTone + 'x')).toBe(true);
        // tone mark placed before a second mark in the other order gives the same letter
        expect(productTextMatches({ name: withTone + 'x' }, nfd(withTone) + 'x')).toBe(true);
      }
    }
  });

  it('still word-prefix, not mid-word', () => {
    expect(productTextMatches({ name: 'Hoạ tiết' }, 'oa')).toBe(false);
    expect(productTextMatches({ name: 'Hoạ tiết' }, 'iết')).toBe(false);
    expect(productTextMatches({ name: 'Hoạ tiết' }, 'họa đỏ')).toBe(false);
  });

  it('splits and keeps the folded term', () => {
    expect(splitSearchWords(nfd('Họa tiết'))).toEqual([nfc('Họa'), 'tiết']);
    expect(buildSearchWordTerm('Họa').pattern).toBe('% hoa%');
    expect(buildSearchWordTerm(nfd('Hoạ')).pattern).toBe('% hoa%');
  });
});

// ---- SQL twin, only with a database -----------------------------------------------------------
const pgDb = process.env.TEST_PG_DB;
const sqlDescribe = pgDb ? describe : describe.skip;

function sqlMatches(name: string, query: string): boolean {
  const words = splitSearchWords(query);
  const cond = words.map((w) => {
    const { pattern } = buildSearchWordTerm(w);
    const col = projectSearchColumnSql('name');
    return { text: `(${col.text} LIKE $${col.values.length + 1})`, values: [...col.values, pattern] };
  });
  let text = '';
  const values: unknown[] = [];
  cond.forEach((c, i) => {
    // renumber placeholders
    const shifted = c.text.replace(/\$(\d+)/g, (_m, n) => `$${Number(n) + values.length}`);
    text += (i ? ' AND ' : '') + shifted;
    values.push(...c.values);
  });
  const lit = (v: unknown) => `'${String(v).replace(/'/g, "''")}'`;
  const inlined = text.replace(/\$(\d+)/g, (_m, n) => lit(values[Number(n) - 1]));
  const sql = `SELECT 1 FROM (SELECT ${lit(name)}::text AS "name") t WHERE ${inlined}`;
  const out = execFileSync('psql', [pgDb as string, '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql]).toString().trim();
  return out === '1';
}

sqlDescribe('#1250 product search ignores diacritics (Postgres unaccent)', () => {
  for (const name of names) {
    for (const q of queries) {
      it(`${JSON.stringify(nfc(name))} (${name === nfc(name) ? 'NFC' : 'NFD'}) is found by ${JSON.stringify(q)}`, () => {
        expect(sqlMatches(name, q)).toBe(true);
      });
    }
  }

  it('đ folds to d, mid-word and other words still do not match', () => {
    expect(sqlMatches('Đầm dạ hội', 'dam')).toBe(true);
    expect(sqlMatches('Dam', 'Đầm')).toBe(true);
    expect(sqlMatches('Hoạ tiết', 'oa')).toBe(false);
    expect(sqlMatches('Hoạ tiết', 'họa đỏ')).toBe(false);
  });
});
