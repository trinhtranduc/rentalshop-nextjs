/**
 * BF-RENT: rent order lifecycle with the Overview money checked at every status (#498).
 * Rules: packages/utils/src/core/revenue-calculator.ts (events), analytics/order-value.ts (#484, #492, #494).
 * Expected numbers come from the inputs below, never from the API.
 */
const {
  Session,
  describeE2E,
  vnDateKey,
  vnAt,
  futureWindow,
  rentBody,
  watchOverview,
  pick
} = require('../helpers/api');

const MONEY = ['collected', 'deposits', 'pickupAndSale', 'fees', 'refunds', 'orderValue', 'outstanding', 'atPickup'];

describeE2E('BF-RENT rent order lifecycle and Overview money', () => {
  let s;
  const today = vnDateKey();

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  test('BF-RENT-01 same-day rent: deposit, hand-over with collateral money, return with late + damage fee', async () => {
    const A = 300000; // rent (FIXED, qty 1)
    const D = 100000; // deposit paid at booking
    const S = 500000; // collateral money held at hand-over
    const L = 40000; // late fee
    const F = 60000; // damage fee
    const product = await s.createProduct({ kind: 'FIXED', price: A, stock: 2 });
    const customer = await s.createCustomer();
    const w = futureWindow(3);
    const ov = await watchOverview(s, today);

    // RESERVED
    const { body } = rentBody({ customer, lines: [{ product }], from: w.from, to: w.to, depositAmount: D });
    const order = await s.createOrder(body);
    expect(order.status).toBe('RESERVED');
    expect(order.totalAmount).toBe(A);
    expect(order.depositAmount).toBe(D);
    let d = await ov.delta();
    expect(pick(d, [...MONEY, 'newOrders', 'collateralReceived'])).toEqual({
      collected: D,
      deposits: D,
      pickupAndSale: 0,
      fees: 0,
      refunds: 0,
      orderValue: A,
      outstanding: A - D,
      atPickup: A - D,
      newOrders: 1,
      collateralReceived: 0
    });
    let row = await s.orderRow(order.id);
    expect(row.amountDue).toBe(A - D);

    // PICKUPED: remaining rent collected, collateral money held (not revenue)
    let r = await s.setStatus(order.id, 'PICKUPED', {
      securityDeposit: S,
      collateralType: 'ID_CARD',
      collateralDetails: 'CCCD + tiền thế chân'
    });
    expect(r.status).toBe(200);
    d = await ov.delta();
    expect(pick(d, [...MONEY, 'pickups', 'collateralReceived', 'collateralHeld'])).toEqual({
      collected: A - D,
      // same-day pickup folds the deposit into the pickup event (#492 breakdown)
      deposits: -D,
      pickupAndSale: A,
      fees: 0,
      refunds: 0,
      orderValue: 0,
      outstanding: -(A - D),
      atPickup: -(A - D),
      pickups: 1,
      collateralReceived: S,
      collateralHeld: S
    });
    row = await s.orderRow(order.id);
    expect(row.status).toBe('PICKUPED');
    expect(row.amountDue).toBe(0);
    expect(row.refundDue).toBe(S);

    // fees first (iOS/Android send them before RETURNED), then RETURNED
    r = await s.updateOrder(order.id, { lateFee: L, damageFee: F });
    expect(r.status).toBe(200);
    row = await s.orderRow(order.id);
    expect(row.refundDue).toBe(S - L - F);
    r = await s.setStatus(order.id, 'RETURNED');
    expect(r.status).toBe(200);
    d = await ov.delta();
    expect(pick(d, [...MONEY, 'returns', 'collateralHeld'])).toEqual({
      collected: L + F,
      deposits: 0,
      pickupAndSale: 0,
      fees: L + F,
      refunds: 0,
      orderValue: 0,
      outstanding: 0,
      atPickup: 0,
      returns: 1,
      collateralHeld: -S
    });
    // A same-day rent + return moves no collateral (#494)
    expect(d.report.revenue.collateralFlow).toBeDefined();
    row = await s.orderRow(order.id);
    expect(row.status).toBe('RETURNED');
    expect([row.amountDue, row.refundDue]).toEqual([0, 0]);
  });

  test('BF-RENT-02 rent without deposit, papers only as collateral', async () => {
    const A = 250000;
    const product = await s.createProduct({ kind: 'FIXED', price: A, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(2);
    const ov = await watchOverview(s, today);

    const order = await s.createOrder(rentBody({ customer, lines: [{ product }], from: w.from, to: w.to }).body);
    let d = await ov.delta();
    expect(pick(d, ['collected', 'orderValue', 'outstanding', 'newOrders'])).toEqual({
      collected: 0,
      orderValue: A,
      outstanding: A,
      newOrders: 1
    });

    await s.setStatus(order.id, 'PICKUPED', { collateralType: 'ID_CARD', collateralDetails: 'CCCD 0123' });
    d = await ov.delta();
    expect(pick(d, ['collected', 'outstanding', 'collateralReceived', 'collateralHeld'])).toEqual({
      collected: A,
      outstanding: -A,
      collateralReceived: 0,
      collateralHeld: 0
    });
    const detail = await s.getOrder(order.id);
    expect(detail.collateralDetails).toBe('CCCD 0123');
    expect(detail.securityDeposit || 0).toBe(0);

    await s.setStatus(order.id, 'RETURNED');
    d = await ov.delta();
    expect(pick(d, ['collected', 'orderValue', 'outstanding'])).toEqual({ collected: 0, orderValue: 0, outstanding: 0 });
  });

  test('BF-RENT-03 different days: deposit today, pickup on day P, return on day R (collateral back on R)', async () => {
    const price = 80000; // per day
    const D = 50000;
    const S = 1000000;
    const L = 0;
    const F = 30000;
    const product = await s.createProduct({ kind: 'DAILY', price, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(3);
    const A = price * 3;
    const P = w.from;
    const R = w.to;
    const ovToday = await watchOverview(s, today);
    const ovP = await watchOverview(s, P);
    const ovR = await watchOverview(s, R);
    const ovAll = await watchOverview(s, today, R);

    const order = await s.createOrder(rentBody({ customer, lines: [{ product }], from: P, to: R, depositAmount: D }).body);
    expect(order.totalAmount).toBe(A);
    expect(order.rentalDuration).toBe(3);
    expect(order.orderItems[0].rentalDays).toBe(3);
    expect(pick(await ovToday.delta(), ['collected', 'deposits', 'orderValue', 'outstanding'])).toEqual({
      collected: D,
      deposits: D,
      orderValue: A,
      outstanding: A - D
    });

    await s.setStatus(order.id, 'PICKUPED', { pickedUpAt: vnAt(P, '09:00').toISOString(), securityDeposit: S });
    expect(pick(await ovToday.delta(), ['collected', 'outstanding'])).toEqual({ collected: 0, outstanding: -(A - D) });
    expect(pick(await ovP.delta(), ['collected', 'pickupAndSale', 'collateralReceived', 'collateralHeld', 'pickups'])).toEqual({
      collected: A - D,
      pickupAndSale: A - D,
      collateralReceived: S,
      collateralHeld: S,
      pickups: 1
    });

    await s.updateOrder(order.id, { lateFee: L, damageFee: F });
    await s.setStatus(order.id, 'RETURNED', { returnedAt: vnAt(R, '18:00').toISOString() });
    expect(pick(await ovR.delta(), ['collected', 'fees', 'collateralReturned', 'returns'])).toEqual({
      collected: L + F,
      fees: L + F,
      collateralReturned: S,
      returns: 1
    });
    // The pickup day keeps its money; the collateral is no longer "held"
    expect(pick(await ovP.delta(), ['collected', 'collateralHeld'])).toEqual({ collected: 0, collateralHeld: -S });

    // Whole window: rent + fees collected, collateral in and out, never part of "collected"
    const all = await ovAll.delta();
    expect(pick(all, ['collected', 'collateralReceived', 'collateralReturned', 'orderValue', 'outstanding'])).toEqual({
      collected: A + L + F,
      collateralReceived: S,
      collateralReturned: S,
      orderValue: A,
      outstanding: 0
    });
    expect(all.totalRevenue - all.collected).toBe(all.collateralReceived - all.collateralReturned);
  });

  test('BF-RENT-04 damage fee larger than collateral: customer owes the difference before return', async () => {
    const A = 200000;
    const S = 100000;
    const F = 300000;
    const product = await s.createProduct({ kind: 'FIXED', price: A, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(2);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product }], from: w.from, to: w.to }).body);
    await s.setStatus(order.id, 'PICKUPED', { securityDeposit: S });
    await s.updateOrder(order.id, { damageFee: F });
    const row = await s.orderRow(order.id);
    expect(row.amountDue).toBe(F - S);
    expect(row.refundDue).toBe(0);
  });

  test('BF-RENT-05 only allowed status changes (#361)', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product }], from: w.from, to: w.to }).body);

    let r = await s.setStatus(order.id, 'RETURNED');
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('INVALID_ORDER_STATUS');
    r = await s.setStatus(order.id, 'COMPLETED');
    expect(r.status).toBe(400);
    r = await s.setStatus(order.id, 'RESERVED'); // echo of the current status is a no-op
    expect(r.status).toBe(200);

    await s.setStatus(order.id, 'PICKUPED');
    await s.setStatus(order.id, 'RETURNED');
    for (const next of ['PICKUPED', 'RESERVED', 'CANCELLED']) {
      r = await s.setStatus(order.id, next);
      expect([next, r.status]).toEqual([next, 400]);
    }
    // PATCH /status (web) follows the same table
    r = await s.patch(`/api/orders/${order.id}/status`, { status: 'PICKUPED' });
    expect(r.status).toBe(400);
  });

  test('BF-RENT-06 stock: hand-over moves units to renting, return brings them back', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 3 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product, quantity: 2 }], from: w.from, to: w.to }).body);
    expect(await s.outletStock(product.id, product.outletId)).toEqual({ stock: 3, available: 3, renting: 0 });
    await s.setStatus(order.id, 'PICKUPED');
    expect(await s.outletStock(product.id, product.outletId)).toEqual({ stock: 3, available: 1, renting: 2 });
    await s.setStatus(order.id, 'RETURNED');
    expect(await s.outletStock(product.id, product.outletId)).toEqual({ stock: 3, available: 3, renting: 0 });
  });
});
