/**
 * Test cases for order search — mirrors buildOrderSearchConditions()
 * in packages/database/src/order.ts
 *
 * Two rules under test:
 *
 * 1. Word-prefix matching (NOT substring): the term must start the whole name OR start
 *    any word inside it. So "thu"/"thuy" match "Chị Thủy" but "huy" does not (mid-word).
 *
 * 2. Conditional accent handling driven by the QUERY:
 *    - Query WITHOUT diacritics ("thuy") → accent-INSENSITIVE, also matches "Thủy".
 *    - Query WITH diacritics ("thúy") → accent-SENSITIVE, matches the exact accented
 *      form only. "thúy"/"Thụy" must NOT match "Thủy".
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

interface Customer {
  id: number;
  firstName: string;
  lastName: string | null;
  phone: string | null;
}

/**
 * Simulate buildOrderSearchConditions() customer matching.
 * Returns true if the customer matches the search query.
 */
function customerMatchesSearch(customer: Customer, searchInput: string): boolean {
  const searchTerm = searchInput.trim();
  const searchTermNFC = searchTerm.normalize('NFC');
  const normalizedTerm = removeVietnameseDiacritics(searchTerm);
  const hasDiacritics = searchTermNFC.toLowerCase() !== normalizedTerm.toLowerCase();

  // phone: raw prefix match (phones carry no diacritics)
  if (customer.phone && customer.phone.toLowerCase().startsWith(searchTerm.toLowerCase())) {
    return true;
  }

  const patternTerm = (hasDiacritics ? searchTermNFC : normalizedTerm).toLowerCase();
  const startPattern = `${patternTerm}%`;
  const wordPattern = `% ${patternTerm}%`;

  const fwd = customer.firstName + ' ' + (customer.lastName || '');
  const rev = (customer.lastName || '') + ' ' + customer.firstName;
  // Accent-sensitive → compare NFC (keep accents); accent-insensitive → unaccent both sides.
  const proj = (s: string) =>
    hasDiacritics ? s.normalize('NFC').toLowerCase() : removeVietnameseDiacritics(s).toLowerCase();
  const nameHit = (v: string) =>
    like(proj(v), startPattern) || like(proj(v), wordPattern);

  return nameHit(fwd) || nameHit(rev);
}

// Test data
const customers: Customer[] = [
  { id: 1, firstName: 'Hồng', lastName: 'Ngọc', phone: '0901234567' },
  { id: 2, firstName: 'Hong', lastName: 'Ngoc', phone: '0912345678' }, // stored without diacritics (mobile font issue)
  { id: 3, firstName: 'Trần', lastName: 'Thị Phương', phone: '0923456789' },
  { id: 4, firstName: 'Nguyễn', lastName: 'Văn An', phone: '0934567890' },
  { id: 5, firstName: 'Kim', lastName: 'Phụng', phone: '0799502898' },
];

describe('Order Search - word-prefix + conditional accent', () => {

  describe('Search WITH diacritics → matches the exact accented form', () => {
    it('"Hồng" → matches "Hồng Ngọc"', () => {
      expect(customerMatchesSearch(customers[0], 'Hồng')).toBe(true);
    });

    it('"Ngọc" → matches "Hồng Ngọc" (word start)', () => {
      expect(customerMatchesSearch(customers[0], 'Ngọc')).toBe(true);
    });

    it('"Phương" → matches "Trần Thị Phương" (word start)', () => {
      expect(customerMatchesSearch(customers[2], 'Phương')).toBe(true);
    });

    it('"Nguyễn" → matches "Nguyễn Văn An"', () => {
      expect(customerMatchesSearch(customers[3], 'Nguyễn')).toBe(true);
    });

    it('"Hồng" (accented) → does NOT match unaccented "Hong Ngoc"', () => {
      // Rule: searching WITH diacritics matches the exact accented form only.
      expect(customerMatchesSearch(customers[1], 'Hồng')).toBe(false);
    });
  });

  describe('Search WITHOUT diacritics → matches data WITH diacritics (unaccent)', () => {
    it('"Hong" → matches "Hồng Ngọc"', () => {
      expect(customerMatchesSearch(customers[0], 'Hong')).toBe(true);
    });

    it('"Ngoc" → matches "Hồng Ngọc"', () => {
      expect(customerMatchesSearch(customers[0], 'Ngoc')).toBe(true);
    });

    it('"Phuong" → matches "Trần Thị Phương"', () => {
      expect(customerMatchesSearch(customers[2], 'Phuong')).toBe(true);
    });

    it('"Nguyen" → matches "Nguyễn Văn An"', () => {
      expect(customerMatchesSearch(customers[3], 'Nguyen')).toBe(true);
    });

    it('"Phung" → matches "Kim Phụng"', () => {
      expect(customerMatchesSearch(customers[4], 'Phung')).toBe(true);
    });
  });

  describe('Search WITHOUT diacritics → matches data WITHOUT diacritics', () => {
    it('"Hong" → matches "Hong Ngoc"', () => {
      expect(customerMatchesSearch(customers[1], 'Hong')).toBe(true);
    });

    it('"Ngoc" → matches "Hong Ngoc"', () => {
      expect(customerMatchesSearch(customers[1], 'Ngoc')).toBe(true);
    });
  });

  describe('Full name search (multi-word, contiguous)', () => {
    it('"hong ngoc" → matches "Hồng Ngọc"', () => {
      expect(customerMatchesSearch(customers[0], 'hong ngoc')).toBe(true);
    });

    it('"Hồng Ngọc" → matches "Hồng Ngọc"', () => {
      expect(customerMatchesSearch(customers[0], 'Hồng Ngọc')).toBe(true);
    });

    it('"ngoc hong" → matches "Hồng Ngọc" (reverse order)', () => {
      expect(customerMatchesSearch(customers[0], 'ngoc hong')).toBe(true);
    });

    it('"van an" → matches "Nguyễn Văn An"', () => {
      expect(customerMatchesSearch(customers[3], 'van an')).toBe(true);
    });

    it('"nguyen van" → matches "Nguyễn Văn An"', () => {
      expect(customerMatchesSearch(customers[3], 'nguyen van')).toBe(true);
    });
  });

  describe('Phone search (unaffected by diacritics)', () => {
    it('"0901234567" → matches by phone', () => {
      expect(customerMatchesSearch(customers[0], '0901234567')).toBe(true);
    });

    it('"0799" → partial phone match (prefix)', () => {
      expect(customerMatchesSearch(customers[4], '0799')).toBe(true);
    });
  });

  describe('No false positives', () => {
    it('"Minh" → does NOT match "Hồng Ngọc"', () => {
      expect(customerMatchesSearch(customers[0], 'Minh')).toBe(false);
    });

    it('"Tran" → does NOT match "Nguyễn Văn An"', () => {
      expect(customerMatchesSearch(customers[3], 'Tran')).toBe(false);
    });
  });
});

describe('Bug: "Chị Thủy" — honorific prefix + tone-mark sensitivity', () => {
  // Try both plausible storage shapes: split fields, and everything in firstName.
  const split: Customer = { id: 20, firstName: 'Chị', lastName: 'Thủy', phone: '0900111222' };
  const single: Customer = { id: 21, firstName: 'Chị Thủy', lastName: null, phone: '0900333444' };

  const cases: Array<[string, boolean]> = [
    ['Chi', true],    // honorific, word start
    ['chi', true],    // lowercase
    ['Thu', true],    // prefix of "Thủy" (no diacritics)
    ['thuy', true],   // full name, no diacritics → matches accented "Thủy"
    ['Thuy', true],
    ['thủy', true],   // exact accent
    ['thúy', false],  // WRONG tone mark → must NOT match "Thủy"
    ['Thụy', false],  // WRONG tone mark → must NOT match "Thủy"
    ['huy', false],   // mid-word inside "thuy" → not a word start
  ];

  describe('firstName="Chị", lastName="Thủy"', () => {
    for (const [q, expected] of cases) {
      it(`"${q}" → ${expected}`, () => {
        expect(customerMatchesSearch(split, q)).toBe(expected);
      });
    }
  });

  describe('firstName="Chị Thủy", lastName=null', () => {
    for (const [q, expected] of cases) {
      it(`"${q}" → ${expected}`, () => {
        expect(customerMatchesSearch(single, q)).toBe(expected);
      });
    }
  });
});
