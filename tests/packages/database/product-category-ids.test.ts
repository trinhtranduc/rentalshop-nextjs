/**
 * #1536 database search: `categoryIds` filters by any of the categories and wins over `categoryId`; `categoryId` alone
 * is unchanged. Spec .agent/changes/1536-category-multi-filter (1-4).
 */
const mockPrisma: any = {
  product: { findMany: jest.fn(), count: jest.fn() },
  merchant: { findUnique: jest.fn() },
  category: { findUnique: jest.fn() },
  $queryRaw: jest.fn(),
};
jest.mock('../../../packages/database/src/client', () => ({ prisma: mockPrisma }));
jest.mock('@rentalshop/utils', () => ({
  removeVietnameseDiacritics: (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, ''),
  foldSearchText: (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(),
}));

import { simplifiedProducts } from '../../../packages/database/src/product';

const whereOfList = () => mockPrisma.product.findMany.mock.calls[0][0].where;
const whereOfCount = () => mockPrisma.product.count.mock.calls[0][0].where;

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.product.findMany.mockResolvedValue([]);
  mockPrisma.product.count.mockResolvedValue(0);
  mockPrisma.merchant.findUnique.mockResolvedValue({ id: 2 });
  mockPrisma.category.findUnique.mockImplementation(async ({ where }: any) => ({ id: where.id }));
});

describe('searchProducts — categoryIds (#1536)', () => {
  it('categoryIds [3, 7]: products of category 3 or 7, list and count alike', async () => {
    await simplifiedProducts.search({ merchantId: 2, categoryIds: [3, 7] });
    expect(whereOfList()).toMatchObject({ merchantId: 2, categoryId: { in: [3, 7] } });
    expect(whereOfCount().categoryId).toEqual({ in: [3, 7] });
  });

  it('categoryIds wins over categoryId', async () => {
    await simplifiedProducts.search({ merchantId: 2, categoryId: 5, categoryIds: [3, 7] });
    expect(whereOfList().categoryId).toEqual({ in: [3, 7] });
  });

  it('an empty categoryIds is no filter; categoryId alone is as before', async () => {
    await simplifiedProducts.search({ merchantId: 2, categoryIds: [] });
    expect(whereOfList().categoryId).toBeUndefined();
    jest.clearAllMocks();
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);
    mockPrisma.merchant.findUnique.mockResolvedValue({ id: 2 });
    mockPrisma.category.findUnique.mockImplementation(async ({ where }: any) => ({ id: where.id }));
    await simplifiedProducts.search({ merchantId: 2, categoryId: 5 });
    expect(whereOfList().categoryId).toBe(5);
  });
});
