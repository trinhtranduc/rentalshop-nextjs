/**
 * Test cases for diacritics-insensitive order search
 * 
 * Scenarios:
 * 1. Search WITH diacritics → matches data WITH diacritics ✓
 * 2. Search WITHOUT diacritics → matches data WITH diacritics ✓ (via unaccent)
 * 3. Search WITH diacritics → matches data WITHOUT diacritics ✓ (via normalized)
 * 4. Search WITHOUT diacritics → matches data WITHOUT diacritics ✓
 * 5. Full name search (multi-word)
 * 6. Phone and order number search unaffected
 */

// Inline removeVietnameseDiacritics (same as @rentalshop/utils)
function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Simulate unaccent() behavior (same as PostgreSQL unaccent extension)
function unaccent(str: string): string {
  return removeVietnameseDiacritics(str);
}

// Simulate PostgreSQL LIKE with unaccent
function unaccentLike(dbValue: string, searchPattern: string): boolean {
  const pattern = searchPattern.replace(/%/g, '');
  return unaccent(dbValue.toLowerCase()).includes(pattern.toLowerCase());
}

// Simulate Prisma contains (ILIKE - case insensitive but NOT diacritics insensitive)
function prismaContains(dbValue: string, searchTerm: string): boolean {
  return dbValue.toLowerCase().includes(searchTerm.toLowerCase());
}

interface Customer {
  id: number;
  firstName: string;
  lastName: string | null;
  phone: string | null;
}

/**
 * Simulate buildOrderSearchConditions() logic
 * Returns true if customer matches search query
 */
function customerMatchesSearch(customer: Customer, searchInput: string): boolean {
  const searchTerm = searchInput.trim();
  const normalizedTerm = removeVietnameseDiacritics(searchTerm);

  // 1. Prisma contains (original term) - matches same diacritics
  if (prismaContains(customer.firstName, searchTerm)) return true;
  if (customer.lastName && prismaContains(customer.lastName, searchTerm)) return true;
  if (customer.phone && prismaContains(customer.phone, searchTerm)) return true;

  // 2. Prisma contains (normalized term) - matches data without diacritics
  if (prismaContains(customer.firstName, normalizedTerm)) return true;
  if (customer.lastName && prismaContains(customer.lastName, normalizedTerm)) return true;

  // 3. PostgreSQL unaccent() - TRUE diacritics-insensitive match
  const searchPattern = normalizedTerm.toLowerCase();
  const fullName = customer.firstName + ' ' + (customer.lastName || '');
  const reverseName = (customer.lastName || '') + ' ' + customer.firstName;
  
  if (unaccentLike(customer.firstName, searchPattern)) return true;
  if (customer.lastName && unaccentLike(customer.lastName, searchPattern)) return true;
  if (unaccentLike(fullName, searchPattern)) return true;
  if (unaccentLike(reverseName, searchPattern)) return true;

  return false;
}

// Test data
const customers: Customer[] = [
  { id: 1, firstName: 'Hồng', lastName: 'Ngọc', phone: '0901234567' },
  { id: 2, firstName: 'Hong', lastName: 'Ngoc', phone: '0912345678' }, // stored without diacritics (mobile font issue)
  { id: 3, firstName: 'Trần', lastName: 'Thị Phương', phone: '0923456789' },
  { id: 4, firstName: 'Nguyễn', lastName: 'Văn An', phone: '0934567890' },
  { id: 5, firstName: 'Kim', lastName: 'Phụng', phone: '0799502898' },
];

describe('Order Search - Diacritics Insensitive', () => {

  describe('Search WITH diacritics → matches data WITH diacritics', () => {
    it('"Hồng" → matches "Hồng Ngọc"', () => {
      expect(customerMatchesSearch(customers[0], 'Hồng')).toBe(true);
    });

    it('"Ngọc" → matches "Hồng Ngọc"', () => {
      expect(customerMatchesSearch(customers[0], 'Ngọc')).toBe(true);
    });

    it('"Phương" → matches "Trần Thị Phương"', () => {
      expect(customerMatchesSearch(customers[2], 'Phương')).toBe(true);
    });

    it('"Nguyễn" → matches "Nguyễn Văn An"', () => {
      expect(customerMatchesSearch(customers[3], 'Nguyễn')).toBe(true);
    });
  });

  describe('Search WITHOUT diacritics → matches data WITH diacritics (unaccent)', () => {
    it('"Hong" → matches "Hồng Ngọc" via unaccent', () => {
      expect(customerMatchesSearch(customers[0], 'Hong')).toBe(true);
    });

    it('"Ngoc" → matches "Hồng Ngọc" via unaccent', () => {
      expect(customerMatchesSearch(customers[0], 'Ngoc')).toBe(true);
    });

    it('"Phuong" → matches "Trần Thị Phương" via unaccent', () => {
      expect(customerMatchesSearch(customers[2], 'Phuong')).toBe(true);
    });

    it('"Nguyen" → matches "Nguyễn Văn An" via unaccent', () => {
      expect(customerMatchesSearch(customers[3], 'Nguyen')).toBe(true);
    });

    it('"Phung" → matches "Kim Phụng" via unaccent', () => {
      expect(customerMatchesSearch(customers[4], 'Phung')).toBe(true);
    });
  });

  describe('Search WITH diacritics → matches data WITHOUT diacritics (normalized)', () => {
    it('"Hồng" → matches "Hong Ngoc" (data without diacritics)', () => {
      // removeVietnameseDiacritics("Hồng") = "Hong"
      // prismaContains("Hong", "Hong") = true
      expect(customerMatchesSearch(customers[1], 'Hồng')).toBe(true);
    });

    it('"Ngọc" → matches "Hong Ngoc" (data without diacritics)', () => {
      expect(customerMatchesSearch(customers[1], 'Ngọc')).toBe(true);
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

  describe('Full name search (multi-word)', () => {
    it('"hong ngoc" → matches "Hồng Ngọc" via unaccent full name', () => {
      expect(customerMatchesSearch(customers[0], 'hong ngoc')).toBe(true);
    });

    it('"Hồng Ngọc" → matches "Hồng Ngọc"', () => {
      expect(customerMatchesSearch(customers[0], 'Hồng Ngọc')).toBe(true);
    });

    it('"ngoc hong" → matches "Hồng Ngọc" (reverse name order)', () => {
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

    it('"0799" → partial phone match', () => {
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

describe('Bug fix: "cẩm diệu" full name search', () => {
  const camDieu: Customer = { id: 10, firstName: 'Cẩm', lastName: 'Diệu', phone: '0909000111' };
  const camDieuReverse: Customer = { id: 11, firstName: 'Diệu', lastName: 'Cẩm', phone: '0909000222' };

  it('"cẩm" → matches (single word, contains in firstName)', () => {
    expect(customerMatchesSearch(camDieu, 'cẩm')).toBe(true);
  });

  it('"cẩm diệu" → matches (full name with diacritics)', () => {
    expect(customerMatchesSearch(camDieu, 'cẩm diệu')).toBe(true);
  });

  it('"cam dieu" → matches (full name without diacritics via unaccent)', () => {
    expect(customerMatchesSearch(camDieu, 'cam dieu')).toBe(true);
  });

  it('"diệu cẩm" → matches (reverse order)', () => {
    expect(customerMatchesSearch(camDieu, 'diệu cẩm')).toBe(true);
  });

  it('"dieu cam" → matches (reverse order, no diacritics)', () => {
    expect(customerMatchesSearch(camDieu, 'dieu cam')).toBe(true);
  });

  it('"Cẩm Diệu" with firstName=Diệu, lastName=Cẩm → matches', () => {
    expect(customerMatchesSearch(camDieuReverse, 'Cẩm Diệu')).toBe(true);
  });
});
