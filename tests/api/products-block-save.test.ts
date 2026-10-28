/**
 * #1189 db.products.update / create with a BLOCK option: saved only for a client that sent `pricingSchemaVersion: 2`,
 * the product keeps rentPrice = day-1 price and type FIXED (old apps), `pricingSchemaVersion` never reaches Prisma.
 */
const mockTx: any = {
  productPricingOption: { deleteMany: jest.fn(async () => ({})), createMany: jest.fn(async () => ({})) },
  product: { update: jest.fn(async ({ data }: any) => ({ id: 7, ...data, pricingOptions: [] })) },
};
const mockPrisma: any = {
  ...mockTx,
  $transaction: async (fn: any) => fn(mockTx),
  product: {
    ...mockTx.product,
    create: jest.fn(async ({ data }: any) => ({ id: 8, ...data })),
  },
  category: { findUnique: jest.fn(), findFirst: jest.fn(async () => ({ id: 1, merchantId: 1, isActive: true, name: 'c' })) },
};
jest.mock('../../packages/database/src/client', () => ({ prisma: mockPrisma }));

jest.mock('@rentalshop/utils', () => ({ removeVietnameseDiacritics: (s: string) => s }));

import { simplifiedProducts } from '../../packages/database/src/product';

const block = { type: 'BLOCK', price: 5, blockTiers: [80000, 100000, 120000], blockExtraMode: 'EXTRA_PER_DAY', blockExtraPrice: 20000, isDefault: true };

beforeEach(() => jest.clearAllMocks());

describe('db.products.update with pricingOptions', () => {
  it('pricingSchemaVersion 2 saves the BLOCK option; price = day-1, product rentPrice = day-1, type FIXED', async () => {
    await simplifiedProducts.update(7, { pricingSchemaVersion: 2, pricingOptions: [block] });
    const created = (mockTx.productPricingOption.createMany.mock.calls[0] as any)[0].data;
    expect(created).toEqual([expect.objectContaining({ productId: 7, type: 'BLOCK', price: 80000, blockTiers: [80000, 100000, 120000], blockExtraPrice: 20000 })]);
    const data = (mockTx.product.update.mock.calls[0] as any)[0].data;
    expect(data).toMatchObject({ rentPrice: 80000, pricingType: 'FIXED' });
    expect('pricingSchemaVersion' in data).toBe(false);
  });

  it('without pricingSchemaVersion a BLOCK option in the payload is not saved (old clients cannot edit tables)', async () => {
    await simplifiedProducts.update(7, { pricingOptions: [block, { type: 'FIXED', price: 9 }] });
    const created = (mockTx.productPricingOption.createMany.mock.calls[0] as any)[0].data;
    expect(created.map((o: any) => o.type)).toEqual(['FIXED']);
  });

  it('a FIXED / DAILY save keeps type and rentPrice as before', async () => {
    await simplifiedProducts.update(7, { pricingSchemaVersion: 2, pricingOptions: [{ type: 'DAILY', price: 30000, isDefault: true }] });
    expect((mockTx.product.update.mock.calls[0] as any)[0].data).toMatchObject({ rentPrice: 30000, pricingType: 'DAILY' });
  });
});
