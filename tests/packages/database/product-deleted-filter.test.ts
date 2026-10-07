/**
 * #389 — soft-deleted products (`deletedAt` set) disappear from product lists, search, barcode / image lookups and
 * detail, like a hard-deleted product did before. Orders keep their items (the product row still exists).
 */
const mockPrisma: any = {
  product: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
  merchant: { findUnique: jest.fn() },
  $queryRaw: jest.fn(),
};
jest.mock('../../../packages/database/src/client', () => ({ prisma: mockPrisma }));
jest.mock('@rentalshop/utils', () => ({
  removeVietnameseDiacritics: (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D'),
}));

import { simplifiedProducts } from '../../../packages/database/src/product';

const sqlText = (call: any[]) => (call[0] as any).strings?.join(' ') ?? (Array.isArray(call[0]) ? call[0].join(' ') : String(call[0]));

describe('deleted products are hidden (#389)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);
    mockPrisma.merchant.findUnique.mockResolvedValue({ id: 2 });
    mockPrisma.$queryRaw.mockResolvedValue([{ id: 7 }]);
  });

  it('list (default active products)', async () => {
    await simplifiedProducts.search({ merchantId: 2 });
    expect(mockPrisma.product.findMany.mock.calls[0][0].where).toMatchObject({ merchantId: 2, isActive: true, deletedAt: null });
    expect(mockPrisma.product.count.mock.calls[0][0].where.deletedAt).toBeNull();
  });

  it('list of inactive products still hides deleted ones', async () => {
    await simplifiedProducts.search({ merchantId: 2, isActive: false });
    expect(mockPrisma.product.findMany.mock.calls[0][0].where).toMatchObject({ isActive: false, deletedAt: null });
  });

  it('text search: the raw name match skips deleted rows too', async () => {
    await simplifiedProducts.search({ merchantId: 2, search: 'vest' });
    expect(sqlText(mockPrisma.$queryRaw.mock.calls[0])).toContain('"deletedAt" IS NULL');
    expect(mockPrisma.product.findMany.mock.calls[0][0].where.deletedAt).toBeNull();
  });

  it('detail by id', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null);
    expect(await simplifiedProducts.findById(7)).toBeNull();
    expect(mockPrisma.product.findFirst.mock.calls[0][0].where).toEqual({ id: 7, deletedAt: null });
  });

  it('barcode lookup', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null);
    await simplifiedProducts.findByBarcode('123');
    expect(mockPrisma.product.findFirst.mock.calls[0][0].where).toEqual({ barcode: '123', deletedAt: null });
  });

  it('batch lookup by ids (image search)', async () => {
    await simplifiedProducts.findByIds([7, 8]);
    expect(mockPrisma.product.findMany.mock.calls[0][0].where).toEqual({ id: { in: [7, 8] }, deletedAt: null });
  });
});
