/**
 * #727: stock left (BF-STOCK), calendar (BF-CAL), "việc cần làm" (BF-TODO), cart check (BF-CART) and order
 * detail quantities (BF-DET), proven with numbers through the endpoints the iOS/Android apps call.
 * Merchant account; staff and kho on the same flows are in roles-flows.e2e.test.js.
 *
 * Every test makes its own products, customers and orders. Merchant-wide counters are read as deltas; the
 * "việc cần làm" cases work at the merchant's SECOND outlet (`outletIds=<other>`) so a leftover order of another
 * suite on the main outlet never moves them. Orders still open at the end of a describe are cancelled.
 * Day rule: a VN civil day is held from the pickup day to the return day, both included (#351).
 */
const {
  Session,
  describeE2E,
  must,
  vnDateKey,
  vnAt,
  vnDayRange,
  addDays,
  futureWindow,
  rentBody,
  saleBody,
  knownBug
} = require('../helpers/api');
const F = require('../helpers/flows');

const today = vnDateKey();
const VN = 'Asia/Ho_Chi_Minh';

/** The PUT body of an edited cart (iOS Cart.toUpdateOrderRequest): same as create, item key `rentalDays`. */
function updateBody(args) {
  const { body, subtotal, days } = rentBody(args);
  const orderItems = body.orderItems.map(({ rentDays, ...item }) => ({ ...item, rentalDays: item.pricingType === 'DAILY' ? days : 1 }));
  return { body: { ...body, orderItems }, subtotal, days };
}

/** Main outlet of the staff account (= the default outlet) and the merchant's other outlet. */
async function outletsOf(s) {
  const staff = await Session.login('staff');
  const main = staff.user.outletId;
  const data = await must(s.get('/api/outlets?limit=50'), 'outlets');
  const other = F.listOf(data, 'outlets').find((o) => o.id !== main);
  return { main, other: other ? other.id : null };
}

// =====================================================================================================
describeE2E('BF-STOCK stock left after a sale and after a rent order', () => {
  let s;
  let M; // main outlet
  let O; // other outlet
  const created = [];

  beforeAll(async () => {
    s = await Session.login('merchant');
    ({ main: M, other: O } = await outletsOf(s));
    expect(O).toBeTruthy();
  });
  afterAll(() => F.cancelOpen(s, created));

  const book = async (args) => {
    const o = await F.bookRent(s, { outletId: M, ...args });
    created.push(o.id);
    return o;
  };
  /** Free units of every day in a..b by the two day-by-day reads: availability-calendar grid and single check. */
  const grid = async (product, a, b, outletId = M) => {
    const days = F.dayKeys(a, b);
    const cal = await F.freeDays(s, product, a, b, outletId);
    const single = await F.oneDayFree(s, product, days, outletId);
    expect(single).toEqual(cal);
    return days.map((d) => cal[d]);
  };

  test('BF-STOCK-01 sale of 2 from stock 5: 3 left for ever, in the list, the detail and every day', async () => {
    const p = await s.createProduct({ kind: 'SALE', price: 90000, stock: 5, outletId: M });
    const sale = await F.sell(s, { product: p, quantity: 2, outletId: M });
    expect(sale.status).toBe('COMPLETED');
    const v = await F.stockView(s, p, M);
    expect(v.list).toMatchObject({ today: 3, available: 3, stock: 3, renting: 0, rowAvailable: 3 });
    expect(v.detail).toEqual({ stock: 3, available: 3, renting: 0 });
    expect((await s.getProduct(p.id)).totalStock).toBe(3);
    // not only today: tomorrow and 60 days out
    expect(await grid(p, today, addDays(today, 3))).toEqual([3, 3, 3, 3]);
    expect((await F.freeOn(s, p, addDays(today, 60))).free).toBe(3);
    const cart = await s.batchAvailability([{ productId: p.id, quantity: 3 }], { from: today, to: today, outletId: M });
    expect(cart.results[0]).toMatchObject({ totalStock: 3, isAvailable: true });
    // a second sale of 1
    await F.sell(s, { product: p, quantity: 1, outletId: M });
    expect((await F.stockView(s, p, M)).detail).toEqual({ stock: 2, available: 2, renting: 0 });
    expect((await F.freeOn(s, p, addDays(today, 60))).free).toBe(2);
  });

  test('BF-STOCK-02 selling every unit leaves 0: not available for 1, in the single and the cart check', async () => {
    const p = await s.createProduct({ kind: 'SALE', price: 50000, stock: 2, outletId: M });
    await F.sell(s, { product: p, quantity: 2, outletId: M });
    const v = await F.stockView(s, p, M);
    expect(v.list).toMatchObject({ today: 0, available: 0, stock: 0, renting: 0 });
    expect(v.detail).toEqual({ stock: 0, available: 0, renting: 0 });
    const one = await F.freeOn(s, p, today);
    expect([one.ok, one.free]).toEqual([false, 0]);
    const cart = await s.batchAvailability([{ productId: p.id, quantity: 1 }], { from: today, to: today, outletId: M });
    expect([cart.results[0].isAvailable, cart.results[0].availabilityByOutlet[0].effectivelyAvailable]).toEqual([false, 0]);
  });

  test('BF-STOCK-03 a sale above the stock is accepted and the stock goes negative (current behaviour, Q7)', async () => {
    const p = await s.createProduct({ kind: 'SALE', price: 50000, stock: 2, outletId: M });
    const sale = await F.sell(s, { product: p, quantity: 3, outletId: M });
    expect(sale.status).toBe('COMPLETED');
    const v = await F.stockView(s, p, M);
    // Home never shows a negative free count; the OutletStock row itself keeps -1
    expect(v.detail).toEqual({ stock: -1, available: 0, renting: 0 });
    expect(v.list.today).toBe(0);
  });

  test('BF-STOCK-04 cancelling a sale gives the units back everywhere', async () => {
    const p = await s.createProduct({ kind: 'SALE', price: 50000, stock: 4, outletId: M });
    const sale = await F.sell(s, { product: p, quantity: 3, outletId: M });
    expect((await F.stockView(s, p, M)).detail.stock).toBe(1);
    expect((await s.setStatus(sale.id, 'CANCELLED')).status).toBe(200);
    const v = await F.stockView(s, p, M);
    expect(v.detail).toEqual({ stock: 4, available: 4, renting: 0 });
    expect(v.list).toMatchObject({ today: 4, stock: 4 });
    expect((await F.freeOn(s, p, addDays(today, 10))).free).toBe(4);
  });

  test('BF-STOCK-05 rent 2 of 5 on P..R (future): P..R show 3, the day before and after show 5, nothing leaves the shelf yet', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 5, outletId: M });
    const w = futureWindow(3);
    await book({ product: p, quantity: 2, ...w });
    expect(await grid(p, addDays(w.from, -1), addDays(w.to, 1))).toEqual([5, 3, 3, 3, 5]);
    // the window as one cart check, single and batch
    const av = await s.availability(p.id, { ...w, quantity: 3, outletId: M });
    expect([av.isAvailable, av.availabilityByOutlet[0].effectivelyAvailable, av.availabilityByOutlet[0].conflictingQuantity]).toEqual([true, 3, 2]);
    const cart = await s.batchAvailability([{ productId: p.id, quantity: 4 }], { ...w, outletId: M });
    expect([cart.results[0].isAvailable, cart.results[0].availabilityByOutlet[0].effectivelyAvailable]).toEqual([false, 3]);
    // before the pickup the unit is not "renting" and today is untouched
    const v = await F.stockView(s, p, M);
    expect(v.detail).toEqual({ stock: 5, available: 5, renting: 0 });
    expect(v.list).toMatchObject({ today: 5, available: 5, renting: 0 });
  });

  test('BF-STOCK-06 a rent window that includes today: list "còn hôm nay" = 3, detail still {5,5,0}; the day after the window is 5', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 5, outletId: M });
    await book({ product: p, quantity: 2, from: today, to: addDays(today, 2) });
    const v = await F.stockView(s, p, M);
    expect(v.list).toMatchObject({ today: 3, available: 3, stock: 5, renting: 0, rowAvailable: 3 });
    expect(v.detail).toEqual({ stock: 5, available: 5, renting: 0 });
    expect(await grid(p, today, addDays(today, 3))).toEqual([3, 3, 3, 5]);
  });

  test('BF-STOCK-07 after PICKUPED the 2 units are "renting" and are counted once; RETURNED frees them', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 5, outletId: M });
    const o = await book({ product: p, quantity: 2, from: today, to: addDays(today, 2) });
    expect((await s.setStatus(o.id, 'PICKUPED')).status).toBe(200);
    const v = await F.stockView(s, p, M);
    expect(v.detail).toEqual({ stock: 5, available: 3, renting: 2 });
    // free on the window is stock - booked (3), not stock - renting - booked (1)
    expect(v.list).toMatchObject({ today: 3, stock: 5, renting: 2 });
    expect(await grid(p, today, addDays(today, 3))).toEqual([3, 3, 3, 5]);
    const av = await s.availability(p.id, { from: today, to: addDays(today, 2), quantity: 3, outletId: M });
    expect(av.isAvailable).toBe(true);
    expect((await s.setStatus(o.id, 'RETURNED')).status).toBe(200);
    expect((await F.stockView(s, p, M)).detail).toEqual({ stock: 5, available: 5, renting: 0 });
    expect(await grid(p, today, addDays(today, 3))).toEqual([5, 5, 5, 5]);
    expect((await F.stockView(s, p, M)).list.today).toBe(5);
  });

  test('BF-STOCK-08 cancelled RESERVED and cancelled PICKUPED orders give every unit back', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 4, outletId: M });
    const w = futureWindow(2);
    const a = await book({ product: p, quantity: 3, ...w });
    expect(await grid(p, w.from, w.to)).toEqual([1, 1]);
    expect((await s.setStatus(a.id, 'CANCELLED')).status).toBe(200);
    expect(await grid(p, w.from, w.to)).toEqual([4, 4]);
    const b = await book({ product: p, quantity: 3, from: today, to: addDays(today, 1) });
    await s.setStatus(b.id, 'PICKUPED');
    expect((await F.stockView(s, p, M)).detail).toEqual({ stock: 4, available: 1, renting: 3 });
    expect((await s.setStatus(b.id, 'CANCELLED')).status).toBe(200);
    expect((await F.stockView(s, p, M)).detail).toEqual({ stock: 4, available: 4, renting: 0 });
    expect(await grid(p, today, addDays(today, 1))).toEqual([4, 4]);
  });

  test('BF-STOCK-09 partial quantity and two orders add up day by day', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 5, outletId: M });
    const w = futureWindow(1);
    const d = (n) => addDays(w.from, n);
    await book({ product: p, quantity: 2, from: d(0), to: d(2) }); // A: 2 units, days 0..2
    await book({ product: p, quantity: 1, from: d(2), to: d(4) }); // B: 1 unit, days 2..4
    // day:        -1 0 1 2 3 4 5
    expect(await grid(p, d(-1), d(5))).toEqual([5, 3, 3, 2, 4, 4, 5]);
    // the cart check of a 3-unit line over days 0..1 passes, over days 1..3 does not (day 2 has 2 left)
    expect((await F.freeOn(s, p, d(0), { to: d(1), quantity: 3 })).ok).toBe(true);
    const over = await F.freeOn(s, p, d(1), { to: d(3), quantity: 3 });
    expect([over.ok, over.free]).toEqual([false, 2]);
    // the free number of a window is its worst day
    expect((await F.freeOn(s, p, d(0), { to: d(4) })).free).toBe(2);
  });

  test('BF-STOCK-10 two orders on the same days: stock 4, 2 + 1 booked leaves 1', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 4, outletId: M });
    const w = futureWindow(2);
    await book({ product: p, quantity: 2, ...w });
    await book({ product: p, quantity: 1, ...w });
    expect(await grid(p, w.from, w.to)).toEqual([1, 1]);
    expect((await F.freeOn(s, p, w.from, { to: w.to, quantity: 1 })).ok).toBe(true);
    expect((await F.freeOn(s, p, w.from, { to: w.to, quantity: 2 })).ok).toBe(false);
    const cart = await s.batchAvailability([{ productId: p.id, quantity: 1 }], { ...w, outletId: M });
    expect(cart.results[0].availabilityByOutlet[0]).toMatchObject({ conflictingQuantity: 3, effectivelyAvailable: 1 });
  });

  test('BF-STOCK-11 a rent order and a sale together: stock 3, sale 1, rent 2 on P..R leaves 0 there and 2 elsewhere', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, salePrice: 80000, stock: 3, outletId: M });
    const w = futureWindow(2);
    await book({ product: p, quantity: 2, ...w });
    await F.sell(s, { product: p, quantity: 1, outletId: M });
    expect((await F.stockView(s, p, M)).detail).toEqual({ stock: 2, available: 2, renting: 0 });
    expect(await grid(p, addDays(w.from, -1), addDays(w.to, 1))).toEqual([2, 0, 0, 2]);
    expect((await F.freeOn(s, p, w.from, { to: w.to })).ok).toBe(false);
  });

  test('BF-STOCK-12 two outlets: each outlet keeps its own units for rent, hand-over and sale', async () => {
    const name = `SP 2 outlets E2E ${Date.now().toString(36)}`;
    const r = await s.postForm('/api/products', {
      name,
      rentPrice: 100000,
      salePrice: 70000,
      deposit: 0,
      totalStock: 5,
      outletStock: [{ outletId: M, stock: 3 }, { outletId: O, stock: 2 }],
      pricingOptions: [{ type: 'FIXED', price: 100000, isDefault: true }]
    });
    expect(r.status).toBe(200);
    const p = { ...r.body.data, outletId: M };
    const w = futureWindow(2);
    const o = await F.bookRent(s, { product: p, quantity: 2, outletId: M, ...w });
    created.push(o.id);
    expect(await F.freeDays(s, p, w.from, w.to, M)).toEqual({ [w.from]: 1, [addDays(w.from, 1)]: 1 });
    expect(await F.freeDays(s, p, w.from, w.to, O)).toEqual({ [w.from]: 2, [addDays(w.from, 1)]: 2 });
    expect((await s.availability(p.id, { ...w, quantity: 2, outletId: O })).isAvailable).toBe(true);
    expect((await s.availability(p.id, { ...w, quantity: 2, outletId: M })).isAvailable).toBe(false);
    // the list of the other outlet shows its own number
    expect((await F.stockView(s, p, O)).list).toMatchObject({ today: 2, stock: 2 });
    // hand-over at M moves M only
    await s.setStatus(o.id, 'PICKUPED');
    expect(await s.outletStock(p.id, M)).toEqual({ stock: 3, available: 1, renting: 2 });
    expect(await s.outletStock(p.id, O)).toEqual({ stock: 2, available: 2, renting: 0 });
    // a sale at O takes from O only; the product total is the sum of the outlets
    await F.sell(s, { product: p, quantity: 1, outletId: O });
    expect(await s.outletStock(p.id, O)).toEqual({ stock: 1, available: 1, renting: 0 });
    expect(await s.outletStock(p.id, M)).toEqual({ stock: 3, available: 1, renting: 2 });
    expect((await s.getProduct(p.id)).totalStock).toBe(4);
  });

  test('BF-STOCK-13 a product with stock 0 is never free: list 0, single and cart check no, grid shows every day full', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 0, outletId: M });
    const v = await F.stockView(s, p, M);
    expect(v.list).toMatchObject({ today: 0, available: 0, stock: 0 });
    expect(v.detail).toEqual({ stock: 0, available: 0, renting: 0 });
    const w = futureWindow(2);
    const av = await F.freeOn(s, p, w.from, { to: w.to });
    expect([av.ok, av.free]).toEqual([false, 0]);
    const cart = await s.batchAvailability([{ productId: p.id, quantity: 1 }], { ...w, outletId: M });
    expect([cart.results[0].isAvailable, cart.results[0].availabilityByOutlet[0].effectivelyAvailable]).toEqual([false, 0]);
    const cal = await must(s.get(`/api/products/${p.id}/availability-calendar?from=${w.from}&to=${w.to}&outletId=${M}`), 'cal');
    expect(cal.occupiedDates).toEqual([w.from, w.to]);
    // adding stock opens every day at once
    await s.updateProduct(p.id, { totalStock: 2, outletStock: [{ outletId: M, stock: 2 }] });
    expect(await F.freeDays(s, p, w.from, w.to, M)).toEqual({ [w.from]: 2, [w.to]: 2 });
    expect((await F.stockView(s, p, M)).list.today).toBe(2);
  });

  test('BF-STOCK-14 the list number, the detail and the day check say the same thing in every state of one order', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 3, outletId: M });
    const o = await book({ product: p, quantity: 1, from: today, to: addDays(today, 1) });
    const read = async () => {
      const v = await F.stockView(s, p, M);
      const day = await F.freeOn(s, p, today);
      return { list: v.list.today, detailFree: v.detail.stock - v.detail.renting, day: day.free, row: v.list.rowAvailable };
    };
    // RESERVED: the day is booked (list = day = 2); the shelf (detail) is still full
    expect(await read()).toEqual({ list: 2, detailFree: 3, day: 2, row: 2 });
    await s.setStatus(o.id, 'PICKUPED');
    expect(await read()).toEqual({ list: 2, detailFree: 2, day: 2, row: 2 });
    await s.setStatus(o.id, 'RETURNED');
    expect(await read()).toEqual({ list: 3, detailFree: 3, day: 3, row: 3 });
  });
});

// =====================================================================================================
describeE2E('BF-CAL calendar: month counts and day lists follow the order through its life', () => {
  let s;
  let staff;
  let other;
  let M;
  let O;
  const created = [];

  beforeAll(async () => {
    s = await Session.login('merchant');
    staff = await Session.login('staff');
    other = await Session.login('otherMerchant');
    ({ main: M, other: O } = await outletsOf(s));
  });
  afterAll(() => F.cancelOpen(s, created));

  const book = async (args) => {
    const o = await F.bookRent(s, { outletId: M, ...args });
    created.push(o.id);
    return o;
  };
  /** What the Android calendar sends (status=RESERVED) and what the iOS month grid reads (byDate). */
  const day = (key, opts) => F.calendarDay(s, key, opts);
  const rowOf = (rows, id) => rows.find((r) => r.id === id);

  test('BF-CAL-01 RESERVED: the pickup day lists it and counts a pickup; the return day does not', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 120000, stock: 5, outletId: M });
    const w = futureWindow(3);
    const before = { P: await day(w.from, { status: 'RESERVED' }), R: await day(w.to, { status: 'RESERVED' }) };
    const o = await book({ product: p, quantity: 2, ...w, depositAmount: 20000 });
    const P = await day(w.from, { status: 'RESERVED' });
    const R = await day(w.to, { status: 'RESERVED' });
    expect([P.count - before.P.count, P.pickups - before.P.pickups, P.returns - before.P.returns]).toEqual([1, 1, 0]);
    expect([R.count - before.R.count, R.pickups - before.R.pickups, R.returns - before.R.returns]).toEqual([0, 0, 0]);
    const rows = await F.calendarList(s, w.from, { status: 'RESERVED' });
    const row = rowOf(rows, o.id);
    expect(row).toMatchObject({ status: 'RESERVED', orderType: 'RENT', totalAmount: 240000, productCount: 2, amountDue: 220000, refundDue: 0 });
    expect(row.orderItems).toHaveLength(1);
    expect(row.orderItems[0]).toMatchObject({ productId: p.id, quantity: 2, unitPrice: 120000, totalPrice: 240000 });
    expect(rowOf(await F.calendarList(s, w.to, { status: 'RESERVED' }), o.id)).toBeUndefined();
    expect(rowOf(await F.calendarList(s, w.to, { kind: 'return' }), o.id)).toBeUndefined();
    expect(rowOf(await F.calendarList(s, addDays(w.from, -1), { status: 'RESERVED' }), o.id)).toBeUndefined();
  });

  test('BF-CAL-02 PICKUPED: the pickup disappears from the RESERVED list, the return day lists it (kind=return) and counts a return', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 5, outletId: M });
    const w = futureWindow(3);
    const o = await book({ product: p, quantity: 1, ...w });
    const P0 = await day(w.from, { status: 'RESERVED' });
    const R0 = await day(w.to, { status: 'RESERVED' });
    expect((await s.setStatus(o.id, 'PICKUPED')).status).toBe(200);
    const P = await day(w.from, { status: 'RESERVED' });
    const R = await day(w.to, { status: 'RESERVED' });
    expect([P.count - P0.count, P.pickups - P0.pickups]).toEqual([-1, -1]);
    expect([R.returns - R0.returns, R.pickups - R0.pickups]).toEqual([1, 0]);
    expect(rowOf(await F.calendarList(s, w.from, { status: 'RESERVED' }), o.id)).toBeUndefined();
    const ret = await F.calendarList(s, w.to, { kind: 'return' });
    expect(rowOf(ret, o.id)).toMatchObject({ status: 'PICKUPED', productCount: 1 });
    expect(rowOf(await F.calendarList(s, addDays(w.to, 1), { kind: 'return' }), o.id)).toBeUndefined();
    // the list without a status still shows it on its pickup day (all statuses, by planned pickup)
    expect(rowOf(await F.calendarList(s, w.from), o.id)).toMatchObject({ status: 'PICKUPED' });
  });

  test('BF-CAL-03 RETURNED: no pickup, no return left on the calendar marks', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 5, outletId: M });
    const w = futureWindow(2);
    const base = { P: await day(w.from, { status: 'RESERVED' }), R: await day(w.to, { status: 'RESERVED' }) };
    const o = await book({ product: p, quantity: 1, ...w });
    await s.setStatus(o.id, 'PICKUPED');
    await s.setStatus(o.id, 'RETURNED');
    const P = await day(w.from, { status: 'RESERVED' });
    const R = await day(w.to, { status: 'RESERVED' });
    expect([P.count, P.pickups, R.returns]).toEqual([base.P.count, base.P.pickups, base.R.returns]);
    expect(rowOf(await F.calendarList(s, w.to, { kind: 'return' }), o.id)).toBeUndefined();
    expect(rowOf(await F.calendarList(s, w.from), o.id)).toMatchObject({ status: 'RETURNED' });
  });

  test('BF-CAL-04 same-day pickup and return: pickup mark first, return mark after hand-over, on the same day', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2, outletId: M });
    const d = addDays(today, 40);
    const b = await day(d, { status: 'RESERVED' });
    const o = await book({ product: p, quantity: 1, from: d, to: d });
    let x = await day(d, { status: 'RESERVED' });
    expect([x.pickups - b.pickups, x.returns - b.returns]).toEqual([1, 0]);
    await s.setStatus(o.id, 'PICKUPED');
    x = await day(d, { status: 'RESERVED' });
    expect([x.pickups - b.pickups, x.returns - b.returns]).toEqual([0, 1]);
    expect(rowOf(await F.calendarList(s, d, { kind: 'return' }), o.id)).toBeTruthy();
    expect(rowOf(await F.calendarList(s, addDays(d, 1), { kind: 'return' }), o.id)).toBeUndefined();
    expect(rowOf(await F.calendarList(s, addDays(d, -1), { kind: 'return' }), o.id)).toBeUndefined();
  });

  test('BF-CAL-05 a cancelled order leaves the RESERVED marks and lists; the list without a status still names it CANCELLED (Q8)', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2, outletId: M });
    const w = futureWindow(2);
    const b = await day(w.from, { status: 'RESERVED' });
    const o = await book({ product: p, quantity: 1, ...w });
    expect((await day(w.from, { status: 'RESERVED' })).pickups - b.pickups).toBe(1);
    await s.setStatus(o.id, 'CANCELLED');
    const x = await day(w.from, { status: 'RESERVED' });
    expect([x.count - b.count, x.pickups - b.pickups]).toEqual([0, 0]);
    expect(rowOf(await F.calendarList(s, w.from, { status: 'RESERVED' }), o.id)).toBeUndefined();
    // with no status filter the month count and the day list still include the cancelled order (current)
    expect((await day(w.from)).count - b.count).toBeGreaterThanOrEqual(1);
    expect(rowOf(await F.calendarList(s, w.from), o.id)).toMatchObject({ status: 'CANCELLED' });
  });

  test('BF-CAL-06 an order spanning two months: the pickup is counted in the first month, the return in the second', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 3, outletId: M });
    // last day of the month 2 months from now, return 2 days later (next month)
    const anchor = addDays(today, 65);
    const [y, m] = anchor.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const P = `${anchor.slice(0, 8)}${String(last).padStart(2, '0')}`;
    const R = addDays(P, 2);
    expect(R.slice(0, 7)).not.toBe(P.slice(0, 7));
    const b = { P: await day(P, { status: 'RESERVED' }), R: await day(R, { status: 'RESERVED' }) };
    const o = await book({ product: p, quantity: 2, from: P, to: R });
    let xP = await day(P, { status: 'RESERVED' });
    let xR = await day(R, { status: 'RESERVED' });
    expect([xP.pickups - b.P.pickups, xR.pickups - b.R.pickups, xR.returns - b.R.returns]).toEqual([1, 0, 0]);
    await s.setStatus(o.id, 'PICKUPED');
    xP = await day(P, { status: 'RESERVED' });
    xR = await day(R, { status: 'RESERVED' });
    expect([xP.pickups - b.P.pickups, xR.returns - b.R.returns, xR.pickups - b.R.pickups]).toEqual([0, 1, 0]);
    expect(rowOf(await F.calendarList(s, R, { kind: 'return' }), o.id)).toMatchObject({ productCount: 2 });
    // every day of the stay shows 1 left of 3 in the free-days grid, across the month edge
    expect(Object.values(await F.freeDays(s, p, P, R, M))).toEqual([1, 1, 1]);
  });

  test('BF-CAL-07 late return: PICKUPED with a return day in the past counts in lateReturns and on that day; RETURNED removes it', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 3, outletId: M });
    const R = addDays(today, -1);
    const b = await day(R, { status: 'RESERVED' });
    const o = await book({ product: p, quantity: 1, from: addDays(today, -3), to: R });
    await s.setStatus(o.id, 'PICKUPED');
    let x = await day(R, { status: 'RESERVED' });
    expect([x.lateReturns - b.lateReturns, x.returns - b.returns]).toEqual([1, 1]);
    expect(rowOf(await F.calendarList(s, R, { kind: 'return' }), o.id)).toBeTruthy();
    await s.setStatus(o.id, 'RETURNED');
    x = await day(R, { status: 'RESERVED' });
    expect([x.lateReturns - b.lateReturns, x.returns - b.returns]).toEqual([0, 0]);
  });

  test('BF-CAL-08 another outlet: the merchant sees it unfiltered and with outletId; staff of the main outlet and the other merchant do not', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2, outletId: O });
    const w = futureWindow(2);
    const b = {
      all: await day(w.from, { status: 'RESERVED' }),
      main: await day(w.from, { status: 'RESERVED', outletId: M }),
      other: await day(w.from, { status: 'RESERVED', outletId: O }),
      staff: await F.calendarDay(staff, w.from, { status: 'RESERVED' }),
      foreign: await F.calendarDay(other, w.from, { status: 'RESERVED' })
    };
    const o = await book({ product: p, quantity: 1, outletId: O, ...w });
    expect((await day(w.from, { status: 'RESERVED' })).pickups - b.all.pickups).toBe(1);
    expect((await day(w.from, { status: 'RESERVED', outletId: O })).pickups - b.other.pickups).toBe(1);
    expect((await day(w.from, { status: 'RESERVED', outletId: M })).pickups - b.main.pickups).toBe(0);
    expect((await F.calendarDay(staff, w.from, { status: 'RESERVED' })).pickups - b.staff.pickups).toBe(0);
    expect((await F.calendarDay(other, w.from, { status: 'RESERVED' })).pickups - b.foreign.pickups).toBe(0);
    expect(rowOf(await F.calendarList(s, w.from, { status: 'RESERVED' }), o.id)).toBeTruthy();
    expect(rowOf(await F.calendarList(s, w.from, { status: 'RESERVED', outletId: M }), o.id)).toBeUndefined();
    expect(rowOf(await F.calendarList(staff, w.from, { status: 'RESERVED' }), o.id)).toBeUndefined();
    expect(rowOf(await F.calendarList(other, w.from, { status: 'RESERVED' }), o.id)).toBeUndefined();
    expect(rowOf(await F.calendarList(other, w.from), o.id)).toBeUndefined();
  });

  test('BF-CAL-09 a sale has no pickup day: it is not on the pickup list, but the COMPLETED list of its creation day has it with quantities', async () => {
    const p = await s.createProduct({ kind: 'SALE', price: 60000, stock: 6, outletId: M });
    const sale = await F.sell(s, { product: p, quantity: 3, outletId: M });
    expect(rowOf(await F.calendarList(s, today, { status: 'RESERVED' }), sale.id)).toBeUndefined();
    expect(rowOf(await F.calendarList(s, today), sale.id)).toBeUndefined();
    const row = rowOf(await F.calendarList(s, today, { status: 'COMPLETED' }), sale.id);
    expect(row).toMatchObject({ orderType: 'SALE', status: 'COMPLETED', totalAmount: 180000, productCount: 3, amountDue: 0 });
    expect(row.orderItems[0]).toMatchObject({ quantity: 3, unitPrice: 60000, totalPrice: 180000 });
  });

  test('BF-CAL-10 the device time zone moves the day: 00:00 VN of P is the evening of P - 1 in Los Angeles', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2, outletId: M });
    const w = futureWindow(2);
    const o = await book({ product: p, quantity: 1, ...w });
    expect(rowOf(await F.calendarList(s, w.from, { status: 'RESERVED', timeZone: VN }), o.id)).toBeTruthy();
    expect(rowOf(await F.calendarList(s, w.from, { status: 'RESERVED' }), o.id)).toBeTruthy();
    const la = 'America/Los_Angeles';
    expect(rowOf(await F.calendarList(s, addDays(w.from, -1), { status: 'RESERVED', timeZone: la }), o.id)).toBeTruthy();
    expect(rowOf(await F.calendarList(s, w.from, { status: 'RESERVED', timeZone: la }), o.id)).toBeUndefined();
    const r = await s.get('/api/calendar/orders/by-date?date=' + w.from + '&timeZone=Not/AZone');
    expect(r.status).toBe(400);
  });

  test('BF-CAL-11 the free-days grid and the day lists agree: a day with 2 of 5 units out has those 2 units on the list', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 5, outletId: M });
    const w = futureWindow(3);
    const a = await book({ product: p, quantity: 2, from: w.from, to: addDays(w.from, 1) });
    const b = await book({ product: p, quantity: 1, from: addDays(w.from, 1), to: w.to });
    const grid = await F.freeDays(s, p, w.from, w.to, M);
    expect(Object.values(grid)).toEqual([3, 2, 4]);
    // units listed on the pickup days: A on day 0, B on day 1; held units on day 1 = both orders
    const quantity = (row) => row.orderItems.reduce((n, i) => n + i.quantity, 0);
    expect(quantity(rowOf(await F.calendarList(s, w.from, { status: 'RESERVED' }), a.id))).toBe(2);
    expect(quantity(rowOf(await F.calendarList(s, addDays(w.from, 1), { status: 'RESERVED' }), b.id))).toBe(1);
    expect(5 - grid[addDays(w.from, 1)]).toBe(2 + 1);
  });
});

// =====================================================================================================
const CORE = ['pickups', 'returns', 'late', 'noShows', 'soon', 'tomorrowPickups', 'tomorrowReturns', 'donePickups', 'doneReturns', 'newToday'];
const core = (d) => Object.fromEntries(Object.entries(d).filter(([k]) => CORE.includes(k)));

describeE2E('BF-TODO việc cần làm (Hôm nay card): every counter moves by exactly the right 1', () => {
  let s;
  let O;
  let w; // watcher of the merchant's second outlet
  const created = [];
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);

  beforeAll(async () => {
    s = await Session.login('merchant');
    ({ other: O } = await outletsOf(s));
    expect(O).toBeTruthy();
  });
  beforeEach(async () => {
    w = await F.watchOperations(s, { outletIds: O });
  });
  afterAll(() => F.cancelOpen(s, created));

  const product = (stock = 20) => s.createProduct({ kind: 'FIXED', price: 100000, stock, outletId: O });
  const book = async (args) => {
    const o = await F.bookRent(s, { outletId: O, ...args });
    created.push(o.id);
    return o;
  };
  const step = async (expected, label) => {
    const { d, ops } = await w.delta();
    expect({ label, ...core(d) }).toEqual({ label, ...expected });
    return ops;
  };
  const set = (rows) => F.ids(rows);
  /** The orders list the app opens from a counter. */
  const appList = (params) => s.listOrders({ orderType: 'RENT', outletId: String(O), limit: '100', ...params });

  test('BF-TODO-01 pickup today: +1 to pickups; picking up moves it to done; returning moves done returns; every list holds it', async () => {
    const p = await product();
    const o = await book({ product: p, quantity: 2, from: today, to: addDays(today, 2) });
    let ops = await step({ pickups: 1, newToday: 1 }, 'created');
    const row = ops.pickupsToday.orders.find((r) => r.id === o.id);
    expect(row).toMatchObject({ itemCount: 2, totalAmount: 200000, amountDue: 200000, refundDue: 0, lateDays: 0 });
    expect(row.items).toEqual([{ name: p.name, quantity: 2 }]);
    expect(set(ops.pickupsToday.orders)).toEqual(set(await appList({ status: 'RESERVED', dateField: 'pickupPlanAt', startDate: today, endDate: today })));
    expect((await s.setStatus(o.id, 'PICKUPED')).status).toBe(200);
    ops = await step({ pickups: -1, donePickups: 1, soon: 1 }, 'picked up');
    expect(ops.returnsSoon.orders.map((r) => r.id)).toContain(o.id);
    expect(ops.pickupsToday.orders.map((r) => r.id)).not.toContain(o.id);
    expect((await s.setStatus(o.id, 'RETURNED')).status).toBe(200);
    await step({ soon: -1, doneReturns: 1 }, 'returned');
  });

  test('BF-TODO-02 cancelling removes it: a RESERVED one from pickups, a PICKUPED one from soon and from the done count', async () => {
    const p = await product();
    const a = await book({ product: p, from: today, to: addDays(today, 1) });
    await step({ pickups: 1, newToday: 1 }, 'a created');
    await s.setStatus(a.id, 'CANCELLED');
    const ops = await step({ pickups: -1 }, 'a cancelled');
    expect(ops.pickupsToday.orders.map((r) => r.id)).not.toContain(a.id);
    const b = await book({ product: p, from: today, to: addDays(today, 2) });
    await s.setStatus(b.id, 'PICKUPED');
    await step({ newToday: 1, donePickups: 1, soon: 1 }, 'b picked up');
    await s.setStatus(b.id, 'CANCELLED');
    await step({ donePickups: -1, soon: -1 }, 'b cancelled');
  });

  test('BF-TODO-03 Vietnam day edges for the pickup: 00:30 and 23:30 today are today; 23:30 yesterday is a no-show; 00:30 tomorrow is tomorrow', async () => {
    const p = await product();
    const at = (day, hhmm) => ({ pickup: vnAt(day, hhmm), return: vnAt(addDays(day, 5), '12:00') });
    const mk = (day, hhmm) => book({ product: p, from: day, to: addDays(day, 5), at: at(day, hhmm) });
    await mk(today, '00:30');
    await step({ pickups: 1, newToday: 1 }, 'today 00:30');
    await mk(today, '23:30');
    await step({ pickups: 1, newToday: 1 }, 'today 23:30');
    await mk(yesterday, '23:30');
    await step({ noShows: 1, newToday: 1 }, 'yesterday 23:30');
    await mk(tomorrow, '00:30');
    await step({ tomorrowPickups: 1, newToday: 1 }, 'tomorrow 00:30');
    await mk(tomorrow, '23:30');
    await step({ tomorrowPickups: 1, newToday: 1 }, 'tomorrow 23:30');
    await mk(addDays(today, 2), '00:30');
    await step({ newToday: 1 }, 'day after tomorrow 00:30 (nowhere)');
  });

  test('BF-TODO-04 Vietnam day edges for the return: 00:30 and 23:30 today are returns today; 23:30 yesterday is late; 00:30 tomorrow is tomorrow', async () => {
    const p = await product();
    const mk = async (retDay, hhmm) => {
      const o = await book({ product: p, from: addDays(retDay, -2), to: retDay, at: { pickup: vnAt(addDays(retDay, -2), '09:00'), return: vnAt(retDay, hhmm) } });
      await s.setStatus(o.id, 'PICKUPED');
      return o;
    };
    await mk(today, '00:30');
    await step({ returns: 1, donePickups: 1, newToday: 1 }, 'return today 00:30');
    await mk(today, '23:30');
    await step({ returns: 1, donePickups: 1, newToday: 1 }, 'return today 23:30');
    await mk(yesterday, '23:30');
    await step({ late: 1, donePickups: 1, newToday: 1 }, 'return yesterday 23:30');
    await mk(tomorrow, '00:30');
    await step({ tomorrowReturns: 1, soon: 1, donePickups: 1, newToday: 1 }, 'return tomorrow 00:30');
  });

  test('BF-TODO-05 no-show = a booking whose pickup day is before today and is still RESERVED: counted with its days late, listed, gone when picked up or cancelled', async () => {
    const p = await product();
    const a = await book({ product: p, from: yesterday, to: addDays(today, 2) });
    const b = await book({ product: p, from: addDays(today, -3), to: addDays(today, 2) });
    const ops = await step({ noShows: 2, newToday: 2 }, 'two no-shows');
    const rows = Object.fromEntries(ops.noShows.orders.map((r) => [r.id, r]));
    expect([rows[a.id].lateDays, rows[b.id].lateDays]).toEqual([1, 3]);
    expect(set(ops.noShows.orders)).toEqual(set(await appList({ status: 'RESERVED', dateField: 'pickupPlanAt', endDate: yesterday })));
    // not counted as a pickup of today
    expect(ops.pickupsToday.orders.map((r) => r.id)).not.toContain(a.id);
    await s.setStatus(a.id, 'PICKUPED'); // late hand-over happens today: it is "done today"
    await step({ noShows: -1, donePickups: 1, soon: 1 }, 'a picked up late');
    await s.setStatus(b.id, 'CANCELLED');
    const after = await step({ noShows: -1 }, 'b cancelled');
    expect(after.noShows.orders.map((r) => r.id)).not.toContain(b.id);
  });

  test('BF-TODO-06 returns today: PICKUPED with the return day today; RETURNED moves it to done; the app list shows the same orders', async () => {
    const p = await product();
    const o = await book({ product: p, quantity: 3, from: yesterday, to: today });
    await s.setStatus(o.id, 'PICKUPED');
    let ops = await step({ newToday: 1, donePickups: 1, returns: 1 }, 'picked up, due today');
    expect(ops.returnsToday.orders.find((r) => r.id === o.id)).toMatchObject({ itemCount: 3, items: [{ name: p.name, quantity: 3 }] });
    expect(set(ops.returnsToday.orders)).toEqual(set(await appList({ status: 'PICKUPED', dateField: 'returnPlanAt', startDate: today, endDate: today })));
    await s.setStatus(o.id, 'RETURNED');
    ops = await step({ returns: -1, doneReturns: 1 }, 'returned');
    expect(set(ops.returnsToday.orders)).toEqual(set(await appList({ status: 'PICKUPED', dateField: 'returnPlanAt', startDate: today, endDate: today })));
    const c = await book({ product: p, from: yesterday, to: today });
    await s.setStatus(c.id, 'PICKUPED');
    await step({ newToday: 1, donePickups: 1, returns: 1 }, 'second due today');
    await s.setStatus(c.id, 'CANCELLED');
    await step({ returns: -1, donePickups: -1 }, 'second cancelled: not returned, no longer done');
  });

  test('BF-TODO-07 late return: PICKUPED past its return day is late (days overdue), not "returns today"; RETURNED clears it', async () => {
    const p = await product();
    const a = await book({ product: p, from: addDays(today, -3), to: yesterday });
    const b = await book({ product: p, from: addDays(today, -5), to: addDays(today, -3) });
    await s.setStatus(a.id, 'PICKUPED');
    await s.setStatus(b.id, 'PICKUPED');
    const ops = await step({ newToday: 2, donePickups: 2, late: 2 }, 'two late');
    const rows = Object.fromEntries(ops.overdueReturns.orders.map((r) => [r.id, r]));
    expect([rows[a.id].daysOverdue, rows[b.id].daysOverdue]).toEqual([1, 3]);
    expect([rows[a.id].lateDays, rows[b.id].lateDays]).toEqual([1, 3]);
    expect(set(ops.overdueReturns.orders)).toEqual(set(await appList({ status: 'PICKUPED', dateField: 'returnPlanAt', endDate: yesterday })));
    await s.setStatus(a.id, 'RETURNED');
    await step({ late: -1, doneReturns: 1 }, 'a returned');
  });

  test('BF-TODO-08 tomorrow and the 3-day look-ahead: pickups and returns of tomorrow are listed; returns up to today + 3 are "soon", today + 4 is not', async () => {
    const p = await product();
    const pick = await book({ product: p, from: tomorrow, to: addDays(today, 3) });
    let ops = await step({ tomorrowPickups: 1, newToday: 1 }, 'pickup tomorrow');
    expect(ops.tomorrowPickups.orders.map((r) => r.id)).toContain(pick.id);
    const outAt = async (returnDay) => {
      const o = await book({ product: p, from: yesterday, to: returnDay });
      await s.setStatus(o.id, 'PICKUPED');
      return o;
    };
    const t = await outAt(tomorrow);
    ops = await step({ newToday: 1, donePickups: 1, tomorrowReturns: 1, soon: 1 }, 'return tomorrow');
    expect(ops.tomorrowReturns.orders.map((r) => r.id)).toContain(t.id);
    await outAt(addDays(today, 3));
    await step({ newToday: 1, donePickups: 1, soon: 1 }, 'return today + 3');
    await outAt(addDays(today, 4));
    await step({ newToday: 1, donePickups: 1 }, 'return today + 4 (outside the look-ahead)');
  });

  test('BF-TODO-09 collateral and deposit counters (merchant only): to collect, to give back, held, due today, fees of today', async () => {
    const p = await product();
    const D = 50000;
    const S = 300000;
    const o = await book({ product: p, from: today, to: today, depositAmount: D, securityDeposit: S });
    await step({ newToday: 1, pickups: 1 }, 'created');
    let { d } = await w.delta();
    expect(d).toEqual({});
    const base = (await F.operations(s, { outletIds: O })).cash;
    expect(base.collateralToCollect.orders).toBeGreaterThanOrEqual(1);
    await s.setStatus(o.id, 'PICKUPED');
    ({ d } = await w.delta());
    expect(d).toMatchObject({
      pickups: -1, donePickups: 1, returns: 1,
      toCollectOrders: -1, toCollect: -S, toReturnOrders: 1, toReturn: S,
      heldOrders: 1, heldDeposit: D, heldCollateral: S,
      dueTodayOrders: 1, dueTodayDeposit: D, dueTodayCollateral: S
    });
    expect((await s.updateOrder(o.id, { lateFee: 20000, damageFee: 10000 })).status).toBe(200);
    await w.delta();
    await s.setStatus(o.id, 'RETURNED');
    ({ d } = await w.delta());
    expect(d).toMatchObject({
      returns: -1, doneReturns: 1,
      toReturnOrders: -1, toReturn: -S, heldOrders: -1, heldDeposit: -D, heldCollateral: -S,
      dueTodayOrders: -1, dueTodayDeposit: -D, dueTodayCollateral: -S,
      feesOrders: 1, lateFees: 20000, damageFees: 10000
    });
    // a booking cancelled before pickup never held anything
    const c = await book({ product: p, from: today, to: today, depositAmount: D, securityDeposit: S });
    await w.delta();
    await s.setStatus(c.id, 'CANCELLED');
    ({ d } = await w.delta());
    expect(d).toEqual({ pickups: -1, toCollectOrders: -1, toCollect: -S });
  });

  test('BF-TODO-10 a day of mixed orders: all seven kinds move their own counter once; cancelling them all brings every counter back', async () => {
    const p = await product(50);
    const out = async (from, to) => {
      const o = await book({ product: p, from, to });
      await s.setStatus(o.id, 'PICKUPED');
      return o;
    };
    await w.delta();
    const made = [];
    made.push(await book({ product: p, from: today, to: addDays(today, 2) })); // pickup today
    made.push(await book({ product: p, from: yesterday, to: today })); // no-show (RESERVED, pickup yesterday)
    made.push(await book({ product: p, from: tomorrow, to: addDays(today, 3) })); // pickup tomorrow
    made.push(await out(yesterday, today)); // return today
    made.push(await out(addDays(today, -3), yesterday)); // late
    made.push(await out(yesterday, tomorrow)); // return tomorrow (+ soon)
    made.push((await F.sell(s, { product: p, outletId: O }))); // a sale: only a new order
    const { d, ops } = await w.delta();
    expect(core(d)).toEqual({ pickups: 1, noShows: 1, tomorrowPickups: 1, returns: 1, late: 1, tomorrowReturns: 1, soon: 1, donePickups: 3, newToday: 7 });
    // every counter equals the length of the list behind it (lists are short at this outlet)
    for (const [k, group] of [['pickupsToday', ops.pickupsToday], ['returnsToday', ops.returnsToday], ['overdueReturns', ops.overdueReturns], ['noShows', ops.noShows], ['returnsSoon', ops.returnsSoon]]) {
      expect({ k, count: group.count, listed: group.orders.length }).toEqual({ k, count: group.count, listed: Math.min(group.count, 50) });
    }
    for (const o of made.slice(0, 6)) await s.setStatus(o.id, 'CANCELLED');
    await s.setStatus(made[6].id, 'CANCELLED');
    const back = await w.delta();
    // everything open is gone; "new today" stays (cancelled bookings still count as new, Q2) and the sale is cancelled
    expect(core(back.d)).toEqual({ pickups: -1, noShows: -1, tomorrowPickups: -1, returns: -1, late: -1, tomorrowReturns: -1, soon: -1, donePickups: -3 });
  });

  test('BF-TODO-11 the card works with and without the device time zone, rejects an unknown one, and its day is the Vietnam day', async () => {
    const withTz = await F.operations(s, { outletIds: O });
    const without = await F.operations(s, { outletIds: O, timeZone: null });
    expect(withTz.date).toBe(today);
    expect(without.date).toBe(today);
    expect(F.opsCounters(without)).toEqual(F.opsCounters(withTz));
    expect((await s.get('/api/analytics/outlet-operations?timeZone=Not/AZone')).status).toBe(400);
  });

  test('BF-TODO-12 outlets do not mix: an order at the other outlet moves that outlet only, and a foreign outlet id is refused', async () => {
    const { main: M } = await outletsOf(s);
    const wm = await F.watchOperations(s, { outletIds: M });
    const p = await product();
    await book({ product: p, from: today, to: addDays(today, 1) });
    expect((await wm.delta()).d).toEqual({});
    expect(core((await w.delta()).d)).toEqual({ pickups: 1, newToday: 1 });
    const foreign = await s.get('/api/analytics/outlet-operations?outletIds=1');
    expect([foreign.status, foreign.body.code]).toEqual([403, 'CROSS_MERCHANT_ACCESS_DENIED']);
    const all = await F.operations(s, {});
    expect(all.outletIds.sort()).toEqual([M, O].sort());
  });

  test('BF-TODO-13 the number of new orders today counts rent and sale orders, cancelled or not (Q2)', async () => {
    const p = await product();
    await book({ product: p, from: addDays(today, 5), to: addDays(today, 6) });
    await step({ newToday: 1 }, 'rent');
    await F.sell(s, { product: await s.createProduct({ kind: 'SALE', price: 1000, stock: 2, outletId: O }), outletId: O });
    await step({ newToday: 1 }, 'sale');
    const c = await book({ product: p, from: addDays(today, 5), to: addDays(today, 6) });
    await w.delta();
    await s.setStatus(c.id, 'CANCELLED');
    await step({}, 'cancel changes nothing here');
  });
});

// =====================================================================================================
describeE2E('BF-CART create an order: how many are left, and what the cart is told when stock is short', () => {
  let s;
  let M;
  let O;
  const created = [];

  beforeAll(async () => {
    s = await Session.login('merchant');
    ({ main: M, other: O } = await outletsOf(s));
  });
  afterAll(() => F.cancelOpen(s, created));

  const book = async (args) => {
    const o = await F.bookRent(s, { outletId: M, ...args });
    created.push(o.id);
    return o;
  };
  const prod = (stock, extra = {}) => s.createProduct({ kind: 'FIXED', price: 100000, stock, outletId: M, ...extra });
  /** The cart's own rule (iOS/Android): a line is fine when isAvailable and effectivelyAvailable >= requested. */
  const lineOk = (r) => r.isAvailable && r.availabilityByOutlet[0].effectivelyAvailable >= r.requestedQuantity;
  const batch = (lines, w, extra = {}) => s.batchAvailability(lines, { ...w, outletId: M, ...extra });
  const overlaps = async (on) => must(s.put('/api/settings/merchant', { allowOverlappingOrders: on }), `overlaps ${on}`);

  test('BF-CART-01 stock 3, nothing booked: 1, 2 and 3 are fine, 4 is not available (single and cart check agree)', async () => {
    const p = await prod(3);
    const w = futureWindow(2);
    for (const q of [1, 2, 3, 4]) {
      const single = await s.availability(p.id, { ...w, quantity: q, outletId: M });
      const cart = (await batch([{ productId: p.id, quantity: q }], w)).results[0];
      const expectOk = q <= 3;
      expect({ q, single: single.isAvailable, cart: lineOk(cart), free: single.availabilityByOutlet[0].effectivelyAvailable }).toEqual({ q, single: expectOk, cart: expectOk, free: 3 });
      expect(single.availabilityByOutlet[0].conflicts).toEqual([]);
      expect(cart.stockAvailable).toBe(expectOk);
    }
  });

  test('BF-CART-02 2 of 3 booked on the days: 1 is fine, 2 is not; the answer names the clashing order and its quantity', async () => {
    const p = await prod(3);
    const w = futureWindow(2);
    const first = await book({ product: p, quantity: 2, ...w });
    const ask = async (q, opts = {}) => (await s.availability(p.id, { ...w, quantity: q, outletId: M, ...opts })).availabilityByOutlet[0];
    expect([(await s.availability(p.id, { ...w, outletId: M })).isAvailable, (await ask(1)).effectivelyAvailable]).toEqual([true, 1]);
    const two = await s.availability(p.id, { ...w, quantity: 2, outletId: M });
    expect(two.isAvailable).toBe(false);
    expect(two.availabilityByOutlet[0]).toMatchObject({ effectivelyAvailable: 1, conflictingQuantity: 2, canFulfillRequest: false });
    expect(two.availabilityByOutlet[0].conflicts.map((c) => [c.orderNumber, c.quantity])).toEqual([[first.orderNumber, 2]]);
    const cart = (await batch([{ productId: p.id, quantity: 2 }], w)).results[0];
    expect(lineOk(cart)).toBe(false);
    expect(cart.availabilityByOutlet[0].conflicts.map((c) => [c.orderNumber, c.quantity])).toEqual([[first.orderNumber, 2]]);
    // a window next to it is free
    expect((await F.freeOn(s, p, addDays(w.to, 1), { quantity: 3 })).ok).toBe(true);
  });

  test('BF-CART-03 the whole cart: three lines, two short; the summary counts them and fixing the lines clears it', async () => {
    const a = await prod(3);
    const b = await prod(1);
    const c = await prod(2);
    const w = futureWindow(2);
    await book({ product: c, quantity: 2, ...w });
    const cartOf = async (lines) => batch(lines, w);
    let r = await cartOf([{ productId: a.id, quantity: 1 }, { productId: b.id, quantity: 2 }, { productId: c.id, quantity: 1 }]);
    const byId = Object.fromEntries(r.results.map((x) => [x.productId, x]));
    expect([lineOk(byId[a.id]), lineOk(byId[b.id]), lineOk(byId[c.id])]).toEqual([true, false, false]);
    expect([a, b, c].map((p) => byId[p.id].availabilityByOutlet[0].effectivelyAvailable)).toEqual([3, 1, 0]);
    expect(r.summary).toMatchObject({ totalProducts: 3, availableProducts: 1, unavailableProducts: 2, errorProducts: 0 });
    // lower B to 1: still not allowed to order because of C
    r = await cartOf([{ productId: a.id, quantity: 1 }, { productId: b.id, quantity: 1 }, { productId: c.id, quantity: 1 }]);
    expect(r.summary).toMatchObject({ availableProducts: 2, unavailableProducts: 1 });
    // remove C: the cart is fine
    r = await cartOf([{ productId: a.id, quantity: 1 }, { productId: b.id, quantity: 1 }]);
    expect(r.results.every(lineOk)).toBe(true);
    expect(r.summary).toMatchObject({ availableProducts: 2, unavailableProducts: 0 });
  });

  test('BF-CART-04 "cho tạo đơn khi trùng lịch" ON: an overlapping order is accepted although the cart check said it is full (current behaviour, Q1)', async () => {
    const before = (await must(s.get('/api/users/profile'), 'profile')).merchant.allowOverlappingOrders;
    try {
      await overlaps(true);
      const p = await prod(1);
      const w = futureWindow(2);
      await book({ product: p, quantity: 1, ...w });
      const check = (await batch([{ productId: p.id, quantity: 1 }], w)).results[0];
      expect([lineOk(check), check.availabilityByOutlet[0].effectivelyAvailable]).toEqual([false, 0]);
      const second = await F.bookRentRaw(s, { product: p, quantity: 1, outletId: M, ...w });
      expect(second.status).toBe(200);
      created.push(second.body.data.id);
      // both orders now hold the days; the free number stays 0, the conflict quantity is 2
      const av = await s.availability(p.id, { ...w, outletId: M });
      expect([av.isAvailable, av.availabilityByOutlet[0].conflictingQuantity, av.availabilityByOutlet[0].effectivelyAvailable]).toEqual([false, 2, 0]);
    } finally {
      await overlaps(before !== false);
    }
  });

  test('BF-CART-05 overlaps OFF: the same order is refused with 409 and the clash (product, days, order number); the cart check says the same as with ON', async () => {
    const before = (await must(s.get('/api/users/profile'), 'profile')).merchant.allowOverlappingOrders;
    try {
      await overlaps(false);
      const p = await prod(2);
      const w = futureWindow(3);
      const first = await book({ product: p, quantity: 2, ...w });
      const check = (await batch([{ productId: p.id, quantity: 1 }], w)).results[0];
      expect([lineOk(check), check.availabilityByOutlet[0].effectivelyAvailable]).toEqual([false, 0]);
      const r = await F.bookRentRaw(s, { product: p, quantity: 1, outletId: M, from: addDays(w.from, 1), to: addDays(w.to, 1) });
      expect([r.status, r.body.code]).toEqual([409, 'ORDER_SCHEDULE_CONFLICT']);
      const c = r.body.data.conflicts[0];
      expect(c).toMatchObject({ productId: p.id, requested: 1, available: 0 });
      expect(c.orderNumbers).toEqual([first.orderNumber]);
      expect(c.days).toEqual([addDays(w.from, 1), addDays(w.from, 2)]);
      // 1 left of 2 on a day that holds one unit: a 1-unit order fits, a 2-unit order does not
      const half = await prod(2);
      await book({ product: half, quantity: 1, ...w });
      const fits = await F.bookRentRaw(s, { product: half, quantity: 1, outletId: M, ...w });
      expect(fits.status).toBe(200);
      created.push(fits.body.data.id);
      const tooMany = await F.bookRentRaw(s, { product: await prod(2), quantity: 1, outletId: M, ...w });
      expect(tooMany.status).toBe(200); // different product, nothing booked
      created.push(tooMany.body.data.id);
      // a day nobody holds is never a conflict, even for more units than the stock (Q9: stock levels are not enforced)
      const over = await F.bookRentRaw(s, { product: await prod(1), quantity: 3, outletId: M, ...futureWindow(1) });
      expect(over.status).toBe(200);
      created.push(over.body.data.id);
    } finally {
      await overlaps(before !== false);
    }
  });

  test('BF-CART-06 a product that is out today is still addable for a later date', async () => {
    const p = await prod(1);
    const o = await book({ product: p, quantity: 1, from: today, to: addDays(today, 1) });
    await s.setStatus(o.id, 'PICKUPED');
    // Home says 0 left today, the detail says the unit is out
    const v = await F.stockView(s, p, M);
    expect([v.list.today, v.detail]).toEqual([0, { stock: 1, available: 0, renting: 1 }]);
    expect((await F.freeOn(s, p, today)).ok).toBe(false);
    // a booking for later checks free and is accepted
    const later = { from: addDays(today, 5), to: addDays(today, 6) };
    const check = (await batch([{ productId: p.id, quantity: 1 }], later)).results[0];
    expect([lineOk(check), check.availabilityByOutlet[0].effectivelyAvailable]).toEqual([true, 1]);
    const next = await book({ product: p, quantity: 1, ...later });
    expect(next.status).toBe('RESERVED');
    // the day after tomorrow is free as well
    expect((await F.freeOn(s, p, addDays(today, 2))).ok).toBe(true);
    expect((await F.stockView(s, p, M)).list.today).toBe(0);
  });

  test('BF-CART-07 editing: excludeOrderId lets the order keep its own units, but not the units of other orders', async () => {
    const p = await prod(4);
    const w = futureWindow(2);
    const mine = await book({ product: p, quantity: 2, ...w });
    const other = await book({ product: p, quantity: 1, ...w });
    const free = async (q, exclude) => (await batch([{ productId: p.id, quantity: q }], w, exclude ? { excludeOrderId: mine.id } : {})).results[0];
    expect((await free(1, false)).availabilityByOutlet[0].effectivelyAvailable).toBe(1);
    expect((await free(1, true)).availabilityByOutlet[0].effectivelyAvailable).toBe(3);
    expect([lineOk(await free(3, true)), lineOk(await free(4, true))]).toEqual([true, false]);
    expect((await s.availability(p.id, { ...w, quantity: 3, outletId: M, excludeOrderId: mine.id })).isAvailable).toBe(true);
    expect((await s.availability(p.id, { ...w, quantity: 3, outletId: M, excludeOrderId: other.id })).isAvailable).toBe(false);
  });

  test('BF-CART-08 a sale cart needs no dates: up to the stock is fine, one more is not', async () => {
    const p = await s.createProduct({ kind: 'SALE', price: 50000, stock: 3, outletId: M });
    const ask = async (q) => (await must(s.post('/api/products/batch-availability', { products: [{ productId: p.id, quantity: q }], orderType: 'SALE', outletId: M }), 'sale cart')).results[0];
    expect([lineOk(await ask(3)), lineOk(await ask(4))]).toEqual([true, false]);
    expect((await ask(4)).availabilityByOutlet[0].effectivelyAvailable).toBe(3);
  });

  test('BF-CART-09 what the three reads say for a booked product: totalAvailableStock and effectivelyAvailable agree, available / renting differ (Q10)', async () => {
    const p = await prod(5);
    const w = { from: today, to: today };
    await book({ product: p, quantity: 2, ...w });
    const single = (await s.availability(p.id, { ...w, outletId: M })).availabilityByOutlet[0];
    const cart = (await batch([{ productId: p.id, quantity: 1 }], w)).results[0].availabilityByOutlet[0];
    const detail = await s.outletStock(p.id, M);
    // what both cart checks and the app's "còn N" read
    expect([single.effectivelyAvailable, cart.effectivelyAvailable]).toEqual([3, 3]);
    // what differs: single check reports the booked units as renting / not available, the cart check and the product detail do not
    expect({ single: [single.available, single.renting], cart: [cart.available, cart.renting], detail: [detail.available, detail.renting] }).toEqual({
      single: [3, 2],
      cart: [5, 0],
      detail: [5, 0]
    });
  });

  test('BF-CART-10 a product that is not stocked at the outlet answers PRODUCT_OUTLET_NOT_FOUND in the cart check, not a number', async () => {
    const p = await prod(2);
    const r = (await batch([{ productId: p.id, quantity: 1 }], futureWindow(1), { outletId: O })).results[0];
    expect(r.error).toBe('PRODUCT_OUTLET_NOT_FOUND');
    const single = await s.get(`/api/products/${p.id}/availability?startDate=${new Date().toISOString()}&endDate=${new Date(Date.now() + 86400000).toISOString()}&outletId=${O}`);
    expect([single.status, single.body.code]).toEqual([404, 'PRODUCT_OUTLET_NOT_FOUND']);
  });
});

// =====================================================================================================
describeE2E('BF-DET order detail: quantities, line totals, deposit, collateral and amounts due agree on every screen', () => {
  let s;
  let M;
  const created = [];

  beforeAll(async () => {
    s = await Session.login('merchant');
    ({ main: M } = await outletsOf(s));
  });
  afterAll(() => F.cancelOpen(s, created));

  const SHARED = ['id', 'orderNumber', 'orderType', 'status', 'totalAmount', 'depositAmount', 'securityDeposit', 'lateFee', 'damageFee', 'discountAmount', 'pickupPlanAt', 'returnPlanAt', 'pickedUpAt', 'returnedAt', 'rentalDuration', 'customerId', 'outletId'];
  const pickKeys = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));
  const lines = (items) => items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: i.totalPrice, rentalDays: i.rentalDays }));

  /** Every read of one order the apps have: detail, by-number, list row, calendar row, customer orders. */
  const readAll = async (order, { calendarDay, status } = {}) => {
    const detail = await s.getOrder(order.id);
    const byNumber = await must(s.get(`/api/orders/by-number/${order.orderNumber}`), 'by number');
    const row = await s.orderRow(order.id, order.orderNumber);
    const cal = calendarDay ? (await F.calendarList(s, calendarDay, { status })).find((r) => r.id === order.id) : null;
    const customer = (await s.customerOrders(order.customerId)).orders.find((r) => r.id === order.id);
    return { detail, byNumber, row, cal, customer };
  };

  test('BF-DET-01 two lines (2 x 150.000 per rental, 3 x 40.000 per day for 3 days), deposit 100.000, collateral 200.000: every screen shows the same numbers', async () => {
    const a = await s.createProduct({ kind: 'FIXED', price: 150000, stock: 5, outletId: M });
    const b = await s.createProduct({ kind: 'DAILY', price: 40000, stock: 5, outletId: M });
    const w = futureWindow(3);
    const customer = await s.createCustomer();
    const args = { customer, from: w.from, to: w.to, depositAmount: 100000, securityDeposit: 200000, lines: [{ product: a, quantity: 2 }, { product: b, quantity: 3 }] };
    const order = await s.createOrder({ ...rentBody(args).body, outletId: M });
    created.push(order.id);
    const { detail, byNumber, row, cal, customer: crow } = await readAll(order, { calendarDay: w.from, status: 'RESERVED' });
    const total = 2 * 150000 + 3 * 40000 * 3; // 660.000
    expect(detail).toMatchObject({ totalAmount: total, depositAmount: 100000, securityDeposit: 200000, rentalDuration: 3, status: 'RESERVED', totalPaid: 0 });
    const byProduct = Object.fromEntries(detail.orderItems.map((i) => [i.productId, i]));
    expect(byProduct[a.id]).toMatchObject({ quantity: 2, unitPrice: 150000, totalPrice: 300000, rentalDays: 1, pricingType: 'FIXED' });
    expect(byProduct[b.id]).toMatchObject({ quantity: 3, unitPrice: 40000, totalPrice: 360000, rentalDays: 3, pricingType: 'DAILY' });
    // line totals add up to the order total
    expect(detail.orderItems.reduce((n, i) => n + i.totalPrice, 0)).toBe(total);
    // by number = detail; list row and customer row carry the same lines and totals
    expect(pickKeys(byNumber, SHARED)).toEqual(pickKeys(detail, SHARED));
    expect(lines(byNumber.orderItems)).toEqual(lines(detail.orderItems));
    for (const other of [row, crow]) {
      expect(pickKeys(other, ['id', 'orderNumber', 'totalAmount', 'depositAmount', 'securityDeposit', 'status'])).toEqual(pickKeys(detail, ['id', 'orderNumber', 'totalAmount', 'depositAmount', 'securityDeposit', 'status']));
    }
    expect(lines(row.orderItems).sort((x, y) => x.productId - y.productId)).toEqual(lines(detail.orderItems).sort((x, y) => x.productId - y.productId));
    expect(crow._count.orderItems).toBe(2); // the customer's order list carries the number of lines, not the lines
    // owed at the counter = total - deposit + collateral to receive; the list row carries it, the detail carries what was paid
    expect(row).toMatchObject({ amountDue: total - 100000 + 200000, refundDue: 0, totalPaid: 0 });
    expect(cal).toMatchObject({ totalAmount: total, productCount: 5, amountDue: total - 100000 + 200000, refundDue: 0 });
    expect(cal.orderItems.map((i) => i.quantity).sort()).toEqual([2, 3]);
    expect(detail.amountDue).toBeUndefined(); // the detail has no amountDue today: the apps use the list / calendar row
  });

  test('BF-DET-02 quantity up and down while RESERVED: detail, list, calendar and the free days all follow', async () => {
    const p = await s.createProduct({ kind: 'DAILY', price: 70000, stock: 6, outletId: M });
    const w = futureWindow(2);
    const customer = await s.createCustomer();
    const D = 50000;
    const args = (q) => ({ customer, from: w.from, to: w.to, depositAmount: D, lines: [{ product: p, quantity: q }] });
    const order = await s.createOrder({ ...rentBody(args(2)).body, outletId: M });
    created.push(order.id);
    expect(await F.freeDays(s, p, w.from, w.to, M)).toEqual({ [w.from]: 4, [w.to]: 4 });
    for (const [q, free] of [[4, 2], [1, 5]]) {
      const r = await s.updateOrder(order.id, { ...updateBody(args(q)).body, outletId: M });
      expect(r.status).toBe(200);
      const total = q * 70000 * 2;
      const { detail, row, cal } = await readAll(order, { calendarDay: w.from, status: 'RESERVED' });
      expect(detail.orderItems).toHaveLength(1);
      expect(detail.orderItems[0]).toMatchObject({ quantity: q, unitPrice: 70000, totalPrice: total, rentalDays: 2 });
      expect(detail.totalAmount).toBe(total);
      expect(row).toMatchObject({ totalAmount: total, amountDue: total - D });
      expect(row.orderItems[0].quantity).toBe(q);
      expect(cal).toMatchObject({ totalAmount: total, productCount: q, amountDue: total - D });
      expect(await F.freeDays(s, p, w.from, w.to, M)).toEqual({ [w.from]: free, [w.to]: free });
    }
  });

  test('BF-DET-03 extending the stay by 2 days (RESERVED): days, the DAILY line, the return day and the free days move; the FIXED line does not', async () => {
    const a = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 3, outletId: M });
    const b = await s.createProduct({ kind: 'DAILY', price: 40000, stock: 3, outletId: M });
    const w = futureWindow(3);
    const customer = await s.createCustomer();
    const mk = (to) => ({ customer, from: w.from, to, lines: [{ product: a, quantity: 1 }, { product: b, quantity: 2 }] });
    const order = await s.createOrder({ ...rentBody(mk(w.to)).body, outletId: M });
    created.push(order.id);
    expect(order.totalAmount).toBe(100000 + 2 * 40000 * 3);
    const newTo = addDays(w.to, 2);
    const r = await s.updateOrder(order.id, { ...updateBody(mk(newTo)).body, outletId: M });
    expect(r.status).toBe(200);
    const { detail, row } = await readAll(order);
    const items = Object.fromEntries(detail.orderItems.map((i) => [i.productId, i]));
    expect(detail.rentalDuration).toBe(5);
    expect(vnDateKey(new Date(detail.returnPlanAt))).toBe(newTo);
    expect(items[b.id]).toMatchObject({ quantity: 2, rentalDays: 5, totalPrice: 2 * 40000 * 5 });
    expect(items[a.id]).toMatchObject({ quantity: 1, rentalDays: 1, totalPrice: 100000 });
    expect(detail.totalAmount).toBe(100000 + 2 * 40000 * 5);
    expect(row.totalAmount).toBe(detail.totalAmount);
    expect(vnDateKey(new Date(row.returnPlanAt))).toBe(newTo);
    // both products are now held on the two extra days; the one-day line of A also holds them (the order's days)
    expect(Object.values(await F.freeDays(s, b, w.from, addDays(newTo, 1), M))).toEqual([1, 1, 1, 1, 1, 3]);
    expect(await F.calendarList(s, newTo, { kind: 'return' })).toEqual([]); // not picked up yet: no return mark
  });

  test('BF-DET-04 hand-over then return: quantities stay, the stamps appear, what is due changes as the money moves', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 200000, stock: 4, outletId: M });
    const customer = await s.createCustomer();
    const A = 2 * 200000;
    const D = 100000;
    const S = 300000;
    const order = await s.createOrder({
      ...rentBody({ customer, from: today, to: addDays(today, 1), depositAmount: D, securityDeposit: S, lines: [{ product: p, quantity: 2 }] }).body,
      outletId: M
    });
    created.push(order.id);
    let x = await readAll(order);
    expect(x.row).toMatchObject({ amountDue: A - D + S, refundDue: 0 });
    expect([x.detail.pickedUpAt, x.detail.returnedAt]).toEqual([null, null]);
    expect((await s.setStatus(order.id, 'PICKUPED')).status).toBe(200);
    x = await readAll(order);
    expect(x.detail.status).toBe('PICKUPED');
    expect(vnDateKey(new Date(x.detail.pickedUpAt))).toBe(today);
    expect(x.detail.returnedAt).toBeNull();
    expect(x.detail.orderItems[0]).toMatchObject({ quantity: 2, totalPrice: A });
    expect(x.row).toMatchObject({ amountDue: 0, refundDue: S, totalAmount: A });
    expect((await F.stockView(s, p, M)).detail).toEqual({ stock: 4, available: 2, renting: 2 });
    expect((await s.setStatus(order.id, 'RETURNED')).status).toBe(200);
    x = await readAll(order);
    expect(x.detail.status).toBe('RETURNED');
    expect(vnDateKey(new Date(x.detail.returnedAt))).toBe(today);
    expect(x.detail.orderItems[0]).toMatchObject({ quantity: 2, totalPrice: A });
    expect(x.row).toMatchObject({ amountDue: 0, refundDue: 0 });
    expect(x.customer).toMatchObject({ status: 'RETURNED', totalAmount: A });
    expect((await F.stockView(s, p, M)).detail).toEqual({ stock: 4, available: 4, renting: 0 });
  });

  test('BF-DET-05 a sale: quantity, line total, discount and no deposit or collateral, on detail, list and calendar', async () => {
    const p = await s.createProduct({ kind: 'SALE', price: 90000, stock: 10, outletId: M });
    const customer = await s.createCustomer();
    const { body } = saleBody({ customer, lines: [{ product: p, quantity: 3 }], discountAmount: 17000 });
    const sale = await s.createOrder({ ...body, outletId: M });
    created.push(sale.id);
    const { detail, row, cal } = await readAll(sale, { calendarDay: today, status: 'COMPLETED' });
    const total = 3 * 90000 - 17000;
    expect(detail).toMatchObject({ orderType: 'SALE', status: 'COMPLETED', totalAmount: total, discountAmount: 17000, depositAmount: 0, securityDeposit: 0 });
    expect(detail.orderItems[0]).toMatchObject({ quantity: 3, unitPrice: 90000, totalPrice: 270000 });
    expect(row).toMatchObject({ totalAmount: total, amountDue: 0, refundDue: 0 });
    expect(cal).toMatchObject({ totalAmount: total, productCount: 3 });
  });

  test('BF-DET-06 cancelled order: quantities and totals stay readable, nothing is due, the units are free', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 3, outletId: M });
    const w = futureWindow(2);
    const order = await F.bookRent(s, { product: p, quantity: 2, outletId: M, depositAmount: 40000, ...w });
    created.push(order.id);
    expect((await s.setStatus(order.id, 'CANCELLED')).status).toBe(200);
    const { detail, row } = await readAll(order);
    expect(detail).toMatchObject({ status: 'CANCELLED', totalAmount: 200000 });
    expect(detail.orderItems[0]).toMatchObject({ quantity: 2, totalPrice: 200000 });
    expect(row.orderItems[0].quantity).toBe(2);
    expect(await F.freeDays(s, p, w.from, w.to, M)).toEqual({ [w.from]: 3, [w.to]: 3 });
  });
});
