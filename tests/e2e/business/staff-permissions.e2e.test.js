/**
 * BF-STAFF — OUTLET_STAFF permission matrix (#635).
 * Source of the matrix: ROLE_PERMISSIONS['OUTLET_STAFF'] in packages/auth/src/permissions.ts.
 * Allowed calls must succeed; denied calls must be rejected (403) AND leave the data unchanged, read back as the
 * merchant. A case where the API disagrees with the matrix asserts the matrix and runs as a known bug.
 * BF-SCOPE-04 (staff price edit) and BF-SCOPE-05 (staff orders at own outlet only) are not repeated here.
 */
const {
  Session,
  describeE2E,
  must,
  request,
  vnDateKey,
  futureWindow,
  rentBody,
  uniqueName
} = require('../helpers/api');

describeE2E('BF-STAFF OUTLET_STAFF permissions', () => {
  let s;
  let staff;
  let merchantId;
  let outletId;
  let product;
  let customer;
  let order;
  const today = vnDateKey();

  const del = (session, path) => request(session.token, 'DELETE', path);
  const listOf = (data, ...keys) => {
    if (Array.isArray(data)) return data;
    for (const k of keys) if (Array.isArray(data?.[k])) return data[k];
    return [];
  };
  const profile = async (session) => must(session.get('/api/users/profile'), 'profile');
  const outletRow = async (id) => {
    const data = await must(s.get('/api/outlets?limit=50'), 'list outlets');
    return listOf(data, 'outlets', 'items').find((o) => o.id === id);
  };

  beforeAll(async () => {
    s = await Session.login('merchant');
    staff = await Session.login('staff');
    expect(staff.user.role).toBe('OUTLET_STAFF');
    outletId = staff.user.outletId;
    merchantId = s.user.merchantId ?? s.user.merchant?.id ?? (await profile(s)).merchant.id;
    product = await s.createProduct({ kind: 'FIXED', price: 180000, stock: 3, outletId });
    customer = await s.createCustomer();
    const w = futureWindow(1);
    order = await s.createOrder({
      ...rentBody({ customer, lines: [{ product }], from: w.from, to: w.to, depositAmount: 20000 }).body,
      outletId
    });
  });

  // ------------------------------------------------------------------ outlet

  test('BF-STAFF-01 views its own outlet only', async () => {
    const r = await staff.get('/api/outlets?limit=50');
    expect(r.status).toBe(200);
    const ids = listOf(r.body.data, 'outlets', 'items').map((o) => o.id);
    expect(ids).toEqual([outletId]);
  });

  // ------------------------------------------------------------------ products

  test('BF-STAFF-02 lists and opens products, without cost price', async () => {
    const list = await staff.get(`/api/products?search=${encodeURIComponent(product.name)}`);
    expect(list.status).toBe(200);
    const row = listOf(list.body.data, 'products', 'items').find((p) => p.id === product.id);
    expect(row).toBeDefined();
    expect(row).not.toHaveProperty('costPrice');
    const detail = await staff.get(`/api/products/${product.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.id).toBe(product.id);
    expect(detail.body.data).not.toHaveProperty('costPrice');
  });

  test('BF-STAFF-03 creates a product without price fields at its outlet', async () => {
    // rentPrice is required by productCreateSchema; 0 is what a form without price fields sends.
    const name = uniqueName('SP staff');
    const r = await staff.postForm('/api/products', { name, rentPrice: 0, totalStock: 2, outletStock: [{ outletId, stock: 2 }] });
    expect({ status: r.status, code: r.body?.code, error: r.body?.error }).toMatchObject({ status: 200 });
    const created = await s.getProduct(r.body.data.id);
    expect(created).toMatchObject({ name, rentPrice: 0, salePrice: 0, totalStock: 2 });
  });

  test('BF-STAFF-04 cannot edit a product (name, stock), on either update route', async () => {
    const r = await staff.updateProduct(product.id, { name: 'staff rename', totalStock: 9 });
    expect(r.status).toBe(403);
    const r2 = await staff.put(`/api/merchants/${merchantId}/products/${product.id}`, { name: 'staff rename' });
    expect(r2.status).toBe(403);
    const after = await s.getProduct(product.id);
    expect(after.name).toBe(product.name);
    expect(after.totalStock).toBe(3);
  });

  test('BF-STAFF-05 cannot delete a product (single or batch)', async () => {
    const removed = await del(staff, `/api/products/${product.id}`);
    expect(removed.status).toBe(403);
    const batch = await staff.post('/api/products/batch-delete', { ids: [product.id] });
    expect(batch.status).toBe(403);
    expect((await s.get(`/api/products/${product.id}`)).status).toBe(200);
  });

  test('BF-STAFF-06 cannot export or bulk-import products', async () => {
    expect((await staff.get('/api/products/export?format=csv')).status).toBe(403);
    const name = uniqueName('SP import');
    const imp = await staff.post('/api/products/bulk-import', { products: [{ name, rentPrice: 1, totalStock: 1 }] });
    expect(imp.status).toBe(403);
    const found = await must(s.get(`/api/products?search=${encodeURIComponent(name)}`), 'search products');
    expect(listOf(found, 'products', 'items')).toEqual([]);
  });

  // ------------------------------------------------------------------ categories

  describe('categories', () => {
    let category;

    beforeAll(async () => {
      const data = await must(s.post('/api/categories', { name: uniqueName('DM') }), 'create category');
      category = data.category || data;
    });

    const merchantCategories = async () => listOf(await must(s.get('/api/categories'), 'list categories'), 'categories');

    test('BF-STAFF-07 lists categories (to pick one on a product)', async () => {
      const r = await staff.get('/api/categories');
      expect(r.status).toBe(200);
      expect(listOf(r.body.data, 'categories').map((c) => c.id)).toContain(category.id);
    });

    test('BF-STAFF-08 cannot add a category', async () => {
      const name = uniqueName('DM staff');
      const r = await staff.post('/api/categories', { name });
      expect(r.status).toBe(403);
      expect((await merchantCategories()).map((c) => c.name)).not.toContain(name);
    });

    test('BF-STAFF-09 cannot rename or delete a category', async () => {
      const put = await staff.put(`/api/categories/${category.id}`, { name: 'staff rename' });
      expect(put.status).toBe(403);
      const removed = await del(staff, `/api/categories/${category.id}`);
      expect(removed.status).toBe(403);
      const row = (await merchantCategories()).find((c) => c.id === category.id);
      expect(row).toBeDefined();
      expect(row.name).toBe(category.name);
    });
  });

  // ------------------------------------------------------------------ orders

  test('BF-STAFF-10 views and edits an order of its outlet', async () => {
    const list = await staff.get(`/api/orders?search=${order.orderNumber}`);
    expect(list.status).toBe(200);
    expect(listOf(list.body.data, 'orders', 'items').map((o) => o.id)).toContain(order.id);
    expect((await staff.get(`/api/orders/${order.id}`)).status).toBe(200);
    const notes = `staff note ${Date.now()}`;
    const put = await staff.updateOrder(order.id, { notes });
    expect(put.status).toBe(200);
    expect((await s.getOrder(order.id)).notes).toBe(notes);
  });

  test('BF-STAFF-11 cannot delete an order (single or batch)', async () => {
    const removed = await del(staff, `/api/orders/${order.id}`);
    expect(removed.status).toBe(403);
    const batch = await staff.post('/api/orders/batch-delete', { ids: [order.id] });
    expect(batch.status).toBe(403);
    const after = await s.getOrder(order.id);
    expect(after.id).toBe(order.id);
    expect(after.status).toBe('RESERVED');
  });

  test('BF-STAFF-12 cannot export orders', async () => {
    expect((await staff.get('/api/orders/export?format=csv')).status).toBe(403);
  });

  // ------------------------------------------------------------------ customers

  test('BF-STAFF-13 views, creates and edits customers', async () => {
    const list = await staff.get(`/api/customers?search=${encodeURIComponent(customer.firstName)}`);
    expect(list.status).toBe(200);
    expect(listOf(list.body.data, 'customers', 'items').map((c) => c.id)).toContain(customer.id);
    const phone = `08${String(Date.now()).slice(-8)}`;
    const created = await staff.post('/api/customers', { firstName: uniqueName('Khach staff'), lastName: 'E2E', phone });
    expect(created.ok).toBe(true);
    const id = (created.body.data.customer || created.body.data).id;
    const put = await staff.put(`/api/customers/${id}`, { lastName: 'Staff edit' });
    expect(put.status).toBe(200);
    const read = await must(s.get(`/api/customers/${id}`), 'get customer');
    expect((read.customer || read).lastName).toBe('Staff edit');
  });

  test('BF-STAFF-14 cannot export customers', async () => {
    expect((await staff.get('/api/customers/export?format=csv')).status).toBe(403);
  });

  // ------------------------------------------------------------------ dashboard / analytics

  test('BF-STAFF-15 sees the today dashboard and daily income', async () => {
    const q = `startDate=${today}&endDate=${today}`;
    for (const path of [
      '/api/analytics/today-metrics',
      '/api/analytics/dashboard',
      '/api/analytics/outlet-operations?timeZone=Asia%2FHo_Chi_Minh',
      `/api/analytics/income/daily?${q}`
    ]) {
      const r = await staff.get(path);
      expect({ path, status: r.status }).toEqual({ path, status: 200 });
    }
  });

  test('BF-STAFF-16 cannot open full analytics (products, customers, revenue, orders)', async () => {
    const q = `startDate=${today}&endDate=${today}`;
    for (const path of [
      `/api/analytics/top-products?${q}`,
      `/api/analytics/top-customers?${q}`,
      `/api/analytics/period?${q}&groupBy=day`,
      `/api/analytics/income?${q}`,
      `/api/analytics/growth-metrics?${q}`,
      `/api/analytics/orders?${q}`,
      '/api/analytics/recent-orders'
    ]) {
      const r = await staff.get(path);
      expect({ path, status: r.status }).toEqual({ path, status: 403 });
    }
  });

  // ------------------------------------------------------------------ users

  test('BF-STAFF-17 cannot list or create users', async () => {
    expect((await staff.get('/api/users')).status).toBe(403);
    const email = `staff-made-${Date.now()}@example.com`;
    const r = await staff.post('/api/users', {
      email,
      password: 'secret123',
      firstName: 'Staff',
      lastName: 'Made',
      role: 'OUTLET_STAFF',
      outletId
    });
    expect(r.status).toBe(403);
    const found = await must(s.get(`/api/users?search=${encodeURIComponent(email)}`), 'search users');
    expect(listOf(found, 'users', 'items').map((u) => u.email)).not.toContain(email);
  });

  // ------------------------------------------------------------------ bank accounts

  test('BF-STAFF-18 cannot add, edit or delete a bank account', async () => {
    const base = `/api/merchants/${merchantId}/outlets/${outletId}/bank-accounts`;
    const acc = await must(
      s.post(base, { accountHolderName: 'NGUYEN VAN A', accountNumber: String(Date.now()).slice(-10), bankName: 'Vietcombank' }),
      'create bank account'
    );
    const before = await must(s.get(base), 'list bank accounts');

    const add = await staff.post(base, { accountHolderName: 'STAFF', accountNumber: '1234567890', bankName: 'Vietcombank' });
    expect(add.status).toBe(403);
    const put = await staff.put(`${base}/${acc.id}`, { accountHolderName: 'STAFF EDIT' });
    expect(put.status).toBe(403);
    const removed = await del(staff, `${base}/${acc.id}`);
    expect(removed.status).toBe(403);

    const after = await must(s.get(base), 'list bank accounts');
    expect(after.length).toBe(before.length);
    expect(after.find((a) => a.id === acc.id)).toMatchObject({ accountHolderName: 'NGUYEN VAN A', isActive: true });
  });

  // ------------------------------------------------------------------ store settings

  test('BF-STAFF-19 cannot change store settings (business info, currency, merchant record)', async () => {
    const before = (await profile(s)).merchant;
    const info = await staff.put('/api/settings/merchant', { name: 'staff shop name' });
    expect(info.status).toBe(403);
    const currency = await staff.put('/api/settings/currency', { currency: before.currency === 'USD' ? 'VND' : 'USD' });
    expect(currency.status).toBe(403);
    const rec = await staff.put(`/api/merchants/${merchantId}`, { name: 'staff shop name' });
    expect(rec.status).toBe(403);
    const after = (await profile(s)).merchant;
    expect(after.name).toBe(before.name);
    expect(after.currency).toBe(before.currency);
  });

  test('BF-STAFF-20 cannot change the overlapping-orders setting', async () => {
    const before = (await profile(s)).merchant.allowOverlappingOrders;
    const r = await staff.put('/api/settings/merchant', { allowOverlappingOrders: !before });
    expect(r.status).toBe(403);
    expect((await profile(s)).merchant.allowOverlappingOrders).toBe(before);
  });

  test('BF-STAFF-21 cannot update the outlet (outlets and merchant outlet routes)', async () => {
    const before = await outletRow(outletId);
    const r1 = await staff.put(`/api/outlets?id=${outletId}`, { name: 'staff outlet name' });
    expect(r1.status).toBe(403);
    const r2 = await staff.put(`/api/merchants/${merchantId}/outlets/${outletId}`, { name: 'staff outlet name' });
    expect(r2.status).toBe(403);
    expect((await outletRow(outletId)).name).toBe(before.name);
  });

  test('BF-STAFF-22 cannot update the outlet through PUT /api/settings/outlet (#636)', async () => {
    const before = await outletRow(outletId);
    let r;
    try {
      r = await staff.put('/api/settings/outlet', { name: 'staff outlet name', address: before.address || 'staff address' });
      expect(r.status).toBe(403);
      const after = await outletRow(outletId);
      expect(after.name).toBe(before.name);
      expect(after.address).toBe(before.address);
    } finally {
      if (r && r.status === 200) {
        await s.put(`/api/outlets?id=${outletId}`, { name: before.name, address: before.address });
      }
    }
  });

  // ------------------------------------------------------------------ billing / loyalty

  test('BF-STAFF-23 sees the subscription status', async () => {
    const r = await staff.get('/api/subscriptions/status');
    expect(r.status).toBe(200);
  });

  test('BF-STAFF-24 cannot change the plan or subscribe', async () => {
    const before = (await profile(s)).merchant.planId;
    const plan = await staff.put(`/api/merchants/${merchantId}/plan`, { planId: before, billingInterval: 'monthly' });
    expect(plan.status).toBe(403);
    const sub = await staff.post('/api/subscriptions', { merchantId, planId: before, billingInterval: 'monthly' });
    expect(sub.status).toBe(403);
    expect((await profile(s)).merchant.planId).toBe(before);
  });

  test('BF-STAFF-25 sees the loyalty program', async () => {
    expect((await staff.get('/api/loyalty/program')).status).toBe(200);
  });
});
