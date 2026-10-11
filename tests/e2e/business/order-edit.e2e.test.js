/**
 * BF-QTY (quantity changes, "giảm số lượng") and BF-EDIT (order edits) with price + Overview checks (#498).
 * Edits go through PUT /api/orders/{id} with the body iOS Cart.toUpdateOrderRequest() sends: the whole order,
 * items with `rentalDays` (create uses `rentDays`), totals computed by the app. The API stores what it gets.
 */
const {
  Session,
  describeE2E,
  vnDateKey,
  vnAt,
  addDays,
  futureWindow,
  rentBody,
  saleBody,
  watchOverview,
  pick,
  knownBug
} = require('../helpers/api');

/** The PUT body iOS sends for an edited cart (same builder as create, item key `rentalDays`). */
function updateBody(args) {
  const { body, subtotal, days } = rentBody(args);
  const orderItems = body.orderItems.map(({ rentDays, ...item }) => ({
    ...item,
    rentalDays: item.pricingType === 'DAILY' ? days : 1
  }));
  return { body: { ...body, orderItems }, subtotal, days };
}

const MONEY = ['collected', 'orderValue', 'outstanding', 'newOrders'];

describeE2E('BF-QTY quantity changes', () => {
  let s;
  const today = vnDateKey();

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  test('BF-QTY-01 RESERVED: lower quantity 3 -> 1 updates totals, outstanding and availability', async () => {
    const price = 70000;
    const D = 50000;
    const product = await s.createProduct({ kind: 'DAILY', price, stock: 3 });
    const customer = await s.createCustomer();
    const w = futureWindow(2);
    const args = { customer, from: w.from, to: w.to, depositAmount: D };
    const order = await s.createOrder(rentBody({ ...args, lines: [{ product, quantity: 3 }] }).body);
    expect(order.totalAmount).toBe(3 * price * 2);
    expect((await s.availability(product.id, w)).isAvailable).toBe(false);

    const ov = await watchOverview(s, today);
    const { body } = updateBody({ ...args, lines: [{ product, quantity: 1 }] });
    const r = await s.updateOrder(order.id, body);
    expect(r.status).toBe(200);
    expect(r.body.data.totalAmount).toBe(price * 2);
    expect(r.body.data.orderItems).toHaveLength(1);
    expect(r.body.data.orderItems[0]).toMatchObject({ quantity: 1, unitPrice: price, totalPrice: price * 2, rentalDays: 2 });
    expect(pick(await ov.delta(), MONEY)).toEqual({
      collected: 0,
      orderValue: -(2 * price * 2),
      outstanding: -(2 * price * 2),
      newOrders: 0
    });
    const av = await s.availability(product.id, { ...w, quantity: 2 });
    expect([av.isAvailable, av.availabilityByOutlet[0].effectivelyAvailable]).toEqual([true, 2]);
    expect((await s.orderRow(order.id)).amountDue).toBe(price * 2 - D);
  });

  test('BF-QTY-02 raising quantity beyond stock: the cart check refuses it; PUT itself accepts it (current)', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 3 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const args = { customer, from: w.from, to: w.to };
    const order = await s.createOrder(rentBody({ ...args, lines: [{ product, quantity: 2 }] }).body);
    const check = await s.batchAvailability([{ productId: product.id, quantity: 4 }], { ...w, excludeOrderId: order.id });
    expect(check.results[0].isAvailable).toBe(false);
    const ok = await s.batchAvailability([{ productId: product.id, quantity: 3 }], { ...w, excludeOrderId: order.id });
    expect(ok.results[0].isAvailable).toBe(true);
    // No server-side stock guard on edit (question for the owner)
    const r = await s.updateOrder(order.id, updateBody({ ...args, lines: [{ product, quantity: 4 }] }).body);
    expect(r.status).toBe(200);
    expect(r.body.data.orderItems[0].quantity).toBe(4);
  });

  test('BF-QTY-03 lowering product stock below what is booked: accepted, the window then shows no units', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    await s.createOrder(rentBody({ customer, lines: [{ product, quantity: 2 }], from: w.from, to: w.to }).body);
    const r = await s.updateProduct(product.id, {
      totalStock: 1,
      outletStock: [{ outletId: product.outletId, stock: 1 }]
    });
    expect(r.status).toBe(200);
    expect((await s.outletStock(product.id, product.outletId)).stock).toBe(1);
    const av = await s.availability(product.id, w);
    expect(av.isAvailable).toBe(false);
    expect(av.availabilityByOutlet[0].effectivelyAvailable).toBe(0);
    // another day is free with the new stock of 1
    expect((await s.availability(product.id, { from: addDays(w.to, 5) })).availabilityByOutlet[0].effectivelyAvailable).toBe(1);
  });

  // #504: PUT orderItems on a PICKUPED order moves OutletStock.renting/available by the difference,
  // so the return gives back every unit that was handed out. Hand-over has no stock guard (Q1/Q9), so an
  // increase is accepted exactly like the same quantity at hand-over.
  const STOCK = (stock, available, renting) => ({ stock, available, renting });

  async function pickedUp(lines) {
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const args = { customer, from: w.from, to: w.to };
    const order = await s.createOrder(rentBody({ ...args, lines }).body);
    await s.setStatus(order.id, 'PICKUPED');
    return { order, args };
  }

  test('BF-QTY-04 PICKUPED: lowering quantity 2 -> 1 gives the unit back at once and the return gives every unit back', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2 });
    const { order, args } = await pickedUp([{ product, quantity: 2 }]);
    expect(await s.outletStock(product.id, product.outletId)).toEqual(STOCK(2, 0, 2));
    const r = await s.updateOrder(order.id, updateBody({ ...args, lines: [{ product, quantity: 1 }] }).body);
    expect(r.status).toBe(200);
    expect(await s.outletStock(product.id, product.outletId)).toEqual(STOCK(2, 1, 1));
    await s.setStatus(order.id, 'RETURNED');
    expect(await s.outletStock(product.id, product.outletId)).toEqual(STOCK(2, 2, 0));
  });

  test('BF-QTY-05 PICKUPED: raising quantity 1 -> 2 takes the unit, the return gives both back', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2 });
    const { order, args } = await pickedUp([{ product, quantity: 1 }]);
    expect(await s.outletStock(product.id, product.outletId)).toEqual(STOCK(2, 1, 1));
    expect((await s.updateOrder(order.id, updateBody({ ...args, lines: [{ product, quantity: 2 }] }).body)).status).toBe(200);
    expect(await s.outletStock(product.id, product.outletId)).toEqual(STOCK(2, 0, 2));
    await s.setStatus(order.id, 'RETURNED');
    expect(await s.outletStock(product.id, product.outletId)).toEqual(STOCK(2, 2, 0));
  });

  test('BF-QTY-06 PICKUPED: raising quantity beyond stock is accepted like at hand-over (Q1); available stops at 0', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2 });
    const { order, args } = await pickedUp([{ product, quantity: 2 }]);
    const r = await s.updateOrder(order.id, updateBody({ ...args, lines: [{ product, quantity: 3 }] }).body);
    expect(r.status).toBe(200);
    expect(await s.outletStock(product.id, product.outletId)).toEqual(STOCK(2, 0, 3));
    await s.setStatus(order.id, 'RETURNED');
    expect(await s.outletStock(product.id, product.outletId)).toEqual(STOCK(2, 2, 0));
  });

  test('BF-QTY-07 PICKUPED: a removed line gives its units back, an added line takes them', async () => {
    const a = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 3 });
    const b = await s.createProduct({ kind: 'FIXED', price: 50000, stock: 3 });
    const c = await s.createProduct({ kind: 'FIXED', price: 70000, stock: 3 });
    const { order, args } = await pickedUp([{ product: a, quantity: 2 }, { product: b, quantity: 1 }]);
    expect(await s.outletStock(b.id, b.outletId)).toEqual(STOCK(3, 2, 1));
    // remove b, add c x2, keep a
    const r = await s.updateOrder(order.id, updateBody({ ...args, lines: [{ product: a, quantity: 2 }, { product: c, quantity: 2 }] }).body);
    expect(r.status).toBe(200);
    expect(await s.outletStock(a.id, a.outletId)).toEqual(STOCK(3, 1, 2));
    expect(await s.outletStock(b.id, b.outletId)).toEqual(STOCK(3, 3, 0));
    expect(await s.outletStock(c.id, c.outletId)).toEqual(STOCK(3, 1, 2));
    await s.setStatus(order.id, 'RETURNED');
    for (const p of [a, b, c]) expect(await s.outletStock(p.id, p.outletId)).toEqual(STOCK(3, 3, 0));
  });

  test('BF-QTY-08 PICKUPED: swapping a product moves the units from the old one to the new one', async () => {
    const a = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2 });
    const b = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2 });
    const { order, args } = await pickedUp([{ product: a, quantity: 2 }]);
    await s.updateOrder(order.id, updateBody({ ...args, lines: [{ product: b, quantity: 1 }] }).body);
    expect(await s.outletStock(a.id, a.outletId)).toEqual(STOCK(2, 2, 0));
    expect(await s.outletStock(b.id, b.outletId)).toEqual(STOCK(2, 1, 1));
    await s.setStatus(order.id, 'RETURNED');
    expect(await s.outletStock(b.id, b.outletId)).toEqual(STOCK(2, 2, 0));
  });

  test('BF-QTY-09 PICKUPED: an edit that keeps the quantities does not move stock', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2 });
    const { order, args } = await pickedUp([{ product, quantity: 2 }]);
    const r = await s.updateOrder(order.id, { ...updateBody({ ...args, lines: [{ product, quantity: 2 }] }).body, notes: 'same lines' });
    expect(r.status).toBe(200);
    expect(await s.outletStock(product.id, product.outletId)).toEqual(STOCK(2, 0, 2));
    await s.updateOrder(order.id, { notes: 'no lines at all' });
    expect(await s.outletStock(product.id, product.outletId)).toEqual(STOCK(2, 0, 2));
  });

  test('BF-QTY-10 RESERVED: editing the lines moves no stock; the hand-over then takes the saved lines', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 3 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const args = { customer, from: w.from, to: w.to };
    const order = await s.createOrder(rentBody({ ...args, lines: [{ product, quantity: 3 }] }).body);
    expect(await s.outletStock(product.id, product.outletId)).toEqual(STOCK(3, 3, 0));
    await s.updateOrder(order.id, updateBody({ ...args, lines: [{ product, quantity: 1 }] }).body);
    expect(await s.outletStock(product.id, product.outletId)).toEqual(STOCK(3, 3, 0));
    await s.setStatus(order.id, 'PICKUPED');
    expect(await s.outletStock(product.id, product.outletId)).toEqual(STOCK(3, 2, 1));
    await s.setStatus(order.id, 'RETURNED');
    expect(await s.outletStock(product.id, product.outletId)).toEqual(STOCK(3, 3, 0));
  });

  test('BF-QTY-11 one PUT that edits the lines and hands the order over takes the saved lines', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 3 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const args = { customer, from: w.from, to: w.to };
    const order = await s.createOrder(rentBody({ ...args, lines: [{ product, quantity: 3 }] }).body);
    const r = await s.updateOrder(order.id, { ...updateBody({ ...args, lines: [{ product, quantity: 1 }] }).body, status: 'PICKUPED' });
    expect(r.status).toBe(200);
    expect(await s.outletStock(product.id, product.outletId)).toEqual(STOCK(3, 2, 1));
    await s.setStatus(order.id, 'RETURNED');
    expect(await s.outletStock(product.id, product.outletId)).toEqual(STOCK(3, 3, 0));
  });

  test('BF-QTY-12 multi-outlet: an edit moves only its own outlet; moving the order to the other outlet moves the units', async () => {
    const outlets = (await s.get('/api/outlets?limit=50')).body.data.outlets;
    const home = await s.defaultOutletId();
    const other = outlets.find((o) => o.id !== home);
    if (!other) return; // seed has 2 outlets per merchant
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2 });
    expect(
      (await s.updateProduct(product.id, {
        totalStock: 4,
        outletStock: [{ outletId: home, stock: 2 }, { outletId: other.id, stock: 2 }]
      })).status
    ).toBe(200);
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const args = { customer, from: w.from, to: w.to };
    const order = await s.createOrder({ ...rentBody({ ...args, lines: [{ product, quantity: 2 }] }).body, outletId: home });
    await s.setStatus(order.id, 'PICKUPED');
    await s.updateOrder(order.id, { ...updateBody({ ...args, lines: [{ product, quantity: 1 }] }).body, outletId: home });
    expect(await s.outletStock(product.id, home)).toEqual(STOCK(2, 1, 1));
    expect(await s.outletStock(product.id, other.id)).toEqual(STOCK(2, 2, 0));
    const moved = await s.updateOrder(order.id, { outletId: other.id });
    expect(moved.status).toBe(200);
    expect(await s.outletStock(product.id, home)).toEqual(STOCK(2, 2, 0));
    expect(await s.outletStock(product.id, other.id)).toEqual(STOCK(2, 1, 1));
    await s.setStatus(order.id, 'RETURNED');
    expect(await s.outletStock(product.id, home)).toEqual(STOCK(2, 2, 0));
    expect(await s.outletStock(product.id, other.id)).toEqual(STOCK(2, 2, 0));
  });
});

describeE2E('BF-EDIT order edits', () => {
  let s;
  const today = vnDateKey();

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  test('BF-EDIT-01 RESERVED: change customer moves "Đã chi" and order count; Overview unchanged', async () => {
    const A = 180000;
    const product = await s.createProduct({ kind: 'FIXED', price: A, stock: 1 });
    const oldC = await s.createCustomer();
    const newC = await s.createCustomer();
    const w = futureWindow(1);
    const order = await s.createOrder(rentBody({ customer: oldC, lines: [{ product }], from: w.from, to: w.to }).body);
    expect((await s.customerOrders(oldC.id)).summary).toEqual({ totalOrders: 1, totalAmount: A });
    const ov = await watchOverview(s, today);
    const r = await s.updateOrder(order.id, { customerId: newC.id });
    expect(r.status).toBe(200);
    expect(r.body.data.customerId).toBe(newC.id);
    expect((await s.customerOrders(oldC.id)).summary).toEqual({ totalOrders: 0, totalAmount: 0 });
    expect((await s.customerOrders(newC.id)).summary).toEqual({ totalOrders: 1, totalAmount: A });
    expect(pick(await ov.delta(), MONEY)).toEqual({ collected: 0, orderValue: 0, outstanding: 0, newOrders: 0 });
  });

  test('BF-EDIT-02 RESERVED: longer dates re-price daily lines (price x VN days), fixed lines stay', async () => {
    const daily = await s.createProduct({ kind: 'DAILY', price: 40000, stock: 1 });
    const fixed = await s.createProduct({ kind: 'FIXED', price: 150000, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(3);
    const lines = [{ product: daily }, { product: fixed }];
    const order = await s.createOrder(rentBody({ customer, lines, from: w.from, to: w.to }).body);
    expect(order.totalAmount).toBe(40000 * 3 + 150000);

    const ov = await watchOverview(s, today);
    const to2 = addDays(w.to, 2); // 5 days now
    const { body } = updateBody({ customer, lines, from: w.from, to: to2 });
    const r = await s.updateOrder(order.id, body);
    expect(r.status).toBe(200);
    const detail = await s.getOrder(order.id);
    expect(detail.totalAmount).toBe(40000 * 5 + 150000);
    expect(detail.rentalDuration).toBe(5);
    const byProduct = Object.fromEntries(detail.orderItems.map((i) => [i.productId, i]));
    expect(byProduct[daily.id]).toMatchObject({ totalPrice: 200000, rentalDays: 5, pricingType: 'DAILY' });
    expect(byProduct[fixed.id]).toMatchObject({ totalPrice: 150000, rentalDays: 1, pricingType: 'FIXED' });
    // value grows on the day the order was created; no new order is counted
    expect(pick(await ov.delta(), MONEY)).toEqual({ collected: 0, orderValue: 80000, outstanding: 80000, newOrders: 0 });
    expect((await s.availability(daily.id, { from: to2 })).isAvailable).toBe(false);
    expect((await s.availability(daily.id, { from: addDays(to2, 1) })).isAvailable).toBe(true);
  });

  test('BF-EDIT-03 same-day dates = 1 day for a daily line', async () => {
    const daily = await s.createProduct({ kind: 'DAILY', price: 40000, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(3);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product: daily }], from: w.from, to: w.to }).body);
    const { body } = updateBody({ customer, lines: [{ product: daily }], from: w.from, to: w.from });
    await s.updateOrder(order.id, body);
    const detail = await s.getOrder(order.id);
    expect([detail.totalAmount, detail.rentalDuration, detail.orderItems[0].rentalDays]).toEqual([40000, 1, 1]);
  });

  test('BF-EDIT-04 moving dates onto a booked slot: the cart check (excludeOrderId) refuses; PUT accepts (current)', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
    const c1 = await s.createCustomer();
    const c2 = await s.createCustomer();
    const w1 = futureWindow(2);
    const w2 = futureWindow(2);
    await s.createOrder(rentBody({ customer: c1, lines: [{ product }], from: w1.from, to: w1.to }).body);
    const b = await s.createOrder(rentBody({ customer: c2, lines: [{ product }], from: w2.from, to: w2.to }).body);
    const check = await s.batchAvailability([{ productId: product.id, quantity: 1 }], { ...w1, excludeOrderId: b.id });
    expect(check.results[0].isAvailable).toBe(false);
    const r = await s.updateOrder(b.id, updateBody({ customer: c2, lines: [{ product }], from: w1.from, to: w1.to }).body);
    expect(r.status).toBe(200); // no server guard (question for the owner)
  });

  test('BF-EDIT-05 add a line and remove a line: totals and rankings follow', async () => {
    const p1 = await s.createProduct({ kind: 'FIXED', price: 110000, stock: 2 });
    const p2 = await s.createProduct({ kind: 'FIXED', price: 90000, stock: 2 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product: p1 }], from: w.from, to: w.to }).body);
    const ov = await watchOverview(s, today);

    let r = await s.updateOrder(order.id, updateBody({ customer, lines: [{ product: p1 }, { product: p2 }], from: w.from, to: w.to }).body);
    expect(r.body.data.totalAmount).toBe(200000);
    expect(r.body.data.orderItems).toHaveLength(2);
    expect(pick(await ov.delta(), ['orderValue', 'outstanding'])).toEqual({ orderValue: 90000, outstanding: 90000 });
    expect((await s.topProductRow(p2.id, today))?.totalRevenue).toBe(90000);

    r = await s.updateOrder(order.id, updateBody({ customer, lines: [{ product: p2 }], from: w.from, to: w.to }).body);
    expect(r.body.data.totalAmount).toBe(90000);
    expect(r.body.data.orderItems.map((i) => i.productId)).toEqual([p2.id]);
    expect(pick(await ov.delta(), ['orderValue', 'outstanding'])).toEqual({ orderValue: -110000, outstanding: -110000 });
    expect(await s.topProductRow(p1.id, today)).toBeNull();
    expect((await s.availability(p1.id, { ...w, quantity: 2 })).isAvailable).toBe(true);
  });

  test('BF-EDIT-06 per-line price override is for this order only; the catalog price stays', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 200000, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product, unitPrice: 150000 }], from: w.from, to: w.to }).body);
    expect(order.orderItems[0]).toMatchObject({ unitPrice: 150000, totalPrice: 150000 });
    await s.updateOrder(order.id, updateBody({ customer, lines: [{ product, unitPrice: 120000 }], from: w.from, to: w.to }).body);
    const detail = await s.getOrder(order.id);
    expect([detail.totalAmount, detail.orderItems[0].unitPrice]).toEqual([120000, 120000]);
    expect((await s.getProduct(product.id)).rentPrice).toBe(200000);
    expect(detail.orderItems[0].product.rentPrice).toBe(200000);
  });

  test('BF-EDIT-07 discount by amount and by percent', async () => {
    const product = await s.createProduct({ kind: 'DAILY', price: 33333, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(3);
    const subtotal = 33333 * 3;
    const order = await s.createOrder(
      rentBody({ customer, lines: [{ product }], from: w.from, to: w.to, discountAmount: 9999 }).body
    );
    expect([order.totalAmount, order.discountType, order.discountAmount]).toEqual([subtotal - 9999, 'amount', 9999]);

    const ov = await watchOverview(s, today);
    const pct = 10;
    const pctAmount = Math.round((subtotal * pct) / 100); // the apps round to whole đồng
    const { body } = updateBody({
      customer,
      lines: [{ product }],
      from: w.from,
      to: w.to,
      discountAmount: pctAmount,
      discountType: 'percentage',
      discountValue: pct
    });
    await s.updateOrder(order.id, body);
    const detail = await s.getOrder(order.id);
    expect([detail.totalAmount, detail.discountType, detail.discountValue, detail.discountAmount]).toEqual([
      subtotal - pctAmount,
      'percentage',
      pct,
      pctAmount
    ]);
    expect(Number.isInteger(detail.totalAmount)).toBe(true);
    expect(pick(await ov.delta(), ['orderValue'])).toEqual({ orderValue: 9999 - pctAmount });
  });

  test('BF-EDIT-08 change deposit: collected and outstanding move by the difference', async () => {
    const A = 400000;
    const product = await s.createProduct({ kind: 'FIXED', price: A, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product }], from: w.from, to: w.to, depositAmount: 100000 }).body);
    const ov = await watchOverview(s, today);
    await s.updateOrder(order.id, { depositAmount: 250000 });
    expect(pick(await ov.delta(), ['collected', 'deposits', 'outstanding', 'orderValue'])).toEqual({
      collected: 150000,
      deposits: 150000,
      outstanding: -150000,
      orderValue: 0
    });
    expect((await s.orderRow(order.id)).amountDue).toBe(A - 250000);
  });

  test('BF-EDIT-09 change collateral before hand-over: due at pickup changes, Overview does not', async () => {
    const A = 300000;
    const product = await s.createProduct({ kind: 'FIXED', price: A, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product }], from: w.from, to: w.to, securityDeposit: 200000 }).body);
    expect((await s.orderRow(order.id)).amountDue).toBe(A + 200000);
    const ov = await watchOverview(s, today);
    await s.updateOrder(order.id, { securityDeposit: 500000, collateralType: 'ID_CARD', collateralDetails: 'CCCD' });
    expect((await s.orderRow(order.id)).amountDue).toBe(A + 500000);
    expect(pick(await ov.delta(), ['collected', 'orderValue', 'outstanding', 'collateralReceived'])).toEqual({
      collected: 0,
      orderValue: 0,
      outstanding: 0,
      collateralReceived: 0
    });
  });

  test('BF-EDIT-10 notes change no money', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product }], from: w.from, to: w.to, depositAmount: 20000 }).body);
    const ov = await watchOverview(s, today);
    const r = await s.updateOrder(order.id, { notes: 'Khách hẹn 9h, giao tận nơi' });
    expect(r.status).toBe(200);
    const detail = await s.getOrder(order.id);
    expect([detail.notes, detail.totalAmount, detail.depositAmount]).toEqual(['Khách hẹn 9h, giao tận nơi', 100000, 20000]);
    expect(pick(await ov.delta(), ['collected', 'orderValue', 'outstanding', 'newOrders'])).toEqual({
      collected: 0,
      orderValue: 0,
      outstanding: 0,
      newOrders: 0
    });
  });

  // #505: gia hạn (#425) raises totalAmount of a PICKUPED order. The extra rent is due at return (the balance adds
  // totalAmount - pickupTotalAmount), and the money collected at hand-over stays what it was on the pickup day.
  test('BF-EDIT-11 PICKUPED: extend (gia hạn) with extra rent: extra is due, pickup day money unchanged', async () => {
    const A = 300000;
    const X = 100000; // extra rent entered in the Gia hạn sheet
    const S = 500000;
    const product = await s.createProduct({ kind: 'FIXED', price: A, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(2);
    const P = w.from;
    const order = await s.createOrder(rentBody({ customer, lines: [{ product }], from: w.from, to: w.to }).body);
    await s.setStatus(order.id, 'PICKUPED', { pickedUpAt: vnAt(P, '09:00').toISOString(), securityDeposit: S });
    const ovP = await watchOverview(s, P);
    const newReturn = addDays(w.to, 2);
    const r = await s.updateOrder(order.id, {
      returnPlanAt: new Date(`${newReturn}T23:59:59.999+07:00`).toISOString(),
      rentalDuration: 4,
      totalAmount: A + X
    });
    expect(r.status).toBe(200);
    expect(r.body.data.totalAmount).toBe(A + X);
    expect(r.body.data.pickupTotalAmount).toBe(A);
    // collateral S held, X still owed: hand back S - X at return
    const row = await s.orderRow(order.id);
    expect([row.amountDue, row.refundDue]).toEqual([0, S - X]);
    expect(pick(await ovP.delta(), ['collected'])).toEqual({ collected: 0 });
  });

  test('BF-EDIT-14 extend, then return: the extra rent is collected on the return day, the pickup day keeps its money', async () => {
    const A = 300000;
    const X = 100000;
    const S = 500000;
    const product = await s.createProduct({ kind: 'FIXED', price: A, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(2);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product }], from: w.from, to: w.to }).body);
    const ovPickup = await watchOverview(s, w.from);
    await s.setStatus(order.id, 'PICKUPED', { pickedUpAt: vnAt(w.from, '09:00').toISOString(), securityDeposit: S });
    expect(pick(await ovPickup.delta(), ['collected'])).toEqual({ collected: A });
    await s.updateOrder(order.id, { rentalDuration: 4, totalAmount: A + X });
    expect(pick(await ovPickup.delta(), ['collected'])).toEqual({ collected: 0 });
    const returnDay = addDays(w.to, 2);
    const ovReturn = await watchOverview(s, returnDay);
    await s.setStatus(order.id, 'RETURNED', { returnedAt: vnAt(returnDay, '10:00').toISOString() });
    expect(pick(await ovReturn.delta(), ['collected'])).toEqual({ collected: X });
    expect(pick(await ovPickup.delta(), ['collected'])).toEqual({ collected: 0 });
  });

  test('BF-EDIT-15 extension larger than the collateral: the rest is due (amountDue); not extended = as before', async () => {
    const A = 300000;
    const S = 100000;
    const product = await s.createProduct({ kind: 'FIXED', price: A, stock: 2 });
    const customer = await s.createCustomer();
    const w = futureWindow(2);
    const plain = await s.createOrder(rentBody({ customer, lines: [{ product }], from: w.from, to: w.to }).body);
    await s.setStatus(plain.id, 'PICKUPED', { pickedUpAt: vnAt(w.from, '09:00').toISOString(), securityDeposit: S });
    // another customer: an identical order within 60 s is a retry of the first (#341)
    const extended = await s.createOrder(rentBody({ customer: await s.createCustomer(), lines: [{ product }], from: w.from, to: w.to }).body);
    await s.setStatus(extended.id, 'PICKUPED', { pickedUpAt: vnAt(w.from, '09:00').toISOString(), securityDeposit: S });
    await s.updateOrder(extended.id, { totalAmount: A + 250000 });
    const rowPlain = await s.orderRow(plain.id);
    expect([rowPlain.amountDue, rowPlain.refundDue]).toEqual([0, S]);
    const rowExt = await s.orderRow(extended.id);
    expect([rowExt.amountDue, rowExt.refundDue]).toEqual([150000, 0]);
    // a RESERVED order is unaffected by pickupTotalAmount (still null)
    const reserved = await s.createOrder(rentBody({ customer: await s.createCustomer(), lines: [{ product }], from: w.from, to: w.to }).body);
    const detail = await s.getOrder(reserved.id);
    expect(detail.pickupTotalAmount ?? null).toBeNull();
    expect((await s.orderRow(reserved.id)).amountDue).toBe(A);
  });

  test('BF-EDIT-12 late return: late fee (2 days x daily price) is collected on the return day', async () => {
    const price = 50000;
    const product = await s.createProduct({ kind: 'DAILY', price, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(2);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product }], from: w.from, to: w.to }).body);
    await s.setStatus(order.id, 'PICKUPED', { pickedUpAt: vnAt(w.from, '08:00').toISOString() });
    const lateDay = addDays(w.to, 2);
    const ovLate = await watchOverview(s, lateDay);
    const L = 2 * price;
    await s.updateOrder(order.id, { lateFee: L });
    expect((await s.orderRow(order.id)).amountDue).toBe(L);
    await s.setStatus(order.id, 'RETURNED', { returnedAt: vnAt(lateDay, '10:00').toISOString() });
    expect(pick(await ovLate.delta(), ['collected', 'fees', 'returns'])).toEqual({ collected: L, fees: L, returns: 1 });
    const detail = await s.getOrder(order.id);
    expect([detail.lateFee, detail.totalAmount]).toEqual([L, 2 * price]);
  });

  test('BF-EDIT-13 edits after hand-over and on closed orders: what the API accepts today', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 3 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const args = { customer, from: w.from, to: w.to };
    const statusOf = async (id, patch) => (await s.updateOrder(id, patch)).status;

    // PICKUPED: lines, dates, notes are all accepted (no lock after pickup)
    const picked = await s.createOrder(rentBody({ ...args, lines: [{ product }] }).body);
    await s.setStatus(picked.id, 'PICKUPED');
    expect(await statusOf(picked.id, updateBody({ ...args, lines: [{ product, quantity: 2 }] }).body)).toBe(200);
    expect(await statusOf(picked.id, { notes: 'sau khi giao' })).toBe(200);

    // RETURNED: still editable through PUT (question for the owner); status cannot move back
    await s.setStatus(picked.id, 'RETURNED');
    expect(await statusOf(picked.id, { notes: 'đã trả' })).toBe(200);
    expect(await statusOf(picked.id, { totalAmount: 1 })).toBe(200);
    expect(await statusOf(picked.id, { status: 'PICKUPED' })).toBe(400);

    // CANCELLED: same
    const cancelled = await s.createOrder(rentBody({ ...args, customer: await s.createCustomer(), lines: [{ product }] }).body);
    await s.setStatus(cancelled.id, 'CANCELLED');
    expect(await statusOf(cancelled.id, { notes: 'đã huỷ' })).toBe(200);
    expect(await statusOf(cancelled.id, { status: 'RESERVED' })).toBe(400);

    // COMPLETED sale: editable, cannot go back to RESERVED
    const saleProduct = await s.createProduct({ kind: 'SALE', price: 50000, stock: 3 });
    const sale = await s.createOrder(saleBody({ customer: await s.createCustomer(), lines: [{ product: saleProduct }] }).body);
    expect(await statusOf(sale.id, { notes: 'bán xong' })).toBe(200);
    expect(await statusOf(sale.id, { status: 'RESERVED' })).toBe(400);
  });
});
