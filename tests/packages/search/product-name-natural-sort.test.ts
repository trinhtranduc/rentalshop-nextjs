/**
 * Product name natural sort — expected UX for storefront lists.
 *
 * Production uses Postgres ICU collation `natural_sort` (und-u-kn-true) on
 * Product.name (see prisma/migrations/20260825120000_product_name_natural_sort).
 *
 * These cases lock the human-facing contract:
 *   Điệu B2 < Điệu B3 < … < Điệu B19 < Điệu B20
 * Lexicographic/ASCII string sort is wrong for coded dress names.
 */

/** Split into alternating text / number chunks, matching ICU numeric ordering intent. */
function naturalSortKey(value: string): Array<string | number> {
  const parts = value.normalize('NFC').match(/(\d+)|(\D+)/g) ?? [value];
  return parts.map((part) => (/^\d+$/.test(part) ? Number(part) : part.toLocaleLowerCase('vi')));
}

function compareNatural(a: string, b: string): number {
  const ka = naturalSortKey(a);
  const kb = naturalSortKey(b);
  const len = Math.max(ka.length, kb.length);

  for (let i = 0; i < len; i++) {
    const left = ka[i];
    const right = kb[i];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    if (typeof left === 'number' && typeof right === 'number') {
      if (left !== right) return left - right;
      continue;
    }
    const ls = String(left);
    const rs = String(right);
    if (ls !== rs) return ls < rs ? -1 : 1;
  }
  return 0;
}

function sortNatural(names: string[]): string[] {
  return [...names].sort(compareNatural);
}

function sortLexicographic(names: string[]): string[] {
  return [...names].sort((a, b) => a.localeCompare(b, 'en'));
}

const DIEU_SERIES = [
  'Điệu B19',
  'Điệu B2',
  'Điệu B20',
  'Điệu B21',
  'Điệu B3',
  'Điệu B4',
];

describe('Product name natural sort', () => {
  describe('ICU-style natural order (storefront contract)', () => {
    it('orders Điệu B-series by numeric code: B2 before B19', () => {
      expect(sortNatural(DIEU_SERIES)).toEqual([
        'Điệu B2',
        'Điệu B3',
        'Điệu B4',
        'Điệu B19',
        'Điệu B20',
        'Điệu B21',
      ]);
    });

    it('orders mixed SKU-like codes numerically inside the string', () => {
      expect(sortNatural(['SKU-10', 'SKU-2', 'SKU-1', 'SKU-20'])).toEqual([
        'SKU-1',
        'SKU-2',
        'SKU-10',
        'SKU-20',
      ]);
    });

    it('keeps plain text names stable alphabetically when no digits', () => {
      expect(sortNatural(['Áo C', 'Áo A', 'Áo B'])).toEqual([
        'Áo A',
        'Áo B',
        'Áo C',
      ]);
    });

    it('handles multiple numeric segments', () => {
      expect(sortNatural(['A1-B10', 'A1-B2', 'A2-B1', 'A10-B1'])).toEqual([
        'A1-B2',
        'A1-B10',
        'A2-B1',
        'A10-B1',
      ]);
    });
  });

  describe('Why lexicographic sort is wrong for this shop', () => {
    it('lexicographic puts B19 before B2 (the bug users saw on mobile)', () => {
      const lex = sortLexicographic(DIEU_SERIES);
      expect(lex.indexOf('Điệu B19')).toBeLessThan(lex.indexOf('Điệu B2'));
      expect(lex).not.toEqual([
        'Điệu B2',
        'Điệu B3',
        'Điệu B4',
        'Điệu B19',
        'Điệu B20',
        'Điệu B21',
      ]);
    });

    it('natural sort fixes that B19-before-B2 defect', () => {
      const natural = sortNatural(DIEU_SERIES);
      expect(natural.indexOf('Điệu B2')).toBeLessThan(natural.indexOf('Điệu B19'));
    });
  });

  describe('Migration contract', () => {
    it('documents expected default product list order when sortBy=name asc', () => {
      // Mobile GET /api/products forces name ASC; with natural_sort collation
      // this is the order merchants should see on Trang chủ.
      const expectedHomeOrder = sortNatural([
        'Điệu B21',
        'Điệu B3',
        'Điệu B19',
        'Điệu B2',
        'Điệu B20',
        'Điệu B4',
      ]);
      expect(expectedHomeOrder[0]).toBe('Điệu B2');
      expect(expectedHomeOrder[expectedHomeOrder.length - 1]).toBe('Điệu B21');
    });
  });
});
