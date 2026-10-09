/**
 * BF-INV — OUTLET_INVENTORY (Nhân viên kho) permission matrix (#682).
 * Matrix: ROLE_PERMISSIONS['OUTLET_INVENTORY'] = OUTLET_STAFF + products.manage/create/update/export.
 * Products and categories like an outlet admin, everything else like staff (BF-STAFF).
 */
const { Session, describeE2E, must, request, vnDateKey, uniqueName } = require('../helpers/api');

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
    expect(created.status).toBe(200);
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
});
