// ============================================================================
// PRODUCT SEARCH WORD RULES — used by findMatchingProductIds() in ./product.ts
// ============================================================================
// Pure helpers, so the rules can be tested without a database. The SQL in
// projectSearchColumnSql() and the JS in projectSearchValue() must stay twins.
//
//   1. Word-prefix matching: a word must start the whole value OR start any word inside it.
//   2. Accent rule, driven by the QUERY word:
//        - word WITHOUT diacritics ("ao") → accent-INSENSITIVE (unaccent), also matches "Áo".
//        - word WITH diacritics ("áo")    → exact accented match only (NFC).
//   3. A value matches a word when (' ' || projected value) LIKE pattern.

import { Prisma } from '@prisma/client';
import { removeVietnameseDiacritics } from '@rentalshop/utils';

export interface SearchWordTerm {
  /** lower-cased term compared against the projected value */
  term: string;
  /** true when the query word carries diacritics → exact-accent comparison */
  hasDiacritics: boolean;
  /** LIKE pattern (backslash escape) applied to ' ' || projected value */
  pattern: string;
}

/** Split a search query into words. */
export function splitSearchWords(input: string): string[] {
  return (input || '').trim().split(/\s+/).filter((w: string) => w.length > 0);
}

/** Build the term and LIKE pattern for one query word. */
export function buildSearchWordTerm(word: string): SearchWordTerm {
  const nfc = word.normalize('NFC');
  const stripped = removeVietnameseDiacritics(word);
  const hasDiacritics = nfc.toLowerCase() !== stripped.toLowerCase();
  const term = (hasDiacritics ? nfc : stripped).toLowerCase();
  return { term, hasDiacritics, pattern: `% ${term}%` };
}

/**
 * JS twin of projectSearchColumnSql(): the value as the database compares it.
 * (removeVietnameseDiacritics stands in for Postgres unaccent().)
 */
export function projectSearchValue(value: string | null | undefined, hasDiacritics: boolean): string {
  const v = value || '';
  const lowered = hasDiacritics ? v.normalize('NFC').toLowerCase() : removeVietnameseDiacritics(v).toLowerCase();
  return ' ' + lowered;
}

/** SQL projection of a text column, compared with `LIKE pattern`. */
export function projectSearchColumnSql(column: Prisma.Sql, hasDiacritics: boolean): Prisma.Sql {
  return hasDiacritics
    ? Prisma.sql`(' ' || lower(normalize(COALESCE(${column}, ''), NFC)))`
    : Prisma.sql`(' ' || unaccent(lower(COALESCE(${column}, ''))))`;
}

/** PostgreSQL `value LIKE pattern` (default backslash escape), for tests and twins. */
export function likeMatches(value: string, pattern: string): boolean {
  let rx = '^';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '\\' && i + 1 < pattern.length) {
      rx += pattern[++i].replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    } else if (c === '%') {
      rx += '.*';
    } else if (c === '_') {
      rx += '.';
    } else {
      rx += c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    }
  }
  return new RegExp(rx + '$', 'su').test(value);
}

/** True when `value` (a product name or description) matches the query word `word`. */
export function searchValueMatches(value: string | null | undefined, word: string): boolean {
  const { hasDiacritics, pattern } = buildSearchWordTerm(word);
  return likeMatches(projectSearchValue(value, hasDiacritics), pattern);
}

/** True when ALL query words match the name OR the description (mirrors findMatchingProductIds). */
export function productTextMatches(
  product: { name: string; description?: string | null },
  query: string
): boolean {
  const words = splitSearchWords(query);
  if (words.length === 0) return false;
  return words.every(
    (w) => searchValueMatches(product.name, w) || searchValueMatches(product.description, w)
  );
}
