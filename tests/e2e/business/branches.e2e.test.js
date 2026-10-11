/**
 * BF-BRANCH — Nhiều chi nhánh (#844, rules of #823: #834 outlets, #829/#837 products, #831 add-ons, #840 dashboard).
 *
 * Owner rules checked here (2026-10-11):
 *  - only the shop owner (MERCHANT) creates, disables, re-enables and deletes an outlet; OUTLET_ADMIN edits the info
 *    of its own outlet; staff and kho do not manage outlets;
 *  - outlets limit: missing or 0 = 1 outlet, -1 = unlimited; re-enabling checks the limit; a branch add-on only on a
 *    multi-branch plan, and it raises the limit by its amount;
 *  - disable / delete is refused while the outlet has RESERVED or PICKUPED orders (stock alone does not block);
 *  - users of a disabled outlet cannot log in, and an open session ends on its next request;
 *  - every product has a 0-stock row at every active outlet (new outlet, new product, one-time backfill);
 *  - OUTLET_STAFF does not create, edit shared fields or delete products; OUTLET_ADMIN and OUTLET_INVENTORY do,
 *    only for products their outlet holds; stock is written only at their own outlet;
 *  - delete when another outlet still holds the product (stock, on rent, open order line): 409
 *    PRODUCT_HELD_BY_OTHER_OUTLETS for OUTLET_ADMIN / OUTLET_INVENTORY (#847), single and batch delete;
 *  - the dashboard per outlet (byOutlet=1) adds up to the totals, cancelled orders left out.
 * Every case checks the API answer and the rows (Outlet, OutletStock, Product, Order, PlanLimitAddon).
 * Every describe makes its own merchant, plan, outlets and users (helpers/subscription.js), never the seed shops.
 * Run: scripts/e2e/business-e2e.sh -- branches   (needs E2E_API_URL + a local E2E_DATABASE_URL).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { describeE2E, knownBug, uniqueName, rentBody, saleBody, futureWindow, vnDateKey } = require('../helpers/api');
const S = require('../helpers/subscription');

const describeBranch = S.hasDb ? describeE2E : describe.skip;
const brief = (r) => ({ status: r.status, code: r.body?.code });
const OPEN = { outlets: 3, users: -1, products: -1, customers: -1, orders: -1 };
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const MIGRATION = path.resolve(__dirname, '../../../prisma/migrations/20261011120000_backfill_outlet_stock_zero/migration.sql');

// ------------------------------------------------------------------------------------------------ data helpers

function world(label, limits = {}) {
  return S.createWorld(`branch-${label}`, { limits: { ...OPEN, ...limits } });
}

let userSeq = 0;
/** A user of `outletId` (null = no outlet) with the seed password; returns the credentials. */
function addUser(w, outletId, role) {
  userSeq += 1;
  const email = `br.${w.id}.${role.toLowerCase()}.${userSeq}@e2e.test`;
  S.createUser(w.merchantId, outletId, role, email, role);
  return { email, password: S.PASSWORD };
}

/** { name, address, phone, isActive } of an Outlet row. */
function outletRow(id) {
  const [name, address, phone, active] = S.sql(
    `SELECT name || '|' || coalesce(address, '') || '|' || coalesce(phone, '') || '|' || "isActive" FROM "Outlet" WHERE id = ${id}`
  ).split('|');
  return { name, address, phone, isActive: active === 't' || active === 'true' };
}
const outletCount = (merchantId) => Number(S.sql(`SELECT count(*) FROM "Outlet" WHERE "merchantId" = ${merchantId}`));
const activeOutletCount = (merchantId) => Number(S.sql(`SELECT count(*) FROM "Outlet" WHERE "merchantId" = ${merchantId} AND "isActive"`));

/** { [outletId]: 'stock/available/renting' } of every OutletStock row of a product. */
function stockOf(productId) {
  const raw = S.sql(
    `SELECT coalesce(string_agg("outletId" || '=' || stock || '/' || available || '/' || renting, ',' ORDER BY "outletId"), '')
       FROM "OutletStock" WHERE "productId" = ${productId}`
  );
  const out = {};
  for (const part of raw.split(',').filter(Boolean)) {
    const [k, v] = part.split('=');
    out[k] = v;
  }
  return out;
}

/** { name, rentPrice, deleted } of a Product row. */
function productRow(id) {
  const [name, rentPrice, deleted] = S.sql(
    `SELECT name || '|' || "rentPrice" || '|' || ("deletedAt" IS NOT NULL) FROM "Product" WHERE id = ${id}`
  ).split('|');
  return { name, rentPrice: Number(rentPrice), deleted: deleted === 't' || deleted === 'true' };
}
const productsNamed = (name) => Number(S.sql(`SELECT count(*) FROM "Product" WHERE name = ${q(name)}`));
const orderStatus = (id) => S.sql(`SELECT status FROM "Order" WHERE id = ${id}`);
const ordersAt = (outletId) => Number(S.sql(`SELECT count(*) FROM "Order" WHERE "outletId" = ${outletId}`));
const addonsOf = (merchantId) => S.sql(
  `SELECT coalesce(string_agg(outlets || ':' || users || ':' || "isActive", ',' ORDER BY id), '') FROM "PlanLimitAddon" WHERE "merchantId" = ${merchantId}`
);

/** Product through POST /api/products. stocks: [[outletId, n], ...]. Returns the HTTP result. */
function productRaw(session, stocks, { name = uniqueName('SP chi nhanh'), price = 100000, salePrice } = {}) {
  const body = {
    name,
    rentPrice: price,
    deposit: 0,
    totalStock: stocks.reduce((s, [, n]) => s + n, 0),
    outletStock: stocks.map(([outletId, stock]) => ({ outletId, stock })),
    pricingOptions: [{ type: 'FIXED', price, isDefault: true }]
  };
  if (salePrice !== undefined) body.salePrice = salePrice;
  return session.postForm('/api/products', body);
}
async function product(session, stocks, opts) {
  const r = await productRaw(session, stocks, opts);
  if (!r.ok) throw new Error(`create product failed: ${r.status} ${JSON.stringify(r.body).slice(0, 400)}`);
  return r.body.data.product || r.body.data;
}

async function outlet(session, name = uniqueName('Chi nhanh')) {
  const r = await session.post('/api/outlets', { name, address: 'Ha Noi' });
  if (!r.ok) throw new Error(`create outlet failed: ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return r.body.data;
}

async function customer(session) {
  const r = await S.createCustomerRaw(session);
  if (!r.ok) throw new Error(`create customer failed: ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return r.body.data.customer || r.body.data;
}

/** RENT order of one product line at `outletId` (merchant sends outletId; branch roles get their own). */
async function rentOrder(session, { cust, prod, outletId, deposit = 0, qty = 1, price }) {
  const win = futureWindow(2);
  const line = { product: prod, quantity: qty, ...(price !== undefined ? { unitPrice: price } : {}) };
  const { body } = rentBody({ customer: cust, lines: [line], from: win.from, to: win.to, depositAmount: deposit });
  if (outletId) body.outletId = outletId;
  const r = await session.createOrderRaw(body);
  if (!r.ok) throw new Error(`create order failed: ${r.status} ${JSON.stringify(r.body).slice(0, 400)}`);
  return r.body.data.order || r.body.data;
}

async function saleOrder(session, { cust, prod, outletId, qty = 1 }) {
  const { body } = saleBody({ customer: cust, lines: [{ product: prod, quantity: qty }] });
  if (outletId) body.outletId = outletId;
  const r = await session.createOrderRaw(body);
  if (!r.ok) throw new Error(`create sale failed: ${r.status} ${JSON.stringify(r.body).slice(0, 400)}`);
  return r.body.data.order || r.body.data;
}

/** extra: e.g. { outletId } — a MERCHANT user that has an outlet moves the order there otherwise (BF-BRANCH-42b, #851) */
async function status(session, orderId, next, extra = {}) {
  const r = await session.setStatus(orderId, next, extra);
  if (!r.ok) throw new Error(`status ${next} failed: ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
}

let ipSeq = 0;
/**
 * Logged-in session whose calls carry an x-forwarded-for of their own: product / customer lists share a search
 * limiter (100 per 30 s per address + user agent), so this suite does not use up the budget of the suites after it.
 */
async function login(creds) {
  const s = await S.login(creds);
  ipSeq += 1;
  return s.asPlatform({ ...S.MOBILE_HEADERS, 'x-forwarded-for': `10.244.${process.pid % 250}.${ipSeq % 250}` });
}

let adminSession;
async function admin() {
  if (!adminSession) adminSession = await login({ email: 'admin@rentalshop.com', password: 'admin123' });
  return adminSession;
}

// ================================================================================================================
// A. Outlets: who creates, disables, re-enables, deletes, edits (BF-BRANCH-01 .. 09)
// ================================================================================================================

describeBranch('BF-BRANCH outlets: only the owner manages them, OUTLET_ADMIN edits its own info (#834)', () => {
  let w;
  let m;
  let b; // second outlet (not default)
  let oa; // OUTLET_ADMIN of b
  let staff;
  let kho;
  beforeAll(async () => {
    w = world('outlets', { outlets: -1 });
    m = await login(w.merchant);
    b = await outlet(m, `CN B ${w.id}`);
    oa = await login(addUser(w, b.id, 'OUTLET_ADMIN'));
    staff = await login(w.staff);
    kho = await login(w.kho);
  });

  test('BF-BRANCH-01 MERCHANT creates an outlet: active row of its shop, not default', async () => {
    const name = `CN moi ${w.id}`;
    const r = await m.post('/api/outlets', { name, address: 'Da Nang', phone: '0901000001' });
    expect(brief(r)).toEqual({ status: 200, code: 'OUTLET_CREATED_SUCCESS' });
    const id = r.body.data.id;
    expect(typeof id).toBe('number');
    expect(outletRow(id)).toEqual({ name, address: 'Da Nang', phone: '0901000001', isActive: true });
    expect(S.sql(`SELECT "merchantId" || '|' || "isDefault" FROM "Outlet" WHERE id = ${id}`)).toBe(`${w.merchantId}|false`);
  });

  test('BF-BRANCH-02 MERCHANT disables, re-enables, then deletes an outlet; the list follows the row', async () => {
    const o = await outlet(m);
    const listed = async () => ((await m.get('/api/outlets?limit=50')).body.data.outlets || []).some((x) => x.id === o.id);
    expect(brief(await m.put(`/api/outlets?id=${o.id}`, { isActive: false }))).toEqual({ status: 200, code: 'OUTLET_UPDATED_SUCCESS' });
    expect(outletRow(o.id).isActive).toBe(false);
    expect(await listed()).toBe(false);
    expect(brief(await m.put(`/api/outlets?id=${o.id}`, { isActive: true }))).toEqual({ status: 200, code: 'OUTLET_UPDATED_SUCCESS' });
    expect(outletRow(o.id).isActive).toBe(true);
    expect(await listed()).toBe(true);
    expect(brief(await m.delete(`/api/outlets?id=${o.id}`))).toEqual({ status: 200, code: 'OUTLET_DELETED_SUCCESS' });
    expect(outletRow(o.id).isActive).toBe(false);
    expect(await listed()).toBe(false);
  });

  test('BF-BRANCH-03 MERCHANT creates an outlet through POST /api/merchants/[id]/outlets too', async () => {
    const name = `CN route merchant ${w.id}`;
    const r = await m.post(`/api/merchants/${w.merchantId}/outlets`, { name, address: 'Hue' });
    expect(brief(r)).toEqual({ status: 200, code: 'OUTLET_CREATED_SUCCESS' });
    expect(outletRow(r.body.data.id)).toMatchObject({ name, address: 'Hue', isActive: true });
  });

  test('BF-BRANCH-04 OUTLET_ADMIN cannot create an outlet (403 on both routes), no row written', async () => {
    const before = outletCount(w.merchantId);
    expect(brief(await oa.post('/api/outlets', { name: uniqueName('CN oa'), address: 'HN' }))).toEqual({ status: 403, code: 'FORBIDDEN' });
    expect(brief(await oa.post(`/api/merchants/${w.merchantId}/outlets`, { name: uniqueName('CN oa'), address: 'HN' }))).toEqual({ status: 403, code: 'FORBIDDEN' });
    expect(outletCount(w.merchantId)).toBe(before);
  });

  test('BF-BRANCH-05 OUTLET_ADMIN cannot disable or delete its own outlet (403), the row stays active', async () => {
    expect(brief(await oa.put(`/api/outlets?id=${b.id}`, { isActive: false }))).toEqual({ status: 403, code: 'FORBIDDEN' });
    expect(brief(await oa.put(`/api/merchants/${w.merchantId}/outlets/${b.id}`, { isActive: false }))).toEqual({ status: 403, code: 'FORBIDDEN' });
    expect(brief(await oa.delete(`/api/outlets?id=${b.id}`))).toEqual({ status: 403, code: 'FORBIDDEN' });
    expect(outletRow(b.id).isActive).toBe(true);
  });

  test('BF-BRANCH-06 OUTLET_ADMIN edits name, address and phone of its own outlet; echoing isActive true is not a change', async () => {
    const name = `CN B sua ${w.id}`;
    const r = await oa.put(`/api/outlets?id=${b.id}`, { name, address: '12 Hang Bac', phone: '0902000002', isActive: true });
    expect(brief(r)).toEqual({ status: 200, code: 'OUTLET_UPDATED_SUCCESS' });
    expect(outletRow(b.id)).toEqual({ name, address: '12 Hang Bac', phone: '0902000002', isActive: true });
    const r2 = await oa.put(`/api/merchants/${w.merchantId}/outlets/${b.id}`, { address: '14 Hang Bac' });
    expect(brief(r2)).toEqual({ status: 200, code: 'OUTLET_UPDATED_SUCCESS' });
    expect(outletRow(b.id).address).toBe('14 Hang Bac');
  });

  test('BF-BRANCH-07 OUTLET_ADMIN cannot edit another outlet (403 / 404), that row is unchanged', async () => {
    const before = outletRow(w.outletId);
    expect(brief(await oa.put(`/api/outlets?id=${w.outletId}`, { name: 'hack' }))).toEqual({ status: 403, code: 'FORBIDDEN' });
    expect(brief(await oa.put(`/api/merchants/${w.merchantId}/outlets/${w.outletId}`, { name: 'hack' }))).toEqual({ status: 404, code: 'OUTLET_NOT_FOUND' });
    expect(outletRow(w.outletId)).toEqual(before);
  });

  test('BF-BRANCH-08 OUTLET_STAFF and OUTLET_INVENTORY cannot create, edit, disable or delete outlets', async () => {
    const before = { count: outletCount(w.merchantId), a: outletRow(w.outletId), b: outletRow(b.id) };
    for (const [who, s] of [['staff', staff], ['kho', kho]]) {
      expect({ who, ...brief(await s.post('/api/outlets', { name: uniqueName('CN'), address: 'HN' })) }).toMatchObject({ who, status: 403 });
      expect({ who, ...brief(await s.put(`/api/outlets?id=${w.outletId}`, { name: 'hack' })) }).toMatchObject({ who, status: 403 });
      expect({ who, ...brief(await s.put(`/api/outlets?id=${b.id}`, { isActive: false })) }).toMatchObject({ who, status: 403 });
      expect({ who, ...brief(await s.delete(`/api/outlets?id=${b.id}`)) }).toMatchObject({ who, status: 403 });
    }
    expect({ count: outletCount(w.merchantId), a: outletRow(w.outletId), b: outletRow(b.id) }).toEqual(before);
  });

  test('BF-BRANCH-09 OUTLET_INVENTORY reads only its own outlet (detail, merchant list, outlet list)', async () => {
    const own = await kho.get(`/api/merchants/${w.merchantId}/outlets/${w.outletId}`);
    expect(brief(own)).toEqual({ status: 200, code: 'OUTLET_FOUND' });
    expect(own.body.data.id).toBe(w.outletId);
    expect(brief(await kho.get(`/api/merchants/${w.merchantId}/outlets/${b.id}`))).toEqual({ status: 404, code: 'OUTLET_NOT_FOUND' });
    const list = (await kho.get(`/api/merchants/${w.merchantId}/outlets`)).body.data.outlets.map((o) => o.id);
    expect(list).toEqual([w.outletId]);
    const list2 = (await kho.get('/api/outlets?limit=50')).body.data.outlets.map((o) => o.id);
    expect(list2).toEqual([w.outletId]);
  });
});

// ================================================================================================================
// B. Outlets plan limit and branch add-ons (BF-BRANCH-10 .. 15)
// ================================================================================================================

describeBranch('BF-BRANCH outlets limit: missing/0 = 1, -1 unlimited, re-enable checks it, add-ons (#834 #831)', () => {
  test('BF-BRANCH-10 over the limit both create routes answer 422 PLAN_LIMIT_EXCEEDED and write nothing', async () => {
    const w = world('limit-10', { outlets: 2 });
    const m = await login(w.merchant);
    await outlet(m);
    const before = outletCount(w.merchantId);
    expect(brief(await m.post('/api/outlets', { name: uniqueName('CN 3'), address: 'HN' }))).toEqual({ status: 422, code: 'PLAN_LIMIT_EXCEEDED' });
    expect(brief(await m.post(`/api/merchants/${w.merchantId}/outlets`, { name: uniqueName('CN 3'), address: 'HN' }))).toEqual({ status: 422, code: 'PLAN_LIMIT_EXCEEDED' });
    expect(outletCount(w.merchantId)).toBe(before);
    expect(activeOutletCount(w.merchantId)).toBe(2);
  });

  test('BF-BRANCH-11 re-enabling an outlet over the limit is refused on both update routes; it stays disabled', async () => {
    const w = world('limit-11', { outlets: 2 });
    const m = await login(w.merchant);
    const b = await outlet(m);
    expect((await m.put(`/api/outlets?id=${b.id}`, { isActive: false })).status).toBe(200);
    await outlet(m); // the freed slot is used by C
    expect(brief(await m.put(`/api/outlets?id=${b.id}`, { isActive: true }))).toEqual({ status: 422, code: 'PLAN_LIMIT_EXCEEDED' });
    expect(brief(await m.put(`/api/merchants/${w.merchantId}/outlets/${b.id}`, { isActive: true }))).toEqual({ status: 422, code: 'PLAN_LIMIT_EXCEEDED' });
    expect(outletRow(b.id).isActive).toBe(false);
    expect(activeOutletCount(w.merchantId)).toBe(2);
  });

  test('BF-BRANCH-12 a plan without an outlets limit, or with 0, allows 1 outlet', async () => {
    const missing = world('limit-12a');
    S.setPlanFlag(missing.planId, 'outlets', undefined);
    const zero = world('limit-12b', { outlets: 0 });
    for (const [label, w] of [['missing', missing], ['zero', zero]]) {
      const m = await login(w.merchant);
      const r = await m.post('/api/outlets', { name: uniqueName('CN 2'), address: 'HN' });
      expect({ label, ...brief(r) }).toEqual({ label, status: 422, code: 'PLAN_LIMIT_EXCEEDED' });
      expect({ label, n: outletCount(w.merchantId) }).toEqual({ label, n: 1 });
    }
  });

  test('BF-BRANCH-13 outlets -1 is unlimited', async () => {
    const w = world('limit-13', { outlets: -1 });
    const m = await login(w.merchant);
    for (let i = 0; i < 4; i += 1) await outlet(m);
    expect(activeOutletCount(w.merchantId)).toBe(5);
  });

  test('BF-BRANCH-14 a branch add-on on a single-branch plan: 422 ADDON_OUTLETS_NEED_MULTI_BRANCH_PLAN, nothing written; other add-ons pass', async () => {
    const w = world('limit-14', { outlets: 1 });
    const a = await admin();
    expect(brief(await a.post('/api/plan-limit-addons', { merchantId: w.merchantId, outlets: 1 }))).toEqual({ status: 422, code: 'ADDON_OUTLETS_NEED_MULTI_BRANCH_PLAN' });
    expect(brief(await a.post(`/api/merchants/${w.merchantId}/plan-limit-addons`, { outlets: 2 }))).toEqual({ status: 422, code: 'ADDON_OUTLETS_NEED_MULTI_BRANCH_PLAN' });
    expect(addonsOf(w.merchantId)).toBe('');
    const users = await a.post('/api/plan-limit-addons', { merchantId: w.merchantId, outlets: 0, users: 2 });
    expect(users.ok).toBe(true);
    expect(addonsOf(w.merchantId)).toBe('0:2:true');
    const m = await login(w.merchant);
    expect(brief(await m.post('/api/outlets', { name: uniqueName('CN'), address: 'HN' }))).toEqual({ status: 422, code: 'PLAN_LIMIT_EXCEEDED' });
  });

  test('BF-BRANCH-15 a branch add-on on a multi-branch plan is accepted and raises the limit by its amount', async () => {
    const w = world('limit-15', { outlets: 2 });
    const m = await login(w.merchant);
    await outlet(m);
    expect(brief(await m.post('/api/outlets', { name: uniqueName('CN'), address: 'HN' }))).toEqual({ status: 422, code: 'PLAN_LIMIT_EXCEEDED' });
    const a = await admin();
    const add = await a.post('/api/plan-limit-addons', { merchantId: w.merchantId, outlets: 1 });
    expect(add.ok).toBe(true);
    expect(addonsOf(w.merchantId)).toBe('1:0:true');
    await outlet(m);
    expect(activeOutletCount(w.merchantId)).toBe(3);
    expect(brief(await m.post('/api/outlets', { name: uniqueName('CN'), address: 'HN' }))).toEqual({ status: 422, code: 'PLAN_LIMIT_EXCEEDED' });
    expect(activeOutletCount(w.merchantId)).toBe(3);
  });
});

// ================================================================================================================
// C. Open orders block disable / delete (BF-BRANCH-16 .. 18)
// ================================================================================================================

describeBranch('BF-BRANCH open orders: RESERVED / PICKUPED block disable and delete; stock does not (#834)', () => {
  let w;
  let m;
  let cust;
  beforeAll(async () => {
    w = world('open-orders', { outlets: -1 });
    m = await login(w.merchant);
    cust = await customer(m);
  });

  test('BF-BRANCH-16 a RESERVED order: disable and delete answer 409 OUTLET_HAS_OPEN_ORDERS openOrders 1, nothing changes', async () => {
    const b = await outlet(m);
    const p = await product(m, [[b.id, 2]]);
    const o = await rentOrder(m, { cust, prod: p, outletId: b.id });
    for (const r of [
      await m.put(`/api/outlets?id=${b.id}`, { isActive: false }),
      await m.put(`/api/merchants/${w.merchantId}/outlets/${b.id}`, { isActive: false }),
      await m.delete(`/api/outlets?id=${b.id}`)
    ]) {
      expect(brief(r)).toEqual({ status: 409, code: 'OUTLET_HAS_OPEN_ORDERS' });
      expect(r.body.data).toEqual({ openOrders: 1 });
    }
    expect(outletRow(b.id).isActive).toBe(true);
    expect(orderStatus(o.id)).toBe('RESERVED');
    expect(stockOf(p.id)[b.id]).toBe('2/2/0');
  });

  test('BF-BRANCH-17 RESERVED + PICKUPED count 2; after return and cancel the outlet can be disabled, then deleted', async () => {
    const b = await outlet(m);
    const p = await product(m, [[b.id, 3]]);
    const reserved = await rentOrder(m, { cust, prod: p, outletId: b.id });
    const picked = await rentOrder(m, { cust, prod: p, outletId: b.id });
    await status(m, picked.id, 'PICKUPED', { outletId: b.id }); // #851: without it the order moves to A
    const r = await m.delete(`/api/outlets?id=${b.id}`);
    expect(brief(r)).toEqual({ status: 409, code: 'OUTLET_HAS_OPEN_ORDERS' });
    expect(r.body.data.openOrders).toBe(2);
    await status(m, picked.id, 'RETURNED', { outletId: b.id });
    const r2 = await m.put(`/api/outlets?id=${b.id}`, { isActive: false });
    expect(brief(r2)).toEqual({ status: 409, code: 'OUTLET_HAS_OPEN_ORDERS' });
    expect(r2.body.data.openOrders).toBe(1);
    await status(m, reserved.id, 'CANCELLED', { outletId: b.id });
    expect(brief(await m.put(`/api/outlets?id=${b.id}`, { isActive: false }))).toEqual({ status: 200, code: 'OUTLET_UPDATED_SUCCESS' });
    expect(outletRow(b.id).isActive).toBe(false);
    expect([orderStatus(reserved.id), orderStatus(picked.id)]).toEqual(['CANCELLED', 'RETURNED']);
  });

  test('BF-BRANCH-18 stock alone does not block: an outlet holding 5 units and no open order is deleted, its stock row kept', async () => {
    const b = await outlet(m);
    const p = await product(m, [[b.id, 5]]);
    expect(brief(await m.delete(`/api/outlets?id=${b.id}`))).toEqual({ status: 200, code: 'OUTLET_DELETED_SUCCESS' });
    expect(outletRow(b.id).isActive).toBe(false);
    expect(stockOf(p.id)[b.id]).toBe('5/5/0');
  });
});

// ================================================================================================================
// D. Users of a disabled outlet (BF-BRANCH-19)
// ================================================================================================================

describeBranch('BF-BRANCH disabled outlet: its users cannot log in, open sessions end (#834)', () => {
  test('BF-BRANCH-19 403 OUTLET_DEACTIVATED at login, 401 on the next request; MERCHANT and other outlets unaffected; re-enable restores', async () => {
    const w = world('login');
    const m = await login(w.merchant);
    const b = await outlet(m);
    const creds = { OUTLET_ADMIN: addUser(w, b.id, 'OUTLET_ADMIN'), OUTLET_STAFF: addUser(w, b.id, 'OUTLET_STAFF'), OUTLET_INVENTORY: addUser(w, b.id, 'OUTLET_INVENTORY') };
    const open = {};
    for (const [role, c] of Object.entries(creds)) open[role] = await login(c);

    expect((await m.put(`/api/outlets?id=${b.id}`, { isActive: false })).status).toBe(200);
    for (const [role, s] of Object.entries(open)) {
      expect({ role, ...brief(await s.get('/api/products?limit=1')) }).toEqual({ role, status: 401, code: 'OUTLET_DEACTIVATED' });
    }
    for (const [role, c] of Object.entries(creds)) {
      expect({ role, ...brief(await S.loginRaw(c)) }).toEqual({ role, status: 403, code: 'OUTLET_DEACTIVATED' });
    }
    expect((await m.get('/api/outlets?limit=10')).status).toBe(200);
    expect((await S.loginRaw(w.staff)).status).toBe(200); // staff of the default outlet

    // the merchant's own session is still the one used above (login of others does not touch it)
    expect((await m.put(`/api/outlets?id=${b.id}`, { isActive: true })).status).toBe(200);
    for (const [role, c] of Object.entries(creds)) {
      expect({ role, status: (await S.loginRaw(c)).status }).toEqual({ role, status: 200 });
    }
  });
});

// ================================================================================================================
// E. 0-stock rows (BF-BRANCH-20 .. 22)
// ================================================================================================================

describeBranch('BF-BRANCH 0-stock rows: new outlet, new product, backfill (#834)', () => {
  let w;
  let m;
  beforeAll(async () => {
    w = world('zero', { outlets: -1 });
    m = await login(w.merchant);
  });

  test('BF-BRANCH-20 a new outlet (either create route) gets 0/0/0 for every non-deleted product, none for a deleted one', async () => {
    const kept = await product(m, [[w.outletId, 3]]);
    const gone = await product(m, [[w.outletId, 1]]);
    expect((await m.delete(`/api/products/${gone.id}`)).status).toBe(200);
    const c = await outlet(m);
    const r = await m.post(`/api/merchants/${w.merchantId}/outlets`, { name: uniqueName('CN D'), address: 'HN' });
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(stockOf(kept.id)).toEqual({ [w.outletId]: '3/3/0', [c.id]: '0/0/0', [d.id]: '0/0/0' });
    expect(stockOf(gone.id)).toEqual({ [w.outletId]: '1/1/0' });
  });

  test('BF-BRANCH-21 a new product gets 0/0/0 at every other ACTIVE outlet, none at a disabled one', async () => {
    const b = await outlet(m);
    const off = await outlet(m);
    expect((await m.put(`/api/outlets?id=${off.id}`, { isActive: false })).status).toBe(200);
    const p = await product(m, [[w.outletId, 4]]);
    const rows = stockOf(p.id);
    expect(rows[w.outletId]).toBe('4/4/0');
    expect(rows[b.id]).toBe('0/0/0');
    expect(rows[off.id]).toBeUndefined();
    const active = Number(S.sql(`SELECT count(*) FROM "Outlet" WHERE "merchantId" = ${w.merchantId} AND "isActive"`));
    expect(Object.keys(rows)).toHaveLength(active);
  });

  test('BF-BRANCH-22 backfill migration (run in a rolled-back transaction): adds missing 0 rows only, keeps stock, skips deleted products and disabled outlets, second run adds nothing', async () => {
    const b = await outlet(m);
    const off = await outlet(m);
    expect((await m.put(`/api/outlets?id=${off.id}`, { isActive: false })).status).toBe(200);
    const held = await product(m, [[w.outletId, 2], [b.id, 3]]);
    const missing = await product(m, [[w.outletId, 6]]);
    const deleted = await product(m, [[w.outletId, 1]]);
    expect((await m.delete(`/api/products/${deleted.id}`)).status).toBe(200);
    // the gaps the migration fills: rows from before #834
    S.sql(`DELETE FROM "OutletStock" WHERE "productId" = ${missing.id} AND "outletId" = ${b.id}`);
    S.sql(`DELETE FROM "OutletStock" WHERE "productId" = ${deleted.id} AND "outletId" = ${b.id}`);
    const before = { held: stockOf(held.id), missing: stockOf(missing.id), deleted: stockOf(deleted.id) };
    expect(before.missing[b.id]).toBeUndefined();

    const migration = fs.readFileSync(MIGRATION, 'utf8');
    const rowsOf = (pid) => `(SELECT coalesce(string_agg("outletId" || '=' || stock || '/' || available || '/' || renting, ',' ORDER BY "outletId"), '') FROM "OutletStock" WHERE "productId" = ${pid})`;
    const ids = [held.id, missing.id, deleted.id].join(',');
    const script = `BEGIN;
${migration}
CREATE TEMP TABLE e2e_first AS SELECT count(*) AS n FROM "OutletStock";
${migration}
SELECT ${rowsOf(held.id)} || ' | ' || ${rowsOf(missing.id)} || ' | ' || ${rowsOf(deleted.id)} || ' | ' ||
       ((SELECT count(*) FROM "OutletStock") - (SELECT n FROM e2e_first)) || ' | ' ||
       (SELECT count(*) FROM "OutletStock" WHERE "outletId" = ${off.id} AND "productId" IN (${ids}));
ROLLBACK;`;
    S.assertLocalDb();
    const out = execFileSync('psql', [process.env.E2E_DATABASE_URL, '-X', '-q', '-tA', '-v', 'ON_ERROR_STOP=1', '-f', '-'], {
      input: script,
      encoding: 'utf8'
    }).trim();
    const [heldRows, missingRows, deletedRows, secondRun, atDisabled] = out.split(' | ');
    const fmt = (o) => Object.entries(o).sort((x, y) => Number(x[0]) - Number(y[0])).map(([k, v]) => `${k}=${v}`).join(',');
    expect(heldRows).toBe(fmt(before.held));
    expect(missingRows).toBe(fmt({ ...before.missing, [b.id]: '0/0/0' }));
    expect(deletedRows).toBe(fmt(before.deleted));
    expect(Number(secondRun)).toBe(0);
    expect(Number(atDisabled)).toBe(0);
    // rolled back: the database is as before
    expect(stockOf(missing.id)).toEqual(before.missing);
  });
});

// ================================================================================================================
// F. Products by branch role (BF-BRANCH-23 .. 33)
// ================================================================================================================

describeBranch('BF-BRANCH products: staff read-only, OUTLET_ADMIN / kho for what their outlet holds (#829 #837)', () => {
  let w;
  let m;
  let b;
  let staff;
  let kho; // OUTLET_INVENTORY of A
  let oa; // OUTLET_ADMIN of A
  let cust;
  beforeAll(async () => {
    w = world('products', { outlets: -1 });
    m = await login(w.merchant);
    b = await outlet(m, `CN B ${w.id}`);
    staff = await login(w.staff);
    kho = await login(w.kho);
    oa = await login(addUser(w, w.outletId, 'OUTLET_ADMIN'));
    cust = await customer(m);
  });
  const branchRoles = () => [['OUTLET_ADMIN', oa], ['OUTLET_INVENTORY', kho]];
  const del = (s, id) => s.delete(`/api/products/${id}`);

  test('BF-BRANCH-23 OUTLET_STAFF cannot create a product: 403 INSUFFICIENT_PERMISSIONS, no row', async () => {
    const name = uniqueName('SP staff');
    expect(brief(await productRaw(staff, [[w.outletId, 2]], { name }))).toEqual({ status: 403, code: 'INSUFFICIENT_PERMISSIONS' });
    expect(productsNamed(name)).toBe(0);
  });

  test('BF-BRANCH-24 OUTLET_STAFF cannot edit shared fields, stock or delete, even a product its outlet holds', async () => {
    const p = await product(m, [[w.outletId, 2]], { price: 80000 });
    expect(brief(await staff.updateProduct(p.id, { name: 'staff rename', rentPrice: 1 }))).toEqual({ status: 403, code: 'INSUFFICIENT_PERMISSIONS' });
    expect(brief(await del(staff, p.id))).toEqual({ status: 403, code: 'INSUFFICIENT_PERMISSIONS' });
    expect(productRow(p.id)).toEqual({ name: p.name, rentPrice: 80000, deleted: false });
    expect(stockOf(p.id)[w.outletId]).toBe('2/2/0');
  });

  test('BF-BRANCH-25 OUTLET_ADMIN and OUTLET_INVENTORY create with stock at their outlet (0 elsewhere); stock at another outlet is refused', async () => {
    for (const [role, s] of branchRoles()) {
      const name = uniqueName(`SP ${role}`);
      const r = await productRaw(s, [[w.outletId, 3]], { name });
      expect({ role, status: r.status }).toEqual({ role, status: 200 });
      const id = (r.body.data.product || r.body.data).id;
      expect({ role, rows: stockOf(id) }).toEqual({ role, rows: { [w.outletId]: '3/3/0', [b.id]: '0/0/0' } });

      const other = uniqueName(`SP ${role} B`);
      expect({ role, ...brief(await productRaw(s, [[b.id, 3]], { name: other })) }).toEqual({ role, status: 403, code: 'CANNOT_CREATE_PRODUCT_AT_OTHER_OUTLET' });
      expect({ role, ...brief(await productRaw(s, [[w.outletId, 1], [b.id, 1]], { name: other })) }).toEqual({ role, status: 403, code: 'CANNOT_CREATE_PRODUCT_AT_OTHER_OUTLET' });
      expect({ role, n: productsNamed(other) }).toEqual({ role, n: 0 });
    }
  });

  test('BF-BRANCH-26 shared fields: edited when their outlet holds the product; 403 PRODUCT_NOT_AVAILABLE_AT_OUTLET at 0 stock', async () => {
    for (const [role, s] of branchRoles()) {
      const mine = await product(m, [[w.outletId, 2]], { price: 50000 });
      const r = await s.updateProduct(mine.id, { name: `${mine.name} sua`, rentPrice: 60000, pricingOptions: [{ type: 'FIXED', price: 60000, isDefault: true }] });
      expect({ role, status: r.status }).toEqual({ role, status: 200 });
      expect(productRow(mine.id)).toEqual({ name: `${mine.name} sua`, rentPrice: 60000, deleted: false });

      const theirs = await product(m, [[b.id, 4]], { price: 50000 });
      expect({ role, ...brief(await s.updateProduct(theirs.id, { name: 'hack', rentPrice: 1 })) }).toEqual({ role, status: 403, code: 'PRODUCT_NOT_AVAILABLE_AT_OUTLET' });
      expect(productRow(theirs.id)).toEqual({ name: theirs.name, rentPrice: 50000, deleted: false });
    }
  });

  test('BF-BRANCH-27 delete: allowed for a product only their outlet holds; 403 PRODUCT_NOT_AVAILABLE_AT_OUTLET at 0 stock', async () => {
    for (const [role, s] of branchRoles()) {
      const mine = await product(m, [[w.outletId, 1]]);
      expect({ role, ...brief(await del(s, mine.id)) }).toEqual({ role, status: 200, code: 'PRODUCT_DELETED_SUCCESS' });
      expect(productRow(mine.id).deleted).toBe(true);
      const theirs = await product(m, [[b.id, 1]]);
      expect({ role, ...brief(await del(s, theirs.id)) }).toEqual({ role, status: 403, code: 'PRODUCT_NOT_AVAILABLE_AT_OUTLET' });
      expect(productRow(theirs.id).deleted).toBe(false);
    }
  });

  test('BF-BRANCH-28 stock is written only at their own outlet (also from 0); another outlet is refused and unchanged', async () => {
    for (const [role, s] of branchRoles()) {
      const p = await product(m, [[b.id, 4]]);
      expect({ role, ...brief(await s.updateProduct(p.id, { outletStock: [{ outletId: b.id, stock: 9 }] })) }).toEqual({ role, status: 403, code: 'CANNOT_CREATE_PRODUCT_AT_OTHER_OUTLET' });
      expect(stockOf(p.id)).toEqual({ [w.outletId]: '0/0/0', [b.id]: '4/4/0' });
      const r = await s.updateProduct(p.id, { outletStock: [{ outletId: w.outletId, stock: 6 }] });
      expect({ role, status: r.status }).toEqual({ role, status: 200 });
      expect(stockOf(p.id)).toEqual({ [w.outletId]: '6/6/0', [b.id]: '4/4/0' });
    }
  });

  test('BF-BRANCH-29 an outlet of another shop in outletStock: 404 OUTLET_NOT_FOUND on PUT /api/products/[id] and the admin route, nothing written', async () => {
    const other = world('products-foreign');
    const p = await product(m, [[w.outletId, 2], [b.id, 1]], { price: 70000 });
    const before = stockOf(p.id);
    const r = await m.updateProduct(p.id, { name: 'renamed', outletStock: [{ outletId: other.outletId, stock: 3 }] });
    expect(brief(r)).toEqual({ status: 404, code: 'OUTLET_NOT_FOUND' });
    const a = await admin();
    const r2 = await a.put(`/api/merchants/${w.merchantId}/products/${p.id}`, { name: 'renamed', rentPrice: 1, outletStock: [{ outletId: other.outletId, stock: 3 }] });
    expect(brief(r2)).toEqual({ status: 404, code: 'OUTLET_NOT_FOUND' });
    expect(productRow(p.id)).toEqual({ name: p.name, rentPrice: 70000, deleted: false });
    expect(stockOf(p.id)).toEqual(before);
    expect(Number(S.sql(`SELECT count(*) FROM "OutletStock" WHERE "outletId" = ${other.outletId}`))).toBe(0);
  });

  test('BF-BRANCH-30 a branch role without an outlet: 403 OUTLET_REQUIRED on create and edit, nothing written', async () => {
    const lost = await login(addUser(w, null, 'OUTLET_ADMIN'));
    const name = uniqueName('SP no outlet');
    expect(brief(await productRaw(lost, [[w.outletId, 1]], { name }))).toEqual({ status: 403, code: 'OUTLET_REQUIRED' });
    expect(productsNamed(name)).toBe(0);
    const p = await product(m, [[w.outletId, 1]]);
    expect(brief(await lost.updateProduct(p.id, { name: 'x', outletStock: [{ outletId: w.outletId, stock: 5 }] }))).toEqual({ status: 403, code: 'OUTLET_REQUIRED' });
    expect(productRow(p.id).name).toBe(p.name);
    expect(stockOf(p.id)[w.outletId]).toBe('1/1/0');
  });

  test('BF-BRANCH-31 branch roles list every product with their own outlet numbers, whatever outletId they send', async () => {
    const tag = `Ds${w.id}`;
    const pa = await product(m, [[w.outletId, 2]], { name: `${tag} A` });
    const pb = await product(m, [[b.id, 5]], { name: `${tag} B` });
    for (const [role, s] of [['OUTLET_STAFF', staff], ...branchRoles()]) {
      for (const extra of ['', `&outletId=${b.id}`]) {
        const r = await s.get(`/api/products?search=${encodeURIComponent(tag)}&limit=50${extra}`);
        expect({ role, extra, status: r.status }).toEqual({ role, extra, status: 200 });
        const rows = Object.fromEntries((r.body.data.products || []).map((p) => [p.id, p]));
        expect({ role, extra, ids: Object.keys(rows).map(Number).sort() }).toEqual({ role, extra, ids: [pa.id, pb.id].sort() });
        expect({ role, extra, a: rows[pa.id].totalStock, b: rows[pb.id].totalStock }).toEqual({ role, extra, a: 2, b: 0 });
        expect({ role, extra, a: rows[pa.id].available, b: rows[pb.id].available }).toEqual({ role, extra, a: 2, b: 0 });
      }
    }
  });

  test('BF-BRANCH-32 a shop with ONE outlet: OUTLET_ADMIN and OUTLET_INVENTORY delete a product their outlet holds', async () => {
    const one = world('products-one', { outlets: 1 });
    const om = await login(one.merchant);
    const sessions = [['OUTLET_ADMIN', await login(addUser(one, one.outletId, 'OUTLET_ADMIN'))], ['OUTLET_INVENTORY', await login(one.kho)]];
    for (const [role, s] of sessions) {
      const p = await product(om, [[one.outletId, 2]]);
      expect({ role, ...brief(await del(s, p.id)) }).toEqual({ role, status: 200, code: 'PRODUCT_DELETED_SUCCESS' });
      expect(productRow(p.id).deleted).toBe(true);
    }
  });

  test('BF-BRANCH-33 a product on a RESERVED or PICKUPED order cannot be deleted by anyone: 409 PRODUCT_HAS_OPEN_ORDERS', async () => {
    const p = await product(m, [[w.outletId, 3]]);
    const reserved = await rentOrder(m, { cust, prod: p, outletId: w.outletId });
    const picked = await rentOrder(m, { cust, prod: p, outletId: w.outletId });
    await status(m, picked.id, 'PICKUPED');
    for (const [role, s] of [['MERCHANT', m], ...branchRoles()]) {
      expect({ role, ...brief(await del(s, p.id)) }).toEqual({ role, status: 409, code: 'PRODUCT_HAS_OPEN_ORDERS' });
    }
    expect(productRow(p.id).deleted).toBe(false);
    await status(m, picked.id, 'RETURNED');
    expect(brief(await del(m, p.id))).toEqual({ status: 409, code: 'PRODUCT_HAS_OPEN_ORDERS' });
    await status(m, reserved.id, 'CANCELLED');
    expect(brief(await del(oa, p.id))).toEqual({ status: 200, code: 'PRODUCT_DELETED_SUCCESS' });
    expect(productRow(p.id).deleted).toBe(true);
  });
});

// ================================================================================================================
// G. Delete when another outlet still holds the product (#847) (BF-BRANCH-34 .. 37)
//    OUTLET_INVENTORY single delete is BF-INV-18 (inventory-role); here OUTLET_ADMIN and the batch delete.
// ================================================================================================================

describeBranch('BF-BRANCH delete when another outlet holds the product: 409 PRODUCT_HELD_BY_OTHER_OUTLETS (#847)', () => {
  let w;
  let m;
  let b;
  let oa;
  let cust;
  beforeAll(async () => {
    w = world('held', { outlets: -1 });
    m = await login(w.merchant);
    b = await outlet(m, `CN B ${w.id}`);
    oa = await login(addUser(w, w.outletId, 'OUTLET_ADMIN'));
    cust = await customer(m);
  });

  test('BF-BRANCH-34 OUTLET_ADMIN: another outlet has stock: 409 naming it, nothing deleted; at 0 there the delete passes', async () => {
    const p = await product(m, [[w.outletId, 1], [b.id, 2]]);
    const r = await oa.delete(`/api/products/${p.id}`);
    expect(brief(r)).toEqual({ status: 409, code: 'PRODUCT_HELD_BY_OTHER_OUTLETS' });
    expect(r.body.data.outlets).toEqual([{ id: b.id, name: b.name, stock: 2, renting: 0, openOrders: 0 }]);
    expect(productRow(p.id).deleted).toBe(false);
    expect(stockOf(p.id)).toEqual({ [w.outletId]: '1/1/0', [b.id]: '2/2/0' });
    expect((await m.updateProduct(p.id, { outletStock: [{ outletId: b.id, stock: 0 }] })).status).toBe(200);
    expect(brief(await oa.delete(`/api/products/${p.id}`))).toEqual({ status: 200, code: 'PRODUCT_DELETED_SUCCESS' });
    expect(productRow(p.id).deleted).toBe(true);
  });

  test('BF-BRANCH-35 OUTLET_ADMIN: an open order line at another outlet also holds it (openOrders counted)', async () => {
    const p = await product(m, [[w.outletId, 1], [b.id, 1]]);
    const o = await rentOrder(m, { cust, prod: p, outletId: b.id });
    const r = await oa.delete(`/api/products/${p.id}`);
    expect(brief(r)).toEqual({ status: 409, code: 'PRODUCT_HELD_BY_OTHER_OUTLETS' });
    expect(r.body.data.outlets).toEqual([{ id: b.id, name: b.name, stock: 1, renting: 0, openOrders: 1 }]);
    expect(productRow(p.id).deleted).toBe(false);
    expect(orderStatus(o.id)).toBe('RESERVED');
  });

  test('BF-BRANCH-36 MERCHANT deletes a product several outlets hold', async () => {
    const p = await product(m, [[w.outletId, 1], [b.id, 2]]);
    expect(brief(await m.delete(`/api/products/${p.id}`))).toEqual({ status: 200, code: 'PRODUCT_DELETED_SUCCESS' });
    expect(productRow(p.id).deleted).toBe(true);
  });

  test('BF-BRANCH-37 OUTLET_ADMIN batch delete: reports the held product per product, deletes the rest; all held = 409', async () => {
    const mine = await product(m, [[w.outletId, 1]]);
    const shared = await product(m, [[w.outletId, 1], [b.id, 3]]);
    const r = await oa.post('/api/products/batch-delete', { productIds: [mine.id, shared.id] });
    expect(brief(r)).toEqual({ status: 200, code: 'PRODUCTS_BATCH_DELETED_SUCCESS' });
    expect(r.body.data).toMatchObject({ deleted: 1, failed: 1, total: 2 });
    expect(r.body.data.deletedProducts.map((x) => x.id)).toEqual([mine.id]);
    expect(r.body.data.errors).toEqual([
      expect.objectContaining({ id: shared.id, code: 'PRODUCT_HELD_BY_OTHER_OUTLETS', outlets: [{ id: b.id, name: b.name, stock: 3, renting: 0, openOrders: 0 }] })
    ]);
    expect([productRow(mine.id).deleted, productRow(shared.id).deleted]).toEqual([true, false]);

    const only = await oa.post('/api/products/batch-delete', { productIds: [shared.id] });
    expect(brief(only)).toEqual({ status: 409, code: 'PRODUCT_HELD_BY_OTHER_OUTLETS' });
    expect(only.body.data.errors.map((e) => [e.id, e.code])).toEqual([[shared.id, 'PRODUCT_HELD_BY_OTHER_OUTLETS']]);
    expect(productRow(shared.id).deleted).toBe(false);
  });
});

// ================================================================================================================
// H. Dashboard per outlet (#840) (BF-BRANCH-38 .. 41)
// ================================================================================================================

describeBranch('BF-BRANCH dashboard: outletIds and byOutlet=1 add up to the totals, cancelled left out (#840)', () => {
  const today = vnDateKey();
  let w;
  let m;
  let b;
  let oa;
  const period = (s, extra = '') =>
    s.get(`/api/analytics/period?startDate=${today}&endDate=${today}&groupBy=day&limit=3&timeZone=Asia%2FHo_Chi_Minh${extra}`);
  beforeAll(async () => {
    w = world('dashboard', { outlets: -1 });
    m = await login(w.merchant);
    b = await outlet(m, `CN B ${w.id}`);
    oa = await login(addUser(w, w.outletId, 'OUTLET_ADMIN'));
    const cust = await customer(m);
    const rentA = await product(m, [[w.outletId, 2]], { price: 300000 });
    const saleB = await product(m, [[b.id, 2]], { price: 1000, salePrice: 200000 });
    const rentB = await product(m, [[b.id, 2]], { price: 150000 });
    await rentOrder(m, { cust, prod: rentA, outletId: w.outletId, deposit: 100000 });
    await saleOrder(m, { cust, prod: saleB, outletId: b.id });
    const cancelled = await rentOrder(m, { cust, prod: rentB, outletId: b.id, deposit: 50000 });
    await status(m, cancelled.id, 'CANCELLED', { outletId: b.id });
  });

  test('BF-BRANCH-38 MERCHANT byOutlet=1: one row per outlet with its own numbers; rows add up to the totals', async () => {
    const r = await period(m, '&byOutlet=1');
    expect(r.status).toBe(200);
    const d = r.body.data;
    const rows = Object.fromEntries(d.byOutlet.map((x) => [x.outletId, x]));
    expect(Object.keys(rows).map(Number).sort((x, y) => x - y)).toEqual([w.outletId, b.id].sort((x, y) => x - y));
    expect(rows[w.outletId]).toMatchObject({ orderValue: 300000, collected: 100000, cashCollected: 100000, outstanding: 200000, newOrders: 1 });
    expect(rows[b.id]).toMatchObject({ outletName: b.name, orderValue: 200000, collected: 200000, cashCollected: 200000, outstanding: 0, newOrders: 1 });
    const sum = (k) => d.byOutlet.reduce((s, x) => s + x[k], 0);
    expect({
      orderValue: sum('orderValue'), collected: sum('collected'), cashCollected: sum('cashCollected'), outstanding: sum('outstanding'), newOrders: sum('newOrders')
    }).toEqual({
      orderValue: d.revenue.totalOrderValue,
      collected: d.revenue.collected,
      cashCollected: d.revenue.cashCollected,
      outstanding: d.revenue.outstanding,
      newOrders: d.revenue.orderValueByType.rent.orders + d.revenue.orderValueByType.sale.orders
    });
    expect(d.revenue).toMatchObject({ totalOrderValue: 500000, collected: 300000, outstanding: 200000 });
  });

  test('BF-BRANCH-39 MERCHANT outletIds=B narrows the totals and the rows to B', async () => {
    const r = await period(m, `&outletIds=${b.id}&byOutlet=1`);
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d.byOutlet.map((x) => x.outletId)).toEqual([b.id]);
    expect(d.revenue).toMatchObject({ totalOrderValue: 200000, collected: 200000, outstanding: 0 });
  });

  test('BF-BRANCH-40 outletIds of another shop: 403 CROSS_MERCHANT_ACCESS_DENIED; malformed: 400 INVALID_QUERY', async () => {
    const other = world('dashboard-foreign');
    expect(brief(await period(m, `&outletIds=${w.outletId},${other.outletId}`))).toEqual({ status: 403, code: 'CROSS_MERCHANT_ACCESS_DENIED' });
    expect(brief(await period(m, '&outletIds=1,abc'))).toEqual({ status: 400, code: 'INVALID_QUERY' });
  });

  test('BF-BRANCH-41 OUTLET_ADMIN stays locked to its outlet whatever outletIds it sends', async () => {
    const r = await period(oa, `&outletIds=${b.id}&byOutlet=1`);
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d.byOutlet.map((x) => x.outletId)).toEqual([w.outletId]);
    expect(d.revenue).toMatchObject({ totalOrderValue: 300000, collected: 100000, outstanding: 200000 });
  });
});

// ================================================================================================================
// I. Orders per outlet (BF-BRANCH-42 .. 43)
// ================================================================================================================

describeBranch('BF-BRANCH orders per outlet', () => {
  test('BF-BRANCH-42 a merchant order with outletId B moves B stock only (status sent with outletId)', async () => {
    const w = world('orders', { outlets: -1 });
    const m = await login(w.merchant);
    const b = await outlet(m);
    const cust = await customer(m);
    const p = await product(m, [[w.outletId, 2], [b.id, 2]]);
    const o = await rentOrder(m, { cust, prod: p, outletId: b.id });
    expect(Number(S.sql(`SELECT "outletId" FROM "Order" WHERE id = ${o.id}`))).toBe(b.id);
    await status(m, o.id, 'PICKUPED', { outletId: b.id });
    expect(stockOf(p.id)).toEqual({ [w.outletId]: '2/2/0', [b.id]: '2/1/1' });
    await status(m, o.id, 'RETURNED', { outletId: b.id });
    expect(stockOf(p.id)).toEqual({ [w.outletId]: '2/2/0', [b.id]: '2/2/0' });
    expect(Number(S.sql(`SELECT "outletId" FROM "Order" WHERE id = ${o.id}`))).toBe(b.id);
  });

  // A registered MERCHANT user has outletId = the default outlet (registration.ts); the apps change status with
  // { status } only, and PUT /api/orders fills outletId from the user, so the order moves to the default outlet.
  knownBug('#851', 'BF-BRANCH-42b status change by the apps ({ status } only) keeps the order and its stock at B', async () => {
    const w = world('orders-move', { outlets: -1 });
    const m = await login(w.merchant);
    const b = await outlet(m);
    const cust = await customer(m);
    const p = await product(m, [[w.outletId, 2], [b.id, 2]]);
    const o = await rentOrder(m, { cust, prod: p, outletId: b.id });
    await status(m, o.id, 'PICKUPED');
    expect({
      outletId: Number(S.sql(`SELECT "outletId" FROM "Order" WHERE id = ${o.id}`)),
      stock: stockOf(p.id)
    }).toEqual({ outletId: b.id, stock: { [w.outletId]: '2/2/0', [b.id]: '2/1/1' } });
  });

  test('BF-BRANCH-43 a branch role cannot create an order at another outlet: 403 CANNOT_CREATE_ORDER_FOR_OTHER_OUTLET, no order', async () => {
    const w = world('orders-other', { outlets: -1 });
    const m = await login(w.merchant);
    const b = await outlet(m);
    const staff = await login(w.staff);
    const cust = await customer(m);
    const p = await product(m, [[w.outletId, 2], [b.id, 2]]);
    const win = futureWindow(1);
    const { body } = rentBody({ customer: cust, lines: [{ product: p }], from: win.from, to: win.to });
    const r = await staff.createOrderRaw({ ...body, outletId: b.id });
    expect(brief(r)).toEqual({ status: 403, code: 'CANNOT_CREATE_ORDER_FOR_OTHER_OUTLET' });
    expect(ordersAt(b.id)).toBe(0);
    expect(stockOf(p.id)[b.id]).toBe('2/2/0');
  });
});
