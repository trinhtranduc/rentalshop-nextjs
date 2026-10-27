// ============================================================================
// PRODUCT SEARCH WORD RULES — used by findMatchingProductIds() in ./product.ts
// ============================================================================
// Pure helpers, so the rules can be tested without a database. The SQL in
// projectSearchColumnSql() and the JS in projectSearchValue() must stay twins.
//
//   1. Word-prefix matching: a word must start the whole value OR start any word inside it.
//      A word starts after a space OR after punctuation (#1009): "xanh" finds "Mẫu (Xanh Ngọc)".
//      The query is split on the same separators, so "(xanh" is the word "xanh".
//   2. Always accent-insensitive (#1250), on both sides: the query word and the stored name are
//      folded the same way (NFC, strip marks, đ → d, lower case). "ao", "áo", "ào" all find "Áo",
//      and "Họa" finds "Hoạ" whichever way the tone mark sits or the text was encoded (NFC / NFD).
//   3. A value matches a word when (' ' || projected value) LIKE pattern, where the projected
//      value has every run of separators replaced by one space.

import { Prisma } from '@prisma/client';
import { foldSearchText } from '@rentalshop/utils';

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
  /** folded term (no marks, lower case) compared against the projected value */
  term: string;
  /** LIKE pattern (backslash escape) applied to ' ' || projected value */
  pattern: string;
}

/** Split a search query into words on whitespace and punctuation; empty pieces are dropped. */
export function splitSearchWords(input: string): string[] {
  return (input || '').normalize('NFC').split(SEPARATOR_RE).filter((w: string) => w.length > 0);
}

/** Build the term and LIKE pattern for one query word (a piece from splitSearchWords). */
export function buildSearchWordTerm(word: string): SearchWordTerm {
  const term = foldSearchText(word);
  return { term, pattern: `% ${escapeLikePattern(term)}%` };
}

/**
 * JS twin of projectSearchColumnSql(): the value as the database compares it.
 * (foldSearchText stands in for lower(unaccent(normalize(..., NFC))).)
 */
export function projectSearchValue(value: string | null | undefined): string {
  return ' ' + foldSearchText(value || '').replace(SEPARATOR_RE, ' ');
}

/** Product text columns that search reads. */
export type SearchTextColumn = 'name' | 'description';

/**
 * SQL projection of a text column, compared with `LIKE pattern`. The regex is a bound parameter.
 * normalize(NFC) first so a name stored decomposed (NFD) is folded like a composed one.
 */
export function projectSearchColumnSql(columnName: SearchTextColumn): Prisma.Sql {
  const column = columnName === 'name' ? Prisma.raw('"name"') : Prisma.raw('"description"');
  return Prisma.sql`(' ' || regexp_replace(lower(unaccent(normalize(COALESCE(${column}, ''), NFC))), ${SEARCH_SEPARATOR_SQL_REGEX}, ' ', 'g'))`;
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
  const { pattern } = buildSearchWordTerm(word);
  return likeMatches(projectSearchValue(value), pattern);
}

/** True when ALL query words match the product name (mirrors findMatchingProductIds). */
export function productTextMatches(
  product: { name: string; description?: string | null },
  query: string
): boolean {
  const words = splitSearchWords(query);
  if (words.length === 0) return false;
  return words.every((w) => searchValueMatches(product.name, w));
}
