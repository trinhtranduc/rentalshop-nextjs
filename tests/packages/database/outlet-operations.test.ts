/**
 * #350 — operations lists and deposit sums are filtered in SQL with the civil-day bounds.
 */
const mockPrisma = {
  order: { findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  outlet: { findMany: jest.fn() },
};
jest.mock('../../../packages/database/src/client', () => ({ prisma: mockPrisma }));

import { getOutletOperations } from '../../../packages/database/src/outlet-operations';

const start = new Date('2026-10-01T17:00:00.000Z');
const end = new Date('2026-10-02T16:59:59.999Z');

function whereOf(fn: jest.Mock, predicate: (w: any) => boolean) {
  const call = fn.mock.calls.find(([args]) => predicate(args.where));
  if (!call) throw new Error('no matching query');
  return call[0].where;
}

describe('getOutletOperations (#350)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.order.aggregate.mockResolvedValue({ _sum: { depositAmount: 0, securityDeposit: 0, lateFee: 0, damageFee: 0 }, _count: { _all: 0 } });
  });

  it('pickups today: RESERVED rentals picked up within today, in scope, not deleted', async () => {
    await getOutletOperations({ outletIds: [1, 3], start, end, includeCash: false });
    const where = whereOf(mockPrisma.order.findMany, (w) => w.status === 'RESERVED' && w.pickupPlanAt?.gte);
    expect(where).toEqual(
      expect.objectContaining({
        orderType: 'RENT',
        deletedAt: null,
        outletId: { in: [1, 3] },
        pickupPlanAt: { gte: start, lte: end },
      })
    );
  });

  it('returns today: PICKUPED rentals due back within today', async () => {
    await getOutletOperations({ outletIds: [1], start, end, includeCash: false });
    const where = whereOf(mockPrisma.order.findMany, (w) => w.status === 'PICKUPED' && w.returnPlanAt?.gte);
    expect(where.returnPlanAt).toEqual({ gte: start, lte: end });
    expect(where.orderType).toBe('RENT');
  });

  it('overdue: PICKUPED rentals due back before today', async () => {
    await getOutletOperations({ outletIds: [1], start, end, includeCash: false });
    const where = whereOf(mockPrisma.order.findMany, (w) => w.status === 'PICKUPED' && w.returnPlanAt?.lt);
    expect(where.returnPlanAt).toEqual({ lt: start });
  });

  it('no-shows: RESERVED rentals whose pickup day has passed', async () => {
    await getOutletOperations({ outletIds: [1], start, end, includeCash: false });
    const where = whereOf(mockPrisma.order.findMany, (w) => w.status === 'RESERVED' && w.pickupPlanAt?.lt);
    expect(where.pickupPlanAt).toEqual({ lt: start });
  });

  it('caps each list at 50 rows', async () => {
    await getOutletOperations({ outletIds: [1], start, end, includeCash: false });
    for (const [args] of mockPrisma.order.findMany.mock.calls) expect(args.take).toBe(50);
  });

  it('computes no money without includeCash', async () => {
    const result = await getOutletOperations({ outletIds: [1], start, end, includeCash: false });
    expect(result.cash).toBeNull();
    expect(mockPrisma.order.aggregate).not.toHaveBeenCalled();
  });

  it('cash: deposits held over PICKUPED rentals and fees on orders returned today', async () => {
    mockPrisma.order.aggregate.mockImplementation(async ({ where }: any) => {
      if (where.returnedAt) return { _sum: { lateFee: 20, damageFee: 30 }, _count: { _all: 2 } };
      if (where.returnPlanAt) return { _sum: { depositAmount: 100, securityDeposit: 50 }, _count: { _all: 1 } };
      return { _sum: { depositAmount: 500, securityDeposit: 200 }, _count: { _all: 4 } };
    });
    const result = await getOutletOperations({ outletIds: [1], start, end, includeCash: true });
    expect(result.cash).toEqual({
      depositsHeld: { depositAmount: 500, securityDeposit: 200, orders: 4 },
      depositsDueToday: { depositAmount: 100, securityDeposit: 50, orders: 1 },
      feesToday: { lateFee: 20, damageFee: 30, orders: 2 },
    });
    const feesWhere = whereOf(mockPrisma.order.aggregate, (w) => !!w.returnedAt);
    expect(feesWhere.returnedAt).toEqual({ gte: start, lte: end });
    expect(feesWhere.status).toEqual({ not: 'CANCELLED' });
  });
});
