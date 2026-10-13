/**
 * BF-ZERO (#951): a product priced 0đ, and a free line (unit price 0) on a priced product.
 * 0 is a real price: the product keeps a 0đ option, orders store 0 lines, totals and revenue count them as 0,
 * stock and availability are taken as for any other line. The same product may sit on two lines of one order
 * (one paid, one free): stock and availability add both lines up.
 */
const {
  Session,
  describeE2E,
  vnDateKey,
  futureWindow,
  rentBody,
  saleBody,
  watchOverview,
  pick
} = require('../helpers/api');

const MONEY = ['collected', 'orderValue', 'outstanding', 'newOrders'];

describeE2E('BF-ZERO 0đ products and free lines', () => {
  let s;
  const today = vnDateKey();

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  test('BF-ZERO-01 a 0đ rent product keeps its 0đ option; a 0đ sale price is kept; negatives are refused', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 0, salePrice: 0, stock: 3 });
    expect(p).toMatchObject({ rentPrice: 0, salePrice: 0, pricingType: 'FIXED' });
    expect(p.pricingOptions).toEqual([expect.objectContaining({ type: 'FIXED', price: 0, isDefault: true })]);
    const fresh = await s.getProduct(p.id);
    expect(fresh.pricingOptions).toEqual([expect.objectContaining({ type: 'FIXED', price: 0, isDefault: true })]);

    const daily = await s.createProduct({ kind: 'DAILY', price: 0, stock: 1 });
    expect(daily.pricingOptions).toEqual([expect.objectContaining({ type: 'DAILY', price: 0, isDefault: true })]);

    // edit: a priced product set to 0đ, and back
    const priced = await s.createProduct({ kind: 'FIXED', price: 80000, stock: 1 });
    const r = await s.updateProduct(priced.id, { rentPrice: 0, pricingOptions: [{ type: 'FIXED', price: 0, isDefault: true }] });
    expect(r.status).toBe(200);
    const after = await s.getProduct(priced.id);
    expect(after.rentPrice).toBe(0);
    expect(after.pricingOptions).toEqual([expect.objectContaining({ type: 'FIXED', price: 0 })]);

    const outletId = await s.defaultOutletId();
    const bad = await s.postForm('/api/products', {
      name: `SP NEG ${Date.now()}`,
      rentPrice: 0,
      totalStock: 1,
      outletStock: [{ outletId, stock: 1 }],
      pricingOptions: [{ type: 'FIXED', price: -1, isDefault: true }]
    });
    expect(bad.status).toBe(400);
  });

  test('BF-ZERO-02 rent a 0đ product with a paid one: totals, revenue, stock and availability', async () => {
    const free = await s.createProduct({ kind: 'FIXED', price: 0, stock: 1 });
    const paid = await s.createProduct({ kind: 'FIXED', price: 200000, stock: 2 });
    const customer = await s.createCustomer();
    const w = futureWindow(2);
    const D = 50000;
    const ov = await watchOverview(s, today);
    const { body, subtotal } = rentBody({ customer, lines: [{ product: paid }, { product: free }], from: w.from, to: w.to, depositAmount: D });
    expect(subtotal).toBe(200000);
    const order = await s.createOrder(body);
    expect(order.totalAmount).toBe(200000);
    const by = Object.fromEntries(order.orderItems.map((i) => [i.productId, i]));
    expect(by[free.id]).toMatchObject({ quantity: 1, unitPrice: 0, totalPrice: 0 });
    expect(by[paid.id]).toMatchObject({ unitPrice: 200000, totalPrice: 200000 });
    expect(pick(await ov.delta(), MONEY)).toEqual({ collected: D, orderValue: 200000, outstanding: 200000 - D, newOrders: 1 });
    // the free item still holds stock for those days
    expect((await s.availability(free.id, w)).isAvailable).toBe(false);

    const detail = await s.getOrder(order.id);
    expect(detail.orderItems.find((i) => i.productId === free.id)).toMatchObject({ unitPrice: 0, totalPrice: 0 });

    await s.setStatus(order.id, 'PICKUPED');
    expect(await s.outletStock(free.id, free.outletId)).toEqual({ stock: 1, available: 0, renting: 1 });
    expect((await ov.delta()).collected).toBe(200000 - D);
  });

  test('BF-ZERO-03 a priced product given free on one line (unit price 0); the order total counts 0 for it', async () => {
    const vest = await s.createProduct({ kind: 'DAILY', price: 60000, stock: 3 });
    const shirt = await s.createProduct({ kind: 'FIXED', price: 90000, stock: 3 });
    const customer = await s.createCustomer();
    const w = futureWindow(3);
    const ov = await watchOverview(s, today);
    const { body, subtotal } = rentBody({
      customer,
      lines: [{ product: vest, quantity: 2 }, { product: shirt, unitPrice: 0 }],
      from: w.from,
      to: w.to
    });
    expect(subtotal).toBe(2 * 60000 * 3);
    const order = await s.createOrder(body);
    expect(order.totalAmount).toBe(subtotal);
    const by = Object.fromEntries(order.orderItems.map((i) => [i.productId, i]));
    expect(by[shirt.id]).toMatchObject({ unitPrice: 0, totalPrice: 0, quantity: 1 });
    expect(pick(await ov.delta(), ['orderValue', 'outstanding', 'newOrders'])).toEqual({ orderValue: subtotal, outstanding: subtotal, newOrders: 1 });
    // edit the order: the vest becomes free too; the 0 lines stay 0
    const edit = rentBody({ customer, lines: [{ product: vest, quantity: 2, unitPrice: 0 }, { product: shirt, unitPrice: 0 }], from: w.from, to: w.to }).body;
    edit.orderItems = edit.orderItems.map(({ rentDays, ...i }) => ({ ...i, rentalDays: i.pricingType === 'DAILY' ? 3 : 1 }));
    const r = await s.updateOrder(order.id, edit);
    expect(r.status).toBe(200);
    expect(r.body.data.totalAmount).toBe(0);
    expect(r.body.data.orderItems.map((i) => [i.productId, i.unitPrice, i.totalPrice]).sort()).toEqual(
      [
        [vest.id, 0, 0],
        [shirt.id, 0, 0]
      ].sort()
    );
    expect(pick(await ov.delta(), ['orderValue', 'outstanding'])).toEqual({ orderValue: -subtotal, outstanding: -subtotal });
  });

  test('BF-ZERO-04 a sale with a free line: revenue counts only the paid line; stock leaves for both', async () => {
    const cup = await s.createProduct({ kind: 'SALE', price: 30000, stock: 5 });
    const gift = await s.createProduct({ kind: 'SALE', price: 0, stock: 5 });
    expect(gift.salePrice).toBe(0);
    const customer = await s.createCustomer();
    const ov = await watchOverview(s, today);
    const { body, subtotal } = saleBody({ customer, lines: [{ product: cup, quantity: 2 }, { product: gift }, { product: cup, unitPrice: 0 }] });
    expect(subtotal).toBe(60000);
    const order = await s.createOrder(body);
    expect(order).toMatchObject({ status: 'COMPLETED', totalAmount: 60000 });
    expect(order.orderItems.filter((i) => i.unitPrice === 0)).toHaveLength(2);
    expect(pick(await ov.delta(), ['collected', 'orderValue', 'outstanding', 'newOrders'])).toEqual({
      collected: 60000,
      orderValue: 60000,
      outstanding: 0,
      newOrders: 1
    });
    expect(await s.outletStock(cup.id, cup.outletId)).toEqual({ stock: 2, available: 2, renting: 0 });
    expect(await s.outletStock(gift.id, gift.outletId)).toEqual({ stock: 4, available: 4, renting: 0 });
  });

  test('BF-ZERO-05 one product on two lines of a rent order (one paid, one 0đ): totals, stock and availability add up', async () => {
    const p = await s.createProduct({ kind: 'FIXED', price: 150000, stock: 3 });
    const customer = await s.createCustomer();
    const w = futureWindow(1);
    const ov = await watchOverview(s, today);
    const { body } = rentBody({ customer, lines: [{ product: p, quantity: 1 }, { product: p, quantity: 2, unitPrice: 0 }], from: w.from, to: w.to });
    const order = await s.createOrder(body);
    expect(order.totalAmount).toBe(150000);
    const lines = order.orderItems.filter((i) => i.productId === p.id).map((i) => [i.quantity, i.unitPrice, i.totalPrice]);
    expect(lines.sort()).toEqual(
      [
        [1, 150000, 150000],
        [2, 0, 0]
      ].sort()
    );
    expect(pick(await ov.delta(), ['orderValue', 'newOrders'])).toEqual({ orderValue: 150000, newOrders: 1 });
    // 3 of 3 taken for those days: one more is refused / unavailable
    const av = await s.availability(p.id, w);
    expect(av.isAvailable).toBe(false);
    const more = await s.createOrderRaw(rentBody({ customer, lines: [{ product: p }], from: w.from, to: w.to }).body);
    expect(more.status).toBeGreaterThanOrEqual(400);
    // the detail keeps both lines
    const detail = await s.getOrder(order.id);
    expect(detail.orderItems.filter((i) => i.productId === p.id)).toHaveLength(2);
    // pickup takes 3 out
    await s.setStatus(order.id, 'PICKUPED');
    expect(await s.outletStock(p.id, p.outletId)).toEqual({ stock: 3, available: 0, renting: 3 });
  });
});
