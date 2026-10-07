/**
 * BF-SALE (sale orders) and BF-CANC (cancellation) with Overview money, rankings and stock (#498).
 */
const {
  Session,
  describeE2E,
  vnDateKey,
  futureWindow,
  rentBody,
  saleBody,
  watchOverview,
  pick,
  knownBug,
  risingPrice
} = require('../helpers/api');

describeE2E('BF-SALE sale orders', () => {
  let s;
  const today = vnDateKey();

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  test('BF-SALE-01 a sale is COMPLETED at creation: total collected now, stock leaves for good', async () => {
    const price = 120000;
    const product = await s.createProduct({ kind: 'SALE', price, stock: 5 });
    const customer = await s.createCustomer();
    const ov = await watchOverview(s, today);
    const { body } = saleBody({ customer, lines: [{ product, quantity: 2 }] });
    const order = await s.createOrder(body);
    expect(order.orderType).toBe('SALE');
    expect(order.status).toBe('COMPLETED');
    expect(order.totalAmount).toBe(2 * price);
    const d = await ov.delta();
    expect(pick(d, ['collected', 'pickupAndSale', 'deposits', 'orderValue', 'outstanding', 'newOrders'])).toEqual({
      collected: 2 * price,
      pickupAndSale: 2 * price,
      deposits: 0,
      orderValue: 2 * price,
      outstanding: 0,
      newOrders: 1
    });
    expect(await s.outletStock(product.id, product.outletId)).toEqual({ stock: 3, available: 3, renting: 0 });
    const row = await s.orderRow(order.id);
    expect(row.amountDue).toBe(0);
  });

  test('BF-SALE-02 sale with an amount discount: total = subtotal - discount', async () => {
    const price = 99000;
    const product = await s.createProduct({ kind: 'SALE', price, stock: 5 });
    const customer = await s.createCustomer();
    const ov = await watchOverview(s, today);
    const { body, subtotal } = saleBody({ customer, lines: [{ product, quantity: 3 }], discountAmount: 17000 });
    const order = await s.createOrder(body);
    expect(order.totalAmount).toBe(subtotal - 17000);
    expect(order.discountAmount).toBe(17000);
    expect(pick(await ov.delta(), ['collected', 'orderValue'])).toEqual({ collected: subtotal - 17000, orderValue: subtotal - 17000 });
  });

  test('BF-SALE-03 a sale never holds a deposit or collateral (#361)', async () => {
    const product = await s.createProduct({ kind: 'SALE', price: 50000, stock: 2 });
    const customer = await s.createCustomer();
    const { body } = saleBody({ customer, lines: [{ product }] });
    const order = await s.createOrder({ ...body, depositAmount: 20000, securityDeposit: 30000 });
    expect(order.depositAmount).toBe(0);
    expect(order.securityDeposit || 0).toBe(0);
  });

  test('BF-SALE-04 cancelling a completed sale refunds it, frees stock and drops it from rankings', async () => {
    const price = risingPrice();
    const product = await s.createProduct({ kind: 'SALE', price, stock: 4 });
    const customer = await s.createCustomer();
    const ov = await watchOverview(s, today);
    const order = await s.createOrder(saleBody({ customer, lines: [{ product }] }).body);
    let d = await ov.delta();
    expect(d.collected).toBe(price);
    let top = d.report.topProducts.find((p) => p.id === product.id);
    expect(top).toMatchObject({ saleCount: 1, rentalCount: 0, totalRevenue: price });

    const r = await s.setStatus(order.id, 'CANCELLED');
    expect(r.status).toBe(200);
    d = await ov.delta();
    expect(pick(d, ['collected', 'refunds', 'orderValue', 'outstanding', 'cancelled'])).toEqual({
      collected: -price,
      refunds: price,
      orderValue: -price,
      outstanding: 0,
      cancelled: 1
    });
    top = d.report.topProducts.find((p) => p.id === product.id);
    expect(top).toBeUndefined();
    expect(await s.topProductRow(product.id, today)).toBeNull();
    expect(await s.outletStock(product.id, product.outletId)).toEqual({ stock: 4, available: 4, renting: 0 });
    const summary = (await s.customerOrders(customer.id)).summary;
    expect(summary).toEqual({ totalOrders: 1, totalAmount: 0 });
  });
});

describeE2E('BF-CANC cancellation', () => {
  let s;
  const today = vnDateKey();

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  test('BF-CANC-01 cancel RESERVED with deposit: deposit refunded, excluded from value, outstanding and rankings, slot freed', async () => {
    const A = risingPrice();
    const D = 200000;
    const product = await s.createProduct({ kind: 'FIXED', price: A, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(2);
    const ov = await watchOverview(s, today);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product }], from: w.from, to: w.to, depositAmount: D }).body);
    let d = await ov.delta();
    expect(pick(d, ['collected', 'orderValue', 'outstanding'])).toEqual({ collected: D, orderValue: A, outstanding: A - D });
    expect((await s.availability(product.id, w)).isAvailable).toBe(false);

    const r = await s.setStatus(order.id, 'CANCELLED');
    expect(r.status).toBe(200);
    d = await ov.delta();
    expect(pick(d, ['collected', 'refunds', 'orderValue', 'outstanding', 'atPickup', 'cancelled'])).toEqual({
      collected: -D,
      refunds: D,
      orderValue: -A,
      outstanding: -(A - D),
      atPickup: -(A - D),
      cancelled: 1
    });
    expect(d.report.topProducts.find((p) => p.id === product.id)).toBeUndefined();
    expect(await s.topProductRow(product.id, today)).toBeNull();
    const av = await s.availability(product.id, w);
    expect(av.isAvailable).toBe(true);
    expect(av.availabilityByOutlet[0].effectivelyAvailable).toBe(1);
    expect((await s.customerOrders(customer.id)).summary.totalAmount).toBe(0);
  });

  test('BF-CANC-02 a booking cancelled later still counts as a new order of its day (current rule)', async () => {
    // #484 spec: series[].newOrderCount = operational.orderCounts.new = orders created that day,
    // including ones cancelled later. Listed as a question for the owner.
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const ov = await watchOverview(s, today);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product }], from: w.from, to: w.to }).body);
    await s.setStatus(order.id, 'CANCELLED');
    const d = await ov.delta();
    expect(pick(d, ['newOrders', 'seriesNewOrders', 'cancelled', 'orderValue'])).toEqual({
      newOrders: 1,
      seriesNewOrders: 1,
      cancelled: 1,
      orderValue: 0
    });
  });

  // Suspected bug #503: revenue-calculator drops the pickup event when the cancel is on the
  // pickup day ("isSameDayCancelled") but still refunds everything collected, so the day goes negative.
  knownBug('#503', 'BF-CANC-03 cancel after a same-day hand-over: money in and out cancel to zero', async () => {
    const A = 300000;
    const D = 100000;
    const S = 400000;
    const product = await s.createProduct({ kind: 'FIXED', price: A, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(2);
    const ov = await watchOverview(s, today);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product }], from: w.from, to: w.to, depositAmount: D }).body);
    await s.setStatus(order.id, 'PICKUPED', { securityDeposit: S });
    const r = await s.setStatus(order.id, 'CANCELLED');
    expect(r.status).toBe(200);
    const d = await ov.delta();
    // Collected D at booking, A - D at hand-over, refunded A: net 0. Collateral S in and out.
    expect(pick(d, ['collected', 'orderValue', 'outstanding', 'collateralHeld'])).toEqual({
      collected: 0,
      orderValue: 0,
      outstanding: 0,
      collateralHeld: 0
    });
    expect(d.totalRevenue).toBe(0);
  });

  test('BF-CANC-04 cancel after hand-over gives the units back to stock', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product, quantity: 2 }], from: w.from, to: w.to }).body);
    await s.setStatus(order.id, 'PICKUPED');
    expect(await s.outletStock(product.id, product.outletId)).toEqual({ stock: 2, available: 0, renting: 2 });
    await s.setStatus(order.id, 'CANCELLED');
    expect(await s.outletStock(product.id, product.outletId)).toEqual({ stock: 2, available: 2, renting: 0 });
    expect((await s.availability(product.id, w)).isAvailable).toBe(true);
  });

  test('BF-CANC-05 a cancelled order cannot be reopened or progressed', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product }], from: w.from, to: w.to }).body);
    await s.setStatus(order.id, 'CANCELLED');
    for (const next of ['RESERVED', 'PICKUPED', 'RETURNED']) {
      const r = await s.setStatus(order.id, next);
      expect([next, r.status]).toEqual([next, 400]);
    }
  });
});
