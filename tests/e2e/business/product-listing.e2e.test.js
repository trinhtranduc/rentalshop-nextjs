/**
 * BF-LIST — "Hiện ở chi nhánh" (#1341, PR 1 of #1335): OutletStock.isListed.
 *
 * Owner rules checked here (2026-10-30):
 *  - a new product is listed at the branch that creates it; every other branch gets a 0 row that is NOT listed;
 *  - GET /api/products?listed=true lists one branch (a branch role: its own; the owner: outletId); a product listed with
 *    stock 0 stays in; without `listed` the web and branch roles get every product as before;
 *  - #1601 the owner on the iOS / Android app (`x-client-platform: mobile`) without `listed` gets only the products
 *    listed at the outletId it sends (else the shop default branch); `listed=false` turns that off; the web is unchanged;
 *  - only the owner ticks / unticks (PUT /api/products/listing); OUTLET_ADMIN, kho and staff get 403 INSUFFICIENT_PERMISSIONS;
 *  - unticking is never blocked by stock, units on rent or open orders; orders already on the book still work;
 *  - #1603 every product stays shown at one open branch: unticking the last one, or creating a product shown nowhere, is
 *    400 PRODUCT_NEEDS_ONE_BRANCH; a data migration lists the products shown nowhere at the default branch;
 *  - an order from an OLD app (no `X-Client-Capabilities: branch-listing`) lists the product again; the web / new apps do not;
 *  - a shop with one active branch ignores `listed`;
 *  - the backfill of the migration 20261031090000_outlet_stock_is_listed, run in a rolled-back transaction.
 * Every describe makes its own merchant, plan, outlets and users (helpers/subscription.js), never the seed shops.
 * Run: scripts/e2e/business-e2e.sh -- product-listing   (needs E2E_API_URL + a local E2E_DATABASE_URL).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { describeE2E, uniqueName, rentBody, futureWindow } = require('../helpers/api');
const S = require('../helpers/subscription');

const describeList = S.hasDb ? describeE2E : describe.skip;
const OPEN = { outlets: 3, users: -1, products: -1, customers: -1, orders: -1 };
const MIGRATION = path.resolve(__dirname, '../../../prisma/migrations/20261031090000_outlet_stock_is_listed/migration.sql');
const ONE_BRANCH_MIGRATION = path.resolve(__dirname, '../../../prisma/migrations/20261116120000_products_listed_at_one_branch/migration.sql');
const OLD_APP = { ...S.MOBILE_HEADERS };
const NEW_APP = { ...S.MOBILE_HEADERS, 'x-client-capabilities': 'branch-listing' };

let ipSeq = 0;
async function login(creds, headers = OLD_APP) {
  const s = await S.login(creds, headers);
  ipSeq += 1;
  return s.asPlatform({ ...headers, 'x-forwarded-for': `10.245.${process.pid % 250}.${ipSeq % 250}` });
}
/** Same session, now an old app (no capability header) or a new one (`branch-listing`). Logins are single-session, so the account is reused. */
function mode(session, headers) {
  const { 'x-client-capabilities': _old, ...rest } = session.headers;
  return session.asPlatform(headers['x-client-capabilities'] ? { ...rest, 'x-client-capabilities': headers['x-client-capabilities'] } : rest);
}

function world(label, limits = {}) {
  return S.createWorld(`list-${label}`, { limits: { ...OPEN, ...limits } });
}
let userSeq = 0;
function addUser(w, outletId, role) {
  userSeq += 1;
  const email = `ls.${w.id}.${role.toLowerCase()}.${userSeq}@e2e.test`;
  S.createUser(w.merchantId, outletId, role, email, role);
  return { email, password: S.PASSWORD };
}

/** { [outletId]: 'listed/stock/renting' } of every OutletStock row of a product. */
function rowsOf(productId) {
  const raw = S.sql(
    `SELECT coalesce(string_agg("outletId" || '=' || "isListed" || '/' || stock || '/' || renting, ',' ORDER BY "outletId"), '')
       FROM "OutletStock" WHERE "productId" = ${productId}`
  );
  const out = {};
  for (const part of raw.split(',').filter(Boolean)) {
    const [k, v] = part.split('=');
    out[k] = v.replace('true', 't').replace('false', 'f');
  }
  return out;
}

async function product(session, stocks, opts = {}) {
  const body = {
    name: opts.name || uniqueName('SP listing'),
    rentPrice: 100000,
    deposit: 0,
    totalStock: stocks.reduce((s, [, n]) => s + n, 0),
    outletStock: stocks.map(([outletId, stock, isListed]) => ({ outletId, stock, ...(isListed === undefined ? {} : { isListed }) })),
    pricingOptions: [{ type: 'FIXED', price: 100000, isDefault: true }]
  };
  const r = await session.postForm('/api/products', body);
  if (!r.ok) throw new Error(`create product failed: ${r.status} ${JSON.stringify(r.body).slice(0, 400)}`);
  return r.body.data.product || r.body.data;
}

async function outlet(session, name = uniqueName('Chi nhanh')) {
  const r = await session.post('/api/outlets', { name, address: 'Ha Noi' });
  if (!r.ok) throw new Error(`create outlet failed: ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return r.body.data;
}

async function listIds(session, query = '') {
  const r = await session.get(`/api/products?limit=200&page=1${query ? `&${query}` : ''}`);
  if (!r.ok) throw new Error(`list failed: ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return r.body.data.products.map((p) => p.id);
}

const tick = (session, outletId, productIds, isListed) => session.put('/api/products/listing', { outletId, productIds, isListed });

describeList('BF-LIST ticks: create, list, tick, roles (#1341)', () => {
  let w;
  let m;
  let b; // second outlet
  let oa; // OUTLET_ADMIN of b
  let kho; // OUTLET_INVENTORY of A
  let staff; // OUTLET_STAFF of A
  beforeAll(async () => {
    w = world('ticks', { outlets: -1 });
    m = await login(w.merchant);
    b = await outlet(m, `CN B ${w.id}`);
    oa = await login(addUser(w, b.id, 'OUTLET_ADMIN'));
    kho = await login(w.kho);
    staff = await login(w.staff);
  });

  test('BF-LIST-01 create at A: A listed, B (a 0 row added by the server) not listed', async () => {
    const p = await product(m, [[w.outletId, 5]]);
    expect(rowsOf(p.id)).toEqual({ [w.outletId]: 't/5/0', [b.id]: 'f/0/0' });
  });

  test('BF-LIST-02 listed=true: A sees it, the manager of B does not, the owner sees it only at A; no listed = everything', async () => {
    const p = await product(m, [[w.outletId, 5]]);
    expect(await listIds(kho, 'listed=true')).toContain(p.id);
    expect(await listIds(staff, 'listed=true')).toContain(p.id);
    expect(await listIds(oa, 'listed=true')).not.toContain(p.id);
    expect(await listIds(m, `listed=true&outletId=${w.outletId}`)).toContain(p.id);
    expect(await listIds(m, `listed=true&outletId=${b.id}`)).not.toContain(p.id);
    // installed apps never send listed: the branch still gets every product, as before
    expect(await listIds(oa)).toContain(p.id);
    // #1601 the owner's app without outletId: the default branch (A), where p is listed
    expect(await listIds(m)).toContain(p.id);
    // false is not the filter
    expect(await listIds(oa, 'listed=false')).toContain(p.id);
  });

  test('BF-LIST-03 a listed product with stock 0 stays in the list; outletStock[] carries isListed', async () => {
    const p = await product(m, [[w.outletId, 0]]);
    expect(await listIds(kho, 'listed=true')).toContain(p.id);
    const r = await kho.get(`/api/products?listed=true&limit=200`);
    const mine = r.body.data.products.find((x) => x.id === p.id);
    expect(mine.outletStock.find((s) => s.outlet.id === w.outletId).isListed).toBe(true);
    const detail = await m.get(`/api/products/${p.id}`);
    expect(detail.body.data.outletStock.map((s) => [s.outlet.id, s.isListed]).sort()).toEqual([[w.outletId, true], [b.id, false]].sort());
  });

  test('BF-LIST-04 the owner ticks B: the manager of B sees it; ticking again changes nothing', async () => {
    const p = await product(m, [[w.outletId, 5]]);
    const r = await tick(m, b.id, [p.id], true);
    expect(r.status).toBe(200);
    expect(r.body.data.changed).toBe(1);
    expect(rowsOf(p.id)[b.id]).toBe('t/0/0');
    expect(await listIds(oa, 'listed=true')).toContain(p.id);
    const again = await tick(m, b.id, [p.id], true);
    expect(again.status).toBe(200);
    expect(again.body.data.changed).toBe(0);
  });

  test('BF-LIST-05 OUTLET_ADMIN, kho and staff cannot tick or untick: 403, even for their own branch', async () => {
    const p = await product(m, [[w.outletId, 5]]);
    for (const [who, outletId] of [[oa, b.id], [kho, w.outletId], [staff, w.outletId]]) {
      const r = await tick(who, outletId, [p.id], false);
      expect([r.status, r.body.code]).toEqual([403, 'INSUFFICIENT_PERMISSIONS']);
    }
    expect(rowsOf(p.id)[w.outletId]).toBe('t/5/0');
  });

  test('BF-LIST-06 another shop\'s branch is 404 OUTLET_NOT_FOUND; a closed branch too', async () => {
    const other = world('other');
    const p = await product(m, [[w.outletId, 1]]);
    const r1 = await tick(m, other.outletId, [p.id], true);
    expect([r1.status, r1.body.code]).toEqual([404, 'OUTLET_NOT_FOUND']);
    const off = await outlet(m);
    expect((await m.put(`/api/outlets?id=${off.id}`, { isActive: false })).status).toBe(200);
    const r2 = await tick(m, off.id, [p.id], true);
    expect([r2.status, r2.body.code]).toEqual([404, 'OUTLET_NOT_FOUND']);
  });

  test('BF-LIST-07 a branch role creating a product lists its own branch (even asking for isListed: false)', async () => {
    const p = await product(oa, [[b.id, 2, false]]);
    expect(rowsOf(p.id)[b.id]).toBe('t/2/0');
    expect(rowsOf(p.id)[w.outletId]).toBe('f/0/0');
  });

  test('BF-LIST-08 the owner may create a product listed at several branches, or at none of the others', async () => {
    const p = await product(m, [[w.outletId, 2, true], [b.id, 1, true]]);
    expect(rowsOf(p.id)).toEqual({ [w.outletId]: 't/2/0', [b.id]: 't/1/0' });
    const q = await product(m, [[w.outletId, 2, true], [b.id, 0, false]]);
    expect(rowsOf(q.id)).toEqual({ [w.outletId]: 't/2/0', [b.id]: 'f/0/0' });
  });

  test('BF-LIST-09 a new branch (#824) gets its rows NOT listed; the existing rows stay', async () => {
    const p = await product(m, [[w.outletId, 3]]);
    const c = await outlet(m, `CN C ${w.id}`);
    expect(rowsOf(p.id)[c.id]).toBe('f/0/0');
    expect(rowsOf(p.id)[w.outletId]).toBe('t/3/0');
  });
});

describeList('BF-LIST unticking is never blocked by stock, rent or orders (only by the last-branch rule, #1603); orders on the book go on (#1341)', () => {
  let w;
  let m;
  let b;
  let oa;
  let cust;
  beforeAll(async () => {
    w = world('untick', { outlets: -1 });
    m = await login(w.merchant);
    b = await outlet(m, `CN B ${w.id}`);
    oa = await login(addUser(w, b.id, 'OUTLET_ADMIN'));
    cust = await m.createCustomer();
  });

  test('BF-LIST-10 untick a product with stock, units on rent and an open order: 200; the order is picked up and returned; stock is untouched', async () => {
    const prod = await m.createProduct({ stock: 4, outletId: w.outletId });
    const win = futureWindow(2);
    const { body } = rentBody({ customer: cust, lines: [{ product: prod, quantity: 1 }], from: win.from, to: win.to, depositAmount: 0 });
    body.outletId = w.outletId;
    mode(m, NEW_APP);
    const made = await m.createOrderRaw(body);
    expect(made.ok).toBe(true);
    const orderId = (made.body.data.order || made.body.data).id;
    expect(orderId).toBeTruthy();

    // #1603 the product stays shown somewhere (B), so unticking A is not refused for the last-branch rule
    expect((await tick(m, b.id, [prod.id], true)).status).toBe(200);
    const r = await tick(m, w.outletId, [prod.id], false);
    expect([r.status, r.body.success]).toEqual([200, true]);
    const row = rowsOf(prod.id)[w.outletId];
    expect(row.startsWith('f/4/')).toBe(true);
    expect(await listIds(m, `listed=true&outletId=${w.outletId}`)).not.toContain(prod.id);

    // the open order still opens, picks up and returns
    expect((await m.get(`/api/orders/${orderId}`)).status).toBe(200);
    expect((await m.setStatus(orderId, 'PICKUPED')).ok).toBe(true);
    expect((await m.setStatus(orderId, 'RETURNED')).ok).toBe(true);
    expect(rowsOf(prod.id)[w.outletId]).toBe('f/4/0');
  });

  test('BF-LIST-11 an app WITHOUT the token lists the product again when it puts it on an order; one WITH the token does not', async () => {
    const prod = await m.createProduct({ stock: 5, outletId: w.outletId });
    expect((await tick(m, b.id, [prod.id], true)).status).toBe(200); // #1603 shown at B, so A can be unticked
    expect((await tick(m, w.outletId, [prod.id], false)).status).toBe(200);
    expect(rowsOf(prod.id)[w.outletId].startsWith('f/')).toBe(true);
    const win = futureWindow(3);
    const make = () => {
      const { body } = rentBody({ customer: cust, lines: [{ product: prod, quantity: 1 }], from: win.from, to: win.to, depositAmount: 0 });
      body.outletId = w.outletId;
      return body;
    };

    mode(m, NEW_APP);
    expect((await m.createOrderRaw(make())).ok).toBe(true);
    expect(rowsOf(prod.id)[w.outletId].startsWith('f/')).toBe(true); // the draft cart of a new app does not undo the untick

    mode(m, OLD_APP);
    const win2 = futureWindow(5);
    const { body } = rentBody({ customer: cust, lines: [{ product: prod, quantity: 1 }], from: win2.from, to: win2.to, depositAmount: 0 });
    body.outletId = w.outletId;
    expect((await m.createOrderRaw(body)).ok).toBe(true);
    expect(rowsOf(prod.id)[w.outletId].startsWith('t/')).toBe(true);
    mode(m, NEW_APP);
  });

  test('BF-LIST-12 an old app raising the stock of an unlisted branch lists it; the same stock sent back does not', async () => {
    const prod = await product(m, [[w.outletId, 1]]);
    // B holds the product unlisted with 0
    mode(oa, OLD_APP);
    const same = await oa.updateProduct(prod.id, { outletStock: [{ outletId: b.id, stock: 0 }] });
    expect(same.ok).toBe(true);
    expect(rowsOf(prod.id)[b.id]).toBe('f/0/0');
    const up = await oa.updateProduct(prod.id, { outletStock: [{ outletId: b.id, stock: 3 }] });
    expect(up.ok).toBe(true);
    expect(rowsOf(prod.id)[b.id]).toBe('t/3/0');
    // untick, then read-then-save with the same stock: stays unticked
    expect((await tick(m, b.id, [prod.id], false)).status).toBe(200);
    expect((await oa.updateProduct(prod.id, { outletStock: [{ outletId: b.id, stock: 3 }] })).ok).toBe(true);
    expect(rowsOf(prod.id)[b.id]).toBe('f/3/0');
    // a new app (token) raising the stock does not list
    mode(oa, NEW_APP);
    expect((await oa.updateProduct(prod.id, { outletStock: [{ outletId: b.id, stock: 6 }] })).ok).toBe(true);
    expect(rowsOf(prod.id)[b.id]).toBe('f/6/0');
  });
});

describeList('BF-LIST the owner on the app sees only what the branch in use lists (#1601)', () => {
  let w;
  let m;
  let b;
  beforeAll(async () => {
    w = world('owner-app', { outlets: -1 });
    m = await login(w.merchant); // the iOS / Android app (x-client-platform: mobile), no listed
    b = await outlet(m, `CN B ${w.id}`);
  });

  test('BF-LIST-15 outletId of the app (else the default branch) filters; listed=false and the web see everything', async () => {
    const atA = await product(m, [[w.outletId, 3]]);
    const atB = await product(m, [[b.id, 0], [w.outletId, 0, false]]);
    expect(rowsOf(atB.id)).toEqual({ [w.outletId]: 'f/0/0', [b.id]: 't/0/0' });

    // the branch the app sends
    const atAIds = await listIds(m, `outletId=${w.outletId}`);
    expect(atAIds).toContain(atA.id);
    expect(atAIds).not.toContain(atB.id);
    const atBIds = await listIds(m, `outletId=${b.id}`);
    expect(atBIds).toContain(atB.id); // listed with stock 0 stays in
    expect(atBIds).not.toContain(atA.id);

    // no outletId: the shop default branch (A)
    const noBranch = await listIds(m);
    expect(noBranch).toContain(atA.id);
    expect(noBranch).not.toContain(atB.id);

    // listed=false sent on purpose: everything
    expect(await listIds(m, `listed=false&outletId=${b.id}`)).toEqual(expect.arrayContaining([atA.id, atB.id]));

    // the web is unchanged: no branch = everything, a branch without listed = everything
    const appHeaders = m.headers;
    m.asPlatform({ ...appHeaders, ...S.WEB_HEADERS }); // same session (logins are single-session), now the web
    expect(await listIds(m)).toEqual(expect.arrayContaining([atA.id, atB.id]));
    expect(await listIds(m, `outletId=${b.id}`)).toEqual(expect.arrayContaining([atA.id, atB.id]));
    m.asPlatform(appHeaders);

    // the product still opens by id (orders, edit) at a branch that hides it
    expect((await m.get(`/api/products/${atB.id}?outletId=${w.outletId}`)).status).toBe(200);

    // shown again (tick at A): back in A's list
    expect((await tick(m, w.outletId, [atB.id], true)).status).toBe(200);
    expect(await listIds(m, `outletId=${w.outletId}`)).toContain(atB.id);
  });
});

describeList('BF-LIST every product is shown at one open branch at least (#1603)', () => {
  let w;
  let m;
  let b;
  let c; // closed later
  beforeAll(async () => {
    w = world('one-branch', { outlets: -1 });
    m = await login(w.merchant);
    b = await outlet(m, `CN B ${w.id}`);
    c = await outlet(m, `CN C ${w.id}`);
  });
  const code = (r) => ({ status: r.status, code: r.body && r.body.code });

  test('BF-LIST-16 the last open branch cannot be unticked; ticking first then unticking moves it; bulk is all or nothing', async () => {
    const p = await product(m, [[w.outletId, 2]]);
    expect(rowsOf(p.id)).toEqual({ [w.outletId]: 't/2/0', [b.id]: 'f/0/0', [c.id]: 'f/0/0' });

    // the only branch: refused, nothing written
    const r = await tick(m, w.outletId, [p.id], false);
    expect(code(r)).toEqual({ status: 400, code: 'PRODUCT_NEEDS_ONE_BRANCH' });
    expect(r.body.data).toEqual(expect.objectContaining({ productIds: [p.id] }));
    expect(rowsOf(p.id)[w.outletId]).toBe('t/2/0');

    // an installed app moving A -> B sends the untick first: refused; tick B first, then untick A: both fine
    expect(code(await tick(m, w.outletId, [p.id], false)).status).toBe(400);
    expect((await tick(m, b.id, [p.id], true)).status).toBe(200);
    expect((await tick(m, w.outletId, [p.id], false)).status).toBe(200);
    expect(rowsOf(p.id)).toEqual({ [w.outletId]: 'f/2/0', [b.id]: 't/0/0', [c.id]: 'f/0/0' });

    // bulk: one product would be left without a branch -> the whole call is refused
    const both = await product(m, [[w.outletId, 1], [b.id, 1]]);
    const onlyB = await product(m, [[b.id, 1], [w.outletId, 0, false]]);
    const bulk = await tick(m, b.id, [both.id, onlyB.id], false);
    expect(code(bulk)).toEqual({ status: 400, code: 'PRODUCT_NEEDS_ONE_BRANCH' });
    expect(bulk.body.data.productIds).toEqual([onlyB.id]);
    expect(rowsOf(both.id)[b.id]).toBe('t/1/0');
    expect(rowsOf(onlyB.id)[b.id]).toBe('t/1/0');

    // a listed row at a closed branch does not count
    const atC = await product(m, [[w.outletId, 1], [c.id, 1]]);
    S.sql(`UPDATE "Outlet" SET "isActive" = false WHERE id = ${c.id}`);
    try {
      expect(code(await tick(m, w.outletId, [atC.id], false))).toEqual({ status: 400, code: 'PRODUCT_NEEDS_ONE_BRANCH' });
    } finally {
      S.sql(`UPDATE "Outlet" SET "isActive" = true WHERE id = ${c.id}`);
    }
    // ticking is never refused
    expect((await tick(m, c.id, [p.id], true)).status).toBe(200);
  });

  test('BF-LIST-17 creating a product listed at no open branch is refused and creates nothing', async () => {
    const name = uniqueName('SP no branch');
    const body = {
      name,
      rentPrice: 100000,
      deposit: 0,
      totalStock: 1,
      outletStock: [{ outletId: w.outletId, stock: 1, isListed: false }, { outletId: b.id, stock: 0, isListed: false }],
      pricingOptions: [{ type: 'FIXED', price: 100000, isDefault: true }],
    };
    const r = await m.postForm('/api/products', body);
    expect(code(r)).toEqual({ status: 400, code: 'PRODUCT_NEEDS_ONE_BRANCH' });
    expect(Number(S.sql(`SELECT count(*) FROM "Product" WHERE name = '${name.replace(/'/g, "''")}'`))).toBe(0);
    // one ticked branch is enough
    const ok = await product(m, [[w.outletId, 1, false], [b.id, 0, true]]);
    expect(rowsOf(ok.id)[b.id]).toBe('t/0/0');
  });

  test('BF-LIST-18 the migration lists a product listed nowhere at the default open branch; others, deleted ones and a second run untouched', async () => {
    const nowhere = await product(m, [[w.outletId, 3]]);
    const onlyClosed = await product(m, [[w.outletId, 1]]);
    const atB = await product(m, [[b.id, 1], [w.outletId, 0, false]]);
    const gone = await product(m, [[w.outletId, 0]]);
    expect((await m.delete(`/api/products/${gone.id}`)).status).toBe(200);
    S.sql(`UPDATE "OutletStock" SET "isListed" = false WHERE "productId" IN (${nowhere.id}, ${gone.id})`);
    S.sql(`UPDATE "OutletStock" SET "isListed" = ("outletId" = ${c.id}) WHERE "productId" = ${onlyClosed.id}`);
    // no row at all at the default branch for `nowhere`: the migration inserts it
    S.sql(`DELETE FROM "OutletStock" WHERE "productId" = ${nowhere.id} AND "outletId" = ${w.outletId}`);

    const migration = fs.readFileSync(ONE_BRANCH_MIGRATION, 'utf8');
    const show = (id) =>
      `(SELECT coalesce(string_agg("outletId" || '=' || "isListed", ',' ORDER BY "outletId"), '') FROM "OutletStock" WHERE "productId" = ${id})`;
    const ids = [nowhere.id, onlyClosed.id, atB.id, gone.id];
    const script = `BEGIN;
UPDATE "Outlet" SET "isActive" = false WHERE id = ${c.id};
${migration}
CREATE TEMP TABLE bf_one AS SELECT ${ids.map((id, i) => `${show(id)} AS p${i}`).join(', ')};
${migration}
SELECT ${ids.map((id) => show(id)).join(" || ' | ' || ")} || ' | ' || (SELECT ${ids.map((_, i) => `p${i}`).join(" || ' | ' || ")} FROM bf_one);
ROLLBACK;`;
    S.assertLocalDb();
    const out = execFileSync('psql', [process.env.E2E_DATABASE_URL, '-X', '-q', '-tA', '-v', 'ON_ERROR_STOP=1', '-f', '-'], { input: script, encoding: 'utf8' }).trim();
    const parts = out.split(' | ');
    const [nowhereRows, closedRows, atBRows, goneRows] = parts;
    const f = (...pairs) => pairs.sort((x, y) => x[0] - y[0]).map(([k, v]) => `${k}=${v}`).join(',');
    // listed nowhere: the default branch (A) row is inserted, listed
    expect(nowhereRows).toBe(f([w.outletId, 'true'], [b.id, 'false'], [c.id, 'false']));
    // listed only at the closed branch C: A is listed too
    expect(closedRows).toBe(f([w.outletId, 'true'], [b.id, 'false'], [c.id, 'true']));
    // listed at B (open): untouched
    expect(atBRows).toBe(f([w.outletId, 'false'], [b.id, 'true'], [c.id, 'false']));
    // deleted: untouched
    expect(goneRows).toBe(f([w.outletId, 'false'], [b.id, 'false'], [c.id, 'false']));
    // the second run changes nothing
    expect(parts.slice(0, 4)).toEqual(parts.slice(4));
    // rolled back
    expect(rowsOf(nowhere.id)[w.outletId]).toBeUndefined();
  });
});

describeList('BF-LIST a shop with one active branch ignores listed (#1341)', () => {
  let w;
  let m;
  beforeAll(async () => {
    w = world('single');
    m = await login(w.merchant);
  });

  test('BF-LIST-13 the only branch still gets every product, listed or not', async () => {
    const p = await product(m, [[w.outletId, 2]]);
    S.sql(`UPDATE "OutletStock" SET "isListed" = false WHERE "productId" = ${p.id}`);
    expect(await listIds(m, `listed=true&outletId=${w.outletId}`)).toContain(p.id);
    // #1601 the owner's app without listed: one branch, nothing hidden
    expect(await listIds(m, `outletId=${w.outletId}`)).toContain(p.id);
    expect(await listIds(m)).toContain(p.id);
    const staff = await login(w.staff);
    expect(await listIds(staff, 'listed=true')).toContain(p.id);
  });
});

describeList('BF-LIST backfill of the migration (#1341)', () => {
  let w;
  let m;
  let b;
  let c;
  beforeAll(async () => {
    w = world('backfill', { outlets: -1 });
    m = await login(w.merchant);
    b = await outlet(m, `CN B ${w.id}`);
    c = await outlet(m, `CN C ${w.id}`);
  });

  test('BF-LIST-14 stock 0 and no order history is unlisted; stock, units on rent or order history stays listed; one row stays per product; deleted products and a second run untouched', async () => {
    const cust = await m.createCustomer();
    const empty = await product(m, [[w.outletId, 0]]); // A 0, B 0, C 0: no row left listed after step 1
    const held = await product(m, [[w.outletId, 4]]);
    const ordered = await product(m, [[w.outletId, 4]]);
    const win = futureWindow(2);
    const { body } = rentBody({ customer: cust, lines: [{ product: ordered, quantity: 1 }], from: win.from, to: win.to, depositAmount: 0 });
    body.outletId = b.id; // an order of B for `ordered`: B has history
    expect((await m.createOrderRaw(body)).ok).toBe(true);
    const gone = await product(m, [[w.outletId, 0]]);
    expect((await m.delete(`/api/products/${gone.id}`)).status).toBe(200);
    S.sql(`UPDATE "OutletStock" SET "stock" = 0, "available" = 0, "renting" = 0 WHERE "productId" = ${ordered.id} AND "outletId" IN (${w.outletId}, ${b.id}, ${c.id})`);
    // as the rows were before the migration: every row listed
    S.sql(`UPDATE "OutletStock" SET "isListed" = true WHERE "productId" IN (${[empty.id, held.id, ordered.id, gone.id].join(',')})`);
    // C of `held` holds units on rent
    S.sql(`UPDATE "OutletStock" SET "renting" = 1 WHERE "productId" = ${held.id} AND "outletId" = ${c.id}`);

    const migration = fs.readFileSync(MIGRATION, 'utf8');
    const show = (id) =>
      `(SELECT coalesce(string_agg("outletId" || '=' || "isListed", ',' ORDER BY "outletId"), '') FROM "OutletStock" WHERE "productId" = ${id})`;
    const ids = [empty.id, held.id, ordered.id, gone.id];
    const script = `BEGIN;
${migration}
CREATE TEMP TABLE bf_first AS SELECT ${ids.map((id, i) => `${show(id)} AS p${i}`).join(', ')};
${migration}
SELECT ${ids.map((id) => show(id)).join(" || ' | ' || ")} || ' | ' || (SELECT ${ids.map((_, i) => `p${i}`).join(" || ' | ' || ")} FROM bf_first);
ROLLBACK;`;
    S.assertLocalDb();
    const out = execFileSync('psql', [process.env.E2E_DATABASE_URL, '-X', '-q', '-tA', '-v', 'ON_ERROR_STOP=1', '-f', '-'], { input: script, encoding: 'utf8' }).trim();
    const parts = out.split(' | ');
    const [emptyRows, heldRows, orderedRows, goneRows] = parts;
    const first = parts.slice(4);
    const f = (o, ...pairs) => pairs.map(([k, v]) => `${k}=${v}`).join(',');
    // empty: every row 0 / 0 without history -> step 1 unlists all, step 2 lists the row with the smallest id again.
    // Which branch that is depends on the order the rows were inserted: POST /api/products with several active branches
    // writes them in REVERSE (the smallest id is the last branch, not the creating one), so read it from the table.
    const firstRowOutlet = Number(S.sql(`SELECT "outletId" FROM "OutletStock" WHERE "productId" = ${empty.id} ORDER BY id LIMIT 1`));
    expect(emptyRows).toBe([w.outletId, b.id, c.id].map((id) => `${id}=${id === firstRowOutlet ? 'true' : 'false'}`).join(','));
    // held: A has stock, C has units on rent -> both stay; B (0 / 0, no order) is unlisted
    expect(heldRows).toBe(f(null, [w.outletId, 'true'], [b.id, 'false'], [c.id, 'true']));
    // ordered: B has history (an order line of the product) -> stays; A and C are unlisted
    expect(orderedRows).toBe(f(null, [w.outletId, 'false'], [b.id, 'true'], [c.id, 'false']));
    // a deleted product is not touched: every row stays listed
    expect(goneRows).toBe(f(null, [w.outletId, 'true'], [b.id, 'true'], [c.id, 'true']));
    // the second run changes nothing
    expect([emptyRows, heldRows, orderedRows, goneRows]).toEqual(first);
    // rolled back: the rows are as before
    expect(rowsOf(empty.id)[b.id]).toBe('t/0/0');
  });
});
