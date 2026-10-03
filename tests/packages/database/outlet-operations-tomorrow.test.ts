/**
 * #362 — "Việc cần làm" needs tomorrow's hand-overs and returns as lists, and the money fields per row.
 */
const mockPrisma = {
  order: { findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  outlet: { findMany: jest.fn() },
};
jest.mock('../../../packages/database/src/client', () => ({ prisma: mockPrisma }));

import { getOutletOperations } from '../../../packages/database/src/outlet-operations';

const start = new Date('2026-10-02T17:00:00.000Z');
const end = new Date('2026-10-03T16:59:59.999Z');
const tomorrowStart = new Date('2026-10-03T17:00:00.000Z');
const tomorrowEnd = new Date('2026-10-04T16:59:59.999Z');

describe('getOutletOperations tomorrow lists (#362)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.order.findMany.mockResolvedValue([{ id: 1 }]);
    mockPrisma.order.count.mockResolvedValue(1);
  });

  it('lists RESERVED hand-overs and PICKUPED returns planned within tomorrow', async () => {
    const ops: any = await getOutletOperations({
      outletIds: [1], start, end, soonEnd: end, includeCash: false, tomorrowStart, tomorrowEnd,
    });
    const wheres = mockPrisma.order.findMany.mock.calls.map(([args]) => args.where);
    expect(wheres).toContainEqual(expect.objectContaining({ status: 'RESERVED', pickupPlanAt: { gte: tomorrowStart, lte: tomorrowEnd } }));
    expect(wheres).toContainEqual(expect.objectContaining({ status: 'PICKUPED', returnPlanAt: { gte: tomorrowStart, lte: tomorrowEnd } }));
    expect(ops.tomorrowPickups).toEqual({ count: 1, orders: [{ id: 1 }] });
    expect(ops.tomorrowReturns).toEqual({ count: 1, orders: [{ id: 1 }] });
    expect(ops.tomorrow).toEqual({ pickups: 1, returns: 1 });
  });

  it('rows carry what the balance and the item list need', async () => {
    await getOutletOperations({ outletIds: [1], start, end, soonEnd: end, includeCash: false, tomorrowStart, tomorrowEnd });
    const select = mockPrisma.order.findMany.mock.calls[0][0].select;
    expect(select).toEqual(expect.objectContaining({
      orderType: true, status: true, lateFee: true, damageFee: true,
      payments: { select: { amount: true, status: true, notes: true } },
    }));
    expect(select.orderItems.select).toEqual(expect.objectContaining({ productName: true, quantity: true }));
  });

  it('no tomorrow lists without a tomorrow window', async () => {
    const ops: any = await getOutletOperations({ outletIds: [1], start, end, soonEnd: end, includeCash: false });
    expect(ops.tomorrowPickups).toBeNull();
    expect(ops.tomorrowReturns).toBeNull();
  });
});
