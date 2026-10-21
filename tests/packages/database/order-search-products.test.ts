/**
 * Order search matches the order number, the customer phone, and the customer name.
 * It does not match the names of items on the order.
 */
const mockPrisma = { $queryRaw: jest.fn() };
jest.mock('../../../packages/database/src/client', () => ({ prisma: mockPrisma }));
jest.mock('@rentalshop/utils', () => ({
  removeVietnameseDiacritics: (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D'),
  normalizeStartDate: (d: any) => d,
  normalizeEndDate: (d: any) => d,
  formatFullName: (a: string, b: string) => [a, b].filter(Boolean).join(' '),
  parseProductImages: () => [],
}));

import { buildOrderSearchConditions } from '../../../packages/database/src/order';

const sqlText = (call: any[]) => (call[0] as any).strings?.join(' ') ?? (Array.isArray(call[0]) ? call[0].join(' ') : String(call[0]));

describe('order search fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$queryRaw.mockImplementation(async () => []);
  });

  it('does not match item or product names', async () => {
    const conditions = await buildOrderSearchConditions('áo dài', 2);
    expect(conditions.some((condition) => JSON.stringify(condition).includes('orderItems'))).toBe(false);
    expect(conditions.some((condition) => JSON.stringify(condition).includes('productName'))).toBe(false);
    const productQuery = mockPrisma.$queryRaw.mock.calls.find((call: any[]) => sqlText(call).includes('"Product"'));
    expect(productQuery).toBeUndefined();
  });

  it('keeps order number, phone and customer matches', async () => {
    const conditions = await buildOrderSearchConditions('ORD-001-0057', 2);
    expect(conditions).toContainEqual({ orderNumber: { contains: 'ORD-001-0057', mode: 'insensitive' } });
    expect(conditions).toContainEqual({ customer: { phone: { contains: 'ORD-001-0057', mode: 'insensitive' } } });
  });
});
