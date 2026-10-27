/**
 * Test cases for product search — mirrors findMatchingProductIds() / buildProductSearchOr()
 * in packages/database/src/product.ts (same rules as order search).
 *
 * Rules:
 *  1. Word-prefix matching (NOT substring): a term must start the whole value OR start any
 *     word inside the name. "dai" matches "Áo dài" but "ai" (mid-word) does not.
 *  2. Always accent-insensitive (#1250): "ao", "áo", "ào" all match "Áo"; "Họa" = "Hoạ".
 *  3. Multi-word: ALL words must match (AND), each in the name.
 *  4. Barcode matches when the code contains the typed text, independent of the word rules.
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

// Mirrors findMatchingProductIds(): ALL words must match (AND), each in the name.
function nameMatches(product: Product, searchInput: string): boolean {
  const words = searchInput.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return false;

  return words.every((word) => {
    const term = removeVietnameseDiacritics(word).toLowerCase();
    const startPattern = `${term}%`;
    const wordPattern = `% ${term}%`;
    const proj = (s: string) => removeVietnameseDiacritics(s).toLowerCase();
    const hit = (v: string) => like(proj(v), startPattern) || like(proj(v), wordPattern);
    return hit(product.name);
  });
}

// Mirrors buildProductSearchOr(): name match OR the barcode contains the typed text.
function productMatches(product: Product, searchInput: string): boolean {
  const term = searchInput.trim().toLowerCase();
  if (term && product.barcode && product.barcode.toLowerCase().includes(term)) return true;
  return nameMatches(product, searchInput);
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
    it('"lua" does not match a word that is only in the description', () => {
      expect(productMatches(aoDai, 'lua')).toBe(false);
    });
  });

  describe('Search WITH diacritics → accent-insensitive too (#1250)', () => {
    it('"áo" → matches "Áo dài..."', () => {
      expect(productMatches(aoDai, 'áo')).toBe(true);
    });
    it('"áo" → also matches unaccented "Ao thun trắng"', () => {
      expect(productMatches(aoThun, 'áo')).toBe(true);
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
    it('"001" → matches a barcode that contains those digits', () => {
      expect(productMatches(aoDai, '001')).toBe(true);
    });
    it('"AT-002" → matches "Ao thun" by barcode', () => {
      expect(productMatches(aoThun, 'AT-002')).toBe(true);
    });
  });
});
