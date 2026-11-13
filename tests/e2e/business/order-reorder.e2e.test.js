/**
 * BF-REORDER: "Đặt lại" an order (#1515), against the real local API.
 * The clients (web, iOS, Android) read an order, load each product again, build a cart with the CURRENT prices and
 * POST a new order. No new endpoint: this file proves the existing ones carry everything that flow needs.
 * Rules (spec.md): copy order type, customer, order notes, each line's product / quantity / line note.
 * Do not copy discount, deposit, collateral, payments, status, order number, dates. Prices are today's prices.
 * Expected numbers come from the inputs below, never from the API.
 */
const { Session, describeE2E, futureWindow, rentBody, saleBody, uniqueName } = require('../helpers/api');

/** What every client does on "Đặt lại": old order + freshly loaded products -> body of the new order. */
function reorderBody(detail, products, window) {
  const customer = detail.customer ? { id: detail.customer.id } : null;
  const outletId = detail.outlet?.id ?? detail.outletId; // the new order stays in the old order's branch
  const lines = detail.orderItems
    .filter((i) => i.productId && products[i.productId])
    .map((i) => ({ product: products[i.productId], quantity: i.quantity, notes: i.notes || '' }));
  if (detail.orderType === 'SALE') {
    const { body } = saleBody({ customer, lines });
    body.orderItems = body.orderItems.map((it, ix) => ({ ...it, ...(lines[ix].notes ? { notes: lines[ix].notes } : {}) }));
    if (detail.notes) body.notes = detail.notes;
    if (outletId) body.outletId = outletId;
    return body;
  }
  const { body } = rentBody({ customer, lines, from: window.from, to: window.to, notes: detail.notes || undefined });
  body.orderItems = body.orderItems.map((it, ix) => ({ ...it, ...(lines[ix].notes ? { notes: lines[ix].notes } : {}) }));
  if (outletId) body.outletId = outletId;
  return body;
}

async function freshProducts(s, ids) {
  const out = {};
  for (const id of ids) {
    const r = await s.get(`/api/products/${id}`);
    if (r.ok) out[id] = r.body.data.product || r.body.data;
  }
  return out;
}

describeE2E('BF-REORDER reorder an order through the existing API', () => {
  let s;

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  test('BF-REORDER-01 rent order: new order has the same customer, items, notes; current prices; no discount, deposit or collateral', async () => {
    const fixed = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 3 });
    const daily = await s.createProduct({ kind: 'DAILY', price: 50000, stock: 3 });
    const customer = await s.createCustomer();
    const w1 = futureWindow(3);
    const first = rentBody({
      customer,
      lines: [{ product: fixed, quantity: 2 }, { product: daily, quantity: 1 }],
      from: w1.from,
      to: w1.to,
      discountAmount: 30000,
      depositAmount: 50000,
      collateralDetails: 'CCCD',
      notes: 'Giao buổi sáng'
    });
    first.body.orderItems[1].notes = 'Là sẵn, kèm túi';
    const old = await s.createOrder(first.body);
    const oldTotal = 2 * 100000 + 50000 * 3 - 30000;
    expect(old.totalAmount).toBe(oldTotal);

    // The shop raises a price after the first order
    expect((await s.updateProduct(fixed.id, { name: fixed.name, rentPrice: 120000, pricingOptions: [{ type: 'FIXED', price: 120000, isDefault: true }] })).status).toBe(200);

    // 1. Read the order the way the order page does (by id, and by number: the web URL)
    const byId = await s.getOrder(old.id);
    const byNumber = await s.get(`/api/orders/by-number/${old.orderNumber}`);
    expect(byNumber.status).toBe(200);
    const detail = byId;
    expect(detail.orderType).toBe('RENT');
    expect(detail.customer.id).toBe(customer.id);
    expect(detail.notes).toBe('Giao buổi sáng');
    expect(detail.orderItems.map((i) => [i.productId, i.quantity, i.notes || ''])).toEqual([
      [fixed.id, 2, ''],
      [daily.id, 1, 'Là sẵn, kèm túi']
    ]);

    // 2. Load the products again, 3. build the cart, 4. create the new order with new dates
    const products = await freshProducts(s, detail.orderItems.map((i) => i.productId));
    expect(products[fixed.id].rentPrice).toBe(120000);
    const w2 = futureWindow(2);
    const body = reorderBody(detail, products, w2);
    const created = await s.createOrder(body);

    expect(created.id).not.toBe(old.id);
    expect(created.orderNumber).not.toBe(old.orderNumber);
    expect(created.status).toBe('RESERVED');
    const fresh = await s.getOrder(created.id);
    expect(fresh.customer.id).toBe(customer.id);
    expect(fresh.notes).toBe('Giao buổi sáng');
    expect(fresh.outlet?.id ?? fresh.outletId).toBe(old.outlet?.id ?? old.outletId); // same branch
    expect(fresh.orderItems.map((i) => [i.productId, i.quantity, i.unitPrice, i.notes || ''])).toEqual([
      [fixed.id, 2, 120000, ''],
      [daily.id, 1, 50000, 'Là sẵn, kèm túi']
    ]);
    expect(fresh.totalAmount).toBe(2 * 120000 + 50000 * 2); // new price, 2 days, no discount
    expect(fresh.discountAmount || 0).toBe(0);
    expect(fresh.depositAmount || 0).toBe(0);
    expect(fresh.securityDeposit || 0).toBe(0);
    expect(fresh.collateralDetails || '').toBe('');

    // The old order is untouched
    const stillOld = await s.getOrder(old.id);
    expect(stillOld.totalAmount).toBe(oldTotal);
    expect(stillOld.discountAmount).toBe(30000);
    expect(stillOld.depositAmount).toBe(50000);
    expect(stillOld.orderItems.map((i) => i.unitPrice)).toEqual([100000, 50000]);
  });

  test('BF-REORDER-02 a cancelled order can be read and reordered too', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 80000, stock: 2 });
    const customer = await s.createCustomer();
    const w1 = futureWindow(1);
    const old = await s.createOrder(rentBody({ customer, lines: [{ product, quantity: 1 }], from: w1.from, to: w1.to, notes: 'Khách quen' }).body);
    expect((await s.setStatus(old.id, 'CANCELLED', { cancelKeptAmount: 0 })).status).toBe(200);

    const detail = await s.getOrder(old.id);
    expect(detail.status).toBe('CANCELLED');
    const products = await freshProducts(s, detail.orderItems.map((i) => i.productId));
    const w2 = futureWindow(1);
    const created = await s.createOrder(reorderBody(detail, products, w2));
    const fresh = await s.getOrder(created.id);
    expect(fresh.status).toBe('RESERVED');
    expect(fresh.customer.id).toBe(customer.id);
    expect(fresh.notes).toBe('Khách quen');
    expect(fresh.totalAmount).toBe(80000);
  });

  test('BF-REORDER-03 sale order: new sale has the same items at the current sale price, no discount', async () => {
    const product = await s.createProduct({ kind: 'SALE', price: 200000, stock: 5 });
    const customer = await s.createCustomer();
    const first = saleBody({ customer, lines: [{ product, quantity: 2 }], discountAmount: 20000 });
    const old = await s.createOrder(first.body);
    expect(old.totalAmount).toBe(380000);
    expect(old.status).toBe('COMPLETED');

    expect((await s.updateProduct(product.id, { name: product.name, salePrice: 250000 })).status).toBe(200);
    const detail = await s.getOrder(old.id);
    const products = await freshProducts(s, detail.orderItems.map((i) => i.productId));
    expect(products[product.id].salePrice).toBe(250000);
    const created = await s.createOrder(reorderBody(detail, products, null));
    const fresh = await s.getOrder(created.id);
    expect(fresh.orderType).toBe('SALE');
    expect(fresh.customer.id).toBe(customer.id);
    expect(fresh.orderItems.map((i) => [i.productId, i.quantity, i.unitPrice])).toEqual([[product.id, 2, 250000]]);
    expect(fresh.totalAmount).toBe(500000);
    expect(fresh.discountAmount || 0).toBe(0);
  });

  test('BF-REORDER-04 a deleted product: the old order still reads, the product no longer loads, so the client drops that line', async () => {
    const keep = await s.createProduct({ kind: 'FIXED', price: 60000, stock: 2 });
    const gone = await s.createProduct({ kind: 'FIXED', price: 90000, stock: 2, name: uniqueName('Se xoa') });
    const customer = await s.createCustomer();
    const w1 = futureWindow(1);
    const old = await s.createOrder(rentBody({ customer, lines: [{ product: keep }, { product: gone }], from: w1.from, to: w1.to }).body);
    expect((await s.setStatus(old.id, 'CANCELLED', { cancelKeptAmount: 0 })).status).toBe(200);
    const del = await s.delete(`/api/products/${gone.id}`);
    expect(del.status).toBe(200);

    const detail = await s.getOrder(old.id);
    expect(detail.orderItems).toHaveLength(2);
    const products = await freshProducts(s, detail.orderItems.map((i) => i.productId));
    expect(Object.keys(products).map(Number)).toEqual([keep.id]); // the deleted one is not loadable
    const w2 = futureWindow(1);
    const created = await s.createOrder(reorderBody(detail, products, w2));
    const fresh = await s.getOrder(created.id);
    expect(fresh.orderItems.map((i) => i.productId)).toEqual([keep.id]);
    expect(fresh.totalAmount).toBe(60000);
  });
});
