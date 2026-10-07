/**
 * BF-DUP: duplicate orders ("trùng đơn"): double submit, overlapping bookings, stock vs booked quantity (#498).
 * Availability rule (apps/api/app/api/products/[id]/availability): an active RENT order (RESERVED/PICKUPED) of the
 * same outlet clashes when orderPickup < windowEnd AND orderReturn >= windowStart; days are Vietnam civil days.
 */
const { Session, describeE2E, vnDateKey, addDays, futureWindow, rentBody, watchOverview, pick } = require('../helpers/api');

describeE2E('BF-DUP duplicate orders and overbooking', () => {
  let s;
  const today = vnDateKey();

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  const book = async (product, w, { quantity = 1, customer } = {}) => {
    const c = customer || (await s.createCustomer());
    return s.createOrder(rentBody({ customer: c, lines: [{ product, quantity }], from: w.from, to: w.to }).body);
  };

  test('BF-DUP-01 a double tap / retried create returns the same order once (#341)', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 150000, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(2);
    const ov = await watchOverview(s, today);
    const { body } = rentBody({ customer, lines: [{ product }], from: w.from, to: w.to, depositAmount: 50000 });
    const [a, b] = await Promise.all([s.createOrderRaw(body), s.createOrderRaw(body)]);
    const c = await s.createOrderRaw(body); // retry a moment later
    expect([a.status, b.status, c.status]).toEqual([200, 200, 200]);
    expect(new Set([a.body.data.id, b.body.data.id, c.body.data.id]).size).toBe(1);
    expect((await s.customerOrders(customer.id)).total).toBe(1);
    expect(pick(await ov.delta(), ['newOrders', 'orderValue', 'collected'])).toEqual({
      newOrders: 1,
      orderValue: 150000,
      collected: 50000
    });
  });

  test('BF-DUP-02 the same Idempotency-Key returns the first order even with a changed body', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 90000, stock: 3 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const key = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e9)}`; // [A-Za-z0-9_-]{8,128}
    const first = await s.createOrder(rentBody({ customer, lines: [{ product }], from: w.from, to: w.to }).body, { 'Idempotency-Key': key });
    const again = await s.createOrder(rentBody({ customer, lines: [{ product, quantity: 2 }], from: w.from, to: w.to }).body, {
      'Idempotency-Key': key
    });
    expect(again.id).toBe(first.id);
    expect(again.totalAmount).toBe(90000);
  });

  test('BF-DUP-03 stock 1: a booked window is not available, in the single and the batch (cart) check', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
    const w = futureWindow(3);
    const order = await book(product, w);
    const av = await s.availability(product.id, w);
    expect(av.isAvailable).toBe(false);
    expect(av.availabilityByOutlet[0].effectivelyAvailable).toBe(0);
    expect(av.availabilityByOutlet[0].conflicts.map((c) => c.orderNumber)).toEqual([order.orderNumber]);
    const batch = await s.batchAvailability([{ productId: product.id, quantity: 1 }], w);
    const res = batch.results.find((r) => r.productId === product.id);
    expect(res.isAvailable).toBe(false);
    // the cart's own rule: isAvailable && effectivelyAvailable >= requested
    expect(res.availabilityByOutlet[0].effectivelyAvailable).toBe(0);
  });

  test('BF-DUP-04 stock 1: a second overlapping booking is accepted by POST /api/orders (no server guard today)', async () => {
    // Current behaviour: the API trusts the apps' availability check. Question for the owner (see PR).
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
    const w = futureWindow(3);
    await book(product, w);
    const overlap = { from: addDays(w.from, 1), to: addDays(w.to, 1) };
    const c = await s.createCustomer();
    const r = await s.createOrderRaw(rentBody({ customer: c, lines: [{ product }], from: overlap.from, to: overlap.to }).body);
    expect(r.status).toBe(200);
    const av = await s.availability(product.id, { from: overlap.from, to: overlap.from });
    expect(av.isAvailable).toBe(false);
    expect(av.availabilityByOutlet[0].conflictingQuantity).toBe(2);
    expect(av.availabilityByOutlet[0].effectivelyAvailable).toBe(0);
  });

  test('BF-DUP-05 quantities add up across orders against stock', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 3 });
    const w = futureWindow(2);
    await book(product, w, { quantity: 2 });
    let av = await s.availability(product.id, { ...w, quantity: 1 });
    expect([av.isAvailable, av.availabilityByOutlet[0].effectivelyAvailable]).toEqual([true, 1]);
    av = await s.availability(product.id, { ...w, quantity: 2 });
    expect(av.isAvailable).toBe(false);
    await book(product, w, { quantity: 1 });
    av = await s.availability(product.id, { ...w, quantity: 1 });
    expect([av.isAvailable, av.availabilityByOutlet[0].conflictingQuantity]).toEqual([false, 3]);
    const batch = await s.batchAvailability([{ productId: product.id, quantity: 1 }], w);
    expect(batch.results[0].isAvailable).toBe(false);
  });

  test('BF-DUP-06 adjacent days do not clash; a partial overlap does', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
    const w = futureWindow(2); // X .. X+1
    await book(product, w);
    expect((await s.availability(product.id, { from: addDays(w.to, 1), to: addDays(w.to, 3) })).isAvailable).toBe(true);
    expect((await s.availability(product.id, { from: addDays(w.from, -2), to: addDays(w.from, -1) })).isAvailable).toBe(true);
    expect((await s.availability(product.id, { from: w.to, to: addDays(w.to, 2) })).isAvailable).toBe(false);
    expect((await s.availability(product.id, { from: addDays(w.from, -3), to: w.from })).isAvailable).toBe(false);
    // A booking right after the window is a normal second order
    const next = await book(product, { from: addDays(w.to, 1), to: addDays(w.to, 1) });
    expect(next.status).toBe('RESERVED');
  });

  test('BF-DUP-07 a same-day pickup and return still occupies that day', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
    const w = futureWindow(1); // X .. X
    await book(product, w);
    expect((await s.availability(product.id, w)).isAvailable).toBe(false);
    expect((await s.availability(product.id, { from: addDays(w.from, 1) })).isAvailable).toBe(true);
    expect((await s.availability(product.id, { from: addDays(w.from, -1) })).isAvailable).toBe(true);
  });

  test('BF-DUP-08 the slot frees after return and after cancel', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
    const w = futureWindow(2);
    const a = await book(product, w);
    await s.setStatus(a.id, 'PICKUPED');
    expect((await s.availability(product.id, w)).isAvailable).toBe(false);
    await s.setStatus(a.id, 'RETURNED');
    expect((await s.availability(product.id, w)).isAvailable).toBe(true);

    const b = await book(product, w);
    expect((await s.availability(product.id, w)).isAvailable).toBe(false);
    await s.setStatus(b.id, 'CANCELLED');
    const av = await s.availability(product.id, w);
    expect([av.isAvailable, av.availabilityByOutlet[0].effectivelyAvailable]).toEqual([true, 1]);
  });

  test('BF-DUP-09 editing an order excludes itself from its own conflict check', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
    const w = futureWindow(2);
    const a = await book(product, w);
    expect((await s.availability(product.id, w)).isAvailable).toBe(false);
    expect((await s.availability(product.id, { ...w, excludeOrderId: a.id })).isAvailable).toBe(true);
    const batch = await s.batchAvailability([{ productId: product.id, quantity: 1 }], { ...w, excludeOrderId: a.id });
    expect(batch.results[0].isAvailable).toBe(true);
  });

  test('BF-DUP-10 bookings of another outlet do not use this outlet\'s stock', async () => {
    const outlets = (await s.get('/api/outlets?limit=50')).body.data.outlets;
    const other = outlets.find((o) => !o.isDefault);
    if (!other) return; // seed has 2 outlets per merchant
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
    // same product id, stock 1 only at the default outlet; an order at the other outlet is not a conflict here
    const w = futureWindow(1);
    const c = await s.createCustomer();
    const body = rentBody({ customer: c, lines: [{ product }], from: w.from, to: w.to }).body;
    const r = await s.createOrderRaw({ ...body, outletId: other.id });
    expect(r.status).toBe(200);
    expect((await s.availability(product.id, w)).isAvailable).toBe(true);
  });
});
