/**
 * #967 the one loyalty check: `getActiveMerchantModuleKeys` (database) reads the legacy module rows, the un-ended
 * feature add-ons and the plan features; `merchantHasLoyaltyFeature` / `assertLoyaltyFeature` (loyalty package, used
 * by the order routes and every /api/loyalty route) ask it for 'loyalty'.
 * Cases: plan only / add-on only / both / neither / add-on ended.
 */
const mockPrisma = {
  merchantModule: { findMany: jest.fn() },
  planLimitAddon: { findMany: jest.fn() },
  merchant: { findUnique: jest.fn() },
};
jest.mock('../../../packages/database/src/client', () => ({ prisma: mockPrisma }));
jest.mock('@rentalshop/database', () => {
  const mm = jest.requireActual('../../../packages/database/src/merchant-module');
  return { prisma: mockPrisma, getActiveMerchantModuleKeys: mm.getActiveMerchantModuleKeys, merchantModules: mm.merchantModules };
});

import { getActiveMerchantModuleKeys, getMerchantModuleSources } from '../../../packages/database/src/merchant-module';
import { assertLoyaltyFeature, LoyaltyPlanGateError, merchantHasLoyaltyFeature } from '../../../packages/loyalty/src/plan-gate';

const now = new Date('2026-10-24T03:00:00Z');
const PLAN_WITH = JSON.stringify(['loyalty']);
const PLAN_WITHOUT = JSON.stringify(['Quản lý đơn']);
const shopOn = (features: string, legacyPlan = false) =>
  legacyPlan ? { subscription: null, Plan: { features } } : { subscription: { plan: { features } }, Plan: null };
const addon = (endsAt: Date | null = null) => ({ featureKey: 'loyalty', isActive: true, endsAt });

/** The add-on query filters ended items in SQL; the mock does the same so "ended" behaves like the database. */
function given(plan: any, addons: any[]) {
  mockPrisma.merchant.findUnique.mockResolvedValue(plan);
  mockPrisma.merchantModule.findMany.mockResolvedValue([]);
  mockPrisma.planLimitAddon.findMany.mockImplementation(async ({ where }: any) => {
    const at: Date = where.OR[1].endsAt.gt;
    return addons.filter((a) => a.isActive && (a.endsAt == null || a.endsAt.getTime() > at.getTime()));
  });
}

beforeEach(() => jest.clearAllMocks());

describe('loyalty gate = plan OR un-ended add-on (#967)', () => {
  it('plan only → on, with no add-on', async () => {
    given(shopOn(PLAN_WITH), []);
    expect(await getActiveMerchantModuleKeys(7, now)).toEqual(['loyalty']);
    expect(await merchantHasLoyaltyFeature(7)).toBe(true);
    await expect(assertLoyaltyFeature(7)).resolves.toBeUndefined();
  });

  it('legacy merchant.Plan (no subscription) with loyalty → on, as before', async () => {
    given(shopOn(PLAN_WITH, true), []);
    expect(await merchantHasLoyaltyFeature(7)).toBe(true);
  });

  it('add-on only → on', async () => {
    given(shopOn(PLAN_WITHOUT), [addon()]);
    expect(await getActiveMerchantModuleKeys(7, now)).toEqual(['loyalty']);
    expect(await merchantHasLoyaltyFeature(7)).toBe(true);
  });

  it('both → on', async () => {
    given(shopOn(PLAN_WITH), [addon()]);
    expect(await merchantHasLoyaltyFeature(7)).toBe(true);
  });

  it('neither → off; assert throws PLAN_UPGRADE_REQUIRED (unchanged 403 code)', async () => {
    given(shopOn(PLAN_WITHOUT), []);
    expect(await merchantHasLoyaltyFeature(7)).toBe(false);
    await expect(assertLoyaltyFeature(7)).rejects.toBeInstanceOf(LoyaltyPlanGateError);
    await expect(assertLoyaltyFeature(7)).rejects.toThrow('PLAN_UPGRADE_REQUIRED');
  });

  it('add-on ended (turned off, period over) → off', async () => {
    given(shopOn(PLAN_WITHOUT), [addon(new Date(Date.now() - 1000))]);
    expect(await merchantHasLoyaltyFeature(7)).toBe(false);
  });

  it('a merchant that does not exist → off', async () => {
    given(null, []);
    expect(await merchantHasLoyaltyFeature(7)).toBe(false);
  });

  it('the plan is read from subscription.plan or merchant.Plan, features only', async () => {
    given(shopOn(PLAN_WITH), []);
    await getActiveMerchantModuleKeys(7, now);
    const arg = mockPrisma.merchant.findUnique.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 7 });
    expect(arg.select).toEqual({ subscription: { select: { plan: { select: { features: true } } } }, Plan: { select: { features: true } } });
  });
});

describe('getMerchantModuleSources (#967 admin label)', () => {
  it('says plan / add-on per module', async () => {
    given(shopOn(PLAN_WITHOUT), [addon()]);
    expect(await getMerchantModuleSources(7, now)).toEqual([
      { key: 'attendance', active: false, plan: false, addon: false, legacy: false },
      { key: 'loyalty', active: true, plan: false, addon: true, legacy: false },
    ]);
  });
});
