/**
 * #824: a new outlet gets an OutletStock row (stock 0 / available 0 / renting 0) for every non-deleted product of the
 * merchant, in the same transaction as the outlet itself.
 */
const mockTx: any = {
  outlet: { create: jest.fn() },
  product: { findMany: jest.fn() },
  outletStock: { createMany: jest.fn() },
};
const mockPrisma: any = {
  merchant: { findUnique: jest.fn() },
  outlet: { create: jest.fn() },
  $transaction: jest.fn((fn: any) => fn(mockTx)),
};
jest.mock('../../packages/database/src/client', () => ({ prisma: mockPrisma }));
jest.mock('@rentalshop/utils', () => ({ removeVietnameseDiacritics: (s: string) => s }));

import { simplifiedOutlets } from '../../packages/database/src/outlet';

describe('db.outlets.create (#824)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.merchant.findUnique.mockResolvedValue({ id: 2 });
    mockTx.outlet.create.mockResolvedValue({ id: 9, merchantId: 2, name: 'Chi nhánh 2' });
    mockTx.product.findMany.mockResolvedValue([{ id: 11 }, { id: 12 }]);
    mockTx.outletStock.createMany.mockResolvedValue({ count: 2 });
  });

  it('creates the outlet and 0-stock rows inside one transaction', async () => {
    const created = await simplifiedOutlets.create({ merchant: { connect: { id: 2 } }, name: 'Chi nhánh 2' });
    expect(created).toMatchObject({ id: 9, merchantId: 2 });
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.outlet.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.outlet.create).not.toHaveBeenCalled();
    expect(mockTx.outletStock.createMany).toHaveBeenCalledWith({
      data: [
        // #1341: the new branch lists nothing until the owner ticks the products it sells
        { productId: 11, outletId: 9, stock: 0, available: 0, renting: 0, isListed: false },
        { productId: 12, outletId: 9, stock: 0, available: 0, renting: 0, isListed: false },
      ],
      skipDuplicates: true,
    });
  });

  it('only products of the same merchant that are not soft-deleted', async () => {
    await simplifiedOutlets.create({ merchantId: 2, name: 'Chi nhánh 2' });
    expect(mockTx.product.findMany).toHaveBeenCalledWith({
      where: { merchantId: 2, deletedAt: null },
      select: { id: true },
    });
  });

  it('a merchant without products: no stock insert', async () => {
    mockTx.product.findMany.mockResolvedValue([]);
    await simplifiedOutlets.create({ merchantId: 2, name: 'Chi nhánh 2' });
    expect(mockTx.outletStock.createMany).not.toHaveBeenCalled();
  });
});
