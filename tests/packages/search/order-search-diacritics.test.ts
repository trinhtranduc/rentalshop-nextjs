/**
 * Test cases for order search — mirrors buildOrderSearchConditions()
 * in packages/database/src/order.ts
 *
 * Rules under test:
 *
 * 1. `contains` matching for order number, customer phone, first name, last name,
 *    and concatenated full name.
 * 2. Vietnamese-accent-insensitive matching for customer names.
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

interface Customer {
  id: number;
  firstName: string;
  lastName: string | null;
  phone: string | null;
}

/**
 * Simulate the user-visible search semantics from buildOrderSearchConditions().
 */
interface OrderRecord {
  orderNumber: string;
  customer: Customer;
}

function orderMatchesSearch(order: OrderRecord, searchInput: string): boolean {
  const searchTerm = searchInput.trim();
  const normalizedTerm = removeVietnameseDiacritics(searchTerm).toLowerCase();

  if (!searchTerm) {
    return false;
  }

  if (order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())) {
    return true;
  }

  if (order.customer.phone && order.customer.phone.toLowerCase().includes(searchTerm.toLowerCase())) {
    return true;
  }

  const fullName = `${order.customer.firstName} ${order.customer.lastName || ''}`.trim();
  const reverseFullName = `${order.customer.lastName || ''} ${order.customer.firstName}`.trim();
  const haystacks = [
    order.customer.firstName,
    order.customer.lastName || '',
    fullName,
    reverseFullName,
  ];

  return haystacks.some((value) =>
    removeVietnameseDiacritics(value).toLowerCase().includes(normalizedTerm)
  );
}

// Test data
const orders: OrderRecord[] = [
  {
    orderNumber: 'ORD-001-ALPHA',
    customer: { id: 1, firstName: 'Hồng', lastName: 'Ngọc', phone: '0901234567' },
  },
  {
    orderNumber: 'ORD-002-BETA',
    customer: { id: 2, firstName: 'Hong', lastName: 'Ngoc', phone: '0912345678' },
  },
  {
    orderNumber: 'INV-777',
    customer: { id: 3, firstName: 'Trần', lastName: 'Thị Phương', phone: '0923456789' },
  },
  {
    orderNumber: 'RET-888',
    customer: { id: 4, firstName: 'Nguyễn', lastName: 'Văn An', phone: '0934567890' },
  },
  {
    orderNumber: 'HOLD-999',
    customer: { id: 5, firstName: 'Kim', lastName: 'Phụng', phone: '0799502898' },
  },
  {
    orderNumber: 'ACC-123456',
    customer: { id: 6, firstName: 'Trường', lastName: 'Anh', phone: '123456' },
  },
];

describe('Order Search - contains + accent-insensitive matching', () => {
  describe('First name and last name search', () => {
    it('"Hồng" → matches accented first name', () => {
      expect(orderMatchesSearch(orders[0], 'Hồng')).toBe(true);
    });

    it('"Hong" → matches accented first name without accents in query', () => {
      expect(orderMatchesSearch(orders[0], 'Hong')).toBe(true);
    });

    it('"ong" → matches inside "Hồng"', () => {
      expect(orderMatchesSearch(orders[0], 'ong')).toBe(true);
    });

    it('"Ngọc" → matches accented last name', () => {
      expect(orderMatchesSearch(orders[0], 'Ngọc')).toBe(true);
    });

    it('"goc" → matches inside "Ngọc" without accents in query', () => {
      expect(orderMatchesSearch(orders[0], 'goc')).toBe(true);
    });

    it('"uong" → matches inside "Trường"', () => {
      expect(orderMatchesSearch(orders[5], 'uong')).toBe(true);
    });
  });

  describe('Full name search', () => {
    it('"hong ngoc" → matches "Hồng Ngọc"', () => {
      expect(orderMatchesSearch(orders[0], 'hong ngoc')).toBe(true);
    });

    it('"Hồng Ngọc" → matches "Hồng Ngọc"', () => {
      expect(orderMatchesSearch(orders[0], 'Hồng Ngọc')).toBe(true);
    });

    it('"ong ng" → matches inside concatenated full name', () => {
      expect(orderMatchesSearch(orders[0], 'ong ng')).toBe(true);
    });

    it('"ngoc hong" → matches reverse full name', () => {
      expect(orderMatchesSearch(orders[0], 'ngoc hong')).toBe(true);
    });

    it('"nguyen van" → matches "Nguyễn Văn An"', () => {
      expect(orderMatchesSearch(orders[3], 'nguyen van')).toBe(true);
    });
  });

  describe('Phone search', () => {
    it('"0901234567" → matches by phone', () => {
      expect(orderMatchesSearch(orders[0], '0901234567')).toBe(true);
    });

    it('"1234" → matches middle of phone number', () => {
      expect(orderMatchesSearch(orders[0], '1234')).toBe(true);
    });

    it('"5028" → matches middle of another phone number', () => {
      expect(orderMatchesSearch(orders[4], '5028')).toBe(true);
    });

    it('"3456" → matches phone "123456"', () => {
      expect(orderMatchesSearch(orders[5], '3456')).toBe(true);
    });
  });

  describe('Order number search', () => {
    it('"ORD-001" → matches order number', () => {
      expect(orderMatchesSearch(orders[0], 'ORD-001')).toBe(true);
    });

    it('"001-AL" → matches middle of order number', () => {
      expect(orderMatchesSearch(orders[0], '001-AL')).toBe(true);
    });

    it('"777" → matches numeric fragment in order number', () => {
      expect(orderMatchesSearch(orders[2], '777')).toBe(true);
    });
  });

  describe('No false positives', () => {
    it('"Minh" → does NOT match "Hồng Ngọc"', () => {
      expect(orderMatchesSearch(orders[0], 'Minh')).toBe(false);
    });

    it('"Tran" → does NOT match "Nguyễn Văn An"', () => {
      expect(orderMatchesSearch(orders[3], 'Tran')).toBe(false);
    });
  });
});

describe('Bug: "Chị Thủy" — contains search should work regardless of accents', () => {
  // Try both plausible storage shapes: split fields, and everything in firstName.
  const split: OrderRecord = {
    orderNumber: 'CHI-001',
    customer: { id: 20, firstName: 'Chị', lastName: 'Thủy', phone: '0900111222' },
  };
  const single: OrderRecord = {
    orderNumber: 'CHI-002',
    customer: { id: 21, firstName: 'Chị Thủy', lastName: null, phone: '0900333444' },
  };

  const cases: Array<[string, boolean]> = [
    ['Chi', true],
    ['chi', true],
    ['Thu', true],
    ['thuy', true],
    ['Thuy', true],
    ['thủy', true],
    ['thúy', true],
    ['Thụy', true],
    ['huy', true],
  ];

  describe('firstName="Chị", lastName="Thủy"', () => {
    for (const [q, expected] of cases) {
      it(`"${q}" → ${expected}`, () => {
        expect(orderMatchesSearch(split, q)).toBe(expected);
      });
    }
  });

  describe('firstName="Chị Thủy", lastName=null', () => {
    for (const [q, expected] of cases) {
      it(`"${q}" → ${expected}`, () => {
        expect(orderMatchesSearch(single, q)).toBe(expected);
      });
    }
  });
});
