// #494: "Tiền thực nhận" adds the collateral (thế chân) that changed hands to Thực thu,
// and "Còn phải thu" is split into money due at pickup and pickups already overdue.
const {
  getOrderRevenueEvents,
  withoutCollateral,
  emptyCollateralFlow,
  addToCollateralFlow
} = require('../packages/utils/src/core/revenue-calculator');
const { splitOutstanding } = require('../packages/utils/src/analytics/order-value');
const { ORDER_STATUS, ORDER_TYPE } = require('../packages/constants/src');

function flowOf(order, start, end) {
  const inRange = (e) => !start || (e.date >= start && e.date <= end);
  const withEvents = getOrderRevenueEvents(order).filter(inRange);
  const plain = getOrderRevenueEvents(withoutCollateral(order)).filter(inRange);
  const flow = addToCollateralFlow(emptyCollateralFlow(), withEvents, plain);
  const sum = (list) => list.reduce((s, e) => s + e.revenue, 0);
  return { flow, net: sum(withEvents) - sum(plain) };
}

describe('collateral flow (#494)', () => {
  const rent = {
    orderType: ORDER_TYPE.RENT,
    totalAmount: 200000,
    depositAmount: 50000,
    securityDeposit: 1000000,
    damageFee: 0,
    lateFee: 0,
    createdAt: new Date('2026-03-01T03:00:00Z'),
    pickedUpAt: null,
    returnedAt: null
  };

  it('a reserved order moves no collateral', () => {
    expect(flowOf({ ...rent, status: ORDER_STATUS.RESERVED }).flow).toEqual({ received: 0, returned: 0 });
  });

  it('picked up: collateral received', () => {
    const { flow, net } = flowOf({ ...rent, status: ORDER_STATUS.PICKUPED, pickedUpAt: new Date('2026-03-02T03:00:00Z') });
    expect(flow).toEqual({ received: 1000000, returned: 0 });
    expect(net).toBe(1000000);
  });

  it('returned on a later day: received then handed back, even with fees', () => {
    const { flow, net } = flowOf({
      ...rent,
      damageFee: 30000,
      status: ORDER_STATUS.RETURNED,
      pickedUpAt: new Date('2026-03-02T03:00:00Z'),
      returnedAt: new Date('2026-03-05T03:00:00Z')
    });
    expect(flow).toEqual({ received: 1000000, returned: 1000000 });
    expect(net).toBe(0);
  });

  it('only the return falls in the period: only the hand-back counts', () => {
    const { flow } = flowOf(
      { ...rent, status: ORDER_STATUS.RETURNED, pickedUpAt: new Date('2026-03-02T03:00:00Z'), returnedAt: new Date('2026-03-05T03:00:00Z') },
      new Date('2026-03-04T17:00:00Z'),
      new Date('2026-03-05T16:59:59.999Z')
    );
    expect(flow).toEqual({ received: 0, returned: 1000000 });
  });

  it('rented and returned the same day: no collateral moves', () => {
    const { flow } = flowOf({
      ...rent,
      status: ORDER_STATUS.RETURNED,
      pickedUpAt: new Date('2026-03-01T04:00:00Z'),
      returnedAt: new Date('2026-03-01T09:00:00Z')
    });
    expect(flow).toEqual({ received: 0, returned: 0 });
  });

  it('cancelled after pickup: collateral handed back', () => {
    const { flow } = flowOf({
      ...rent,
      status: ORDER_STATUS.CANCELLED,
      pickedUpAt: new Date('2026-03-02T03:00:00Z'),
      updatedAt: new Date('2026-03-03T03:00:00Z')
    });
    expect(flow).toEqual({ received: 1000000, returned: 1000000 });
  });
});

describe('period summary: collateral flow (#494)', () => {
  const { computeIncomePeriodSummary } = require('../packages/utils/src/analytics/income-period-summary');
  const base = {
    orderType: ORDER_TYPE.RENT,
    totalAmount: 200000,
    depositAmount: 50000,
    securityDeposit: 1000000,
    damageFee: 0,
    lateFee: 0,
    createdAt: new Date('2026-09-20T03:00:00Z')
  };
  const orders = [
    // picked up in the period
    { ...base, id: 1, orderNumber: 'ORD-1-1', status: ORDER_STATUS.PICKUPED, pickedUpAt: new Date('2026-10-02T03:00:00Z'), returnedAt: null, updatedAt: new Date('2026-10-02T03:00:00Z') },
    // picked up before, returned in the period
    { ...base, id: 2, orderNumber: 'ORD-1-2', securityDeposit: 400000, status: ORDER_STATUS.RETURNED, pickedUpAt: new Date('2026-09-25T03:00:00Z'), returnedAt: new Date('2026-10-03T03:00:00Z'), updatedAt: new Date('2026-10-03T03:00:00Z') }
  ];
  const prisma = { order: { findMany: jest.fn(async (args) => (args?.select?.orderNumber ? orders : [])) } };

  it('received minus returned equals revenue minus collected', async () => {
    const { summary } = await computeIncomePeriodSummary(prisma, { startDate: '2026-10-01', endDate: '2026-10-03', outletFilter: {} });
    expect(summary.collateralFlow).toEqual({ received: 1000000, returned: 400000 });
    expect(summary.totalRevenue - summary.totalCollected).toBe(600000);
  });
});

describe('splitOutstanding (#494)', () => {
  const todayStart = new Date('2026-10-05T17:00:00Z'); // 06/10 00:00 in Vietnam
  it('splits at the start of today and adds up to outstanding', () => {
    const result = splitOutstanding(
      [
        { orderType: ORDER_TYPE.RENT, status: ORDER_STATUS.RESERVED, totalAmount: 1000000, depositAmount: 300000, pickupPlanAt: new Date('2026-10-06T02:00:00Z') },
        { orderType: ORDER_TYPE.RENT, status: ORDER_STATUS.RESERVED, totalAmount: 500000, depositAmount: 100000, pickupPlanAt: new Date('2026-10-05T16:59:00Z') },
        { orderType: ORDER_TYPE.RENT, status: ORDER_STATUS.RESERVED, totalAmount: 300000, depositAmount: 0, pickupPlanAt: null },
        { orderType: ORDER_TYPE.RENT, status: ORDER_STATUS.PICKUPED, totalAmount: 900000, depositAmount: 0, pickupPlanAt: new Date('2026-10-01T02:00:00Z') },
        { orderType: ORDER_TYPE.SALE, status: ORDER_STATUS.RESERVED, totalAmount: 200000 },
        { orderType: ORDER_TYPE.RENT, status: ORDER_STATUS.CANCELLED, totalAmount: 800000, depositAmount: 0, pickupPlanAt: new Date('2026-10-01T02:00:00Z') }
      ],
      todayStart
    );
    expect(result).toEqual({
      atPickup: { amount: 700000 + 300000 + 200000, orders: 3 },
      overduePickup: { amount: 400000, orders: 1 }
    });
  });

  it('skips orders fully paid by the deposit', () => {
    const result = splitOutstanding(
      [{ orderType: ORDER_TYPE.RENT, status: ORDER_STATUS.RESERVED, totalAmount: 100000, depositAmount: 100000, pickupPlanAt: null }],
      todayStart
    );
    expect(result.atPickup).toEqual({ amount: 0, orders: 0 });
  });
});
