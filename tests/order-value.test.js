// #484: Overview "Tổng giá trị đơn" and "Còn phải thu" for GET /api/analytics/period
const { summarizeOrderValue } = require('../packages/utils/src/analytics/order-value');
const { ORDER_STATUS, ORDER_TYPE } = require('../packages/constants/src');

describe('summarizeOrderValue (#484)', () => {
  it('sums order value and keeps only the unpaid part as outstanding', () => {
    const result = summarizeOrderValue([
      { orderType: ORDER_TYPE.RENT, status: ORDER_STATUS.RESERVED, totalAmount: 1000000, depositAmount: 300000 },
      { orderType: ORDER_TYPE.RENT, status: ORDER_STATUS.PICKUPED, totalAmount: 500000, depositAmount: 100000 },
      { orderType: ORDER_TYPE.RENT, status: ORDER_STATUS.RETURNED, totalAmount: 400000, depositAmount: 0 },
      { orderType: ORDER_TYPE.SALE, status: ORDER_STATUS.RESERVED, totalAmount: 200000 },
      { orderType: ORDER_TYPE.SALE, status: ORDER_STATUS.COMPLETED, totalAmount: 150000 }
    ]);
    expect(result).toEqual({ totalOrderValue: 2250000, outstanding: 700000 + 200000 });
  });

  it('ignores cancelled orders', () => {
    const result = summarizeOrderValue([
      { orderType: ORDER_TYPE.RENT, status: ORDER_STATUS.CANCELLED, totalAmount: 900000, depositAmount: 100000 }
    ]);
    expect(result).toEqual({ totalOrderValue: 0, outstanding: 0 });
  });

  it('never makes outstanding negative when the deposit exceeds the total', () => {
    const result = summarizeOrderValue([
      { orderType: ORDER_TYPE.RENT, status: ORDER_STATUS.RESERVED, totalAmount: 100000, depositAmount: 150000 }
    ]);
    expect(result.outstanding).toBe(0);
  });
});
