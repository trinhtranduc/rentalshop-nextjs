/**
 * BF-ORD-MERCHANT — an order only references things of the merchant of its outlet (#789).
 *
 * Found while making the merchant order screens work on a phone: the admin order form loaded the products,
 * customers and outlets of every merchant (the list filters were dropped by the client helpers), and the order API
 * did not check that the products and the customer of an order belong to the merchant of the outlet:
 *  - POST /api/orders checked the customer only for non-admin callers and never checked the products;
 *  - PUT /api/orders/[id] checked neither.
 * Two merchants of the seed are used: merchant2 (`merchant`) and merchant1 (`otherMerchant`).
 * Run: scripts/e2e/business-e2e.sh -- order-merchant-scope   (needs E2E_API_URL).
 */
const { Session, describeE2E, must, futureWindow, rentBody } = require('../helpers/api');
const S = require('../helpers/subscription');

const brief = (r) => ({ status: r.status, code: r.body?.code });
const listOf = (data, ...keys) => {
  if (Array.isArray(data)) return data;
  for (const k of keys) if (Array.isArray(data?.[k])) return data[k];
  return [];
};

describeE2E('BF-ORD-MERCHANT orders stay inside one merchant', () => {
  let m2; // merchant2
  let m1; // merchant1
  let admin;
  let outlet2;
  let outlet1;
  let product2;
  let product1;
  let customer2;
  let customer1;

  const firstOutletId = async (s) => listOf(await must(s.get('/api/outlets?limit=50'), 'outlets'), 'outlets', 'items')[0].id;
  const body = (customer, product, outletId) => {
    const win = futureWindow(1);
    return { ...rentBody({ customer, lines: [{ product }], from: win.from, to: win.to }).body, outletId };
  };
  const orderTotal = async (s) => {
    const r = await must(s.get('/api/orders?limit=1'), 'orders');
    return r.total ?? r.pagination?.total ?? listOf(r, 'orders').length;
  };

  beforeAll(async () => {
    m2 = await Session.login('merchant');
    m1 = await Session.login('otherMerchant');
    admin = await S.login({ email: 'admin@rentalshop.com', password: 'admin123' });
    outlet2 = await firstOutletId(m2);
    outlet1 = await firstOutletId(m1);
    product2 = await m2.createProduct({ price: 90000, stock: 5, outletId: outlet2 });
    product1 = await m1.createProduct({ price: 70000, stock: 5, outletId: outlet1 });
    customer2 = await m2.createCustomer();
    customer1 = await m1.createCustomer();
  });

  test('BF-ORD-MERCHANT-01 the admin lists of one merchant (products, customers, outlets) hold only that merchant', async () => {
    const mid = m2.user.merchantId;
    // Other suites leave hundreds of rows: look the unique names up instead of reading the first page.
    const find = async (path, name) => listOf((await admin.get(`${path}${path.includes('?') ? '&' : '?'}merchantId=${mid}&search=${encodeURIComponent(name)}&limit=50`)).body.data, 'products', 'customers', 'items');
    const custName = (c) => c.firstName ?? c.name;
    expect((await find('/api/products', product2.name)).map((p) => p.id)).toContain(product2.id);
    expect((await find('/api/products', product1.name)).map((p) => p.id)).not.toContain(product1.id);
    expect((await find('/api/customers', custName(customer2))).map((c) => c.id)).toContain(customer2.id);
    expect((await find('/api/customers', custName(customer1))).map((c) => c.id)).not.toContain(customer1.id);
    const outlets = listOf((await admin.get(`/api/outlets?merchantId=${mid}&limit=50`)).body.data, 'outlets', 'items');
    expect(outlets.map((o) => o.id)).toContain(outlet2);
    expect(outlets.map((o) => o.id)).not.toContain(outlet1);
  });

  test('BF-ORD-MERCHANT-02 control: an order with the merchant\'s own product and customer is created', async () => {
    const r = await m2.createOrderRaw(body(customer2, product2, outlet2));
    expect(r.status === 200 || r.status === 201).toBe(true);
  });

  test('BF-ORD-MERCHANT-03 a merchant cannot put another merchant\'s product in an order: 404 PRODUCT_NOT_FOUND, nothing created', async () => {
    const before = await orderTotal(m2);
    const r = await m2.createOrderRaw(body(customer2, product1, outlet2));
    expect(brief(r)).toEqual({ status: 404, code: 'PRODUCT_NOT_FOUND' });
    expect(await orderTotal(m2)).toBe(before);
  });

  test('BF-ORD-MERCHANT-04 the admin cannot use another merchant\'s customer for an outlet: 404 CUSTOMER_NOT_FOUND', async () => {
    const before = await orderTotal(m2);
    const r = await admin.postForm('/api/orders', body(customer1, product2, outlet2));
    expect(brief(r)).toEqual({ status: 404, code: 'CUSTOMER_NOT_FOUND' });
    expect(await orderTotal(m2)).toBe(before);
  });

  test('BF-ORD-MERCHANT-05 the admin cannot use another merchant\'s product for an outlet: 404 PRODUCT_NOT_FOUND', async () => {
    const before = await orderTotal(m2);
    const r = await admin.postForm('/api/orders', body(customer2, product1, outlet2));
    expect(brief(r)).toEqual({ status: 404, code: 'PRODUCT_NOT_FOUND' });
    expect(await orderTotal(m2)).toBe(before);
  });

  test('BF-ORD-MERCHANT-06 updating an order: another merchant\'s customer is refused (404 CUSTOMER_NOT_FOUND), the order is unchanged', async () => {
    const created = await m2.createOrder(body(customer2, product2, outlet2));
    const id = created.id ?? created.order?.id;
    const r = await m2.updateOrder(id, { customerId: customer1.id });
    expect(brief(r)).toEqual({ status: 404, code: 'CUSTOMER_NOT_FOUND' });
    const after = await m2.getOrder(id);
    expect((after.order ?? after).customerId ?? (after.order ?? after).customer?.id).toBe(customer2.id);
  });

  test('BF-ORD-MERCHANT-07 updating an order: another merchant\'s product in the lines is refused (404 PRODUCT_NOT_FOUND), the lines are unchanged', async () => {
    const created = await m2.createOrder(body(customer2, product2, outlet2));
    const id = created.id ?? created.order?.id;
    const lineBody = body(customer2, product1, outlet2);
    const r = await m2.updateOrder(id, { orderItems: lineBody.orderItems, totalAmount: lineBody.totalAmount });
    expect(brief(r)).toEqual({ status: 404, code: 'PRODUCT_NOT_FOUND' });
    const after = await m2.getOrder(id);
    const items = (after.order ?? after).orderItems ?? [];
    expect(items.map((i) => i.productId ?? i.product?.id)).toEqual([product2.id]);
  });
});
