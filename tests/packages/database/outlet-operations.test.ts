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
const soonEnd = new Date('2026-10-05T16:59:59.999Z');

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
    await getOutletOperations({ outletIds: [1, 3], start, end, soonEnd, includeCash: false });
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
    await getOutletOperations({ outletIds: [1], start, end, soonEnd, includeCash: false });
    const where = whereOf(mockPrisma.order.findMany, (w) => w.status === 'PICKUPED' && w.returnPlanAt?.gte);
    expect(where.returnPlanAt).toEqual({ gte: start, lte: end });
    expect(where.orderType).toBe('RENT');
  });

  it('overdue: PICKUPED rentals due back before today', async () => {
    await getOutletOperations({ outletIds: [1], start, end, soonEnd, includeCash: false });
    const where = whereOf(mockPrisma.order.findMany, (w) => w.status === 'PICKUPED' && w.returnPlanAt?.lt);
    expect(where.returnPlanAt).toEqual({ lt: start });
  });

  it('no-shows: RESERVED rentals whose pickup day has passed', async () => {
    await getOutletOperations({ outletIds: [1], start, end, soonEnd, includeCash: false });
    const where = whereOf(mockPrisma.order.findMany, (w) => w.status === 'RESERVED' && w.pickupPlanAt?.lt);
    expect(where.pickupPlanAt).toEqual({ lt: start });
  });

  it('returns soon: PICKUPED rentals due back after today, within the next 3 days', async () => {
    await getOutletOperations({ outletIds: [1], start, end, soonEnd, includeCash: false });
    const where = whereOf(mockPrisma.order.findMany, (w) => w.status === 'PICKUPED' && w.returnPlanAt?.gt);
    expect(where.returnPlanAt).toEqual({ gt: end, lte: soonEnd });
  });

  it('caps each list at 50 rows', async () => {
    await getOutletOperations({ outletIds: [1], start, end, soonEnd, includeCash: false });
    for (const [args] of mockPrisma.order.findMany.mock.calls) expect(args.take).toBe(50);
  });

  it('computes no money without includeCash', async () => {
    const result = await getOutletOperations({ outletIds: [1], start, end, soonEnd, includeCash: false });
    expect(result.cash).toBeNull();
    expect(mockPrisma.order.aggregate).not.toHaveBeenCalled();
  });

  it('cash: deposits held over PICKUPED rentals and fees on orders returned today', async () => {
    mockPrisma.order.aggregate.mockImplementation(async ({ where }: any) => {
      if (where.returnedAt) return { _sum: { lateFee: 20, damageFee: 30 }, _count: { _all: 2 } };
      if (where.returnPlanAt) return { _sum: { depositAmount: 100, securityDeposit: 50 }, _count: { _all: 1 } };
      if (where.securityDeposit && where.status === 'RESERVED') return { _sum: { securityDeposit: 700 }, _count: { _all: 3 } };
      if (where.securityDeposit) return { _sum: { securityDeposit: 150 }, _count: { _all: 2 } };
      return { _sum: { depositAmount: 500, securityDeposit: 200 }, _count: { _all: 4 } };
    });
    const result = await getOutletOperations({ outletIds: [1], start, end, soonEnd, includeCash: true });
    expect(result.cash).toEqual({
      depositsHeld: { depositAmount: 500, securityDeposit: 200, orders: 4 },
      depositsDueToday: { depositAmount: 100, securityDeposit: 50, orders: 1 },
      feesToday: { lateFee: 20, damageFee: 30, orders: 2 },
      // #494: added next to the old fields, which keep their values
      collateralToCollect: { securityDeposit: 700, orders: 3 },
      collateralToReturn: { securityDeposit: 150, orders: 2 },
    });
    const feesWhere = whereOf(mockPrisma.order.aggregate, (w) => !!w.returnedAt);
    expect(feesWhere.returnedAt).toEqual({ gte: start, lte: end });
    expect(feesWhere.status).toEqual({ not: 'CANCELLED' });
  });

  it('done today: rentals handed over or taken back within today, cancelled excluded', async () => {
    mockPrisma.order.count.mockImplementation(async ({ where }: any) => (where.pickedUpAt ? 2 : where.returnedAt ? 1 : 0));
    const result = await getOutletOperations({ outletIds: [1], start, end, soonEnd, includeCash: false });
    expect(result.doneToday).toEqual({ pickups: 2, returns: 1 });
    const picked = mockPrisma.order.count.mock.calls.find(([a]) => a.where.pickedUpAt)[0].where;
    expect(picked).toEqual(
      expect.objectContaining({ orderType: 'RENT', outletId: { in: [1] }, deletedAt: null, status: { not: 'CANCELLED' }, pickedUpAt: { gte: start, lte: end } })
    );
    const returned = mockPrisma.order.count.mock.calls.find(([a]) => a.where.returnedAt)[0].where;
    expect(returned.returnedAt).toEqual({ gte: start, lte: end });
  });

  it('new orders by day: one count per civil day, all order types, in scope', async () => {
    const days = [
      { dateKey: '2026-10-01', start: new Date('2026-09-30T17:00:00.000Z'), end: new Date('2026-10-01T16:59:59.999Z') },
      { dateKey: '2026-10-02', start, end },
    ];
    mockPrisma.order.count.mockImplementation(async ({ where }: any) =>
      where.createdAt ? (where.createdAt.gte.getTime() === start.getTime() ? 4 : 2) : 0
    );
    const result = await getOutletOperations({ outletIds: [1, 3], start, end, soonEnd, includeCash: false, trendDays: days });
    expect(result.newOrdersByDay).toEqual([
      { date: '2026-10-01', count: 2 },
      { date: '2026-10-02', count: 4 },
    ]);
    const created = mockPrisma.order.count.mock.calls.filter(([a]) => a.where.createdAt).map(([a]) => a.where);
    expect(created).toHaveLength(2);
    expect(created[0]).toEqual({ outletId: { in: [1, 3] }, deletedAt: null, createdAt: { gte: days[0].start, lte: days[0].end } });
  });

  it('new orders by day is empty without trend days', async () => {
    const result = await getOutletOperations({ outletIds: [1], start, end, soonEnd, includeCash: false });
    expect(result.newOrdersByDay).toEqual([]);
  });

  it('tomorrow: hand-overs (RESERVED) and returns (PICKUPED) planned within tomorrow', async () => {
    const tomorrowStart = new Date('2026-10-02T17:00:00.000Z');
    const tomorrowEnd = new Date('2026-10-03T16:59:59.999Z');
    mockPrisma.order.count.mockImplementation(async ({ where }: any) => {
      if (where.pickupPlanAt?.gte?.getTime?.() === tomorrowStart.getTime()) return 3;
      if (where.returnPlanAt?.gte?.getTime?.() === tomorrowStart.getTime()) return 2;
      return 0;
    });
    const result = await getOutletOperations({ outletIds: [1], start, end, soonEnd, includeCash: false, tomorrowStart, tomorrowEnd });
    expect(result.tomorrow).toEqual({ pickups: 3, returns: 2 });
    const pick = mockPrisma.order.count.mock.calls.find(([a]) => a.where.pickupPlanAt?.gte?.getTime?.() === tomorrowStart.getTime())[0].where;
    expect(pick).toEqual(expect.objectContaining({ orderType: 'RENT', status: 'RESERVED', outletId: { in: [1] }, deletedAt: null }));
    const ret = mockPrisma.order.count.mock.calls.find(([a]) => a.where.returnPlanAt?.gte?.getTime?.() === tomorrowStart.getTime())[0].where;
    expect(ret.status).toBe('PICKUPED');
    expect(ret.returnPlanAt).toEqual({ gte: tomorrowStart, lte: tomorrowEnd });
  });

  it('tomorrow is null when no window is given', async () => {
    const result = await getOutletOperations({ outletIds: [1], start, end, soonEnd, includeCash: false });
    expect(result.tomorrow).toBeNull();
  });
});

describe('getOutletOperations collateral (#494)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.order.count.mockResolvedValue(0);
  });

  it('to collect: RESERVED rentals with collateral, in scope, not deleted', async () => {
    mockPrisma.order.aggregate.mockResolvedValue({ _sum: {}, _count: { _all: 0 } });
    await getOutletOperations({ outletIds: [1, 3], start, end, soonEnd, includeCash: true });
    const where = whereOf(mockPrisma.order.aggregate, (w) => w.status === 'RESERVED');
    expect(where).toEqual({ orderType: 'RENT', deletedAt: null, outletId: { in: [1, 3] }, status: 'RESERVED', securityDeposit: { gt: 0 } });
  });

  it('to return: PICKUPED rentals with collateral; depositsHeld keeps counting every PICKUPED rental', async () => {
    mockPrisma.order.aggregate.mockResolvedValue({ _sum: {}, _count: { _all: 0 } });
    await getOutletOperations({ outletIds: [1], start, end, soonEnd, includeCash: true });
    const pickuped = mockPrisma.order.aggregate.mock.calls
      .map(([args]: any) => args.where)
      .filter((w: any) => w.status === 'PICKUPED' && !w.returnPlanAt);
    expect(pickuped).toHaveLength(2);
    expect(pickuped.find((w: any) => !w.securityDeposit)).toEqual({ orderType: 'RENT', deletedAt: null, outletId: { in: [1] }, status: 'PICKUPED' });
    expect(pickuped.find((w: any) => w.securityDeposit).securityDeposit).toEqual({ gt: 0 });
  });

  it('empty sums read as 0, never null', async () => {
    mockPrisma.order.aggregate.mockResolvedValue({ _sum: { depositAmount: null, securityDeposit: null, lateFee: null, damageFee: null }, _count: { _all: 0 } });
    const result = await getOutletOperations({ outletIds: [1], start, end, soonEnd, includeCash: true });
    expect(result.cash).toEqual({
      depositsHeld: { depositAmount: 0, securityDeposit: 0, orders: 0 },
      depositsDueToday: { depositAmount: 0, securityDeposit: 0, orders: 0 },
      feesToday: { lateFee: 0, damageFee: 0, orders: 0 },
      collateralToCollect: { securityDeposit: 0, orders: 0 },
      collateralToReturn: { securityDeposit: 0, orders: 0 },
    });
  });

  it('staff: no collateral queries, cash stays null', async () => {
    const result = await getOutletOperations({ outletIds: [1], start, end, soonEnd, includeCash: false });
    expect(result.cash).toBeNull();
    expect(mockPrisma.order.aggregate).not.toHaveBeenCalled();
  });
});
