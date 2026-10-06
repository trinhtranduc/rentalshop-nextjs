/**
 * BF-SCOPE (merchant / outlet scope, roles, no CUIDs) and BF-NUM (order numbers) (#498).
 * Order numbers are a random 6-digit string, unique, retried on collision (packages/database/src/order.ts).
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
  findCuids
} = require('../helpers/api');

describeE2E('BF-SCOPE scope and roles', () => {
  let s;
  let other;
  let staff;
  let order;
  let product;
  let customer;
  const today = vnDateKey();

  beforeAll(async () => {
    s = await Session.login('merchant');
    other = await Session.login('otherMerchant');
    staff = await Session.login('staff');
    product = await s.createProduct({ kind: 'FIXED', price: 210000, stock: 2 });
    customer = await s.createCustomer();
    const w = futureWindow(1);
    order = await s.createOrder(rentBody({ customer, lines: [{ product }], from: w.from, to: w.to, depositAmount: 10000 }).body);
  });

  test('BF-SCOPE-01 another merchant cannot change the order', async () => {
    const put = await other.updateOrder(order.id, { notes: 'hack' });
    expect(put.status).toBe(403);
    const status = await other.setStatus(order.id, 'CANCELLED');
    expect(status.status).toBe(403);
    const patch = await other.patch(`/api/orders/${order.id}/status`, { status: 'CANCELLED' });
    expect(patch.status).toBe(403);
    expect((await s.getOrder(order.id)).status).toBe('RESERVED');
    const byNumber = await other.get(`/api/orders/by-number/${order.orderNumber}`);
    expect([403, 404]).toContain(byNumber.status);
  });

  test('BF-SCOPE-02 another merchant does not see the order, product or customer in its lists and search', async () => {
    const rows = await other.listOrders({ search: order.orderNumber });
    expect(rows.find((o) => o.id === order.id)).toBeUndefined();
    const av = await other.get(`/api/products/${product.id}/availability?date=${futureWindow(1).from}`);
    expect([403, 404]).toContain(av.status);
    const cust = await other.get(`/api/customers/${customer.id}/orders`);
    expect([403, 404]).toContain(cust.status);
    const prod = await other.get(`/api/products/${product.id}`);
    expect([403, 404]).toContain(prod.status);
  });

  test('BF-SCOPE-03 another merchant\'s Overview does not move when this merchant sells', async () => {
    const ovOther = await watchOverview(other, today);
    const ovMine = await watchOverview(s, today);
    const p = await s.createProduct({ kind: 'SALE', price: 77000, stock: 2 });
    await s.createOrder(saleBody({ customer: await s.createCustomer(), lines: [{ product: p }] }).body);
    expect((await ovMine.delta()).collected).toBe(77000);
    expect(pick(await ovOther.delta(), ['collected', 'orderValue', 'newOrders'])).toEqual({ collected: 0, orderValue: 0, newOrders: 0 });
  });

  test('BF-SCOPE-04 OUTLET_STAFF cannot change a product price (API rejects)', async () => {
    expect(staff.user.role).toBe('OUTLET_STAFF');
    const r = await staff.updateProduct(product.id, { rentPrice: 1 });
    expect(r.status).toBe(403);
    expect((await s.getProduct(product.id)).rentPrice).toBe(210000);
  });

  test('BF-SCOPE-05 OUTLET_STAFF works orders of its own outlet only', async () => {
    const outlets = (await s.get('/api/outlets?limit=50')).body.data.outlets;
    const otherOutlet = outlets.find((o) => o.id !== staff.user.outletId);
    const w = futureWindow(1);
    const body = rentBody({ customer: await s.createCustomer(), lines: [{ product }], from: w.from, to: w.to }).body;
    const own = await staff.createOrderRaw(body);
    expect(own.status).toBe(200);
    expect(own.body.data.outletId).toBe(staff.user.outletId);
    if (otherOutlet) {
      const r = await staff.createOrderRaw({ ...body, customerId: (await s.createCustomer()).id, outletId: otherOutlet.id });
      expect(r.status).toBe(403);
    }
    // staff hand-over of its own outlet's order works
    const ok = await staff.setStatus(own.body.data.id, 'PICKUPED');
    expect(ok.status).toBe(200);
  });

  test('BF-SCOPE-06 responses carry numeric ids and no CUID', async () => {
    const payloads = [
      await s.getOrder(order.id),
      await s.orderRow(order.id),
      await s.getProduct(product.id),
      await s.period(today),
      await s.availability(product.id, futureWindow(1)),
      await s.customerOrders(customer.id),
      await s.outletOperations(),
      staff.user,
      s.user
    ];
    for (const p of payloads) expect(findCuids(p)).toEqual([]);
    const detail = payloads[0];
    for (const v of [detail.id, detail.outletId, detail.customerId, detail.orderItems[0].id, detail.orderItems[0].productId]) {
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describeE2E('BF-NUM order numbers', () => {
  let s;

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  test('BF-NUM-01 random 6-digit numbers, unique, findable by search and by number', async () => {
    const product = await s.createProduct({ kind: 'SALE', price: 1000, stock: 100 });
    const numbers = [];
    const ids = [];
    for (let i = 0; i < 12; i += 1) {
      const o = await s.createOrder(saleBody({ customer: await s.createCustomer(), lines: [{ product }] }).body);
      numbers.push(o.orderNumber);
      ids.push(o.id);
    }
    for (const n of numbers) expect(n).toMatch(/^[1-9]\d{5}$/);
    expect(new Set(numbers).size).toBe(numbers.length);
    const target = numbers[5];
    const found = await s.listOrders({ search: target });
    expect(found.map((o) => o.orderNumber)).toContain(target);
    const byNumber = await s.get(`/api/orders/by-number/${target}`);
    expect(byNumber.status).toBe(200);
    expect(byNumber.body.data.id).toBe(ids[5]);
  });
});
