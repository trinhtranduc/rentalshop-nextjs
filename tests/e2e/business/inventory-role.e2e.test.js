/**
 * BF-INV — OUTLET_INVENTORY (Nhân viên kho) permission matrix (#682).
 * Matrix: ROLE_PERMISSIONS['OUTLET_INVENTORY'] = OUTLET_STAFF + products.manage/create/update/export.
 * Products and categories like an outlet admin, everything else like staff (BF-STAFF).
 */
const { Session, describeE2E, must, request, vnDateKey, uniqueName, addDays, futureWindow, rentBody } = require('../helpers/api');

describeE2E('BF-INV OUTLET_INVENTORY permissions', () => {
  let s;
  let inv;
  let outletId;
  let otherOutletProduct;
  const today = vnDateKey();
  const del = (session, path) => request(session.token, 'DELETE', path);
  const listOf = (data, ...keys) => {
    if (Array.isArray(data)) return data;
    for (const k of keys) if (Array.isArray(data?.[k])) return data[k];
    return [];
  };

  beforeAll(async () => {
    s = await Session.login('merchant');
    inv = await Session.login('inventory');
    expect(inv.user.role).toBe('OUTLET_INVENTORY');
    outletId = inv.user.outletId;
    const outlets = listOf(await must(s.get('/api/outlets?limit=50'), 'outlets'), 'outlets', 'items');
    const other = outlets.find((o) => o.id !== outletId);
    if (other) otherOutletProduct = await s.createProduct({ price: 50000, stock: 1, outletId: other.id });
  });

  test('BF-INV-01 login carries the product keys and no revenue key', () => {
    const perms = inv.user.permissions || [];
    for (const k of ['products.manage', 'products.update', 'products.export', 'orders.create', 'customers.manage']) {
      expect(perms).toContain(k);
    }
    for (const k of ['analytics.view.revenue', 'orders.delete', 'users.manage', 'outlet.manage']) {
      expect(perms).not.toContain(k);
    }
  });

  test('BF-INV-02 creates a product with prices and cost at its outlet; sees cost price', async () => {
    const name = uniqueName('SP kho');
    const r = await inv.postForm('/api/products', {
      name, rentPrice: 150000, salePrice: 900000, costPrice: 400000, totalStock: 3, outletStock: [{ outletId, stock: 3 }]
    });
    expect({ status: r.status, code: r.body?.code }).toMatchObject({ status: 200 });
    const created = await inv.getProduct(r.body.data.id);
    expect(created).toMatchObject({ name, rentPrice: 150000, salePrice: 900000, costPrice: 400000 });
  });

  test('BF-INV-03 edits name, prices and stock; deletes a product of its outlet', async () => {
    const p = await s.createProduct({ price: 100000, stock: 2, outletId });
    const r = await inv.updateProduct(p.id, { name: `${p.name} sửa`, rentPrice: 120000, totalStock: 4, outletStock: [{ outletId, stock: 4 }] });
    expect(r.status).toBe(200);
    const after = await s.getProduct(p.id);
    expect(after).toMatchObject({ name: `${p.name} sửa`, rentPrice: 120000 });
    const removed = await del(inv, `/api/products/${p.id}`);
    expect(removed.status).toBe(200);
  });

  test('BF-INV-04 cannot edit or delete a product that has no stock at its outlet', async () => {
    if (!otherOutletProduct) return;
    expect((await inv.updateProduct(otherOutletProduct.id, { name: 'kho rename' })).status).toBe(403);
    expect((await del(inv, `/api/products/${otherOutletProduct.id}`)).status).toBe(403);
    expect((await s.getProduct(otherOutletProduct.id)).name).toBe(otherOutletProduct.name);
  });

  test('BF-INV-05 exports products and bulk-imports them', async () => {
    expect((await inv.get('/api/products/export?format=csv')).status).toBe(200);
    const name = uniqueName('SP import kho');
    const imp = await inv.post('/api/products/bulk-import', { products: [{ name, rentPrice: 1, totalStock: 1 }] });
    expect(imp.status).toBe(200);
  });

  test('BF-INV-06 adds, renames and deletes a category of its merchant', async () => {
    const name = uniqueName('DM kho');
    const created = await inv.post('/api/categories', { name });
    expect([200, 201]).toContain(created.status);
    const id = created.body.data.id;
    const put = await inv.put(`/api/categories/${id}`, { name: `${name} 2` });
    expect(put.status).toBe(200);
    expect((await inv.get(`/api/categories/${id}`)).status).toBe(200);
    const removed = await del(inv, `/api/categories/${id}`);
    expect(removed.status).toBe(200);
  });

  test('BF-INV-07 sees no revenue analytics, like staff', async () => {
    const q = `startDate=${today}&endDate=${today}`;
    for (const path of [`/api/analytics/period?${q}&groupBy=day`, `/api/analytics/income?${q}`, `/api/analytics/top-products?${q}`]) {
      const r = await inv.get(path);
      expect({ path, status: r.status }).toEqual({ path, status: 403 });
    }
  });

  test('BF-INV-08 cannot list users, create users or delete orders', async () => {
    expect((await inv.get('/api/users')).status).toBe(403);
    const r = await inv.post('/api/users', { email: `kho-${Date.now()}@example.com`, password: 'secret123', firstName: 'K', lastName: 'H', role: 'OUTLET_STAFF', outletId });
    expect(r.status).toBe(403);
    expect((await inv.get('/api/orders/export?format=csv')).status).toBe(403);
  });

  test('BF-INV-09 the role cannot be given while INVENTORY_ROLE_ENABLED is off', async () => {
    const cfg = await must(s.get('/api/mobile/app-config'), 'app-config');
    const email = `kho-new-${Date.now()}@example.com`;
    const r = await s.post('/api/users', { email, password: 'secret123', firstName: 'Kho', lastName: 'Moi', phone: `09${Date.now() % 100000000}`, role: 'OUTLET_INVENTORY', outletId });
    if (cfg.inventoryRole) {
      expect(r.status).toBe(200);
    } else {
      expect({ status: r.status, code: r.body?.code }).toEqual({ status: 400, code: 'ROLE_NOT_AVAILABLE' });
    }
  });

  // ------------------------------------------------------------------ stock, availability, overlap (#682)

  const book = async (session, product, w, { quantity = 1 } = {}) => {
    const customer = await session.createCustomer();
    return session.createOrderRaw({ ...rentBody({ customer, lines: [{ product, quantity }], from: w.from, to: w.to }).body, outletId });
  };
  const listRow = async (session, product) => {
    const data = await must(session.get(`/api/products?search=${encodeURIComponent(product.name)}&limit=20`), 'list products');
    return listOf(data, 'products', 'items').find((p) => p.id === product.id);
  };

  test('BF-INV-10 a product it creates has stock = available at its outlet, nothing renting', async () => {
    const p = await inv.createProduct({ price: 100000, stock: 3, outletId });
    expect(await s.outletStock(p.id, outletId)).toEqual({ stock: 3, available: 3, renting: 0 });
    const row = await listRow(inv, p);
    expect(row.effectiveAvailableToday).toBe(3);
  });

  test('BF-INV-11 editing stock while a unit is out keeps it rented: available = stock - renting, for both roles', async () => {
    const p = await s.createProduct({ price: 100000, stock: 2, outletId });
    const w = { from: today, to: addDays(today, 2) };
    const order = await must(book(inv, p, w), 'book today');
    expect((await inv.setStatus(order.id, 'PICKUPED')).status).toBe(200);
    expect(await s.outletStock(p.id, outletId)).toMatchObject({ stock: 2, renting: 1, available: 1 });
    const r = await inv.updateProduct(p.id, { totalStock: 4, outletStock: [{ outletId, stock: 4 }] });
    expect(r.status).toBe(200);
    expect(await s.outletStock(p.id, outletId)).toEqual({ stock: 4, renting: 1, available: 3 });
    // Home "còn hôm nay": 4 on the shelf, 1 booked today
    expect((await listRow(inv, p)).effectiveAvailableToday).toBe(3);
    expect((await listRow(s, p)).effectiveAvailableToday).toBe(3);
  });

  test('BF-INV-12 availability (single and cart batch) reads the same for it as for the merchant', async () => {
    const p = await inv.createProduct({ price: 100000, stock: 2, outletId });
    const w = futureWindow(3);
    await must(book(inv, p, w), 'book');
    for (const q of [1, 2]) {
      const mine = await inv.availability(p.id, { ...w, quantity: q, outletId });
      const owner = await s.availability(p.id, { ...w, quantity: q, outletId });
      expect({ q, ok: mine.isAvailable, free: mine.availabilityByOutlet[0].effectivelyAvailable })
        .toEqual({ q, ok: owner.isAvailable, free: owner.availabilityByOutlet[0].effectivelyAvailable });
    }
    const one = await inv.availability(p.id, { ...w, quantity: 1, outletId });
    expect([one.isAvailable, one.availabilityByOutlet[0].effectivelyAvailable]).toEqual([true, 1]);
    const batch = await inv.batchAvailability([{ productId: p.id, quantity: 2 }], { ...w, outletId });
    expect(batch.results.find((x) => x.productId === p.id).isAvailable).toBe(false);
  });

  test('BF-INV-13 trùng đơn: with overlaps allowed a second booking passes and both count; with overlaps off it is 409', async () => {
    const p = await inv.createProduct({ price: 100000, stock: 1, outletId });
    const w = futureWindow(2);
    await must(book(inv, p, w), 'first booking');
    const before = (await must(s.get('/api/users/profile'), 'profile')).merchant.allowOverlappingOrders;
    try {
      await must(s.put('/api/settings/merchant', { allowOverlappingOrders: true }), 'overlaps on');
      const second = await book(inv, p, { from: addDays(w.from, 1), to: addDays(w.to, 1) });
      expect(second.status).toBe(200);
      const av = await inv.availability(p.id, { from: addDays(w.from, 1), to: addDays(w.from, 1), outletId });
      expect([av.isAvailable, av.availabilityByOutlet[0].conflictingQuantity]).toEqual([false, 2]);

      await must(s.put('/api/settings/merchant', { allowOverlappingOrders: false }), 'overlaps off');
      const third = await book(inv, p, w);
      expect({ status: third.status, code: third.body?.code }).toEqual({ status: 409, code: 'ORDER_SCHEDULE_CONFLICT' });
      // the day after the window is free
      const next = await book(inv, p, { from: addDays(w.to, 2), to: addDays(w.to, 2) });
      expect(next.status).toBe(200);
    } finally {
      await s.put('/api/settings/merchant', { allowOverlappingOrders: before !== false });
    }
  });

  test('BF-INV-14 a same-day pickup and return holds that day only', async () => {
    const p = await inv.createProduct({ price: 100000, stock: 1, outletId });
    const w = futureWindow(1);
    await must(book(inv, p, w), 'same-day');
    expect((await inv.availability(p.id, { ...w, outletId })).isAvailable).toBe(false);
    expect((await inv.availability(p.id, { from: addDays(w.from, 1), outletId })).isAvailable).toBe(true);
    expect((await inv.availability(p.id, { from: addDays(w.from, -1), outletId })).isAvailable).toBe(true);
  });

  test('BF-INV-15 the slot and the stock come back after it hands over and takes back', async () => {
    const p = await inv.createProduct({ price: 100000, stock: 1, outletId });
    const w = { from: today, to: addDays(today, 1) };
    const order = await must(book(inv, p, w), 'book');
    expect((await inv.setStatus(order.id, 'PICKUPED')).status).toBe(200);
    expect(await s.outletStock(p.id, outletId)).toMatchObject({ renting: 1, available: 0 });
    expect((await listRow(inv, p)).effectiveAvailableToday).toBe(0);
    expect((await inv.setStatus(order.id, 'RETURNED')).status).toBe(200);
    expect(await s.outletStock(p.id, outletId)).toMatchObject({ renting: 0, available: 1 });
    expect((await inv.availability(p.id, { ...w, outletId })).isAvailable).toBe(true);
    expect((await listRow(inv, p)).effectiveAvailableToday).toBe(1);
  });

  test('BF-INV-16 cannot book at another outlet or set stock of another outlet', async () => {
    const outlets = listOf(await must(s.get('/api/outlets?limit=50'), 'outlets'), 'outlets', 'items');
    const other = outlets.find((o) => o.id !== outletId);
    if (!other) return;
    const p = await inv.createProduct({ price: 100000, stock: 1, outletId });
    const customer = await inv.createCustomer();
    const r = await inv.createOrderRaw({ ...rentBody({ customer, lines: [{ product: p }], ...futureWindow(1) }).body, outletId: other.id });
    expect(r.status).toBe(403);
    const u = await inv.updateProduct(p.id, { outletStock: [{ outletId, stock: 1 }, { outletId: other.id, stock: 5 }] });
    expect(u.status).toBe(403);
    expect(await s.outletStock(p.id, other.id)).toBeNull();
  });

  test('BF-INV-17 lowering stock below the units out on rent gives the same result for it as for the merchant', async () => {
    const lower = async (session) => {
      const p = await s.createProduct({ price: 100000, stock: 2, outletId });
      const order = await must(book(s, p, { from: today, to: addDays(today, 1) }, { quantity: 2 }), 'book 2');
      expect((await s.setStatus(order.id, 'PICKUPED')).status).toBe(200);
      const r = await session.updateProduct(p.id, { totalStock: 1, outletStock: [{ outletId, stock: 1 }] });
      const after = await s.outletStock(p.id, outletId);
      const row = await listRow(session, p);
      return { status: r.status, code: r.body?.code || null, after, today: row?.effectiveAvailableToday };
    };
    const mine = await lower(inv);
    const owner = await lower(s);
    expect(mine).toEqual(owner);
    // never a negative free count on Home
    expect(mine.today).toBeGreaterThanOrEqual(0);
    expect(mine.after.available).toBeGreaterThanOrEqual(0);
  });
});
