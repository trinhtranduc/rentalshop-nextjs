// #484: Overview "Tiền đã thu" leaves collateral (securityDeposit) out: it is held, then refunded.
const { getOrderRevenueEvents, withoutCollateral } = require('../packages/utils/src/core/revenue-calculator');
const { ORDER_STATUS, ORDER_TYPE } = require('../packages/constants/src');

const sum = (events) => events.reduce((s, e) => s + e.revenue, 0);

describe('collected money without collateral (#484)', () => {
  const rent = {
    orderType: ORDER_TYPE.RENT,
    totalAmount: 800000,
    depositAmount: 200000,
    securityDeposit: 1000000,
    damageFee: 50000,
    lateFee: 30000,
    createdAt: '2026-03-01T03:00:00Z',
    pickedUpAt: '2026-03-02T03:00:00Z',
    returnedAt: null
  };

  it('pickup collects the rent balance only', () => {
    const events = getOrderRevenueEvents(withoutCollateral({ ...rent, status: ORDER_STATUS.PICKUPED }));
    expect(events.find((e) => e.revenueType === 'RENT_PICKUP').revenue).toBe(600000);
  });

  it('return collects the fees and refunds no collateral', () => {
    const order = withoutCollateral({ ...rent, status: ORDER_STATUS.RETURNED, returnedAt: '2026-03-05T03:00:00Z' });
    const events = getOrderRevenueEvents(order);
    expect(events.find((e) => e.revenueType === 'RENT_RETURN').revenue).toBe(80000);
    expect(sum(events)).toBe(800000 + 80000);
  });

  it('a cancelled picked-up order refunds only what the shop kept', () => {
    const order = withoutCollateral({ ...rent, status: ORDER_STATUS.CANCELLED, updatedAt: '2026-03-03T03:00:00Z' });
    expect(sum(getOrderRevenueEvents(order))).toBe(0);
  });

  it('does not change the order passed in', () => {
    const order = { ...rent, status: ORDER_STATUS.PICKUPED };
    withoutCollateral(order);
    expect(order.securityDeposit).toBe(1000000);
  });
});
