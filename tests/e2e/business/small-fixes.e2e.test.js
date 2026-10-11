/**
 * BF-FIX: small API fixes found by the web UI run (#727): a deleted order is gone by id too (#739),
 * a blank barcode is stored as NULL so any number of products can have none (#742).
 * (#506, collateral is not spending, is BF-OVR-04 in overview.e2e.test.js.)
 */
const fs = require('fs');
const path = require('path');
const { Session, describeE2E, request, uniqueName, futureWindow, rentBody } = require('../helpers/api');
const S = require('../helpers/subscription');

const describeDb = S.hasDb ? describeE2E : describe.skip;

describeE2E('BF-FIX deleted order is gone by id (#739)', () => {
  let s;
  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  async function cancelledOrder() {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
    const c = await s.createCustomer();
    const w = futureWindow(1);
    const o = await s.createOrder(rentBody({ customer: c, lines: [{ product: p }], from: w.from, to: w.to }).body);
    expect((await s.setStatus(o.id, 'CANCELLED')).status).toBe(200);
    return o;
  }

  test('BF-FIX-01 a deleted order is 404 by id, by number, in the list and in sub-routes', async () => {
    const o = await cancelledOrder();
    // before: visible everywhere
    expect((await s.get(`/api/orders/${o.id}`)).status).toBe(200);
    expect((await s.get(`/api/orders/by-number/${o.orderNumber}`)).status).toBe(200);
    expect((await s.listOrders({ q: o.orderNumber })).length).toBe(1);

    const del = await request(s.token, 'DELETE', `/api/orders/${o.id}`);
    expect(del.status).toBe(200);

    const byId = await s.get(`/api/orders/${o.id}`);
    expect(byId.status).toBe(404);
    expect(byId.body.code).toBe('ORDER_NOT_FOUND');
    expect((await s.get(`/api/orders/by-number/${o.orderNumber}`)).status).toBe(404);
    expect((await s.listOrders({ q: o.orderNumber })).length).toBe(0);
    expect((await s.get(`/api/orders/${o.id}/qr-code`)).status).toBe(404);
    // a second delete and a status change find nothing either
    expect((await request(s.token, 'DELETE', `/api/orders/${o.id}`)).status).toBe(404);
    expect((await s.setStatus(o.id, 'RESERVED')).status).toBe(404);
  });

  test('BF-FIX-02 a cancelled order that is not deleted is still readable by id', async () => {
    const o = await cancelledOrder();
    const r = await s.get(`/api/orders/${o.id}`);
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe('CANCELLED');
  });
});

describeE2E('BF-FIX blank barcode is stored as NULL (#742)', () => {
  let s;
  let oid;
  beforeAll(async () => {
    s = await Session.login('merchant');
    oid = await s.defaultOutletId();
  });

  const body = (name, barcode) => ({
    name,
    rentPrice: 50000,
    deposit: 0,
    totalStock: 1,
    barcode,
    outletStock: [{ outletId: oid, stock: 1 }],
    pricingOptions: [{ type: 'FIXED', price: 50000, isDefault: true }]
  });

  test('BF-FIX-03 products created with barcode "" or blank all end with barcode NULL, several can coexist', async () => {
    const made = [];
    for (const barcode of ['', '   ', '']) {
      const r = await s.postForm('/api/products', body(uniqueName('SP blank'), barcode));
      expect(r.status).toBe(200);
      made.push(r.body.data.product || r.body.data);
    }
    for (const p of made) {
      expect((await s.getProduct(p.id)).barcode ?? null).toBeNull();
    }
  });

  test('BF-FIX-04 two products without a barcode can both be edited with barcode ""', async () => {
    const a = await s.createProduct({ kind: 'FIXED', price: 50000, stock: 1 });
    const b = await s.createProduct({ kind: 'FIXED', price: 50000, stock: 1 });
    for (const p of [a, b]) {
      const r = await s.updateProduct(p.id, { name: `${p.name} S`, barcode: '' });
      expect(r.status).toBe(200);
      const after = await s.getProduct(p.id);
      expect(after.name).toBe(`${p.name} S`);
      expect(after.barcode ?? null).toBeNull();
    }
  });

  test('BF-FIX-05 a real duplicate barcode is still 409 DUPLICATE_ENTRY on create and edit; clearing it gives NULL', async () => {
    const code = `BC${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`;
    const first = await s.postForm('/api/products', body(uniqueName('SP bc1'), code));
    expect(first.status).toBe(200);
    const dup = await s.postForm('/api/products', body(uniqueName('SP bc2'), code));
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('DUPLICATE_ENTRY');
    const other = await s.createProduct({ kind: 'FIXED', price: 50000, stock: 1 });
    const upd = await s.updateProduct(other.id, { barcode: code });
    expect(upd.status).toBe(409);
    expect(upd.body.code).toBe('DUPLICATE_ENTRY');
    const id = (first.body.data.product || first.body.data).id;
    expect((await s.getProduct(id)).barcode).toBe(code);
    expect((await s.updateProduct(id, { barcode: '' })).status).toBe(200);
    expect((await s.getProduct(id)).barcode ?? null).toBeNull();
  });
});

describeDb('BF-FIX data migration of blank barcodes (#742)', () => {
  test('BF-FIX-06 the migration SQL turns old "" and blank barcodes into NULL and keeps real ones', async () => {
    const s = await Session.login('merchant');
    const dir = path.join(__dirname, '../../../prisma/migrations');
    const folder = fs.readdirSync(dir).find((f) => f.endsWith('_product_blank_barcode_to_null'));
    expect(folder).toBeTruthy();
    const migrationSql = fs.readFileSync(path.join(dir, folder, 'migration.sql'), 'utf8');
    // blank rows left by earlier cases (with the old API) would collide with the one inserted below
    S.sql(migrationSql);
    const a = await s.createProduct({ kind: 'FIXED', price: 50000, stock: 1 });
    const b = await s.createProduct({ kind: 'FIXED', price: 50000, stock: 1 });
    const c = await s.createProduct({ kind: 'FIXED', price: 50000, stock: 1 });
    const real = `RB${Date.now().toString(36)}`;
    // what the old API stored (one of each: they differ, so the unique index accepts them)
    S.sql(`UPDATE "Product" SET "barcode" = '' WHERE id = ${a.id}`);
    S.sql(`UPDATE "Product" SET "barcode" = '  ' WHERE id = ${b.id}`);
    S.sql(`UPDATE "Product" SET "barcode" = '${real}' WHERE id = ${c.id}`);
    S.sql(migrationSql);
    expect(S.sql(`SELECT coalesce("barcode", 'NULL') FROM "Product" WHERE id = ${a.id}`)).toBe('NULL');
    expect(S.sql(`SELECT coalesce("barcode", 'NULL') FROM "Product" WHERE id = ${b.id}`)).toBe('NULL');
    expect(S.sql(`SELECT "barcode" FROM "Product" WHERE id = ${c.id}`)).toBe(real);
    expect(S.sql(`SELECT count(*) FROM "Product" WHERE btrim("barcode") = ''`)).toBe('0');
  });
});
