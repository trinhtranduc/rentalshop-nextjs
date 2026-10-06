// #492: Overview "Thực thu" sheet splits collected money by source; the parts add up to the total.
const {
  getOrderRevenueEvents,
  withoutCollateral,
  emptyCollectedBreakdown,
  addToCollectedBreakdown
} = require('../packages/utils/src/core/revenue-calculator');
const { ORDER_STATUS, ORDER_TYPE } = require('../packages/constants/src');

function split(order) {
  const plain = withoutCollateral(order);
  const events = getOrderRevenueEvents(plain);
  const breakdown = emptyCollectedBreakdown();
  events.forEach((e) => addToCollectedBreakdown(breakdown, plain, e));
  const total = events.reduce((s, e) => s + e.revenue, 0);
  return { breakdown, total };
}

const parts = (b) => b.deposits + b.pickupAndSale + b.fees - b.refunds;

describe('collected breakdown (#492)', () => {
  const rent = {
    orderType: ORDER_TYPE.RENT,
    totalAmount: 200000,
    depositAmount: 50000,
    securityDeposit: 1000000,
    damageFee: 20000,
    lateFee: 10000,
    createdAt: '2026-03-01T03:00:00Z',
    pickedUpAt: null,
    returnedAt: null
  };

  it('a reserved order: only the deposit is collected', () => {
    const { breakdown, total } = split({ ...rent, status: ORDER_STATUS.RESERVED });
    expect(breakdown).toEqual({ deposits: 50000, pickupAndSale: 0, fees: 0, refunds: 0 });
    expect(total).toBe(50000);
  });

  it('picked up and returned on later days: deposit, balance, fees', () => {
    const { breakdown, total } = split({
      ...rent,
      status: ORDER_STATUS.RETURNED,
      pickedUpAt: '2026-03-02T03:00:00Z',
      returnedAt: '2026-03-05T03:00:00Z'
    });
    expect(breakdown).toEqual({ deposits: 50000, pickupAndSale: 150000, fees: 30000, refunds: 0 });
    expect(parts(breakdown)).toBe(total);
  });

  it('rented and returned the same day: rent and fees are separate', () => {
    const { breakdown, total } = split({
      ...rent,
      status: ORDER_STATUS.RETURNED,
      pickedUpAt: '2026-03-01T04:00:00Z',
      returnedAt: '2026-03-01T09:00:00Z'
    });
    expect(breakdown).toEqual({ deposits: 0, pickupAndSale: 200000, fees: 30000, refunds: 0 });
    expect(parts(breakdown)).toBe(total);
  });

  it('a cancelled reserved order refunds the deposit', () => {
    const { breakdown, total } = split({ ...rent, status: ORDER_STATUS.CANCELLED, updatedAt: '2026-03-03T03:00:00Z' });
    expect(breakdown).toEqual({ deposits: 50000, pickupAndSale: 0, fees: 0, refunds: 50000 });
    expect(total).toBe(0);
  });

  it('a sale counts as pickup and sale', () => {
    const { breakdown } = split({ ...rent, orderType: ORDER_TYPE.SALE, status: ORDER_STATUS.COMPLETED, depositAmount: 0, securityDeposit: 0 });
    expect(breakdown.pickupAndSale).toBe(200000);
  });
});

describe('period summary: breakdown and collateral received (#492)', () => {
  const { computeIncomePeriodSummary } = require('../packages/utils/src/analytics/income-period-summary');
  const order = {
    id: 1,
    orderNumber: 'ORD-1-1',
    orderType: ORDER_TYPE.RENT,
    status: ORDER_STATUS.PICKUPED,
    totalAmount: 200000,
    depositAmount: 50000,
    securityDeposit: 1000000,
    damageFee: 0,
    lateFee: 0,
    createdAt: new Date('2026-10-01T03:00:00Z'),
    pickedUpAt: new Date('2026-10-02T03:00:00Z'),
    returnedAt: null,
    updatedAt: new Date('2026-10-02T03:00:00Z')
  };
  const prisma = {
    order: { findMany: jest.fn(async (args) => (args?.select?.orderNumber ? [order] : [])) }
  };

  it('splits collected money and reports collateral taken at pickup outside it', async () => {
    const { summary } = await computeIncomePeriodSummary(prisma, {
      startDate: '2026-10-01',
      endDate: '2026-10-03',
      outletFilter: {}
    });
    expect(summary.totalCollected).toBe(200000);
    expect(summary.collectedBreakdown).toEqual({ deposits: 50000, pickupAndSale: 150000, fees: 0, refunds: 0 });
    expect(summary.collateralReceived).toBe(1000000);
  });
});
