/**
 * BF-OTHER — "Chi nhánh khác còn N" (#1347, PR 2 of #1335): POST /api/products/other-outlets-availability.
 *
 * Owner rules checked here (2026-10-30):
 *  - product X is out at branch A on the order's days; branch B has 3, so the hint says "B còn 3" on THOSE days and
 *    the full count on days nothing is booked (the count is by day, like batch-availability, not the shelf);
 *  - the same number batch-availability gives for B;
 *  - only branches that are open and ticked the product are listed, with units left > 0;
 *  - owner, manager (OUTLET_ADMIN) and kho see it; OUTLET_STAFF gets 403 INSUFFICIENT_PERMISSIONS;
 *  - a branch of another shop is 404; a shop with one branch gets an empty list.
 * Every describe makes its own merchant, plan, outlets and users (helpers/subscription.js), never the seed shops.
 * Run: scripts/e2e/business-e2e.sh -- other-outlets-availability   (needs E2E_API_URL + a local E2E_DATABASE_URL).
 */
const { describeE2E, uniqueName, rentBody, futureWindow, vnDateKey } = require('../helpers/api');
const S = require('../helpers/subscription');

const describeOther = S.hasDb ? describeE2E : describe.skip;
const OPEN = { outlets: 4, users: -1, products: -1, customers: -1, orders: -1 };
const NEW_APP = { ...S.MOBILE_HEADERS, 'x-client-capabilities': 'branch-listing' };

let ipSeq = 0;
async function login(creds) {
  const s = await S.login(creds, NEW_APP);
  ipSeq += 1;
  return s.asPlatform({ ...NEW_APP, 'x-forwarded-for': `10.246.${process.pid % 250}.${ipSeq % 250}` });
}

let userSeq = 0;
function addUser(w, outletId, role) {
  userSeq += 1;
  const email = `oo.${w.id}.${role.toLowerCase()}.${userSeq}@e2e.test`;
  S.createUser(w.merchantId, outletId, role, email, role);
  return { email, password: S.PASSWORD };
}

async function outlet(session, name) {
  const r = await session.post('/api/outlets', { name, address: 'Ha Noi' });
  if (!r.ok) throw new Error(`create outlet failed: ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return r.body.data;
}

/** Product listed (ticked) at every outlet given, with its stock. */
async function product(session, rows, name = uniqueName('SP khac')) {
  const body = {
    name,
    rentPrice: 100000,
    deposit: 0,
    totalStock: rows.reduce((s, [, n]) => s + n, 0),
    outletStock: rows.map(([outletId, stock, isListed]) => ({ outletId, stock, isListed: isListed !== false })),
    pricingOptions: [{ type: 'FIXED', price: 100000, isDefault: true }]
  };
  const r = await session.postForm('/api/products', body);
  if (!r.ok) throw new Error(`create product failed: ${r.status} ${JSON.stringify(r.body).slice(0, 400)}`);
  return r.body.data.product || r.body.data;
}

async function rent(session, customer, prod, outletId, win, quantity = 1) {
  const { body } = rentBody({ customer, lines: [{ product: prod, quantity }], from: win.from, to: win.to, depositAmount: 0 });
  body.outletId = outletId;
  const r = await session.createOrderRaw(body);
  if (!r.ok) throw new Error(`create order failed: ${r.status} ${JSON.stringify(r.body).slice(0, 400)}`);
  return (r.body.data.order || r.body.data).id;
}

/** ISO instants of VN days: 00:00 of `from` to the last ms of `to` (what the web cart sends). */
const range = (from, to) => ({
  startDate: new Date(`${from}T00:00:00+07:00`).toISOString(),
  endDate: new Date(`${to}T23:59:59.999+07:00`).toISOString()
});
const day = (key) => ({ date: key });
const ask = (session, outletId, productIds, when) =>
  session.post('/api/products/other-outlets-availability', {
    products: productIds.map((productId) => ({ productId, quantity: 1 })),
    ...(outletId ? { outletId } : {}),
    ...when
  });
const names = (r, productId) => (r.body.data.results.find((x) => x.productId === productId)?.outlets || []).map((o) => `${o.outletName}:${o.available}`);

describeOther('BF-OTHER hint by day, roles, scope (#1347)', () => {
  let w;
  let m;
  let b; // branch B
  let c; // branch C (closed later)
  let oa; // OUTLET_ADMIN of A
  let kho; // OUTLET_INVENTORY of A
  let staff; // OUTLET_STAFF of A
  let cust;
  let prod; // X: A 1, B 3, C 5
  let win;
  let dayAfter;
  beforeAll(async () => {
    w = S.createWorld('other-branches', { limits: OPEN });
    m = await login(w.merchant);
    b = await outlet(m, `Quan 7 ${w.id}`);
    c = await outlet(m, `Thu Duc ${w.id}`);
    oa = await login(addUser(w, w.outletId, 'OUTLET_ADMIN'));
    kho = await login(w.kho);
    staff = await login(w.staff);
    cust = await m.createCustomer();
    prod = await product(m, [[w.outletId, 1], [b.id, 3], [c.id, 5]]);
    win = futureWindow(2);
    dayAfter = futureWindow(1);
    // A is out of X on `win` (its 1 unit is booked); B has 2 of its 3 booked on the first day of `win`
    await rent(m, cust, prod, w.outletId, win, 1);
    await rent(m, cust, prod, b.id, { from: win.from, to: win.from }, 2);
  });

  test('BF-OTHER-01 the owner asks for A on the order days: B has 1 left (3 - 2 booked that day), C has 5; most first', async () => {
    const r = await ask(m, w.outletId, [prod.id], range(win.from, win.to));
    expect(r.status).toBe(200);
    expect(names(r, prod.id)).toEqual([`${c.name}:5`, `${b.name}:1`]);
  });

  test('BF-OTHER-02 on a day nothing is booked B has all 3 (by day, not the shelf)', async () => {
    const r = await ask(m, w.outletId, [prod.id], day(dayAfter.from));
    expect(names(r, prod.id)).toEqual([`${c.name}:5`, `${b.name}:3`]);
  });

  test('BF-OTHER-03 the same count batch-availability gives for B and C on the same days', async () => {
    const hint = await ask(m, w.outletId, [prod.id], range(win.from, win.to));
    for (const o of [b, c]) {
      const batch = await m.post('/api/products/batch-availability', {
        products: [{ productId: prod.id, quantity: 1 }],
        outletId: o.id,
        ...range(win.from, win.to)
      });
      expect(batch.status).toBe(200);
      const eff = batch.body.data.results[0].availabilityByOutlet[0].effectivelyAvailable;
      const mine = hint.body.data.results[0].outlets.find((x) => x.outletId === o.id);
      expect(mine && mine.available).toBe(eff);
    }
  });

  test('BF-OTHER-04 owner, manager and kho see the hint; staff gets 403 INSUFFICIENT_PERMISSIONS', async () => {
    for (const who of [m, oa, kho]) {
      const r = await ask(who, who === m ? w.outletId : undefined, [prod.id], day(dayAfter.from));
      expect(r.status).toBe(200);
      expect(names(r, prod.id).length).toBe(2);
    }
    const s = await ask(staff, undefined, [prod.id], day(dayAfter.from));
    expect([s.status, s.body.code]).toEqual([403, 'INSUFFICIENT_PERMISSIONS']);
  });

  test('BF-OTHER-05 a branch that unticked X, one that is closed, and one with 0 left are not listed', async () => {
    const p = await product(m, [[w.outletId, 0], [b.id, 3, false], [c.id, 4]]);
    let r = await ask(m, w.outletId, [p.id], day(dayAfter.from));
    expect(names(r, p.id)).toEqual([`${c.name}:4`]); // B did not tick it
    expect((await m.put(`/api/outlets?id=${c.id}`, { isActive: false })).status).toBe(200);
    r = await ask(m, w.outletId, [p.id], day(dayAfter.from));
    expect(names(r, p.id)).toEqual([]); // C is closed
    expect((await m.put(`/api/outlets?id=${c.id}`, { isActive: true })).status).toBe(200);
  });

  test('BF-OTHER-06 a branch of another shop is 404 OUTLET_NOT_FOUND; a product of another shop is 404 PRODUCTS_NOT_FOUND', async () => {
    const other = S.createWorld('other-branches-b', { limits: OPEN });
    const r1 = await ask(m, other.outletId, [prod.id], day(dayAfter.from));
    expect([r1.status, r1.body.code]).toEqual([404, 'OUTLET_NOT_FOUND']);
    const om = await login(other.merchant);
    const foreign = await om.createProduct({ stock: 2, outletId: other.outletId });
    const r2 = await ask(m, w.outletId, [foreign.id], day(dayAfter.from));
    expect([r2.status, r2.body.code]).toEqual([404, 'PRODUCTS_NOT_FOUND']);
  });

  test('BF-OTHER-07 a shop with one branch gets an empty list, not an error', async () => {
    const one = S.createWorld('other-branches-one', { limits: OPEN });
    const om = await login(one.merchant);
    const p = await om.createProduct({ stock: 2, outletId: one.outletId });
    const r = await ask(om, one.outletId, [p.id], day(dayAfter.from));
    expect(r.status).toBe(200);
    expect(r.body.data.results).toEqual([{ productId: p.id, outlets: [] }]);
  });

  test('BF-OTHER-08 a one-day order (pickup and return the same day) still holds that day at B', async () => {
    const p = await product(m, [[w.outletId, 0], [b.id, 2]]);
    const booked = futureWindow(1);
    await rent(m, cust, p, b.id, booked, 2);
    const held = await ask(m, w.outletId, [p.id], day(booked.from));
    expect(names(held, p.id)).toEqual([]);
    const free = await ask(m, w.outletId, [p.id], day(vnDateKey()));
    expect(names(free, p.id)).toEqual([`${b.name}:2`]);
  });
});
