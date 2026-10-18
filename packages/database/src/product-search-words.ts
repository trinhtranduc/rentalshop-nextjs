// ============================================================================
// PRODUCT SEARCH WORD RULES — used by findMatchingProductIds() in ./product.ts
// ============================================================================
// Pure helpers, so the rules can be tested without a database. The SQL in
// projectSearchColumnSql() and the JS in projectSearchValue() must stay twins.
//
//   1. Word-prefix matching: a word must start the whole value OR start any word inside it.
//      A word starts after a space OR after punctuation (#1009): "xanh" finds "Mẫu (Xanh Ngọc)".
//      The query is split on the same separators, so "(xanh" is the word "xanh".
//   2. Accent rule, driven by the QUERY word:
//        - word WITHOUT diacritics ("ao") → accent-INSENSITIVE (unaccent), also matches "Áo".
//        - word WITH diacritics ("áo")    → exact accented match only (NFC).
//   3. A value matches a word when (' ' || projected value) LIKE pattern, where the projected
//      value has every run of separators replaced by one space.

import { Prisma } from '@prisma/client';
import { removeVietnameseDiacritics } from '@rentalshop/utils';

/**
 * Characters that end a word: whitespace and punctuation. An explicit list (not [[:alnum:]] or
 * [[:punct:]]) so Postgres and JS agree whatever the database ctype: in a C-ctype database the
 * POSIX classes do not count "ẫ" as a letter.
 */
export const SEARCH_SEPARATOR_CHARS =
  ' \t\n\r\f\v 　' +
  '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~' +
  '‘’“”–—…·•«»' +
  '、。，（）【】「」：；！？～';

/** Bracket body with `\ ] ^ - [` escaped (valid inside [...] in a JS `u` regex and a Postgres ARE). */
const SEPARATOR_CLASS_BODY = Array.from(SEARCH_SEPARATOR_CHARS)
  .map((c) => ('\\]^-['.includes(c) ? `\\${c}` : c))
  .join('');

/** Postgres regex (sent as a bound parameter) matching one run of separators. */
export const SEARCH_SEPARATOR_SQL_REGEX = `[${SEPARATOR_CLASS_BODY}]+`;

const SEPARATOR_RE = new RegExp(`[${SEPARATOR_CLASS_BODY}]+`, 'gu');

/** Escape LIKE wildcards; Postgres LIKE uses backslash as the default escape character. */
export function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&');
}

export interface SearchWordTerm {
  /** lower-cased term compared against the projected value */
  term: string;
  /** true when the query word carries diacritics → exact-accent comparison */
  hasDiacritics: boolean;
  /** LIKE pattern (backslash escape) applied to ' ' || projected value */
  pattern: string;
}

/** Split a search query into words on whitespace and punctuation; empty pieces are dropped. */
export function splitSearchWords(input: string): string[] {
  return (input || '').normalize('NFC').split(SEPARATOR_RE).filter((w: string) => w.length > 0);
}

/** Build the term and LIKE pattern for one query word (a piece from splitSearchWords). */
export function buildSearchWordTerm(word: string): SearchWordTerm {
  const nfc = word.normalize('NFC');
  const stripped = removeVietnameseDiacritics(word);
  const hasDiacritics = nfc.toLowerCase() !== stripped.toLowerCase();
  const term = (hasDiacritics ? nfc : stripped).toLowerCase();
  return { term, hasDiacritics, pattern: `% ${escapeLikePattern(term)}%` };
}

/**
 * JS twin of projectSearchColumnSql(): the value as the database compares it.
 * (removeVietnameseDiacritics stands in for Postgres unaccent().)
 */
export function projectSearchValue(value: string | null | undefined, hasDiacritics: boolean): string {
  const v = value || '';
  const lowered = hasDiacritics ? v.normalize('NFC').toLowerCase() : removeVietnameseDiacritics(v).toLowerCase();
  return ' ' + lowered.replace(SEPARATOR_RE, ' ');
}

/** Product text columns that search reads. */
export type SearchTextColumn = 'name' | 'description';

/** SQL projection of a text column, compared with `LIKE pattern`. The regex is a bound parameter. */
export function projectSearchColumnSql(columnName: SearchTextColumn, hasDiacritics: boolean): Prisma.Sql {
  const column = columnName === 'name' ? Prisma.raw('"name"') : Prisma.raw('"description"');
  return hasDiacritics
    ? Prisma.sql`(' ' || regexp_replace(lower(normalize(COALESCE(${column}, ''), NFC)), ${SEARCH_SEPARATOR_SQL_REGEX}, ' ', 'g'))`
    : Prisma.sql`(' ' || regexp_replace(unaccent(lower(COALESCE(${column}, ''))), ${SEARCH_SEPARATOR_SQL_REGEX}, ' ', 'g'))`;
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
