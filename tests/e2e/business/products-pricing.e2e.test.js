/**
 * BF-PROD (products) and BF-PRICE (order price maths) (#498).
 * Pricing: FIXED = per rental (rentalDays 1), DAILY = per Vietnam civil day, both ends counted (#351),
 * HOURLY = per started hour. The apps compute line totals; the API stores them and snapshots the product.
 */
const {
  Session,
  describeE2E,
  vnDateKey,
  vnDayRange,
  futureWindow,
  rentBody,
  watchOverview,
  pick
} = require('../helpers/api');

describeE2E('BF-PROD products', () => {
  let s;
  const today = vnDateKey();

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  test('BF-PROD-01 rent product, fixed price, deposit, stock 3', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 150000, deposit: 500000, stock: 3 });
    expect(Number.isInteger(p.id)).toBe(true);
    expect(p).toMatchObject({ rentPrice: 150000, deposit: 500000, totalStock: 3, pricingType: 'FIXED' });
    expect(p.pricingOptions).toEqual([expect.objectContaining({ type: 'FIXED', price: 150000, isDefault: true })]);
    expect(await s.outletStock(p.id, p.outletId)).toEqual({ stock: 3, available: 3, renting: 0 });
  });

  test('BF-PROD-02 rent product, daily price', async () => {
    const p = await s.createProduct({ kind: 'DAILY', price: 60000, stock: 2 });
    expect(p).toMatchObject({ rentPrice: 60000, pricingType: 'DAILY', totalStock: 2 });
    expect(p.pricingOptions[0]).toMatchObject({ type: 'DAILY', price: 60000 });
  });

  test('BF-PROD-03 sale product', async () => {
    const p = await s.createProduct({ kind: 'SALE', price: 250000, stock: 10 });
    expect(p).toMatchObject({ salePrice: 250000, totalStock: 10 });
  });

  test('BF-PROD-04 a new product is in the list and the search with its stock', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 120000, stock: 4 });
    const r = await s.get(`/api/products?search=${encodeURIComponent(p.name)}&limit=10`);
    expect(r.status).toBe(200);
    const list = r.body.data.products || r.body.data.items || r.body.data;
    const row = list.find((x) => x.id === p.id);
    expect(row).toBeDefined();
    expect(row.rentPrice).toBe(120000);
    const stockRow = (row.outletStock || []).find((os) => (os.outletId ?? os.outlet?.id) === p.outletId);
    expect(stockRow).toMatchObject({ stock: 4 });
  });

  test('BF-PROD-05 a catalog price change only affects new orders', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const old = await s.createOrder(rentBody({ customer, lines: [{ product: p }], from: w.from, to: w.to }).body);
    const ov = await watchOverview(s, today);
    const r = await s.updateProduct(p.id, { rentPrice: 130000, pricingOptions: [{ type: 'FIXED', price: 130000, isDefault: true }] });
    expect(r.status).toBe(200);
    const fresh = await s.getProduct(p.id);
    expect(fresh.rentPrice).toBe(130000);
    const oldDetail = await s.getOrder(old.id);
    expect([oldDetail.totalAmount, oldDetail.orderItems[0].unitPrice, oldDetail.orderItems[0].totalPrice]).toEqual([100000, 100000, 100000]);
    expect(pick(await ov.delta(), ['orderValue', 'collected'])).toEqual({ orderValue: 0, collected: 0 });
    // a new cart reads the new catalog price
    const next = await s.createOrder(
      rentBody({ customer: await s.createCustomer(), lines: [{ product: fresh }], from: futureWindow(1).from, to: futureWindow(1).from }).body
    );
    expect(next.totalAmount).toBe(130000);
  });

  test('BF-PROD-06 hourly product needs a duration config', async () => {
    const outletId = await s.defaultOutletId();
    const base = { name: `SP HOURLY E2E ${Date.now()}`, rentPrice: 20000, totalStock: 1, outletStock: [{ outletId, stock: 1 }], pricingType: 'HOURLY' };
    const bad = await s.postForm('/api/products', base);
    expect(bad.status).toBe(400);
    const ok = await s.postForm('/api/products', {
      ...base,
      durationConfig: JSON.stringify({ minDuration: 1, maxDuration: 72, defaultDuration: 2 })
    });
    expect(ok.status).toBe(200);
    expect(ok.body.data.pricingType).toBe('HOURLY');
  });
});

describeE2E('BF-PRICE order price maths', () => {
  let s;
  const today = vnDateKey();

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  test('BF-PRICE-01 line totals: FIXED is per rental, DAILY is price x qty x VN days; subtotal = sum', async () => {
    const fixed = await s.createProduct({ kind: 'FIXED', price: 150000, stock: 5 });
    const daily = await s.createProduct({ kind: 'DAILY', price: 45000, stock: 5 });
    const customer = await s.createCustomer();
    const w = futureWindow(4);
    const { body, subtotal } = rentBody({
      customer,
      lines: [
        { product: fixed, quantity: 2 },
        { product: daily, quantity: 3 }
      ],
      from: w.from,
      to: w.to
    });
    expect(subtotal).toBe(2 * 150000 + 3 * 45000 * 4);
    const order = await s.createOrder(body);
    expect(order.totalAmount).toBe(subtotal);
    expect(order.rentalDuration).toBe(4);
    const by = Object.fromEntries(order.orderItems.map((i) => [i.productId, i]));
    expect(by[fixed.id]).toMatchObject({ quantity: 2, unitPrice: 150000, totalPrice: 300000, rentalDays: 1, pricingType: 'FIXED' });
    expect(by[daily.id]).toMatchObject({ quantity: 3, unitPrice: 45000, totalPrice: 540000, rentalDays: 4, pricingType: 'DAILY' });
  });

  test('BF-PRICE-02 whole đồng: odd prices, quantities and a percent discount stay integers end to end', async () => {
    const p = await s.createProduct({ kind: 'DAILY', price: 33333, stock: 5 });
    const customer = await s.createCustomer();
    const w = futureWindow(3);
    const subtotal = 33333 * 3 * 3;
    const discount = Math.round(subtotal * 0.07);
    const D = 33333;
    const ov = await watchOverview(s, today);
    const order = await s.createOrder(
      rentBody({
        customer,
        lines: [{ product: p, quantity: 3 }],
        from: w.from,
        to: w.to,
        depositAmount: D,
        discountAmount: discount,
        discountType: 'percentage',
        discountValue: 7
      }).body
    );
    const A = subtotal - discount;
    expect(order.totalAmount).toBe(A);
    const d = await ov.delta();
    expect(pick(d, ['collected', 'orderValue', 'outstanding'])).toEqual({ collected: D, orderValue: A, outstanding: A - D });
    for (const v of Object.values(pick(d, ['collected', 'orderValue', 'outstanding']))) expect(Number.isInteger(v)).toBe(true);
    await s.setStatus(order.id, 'PICKUPED');
    const d2 = await ov.delta();
    expect(d2.collected).toBe(A - D);
    expect(Number.isInteger(d2.report.revenue.collected)).toBe(true);
  });

  test('BF-PRICE-03 còn thu (amountDue) = total - deposit (+ collateral to take) - paid; Overview outstanding = total - deposit', async () => {
    const A = 500000;
    const D = 150000;
    const S = 300000;
    const p = await s.createProduct({ kind: 'FIXED', price: A, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const ov = await watchOverview(s, today);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product: p }], from: w.from, to: w.to, depositAmount: D, securityDeposit: S }).body);
    const row = await s.orderRow(order.id);
    expect([row.amountDue, row.refundDue, row.totalPaid]).toEqual([A - D + S, 0, 0]);
    expect(pick(await ov.delta(), ['outstanding', 'atPickup'])).toEqual({ outstanding: A - D, atPickup: A - D });
  });

  test('BF-PRICE-04 deposit above the total: nothing outstanding, the deposit is collected', async () => {
    const A = 100000;
    const D = 150000;
    const p = await s.createProduct({ kind: 'FIXED', price: A, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const ov = await watchOverview(s, today);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product: p }], from: w.from, to: w.to, depositAmount: D }).body);
    expect(pick(await ov.delta(), ['collected', 'orderValue', 'outstanding'])).toEqual({ collected: D, orderValue: A, outstanding: 0 });
    expect((await s.orderRow(order.id)).amountDue).toBe(0);
  });

  test('BF-PRICE-05 collateral refund path: held collateral minus fees is handed back', async () => {
    const S = 800000;
    const F = 120000;
    const p = await s.createProduct({ kind: 'FIXED', price: 200000, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const order = await s.createOrder(rentBody({ customer, lines: [{ product: p }], from: w.from, to: w.to }).body);
    await s.setStatus(order.id, 'PICKUPED', { securityDeposit: S });
    await s.updateOrder(order.id, { damageFee: F });
    const row = await s.orderRow(order.id);
    expect([row.amountDue, row.refundDue]).toEqual([0, S - F]);
  });

  test('BF-PRICE-06 HOURLY line: the server counts started hours when the app sends no rentDays', async () => {
    const outletId = await s.defaultOutletId();
    const created = await s.postForm('/api/products', {
      name: `SP HOURLY E2E ${Date.now()}`,
      rentPrice: 20000,
      totalStock: 1,
      outletStock: [{ outletId, stock: 1 }],
      pricingType: 'HOURLY',
      durationConfig: JSON.stringify({ minDuration: 1, maxDuration: 72, defaultDuration: 2 })
    });
    const product = created.body.data;
    const customer = await s.createCustomer();
    const day = futureWindow(1).from;
    const pickup = new Date(`${day}T09:00:00+07:00`);
    const ret = new Date(`${day}T13:30:00+07:00`); // 4.5 h -> 5 started hours
    const order = await s.createOrder({
      orderType: 'RENT',
      customerId: customer.id,
      pickupPlanAt: pickup.toISOString(),
      returnPlanAt: ret.toISOString(),
      totalAmount: 5 * 20000,
      depositAmount: 0,
      orderItems: [{ productId: product.id, quantity: 1, unitPrice: 20000, totalPrice: 5 * 20000, pricingType: 'HOURLY' }]
    });
    expect(order.totalAmount).toBe(100000);
    expect(order.orderItems[0]).toMatchObject({ pricingType: 'HOURLY', rentalDays: 5, totalPrice: 100000 });
    expect(order.rentalDuration).toBe(5);
  });

  test('BF-PRICE-07 a block option (trọn gói) on a daily product is sent as FIXED (#482): one price, rentalDays 1', async () => {
    const outletId = await s.defaultOutletId();
    const created = await s.postForm('/api/products', {
      name: `SP BLOCK E2E ${Date.now()}`,
      rentPrice: 50000,
      totalStock: 1,
      outletStock: [{ outletId, stock: 1 }],
      pricingType: 'DAILY',
      durationConfig: JSON.stringify({ minDuration: 1, maxDuration: 365, defaultDuration: 1 }),
      pricingOptions: [
        { type: 'DAILY', price: 50000, isDefault: true },
        { type: 'FIXED', price: 120000, isDefault: false }
      ]
    });
    expect(created.status).toBe(200);
    const product = created.body.data;
    const block = product.pricingOptions.find((o) => o.type === 'FIXED');
    const customer = await s.createCustomer();
    const w = futureWindow(4);
    const { body } = rentBody({ customer, lines: [{ product, unitPrice: 120000, pricingType: 'FIXED' }], from: w.from, to: w.to });
    body.orderItems[0].pricingOptionId = block.id;
    const order = await s.createOrder(body);
    expect(order.totalAmount).toBe(120000);
    expect(order.orderItems[0]).toMatchObject({ pricingType: 'FIXED', rentalDays: 1, totalPrice: 120000, pricingOptionId: block.id });
  });

  test('BF-PRICE-08 the API stores the totals the app sends (no server re-pricing)', async () => {
    // Current behaviour: totalAmount is trusted even when it does not match the lines. Question for the owner.
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const { body } = rentBody({ customer, lines: [{ product: p }], from: w.from, to: w.to });
    const order = await s.createOrder({ ...body, totalAmount: 90000 });
    expect([order.totalAmount, order.orderItems[0].totalPrice]).toEqual([90000, 100000]);
  });

  test('BF-PRICE-09 rental days count both ends in Vietnam days when the app sends no day count (#351)', async () => {
    const p = await s.createProduct({ kind: 'DAILY', price: 10000, stock: 1 });
    const customer = await s.createCustomer();
    const w = futureWindow(3);
    const order = await s.createOrder({
      orderType: 'RENT',
      customerId: customer.id,
      // Android sends local start of day / 23:59:59 instants; no rentalDuration, no rentDays
      pickupPlanAt: vnDayRange(w.from).start.toISOString(),
      returnPlanAt: vnDayRange(w.to).end.toISOString(),
      totalAmount: 30000,
      depositAmount: 0,
      orderItems: [{ productId: p.id, quantity: 1, unitPrice: 10000, totalPrice: 30000, pricingType: 'DAILY' }]
    });
    expect(order.rentalDuration).toBe(3);
    expect(order.orderItems[0].rentalDays).toBe(3);
  });
});
