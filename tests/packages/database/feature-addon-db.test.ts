/**
 * #943 database side of the feature add-on:
 * - buying one writes an item with no limit columns and the featureKey, a payment when charged, and switches off a
 *   legacy MerchantModule row of the same key (row kept) so the add-on is the only source from then on;
 * - the active module keys (login / profile `merchant.modules`, MODULE_NOT_ENABLED gate) = legacy rows OR un-ended
 *   feature add-ons.
 */
const tx = {
  planLimitAddon: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  payment: { create: jest.fn() },
  merchantModule: { updateMany: jest.fn() },
};
const mockPrisma = {
  $transaction: jest.fn(async (fn: any) => fn(tx)),
  merchantModule: { findMany: jest.fn() },
  planLimitAddon: { findMany: jest.fn(), findFirst: jest.fn() },
};
jest.mock('../../../packages/database/src/client', () => ({ prisma: mockPrisma }));
jest.mock('@rentalshop/utils', () => jest.requireActual('../../../packages/utils/src/core/addon-pricing'));

import { simplifiedMerchantAddons } from '../../../packages/database/src/addon-price';
import { getActiveMerchantModuleKeys } from '../../../packages/database/src/merchant-module';

const quote = { periodDays: 30, remainingDays: 18, monthlyAmount: 99000, cyclePrice: 99000, discountedMonthlyPrice: 99000, amountDue: 59400, reason: 'prorated' as const, currency: 'VND' as const };
const row = { id: 5, name: 'Chấm công', limitKind: 'feature', featureKey: 'attendance', packSize: 1, monthlyPrice: 99000 };

beforeEach(() => {
  jest.clearAllMocks();
  tx.planLimitAddon.create.mockImplementation(async ({ data }: any) => ({ id: 50, ...data }));
  tx.payment.create.mockImplementation(async ({ data }: any) => ({ id: 1, ...data }));
});

describe('merchantAddons.add for a feature (#943)', () => {
  it('writes the feature item (no limit columns, packs 1), the 59.400 payment, and switches the legacy row off', async () => {
    await simplifiedMerchantAddons.add({ merchantId: 7, subscriptionId: 70, addonPrice: row, packs: 1, quote, method: 'CASH', transactionId: 'T1' });
    const data = tx.planLimitAddon.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      merchantId: 7, addonPriceId: 5, featureKey: 'attendance', limitKind: 'feature', packSize: 1, packs: 1, unitPrice: 99000,
      outlets: 0, users: 0, products: 0, customers: 0, orders: 0,
    });
    expect(data).not.toHaveProperty('feature');
    const pay = tx.payment.create.mock.calls[0][0].data;
    expect(pay).toMatchObject({ merchantId: 7, subscriptionId: 70, amount: 59400, method: 'CASH', type: 'PLAN_CHANGE', status: 'PENDING', transactionId: 'T1' });
    expect(pay.description).toContain('Chấm công');
    expect(tx.merchantModule.updateMany).toHaveBeenCalledWith({ where: { merchantId: 7, key: 'attendance', enabled: true }, data: { enabled: false } });
  });

  it('a trial purchase (0) writes no payment', async () => {
    await simplifiedMerchantAddons.add({ merchantId: 7, subscriptionId: 70, addonPrice: row, packs: 1, quote: { ...quote, amountDue: 0, reason: 'trial' } });
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.merchantModule.updateMany).toHaveBeenCalled();
  });

  it('a limit add-on does not touch the module rows and has no featureKey', async () => {
    await simplifiedMerchantAddons.add({
      merchantId: 7, subscriptionId: 70, addonPrice: { id: 2, name: 'Thêm nhân viên', limitKind: 'users', packSize: 2, monthlyPrice: 40000 }, packs: 1, quote,
    });
    expect(tx.planLimitAddon.create.mock.calls[0][0].data).toMatchObject({ users: 2, featureKey: null });
    expect(tx.merchantModule.updateMany).not.toHaveBeenCalled();
  });

  it('findActiveFeature looks for an un-ended item of that key', async () => {
    mockPrisma.planLimitAddon.findFirst.mockResolvedValue(null);
    await simplifiedMerchantAddons.findActiveFeature(7, 'attendance');
    const where = mockPrisma.planLimitAddon.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ merchantId: 7, featureKey: 'attendance', isActive: true });
    expect(where.OR).toEqual([{ endsAt: null }, { endsAt: { gt: expect.any(Date) } }]);
  });
});

describe('getActiveMerchantModuleKeys (#943)', () => {
  const now = new Date('2026-10-24T03:00:00Z');

  it('legacy row only → on (old rows keep working)', async () => {
    mockPrisma.merchantModule.findMany.mockResolvedValue([{ key: 'attendance', enabled: true, endsAt: null }]);
    mockPrisma.planLimitAddon.findMany.mockResolvedValue([]);
    expect(await getActiveMerchantModuleKeys(7, now)).toEqual(['attendance']);
  });

  it('feature add-on only → on; the query asks for un-ended feature items of the shop', async () => {
    mockPrisma.merchantModule.findMany.mockResolvedValue([]);
    mockPrisma.planLimitAddon.findMany.mockResolvedValue([{ featureKey: 'attendance', isActive: true, endsAt: new Date('2026-11-10T17:00:00Z') }]);
    expect(await getActiveMerchantModuleKeys(7, now)).toEqual(['attendance']);
    const where = mockPrisma.planLimitAddon.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ merchantId: 7, featureKey: { not: null }, isActive: true });
  });

  it('neither → off', async () => {
    mockPrisma.merchantModule.findMany.mockResolvedValue([{ key: 'attendance', enabled: false, endsAt: null }]);
    mockPrisma.planLimitAddon.findMany.mockResolvedValue([]);
    expect(await getActiveMerchantModuleKeys(7, now)).toEqual([]);
  });
});
