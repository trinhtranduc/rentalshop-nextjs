/**
 * #782 gap 3: buying the loyalty add-on really runs the program. `merchantAddons.add` provisions the program and sets
 * `LoyaltyProgram.isActive = true` in the same transaction, so admin needs no second switch. Other rows do not touch it.
 */
const tx = {
  planLimitAddon: { create: jest.fn() },
  payment: { create: jest.fn() },
  merchantModule: { updateMany: jest.fn() },
  loyaltyProgram: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  loyaltyTier: { findFirst: jest.fn(), create: jest.fn() },
};
const mockPrisma = { $transaction: jest.fn(async (fn: any) => fn(tx)) };
jest.mock('../../../packages/database/src/client', () => ({ prisma: mockPrisma }));
jest.mock('@rentalshop/utils', () => jest.requireActual('../../../packages/utils/src/core/addon-pricing'));

import { simplifiedMerchantAddons } from '../../../packages/database/src/addon-price';

const quote = { periodDays: 30, remainingDays: 15, monthlyAmount: 49000, cyclePrice: 49000, discountedMonthlyPrice: 49000, amountDue: 24500, reason: 'prorated' as const, currency: 'VND' as const };
const loyaltyRow = { id: 6, name: 'Khách thân thiết', limitKind: 'feature', featureKey: 'loyalty', packSize: 1, monthlyPrice: 49000 };

beforeEach(() => {
  jest.clearAllMocks();
  tx.planLimitAddon.create.mockImplementation(async ({ data }: any) => ({ id: 60, ...data }));
  tx.payment.create.mockImplementation(async ({ data }: any) => ({ id: 1, ...data }));
  tx.loyaltyProgram.findUnique.mockResolvedValue(null);
  tx.loyaltyProgram.create.mockImplementation(async ({ data }: any) => ({ id: 9, ...data }));
  tx.loyaltyProgram.update.mockImplementation(async ({ data }: any) => ({ id: 9, ...data }));
  tx.loyaltyTier.findFirst.mockResolvedValue(null);
  tx.loyaltyTier.create.mockResolvedValue({ id: 1 });
});

describe('merchantAddons.add activates loyalty (#782)', () => {
  it('a shop with no program: the program and base tier are created, then it runs', async () => {
    await simplifiedMerchantAddons.add({ merchantId: 7, subscriptionId: 70, addonPrice: loyaltyRow, packs: 1, quote });
    expect(tx.loyaltyProgram.create).toHaveBeenCalledTimes(1);
    expect(tx.loyaltyTier.create).toHaveBeenCalledTimes(1);
    expect(tx.loyaltyProgram.update).toHaveBeenCalledWith({ where: { merchantId: 7 }, data: { isActive: true } });
  });

  it('a shop with an inactive program keeps its settings and starts running', async () => {
    tx.loyaltyProgram.findUnique.mockResolvedValue({ id: 9, merchantId: 7, isActive: false });
    tx.loyaltyTier.findFirst.mockResolvedValue({ id: 2 });
    await simplifiedMerchantAddons.add({ merchantId: 7, subscriptionId: 70, addonPrice: loyaltyRow, packs: 1, quote });
    expect(tx.loyaltyProgram.create).not.toHaveBeenCalled();
    expect(tx.loyaltyTier.create).not.toHaveBeenCalled();
    expect(tx.loyaltyProgram.update).toHaveBeenCalledWith({ where: { merchantId: 7 }, data: { isActive: true } });
  });

  it('a trial purchase (0 now) activates too, with no payment', async () => {
    await simplifiedMerchantAddons.add({ merchantId: 7, subscriptionId: 70, addonPrice: loyaltyRow, packs: 1, quote: { ...quote, amountDue: 0, reason: 'trial' } });
    expect(tx.loyaltyProgram.update).toHaveBeenCalledTimes(1);
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('activation runs inside the purchase transaction, so a failure leaves nothing behind', async () => {
    tx.loyaltyProgram.update.mockRejectedValue(new Error('boom'));
    await expect(simplifiedMerchantAddons.add({ merchantId: 7, subscriptionId: 70, addonPrice: loyaltyRow, packs: 1, quote })).rejects.toThrow('boom');
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('an attendance row does not touch the loyalty program', async () => {
    await simplifiedMerchantAddons.add({ merchantId: 7, subscriptionId: 70, addonPrice: { ...loyaltyRow, id: 5, name: 'Chấm công', featureKey: 'attendance' }, packs: 1, quote });
    expect(tx.loyaltyProgram.findUnique).not.toHaveBeenCalled();
    expect(tx.loyaltyProgram.update).not.toHaveBeenCalled();
  });

  it('a limit row does not touch the loyalty program', async () => {
    await simplifiedMerchantAddons.add({ merchantId: 7, subscriptionId: 70, addonPrice: { id: 3, name: 'Thêm sản phẩm', limitKind: 'products', packSize: 1, monthlyPrice: 500 }, packs: 100, quote });
    expect(tx.planLimitAddon.create.mock.calls[0][0].data).toMatchObject({ products: 100, packs: 100, packSize: 1, unitPrice: 500 });
    expect(tx.loyaltyProgram.update).not.toHaveBeenCalled();
  });
});

describe('payment and note wording of a typed amount (#782)', () => {
  const unitRow = { id: 3, name: 'Thêm sản phẩm', limitKind: 'products', packSize: 1, monthlyPrice: 500 };

  it('a unit row says +100 sản phẩm, not "× 100"', async () => {
    await simplifiedMerchantAddons.add({ merchantId: 7, subscriptionId: 70, addonPrice: unitRow, packs: 100, quote });
    expect(tx.planLimitAddon.create.mock.calls[0][0].data.notes).toBe('Thêm sản phẩm +100');
    const description = tx.payment.create.mock.calls[0][0].data.description;
    expect(description).toContain('Thêm sản phẩm +100');
    expect(description).not.toContain('×');
  });

  it('an older pack row keeps "× packs"', async () => {
    await simplifiedMerchantAddons.add({ merchantId: 7, subscriptionId: 70, addonPrice: { ...unitRow, name: 'Gói SP', packSize: 100 }, packs: 2, quote });
    expect(tx.planLimitAddon.create.mock.calls[0][0].data.notes).toBe('Gói SP × 2');
    expect(tx.payment.create.mock.calls[0][0].data.description).toContain('Gói SP × 2 (+200 products)');
  });
});
