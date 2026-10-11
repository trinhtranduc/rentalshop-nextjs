/**
 * #824 (owner, #823 question 7): a plan whose limits.outlets is missing or 0 allows 1 outlet; -1 stays unlimited.
 * Only outlets change: the other entities keep "missing = unlimited".
 */
const mockPrisma: any = { merchant: { findUnique: jest.fn() }, plan: { findUnique: jest.fn() } };
const mockDb: any = { planLimitAddons: { calculateTotal: jest.fn() } };
jest.mock('@rentalshop/database', () => ({ prisma: mockPrisma, db: mockDb }));
jest.mock('../../packages/utils/src/core/validation/entity-counts', () => ({
  getCurrentEntityCounts: jest.fn(async () => ({ outlets: 1, users: 1, products: 1, customers: 1, orders: 1 })),
}));
jest.mock('../../packages/utils/src/core/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { getPlanLimitsInfo, validatePlanLimits } from '../../packages/utils/src/core/validation/plan-limits';

const withLimits = (limits: any, addon: any = {}) => {
  mockPrisma.merchant.findUnique.mockResolvedValue({
    id: 2,
    subscription: { id: 1, planId: 1, status: 'active', plan: { id: 1, name: 'Basic', limits, features: [] } },
  });
  mockDb.planLimitAddons.calculateTotal.mockResolvedValue({ outlets: 0, users: 0, products: 0, customers: 0, orders: 0, ...addon });
};

describe('outlets plan limit default (#824)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('limits.outlets missing → 1 outlet; a second one is refused', async () => {
    withLimits({ users: 5 });
    const info = await getPlanLimitsInfo(2);
    expect(info.planLimits.outlets).toBe(1);
    expect(info.isUnlimited.outlets).toBe(false);
    const v = await validatePlanLimits(2, 'outlets');
    expect(v.isValid).toBe(false);
    expect(v.error).toBe('PLAN_LIMIT_EXCEEDED');
  });

  it('limits.outlets 0 → 1 outlet', async () => {
    withLimits({ outlets: 0 });
    expect((await getPlanLimitsInfo(2)).planLimits.outlets).toBe(1);
  });

  it('limits.outlets as a JSON string without outlets → 1 outlet', async () => {
    withLimits(JSON.stringify({ products: 10 }));
    expect((await getPlanLimitsInfo(2)).planLimits.outlets).toBe(1);
  });

  it('-1 stays unlimited', async () => {
    withLimits({ outlets: -1 });
    const info = await getPlanLimitsInfo(2);
    expect(info.planLimits.outlets).toBe(-1);
    expect((await validatePlanLimits(2, 'outlets')).isValid).toBe(true);
  });

  it('an add-on adds to the default 1', async () => {
    withLimits({}, { outlets: 2 });
    expect((await getPlanLimitsInfo(2)).planLimits.outlets).toBe(3);
  });

  it('a set limit is kept', async () => {
    withLimits({ outlets: 3 });
    expect((await getPlanLimitsInfo(2)).planLimits.outlets).toBe(3);
  });

  it('other entities keep missing = unlimited', async () => {
    withLimits({});
    const info = await getPlanLimitsInfo(2);
    expect(info.planLimits.users).toBe(-1);
    expect(info.planLimits.products).toBe(-1);
    expect(info.planLimits.customers).toBe(-1);
    expect(info.planLimits.orders).toBe(-1);
  });
});
