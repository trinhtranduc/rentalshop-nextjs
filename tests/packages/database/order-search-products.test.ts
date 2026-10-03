/**
 * #362 — order search also finds orders by the names of their items (accent-insensitive, merchant-scoped).
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

describe('order search by product name (#362)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$queryRaw.mockImplementation(async (...args: any[]) =>
      sqlText(args).includes('"Product"') ? [{ id: 31 }, { id: 32 }] : []
    );
  });

  it('matches products of the merchant by name and item snapshots by name', async () => {
    const conditions = await buildOrderSearchConditions('áo dài', 2);
    expect(conditions).toContainEqual({ orderItems: { some: { productId: { in: [31, 32] } } } });
    expect(conditions).toContainEqual({ orderItems: { some: { productName: { contains: 'áo dài', mode: 'insensitive' } } } });
    const productQuery = mockPrisma.$queryRaw.mock.calls.find((call: any[]) => sqlText(call).includes('"Product"'))!;
    // The merchant filter is a nested SQL fragment among the values
    const merchantFragment = productQuery.slice(1).find((value: any) => value && Array.isArray(value.strings));
    expect(merchantFragment.strings.join(' ')).toContain('"merchantId"');
    expect(merchantFragment.values).toContain(2);
  });

  it('keeps order number, phone and customer matches', async () => {
    const conditions = await buildOrderSearchConditions('ORD-001-0057', 2);
    expect(conditions).toContainEqual({ orderNumber: { contains: 'ORD-001-0057', mode: 'insensitive' } });
    expect(conditions).toContainEqual({ customer: { phone: { contains: 'ORD-001-0057', mode: 'insensitive' } } });
  });
});
