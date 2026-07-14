/**
 * Test cases for product search — mirrors findMatchingProductIds() / buildProductSearchOr()
 * in packages/database/src/product.ts (same rules as order search).
 *
 * Rules:
 *  1. Word-prefix matching (NOT substring): a term must start the whole value OR start any
 *     word inside name/description. "dai" matches "Áo dài" but "ai" (mid-word) does not.
 *  2. Conditional accent driven by the QUERY:
 *       - query WITHOUT diacritics ("ao") → accent-INSENSITIVE, also matches "Áo".
 *       - query WITH diacritics ("áo")    → exact accented match only.
 *  3. Multi-word: ALL words must match (AND), each in name OR description.
 *  4. Barcode matches the whole term (exact / prefix), independent of the word rules.
 */

// Inline removeVietnameseDiacritics (same behaviour as @rentalshop/utils)
function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize('NFC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// PostgreSQL LIKE with '%' wildcard → regex (anchored, dot matches newline)
function like(value: string, pattern: string): boolean {
  const rx =
    '^' +
    pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') +
    '$';
  return new RegExp(rx, 's').test(value);
}

interface Product {
  name: string;
  description: string | null;
  barcode: string | null;
}

// Mirrors findMatchingProductIds(): ALL words must match (AND), each in name OR description.
function nameMatches(product: Product, searchInput: string): boolean {
  const words = searchInput.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return false;

  return words.every((word) => {
    const nfc = word.normalize('NFC');
    const stripped = removeVietnameseDiacritics(word);
    const hasDiacritics = nfc.toLowerCase() !== stripped.toLowerCase();
    const term = (hasDiacritics ? nfc : stripped).toLowerCase();
    const startPattern = `${term}%`;
    const wordPattern = `% ${term}%`;
    const proj = (s: string) =>
      hasDiacritics ? s.normalize('NFC').toLowerCase() : removeVietnameseDiacritics(s).toLowerCase();
    const hit = (v: string) => like(proj(v), startPattern) || like(proj(v), wordPattern);
    return hit(product.name) || hit(product.description || '');
  });
}

// Mirrors buildProductSearchOr(): name match OR barcode (exact) match.
function productMatches(product: Product, searchInput: string): boolean {
  const term = searchInput.trim();
  if (product.barcode && product.barcode === term) return true;
  return nameMatches(product, term);
}

const aoDai: Product = {
  name: 'Áo dài đỏ truyền thống',
  description: 'Vải lụa cao cấp',
  barcode: 'AD-001',
};
const aoThun: Product = { name: 'Ao thun trắng', description: null, barcode: 'AT-002' };

describe('Product Search - word-prefix + conditional accent', () => {

  describe('Search WITHOUT diacritics → matches accented name', () => {
    it('"ao" → matches "Áo dài đỏ..." (word start)', () => {
      expect(productMatches(aoDai, 'ao')).toBe(true);
    });
    it('"dai" → matches "Áo dài..." (interior word start)', () => {
      expect(productMatches(aoDai, 'dai')).toBe(true);
    });
    it('"do" → matches "...đỏ..." (đ → d)', () => {
      expect(productMatches(aoDai, 'do')).toBe(true);
    });
    it('"truyen" → matches "...truyền thống"', () => {
      expect(productMatches(aoDai, 'truyen')).toBe(true);
    });
    it('"lua" → matches via description "Vải lụa..."', () => {
      expect(productMatches(aoDai, 'lua')).toBe(true);
    });
  });

  describe('Search WITH diacritics → exact accented match only', () => {
    it('"áo" → matches "Áo dài..."', () => {
      expect(productMatches(aoDai, 'áo')).toBe(true);
    });
    it('"áo" → does NOT match unaccented "Ao thun trắng"', () => {
      expect(productMatches(aoThun, 'áo')).toBe(false);
    });
    it('"dà" → matches "...dài..." (prefix, correct accent)', () => {
      expect(productMatches(aoDai, 'dà')).toBe(true);
    });
  });

  describe('Multi-word (ALL words must match)', () => {
    it('"ao dai" → matches "Áo dài đỏ..."', () => {
      expect(productMatches(aoDai, 'ao dai')).toBe(true);
    });
    it('"ao do" → matches (both words present)', () => {
      expect(productMatches(aoDai, 'ao do')).toBe(true);
    });
    it('"ao xanh" → does NOT match (no "xanh")', () => {
      expect(productMatches(aoDai, 'ao xanh')).toBe(false);
    });
  });

  describe('No mid-word / false-positive matches', () => {
    it('"ai" → does NOT match "dài" (mid-word)', () => {
      expect(productMatches(aoDai, 'ai')).toBe(false);
    });
    it('"ruyen" → does NOT match "truyền" (mid-word)', () => {
      expect(productMatches(aoDai, 'ruyen')).toBe(false);
    });
    it('"quan" → does NOT match "Áo dài..."', () => {
      expect(productMatches(aoDai, 'quan')).toBe(false);
    });
  });

  describe('Barcode search', () => {
    it('"AD-001" → matches by barcode', () => {
      expect(productMatches(aoDai, 'AD-001')).toBe(true);
    });
    it('"AT-002" → matches "Ao thun" by barcode', () => {
      expect(productMatches(aoThun, 'AT-002')).toBe(true);
    });
  });
});
