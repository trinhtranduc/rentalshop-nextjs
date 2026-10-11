/**
 * BF-ADD — add-on prices managed by the admin (#850, owner decisions 2026-10-11, last comment of #850).
 *
 * - Plans → Add-on prices: each row = one limit kind + pack size + VND price per pack per month. ADMIN edits.
 * - Merchants → shop → Add-on: pick a row + number of packs; the price comes from the list, never typed.
 *   Charged now = price × packs × days left ÷ days of the period (Vietnam days, whole VND). The limit rises at once.
 * - Price edits apply to new purchases and later renewals; a bought item keeps its price for the paid period.
 * - "Tạm tắt" = no new sales; items already bought keep running until the end of the period, then are not renewed.
 * - Removal takes effect at the end of the period; renewal total = plan + add-ons still renewed.
 * - Outlets rows only for a multi-branch plan (#826).
 * Expected numbers are computed here, independently of the code under test.
 * Every describe makes its own merchant and plan (helpers/subscription.js). Catalog rows get unique names.
 * Run: scripts/e2e/business-e2e.sh -- addon-prices   (needs E2E_API_URL + a local E2E_DATABASE_URL).
 */
const { describeE2E, uniqueName } = require('../helpers/api');
const S = require('../helpers/subscription');

const describeAdd = S.hasDb ? describeE2E : describe.skip;

const VN_MS = 7 * 3600 * 1000;
const DAY_MS = 86400000;
const vnKey = (d) => new Date(new Date(d).getTime() + VN_MS).toISOString().slice(0, 10);
const vnDaysBetween = (a, b) => Math.round((Date.parse(`${vnKey(b)}T00:00:00Z`) - Date.parse(`${vnKey(a)}T00:00:00Z`)) / DAY_MS);
const iso = (d) => new Date(d).toISOString();
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const brief = (r) => ({ status: r.status, code: r.body?.code });
const created = (r) => r.status === 200 || r.status === 201;

const PLAN_PRICE = 399000;

let adminSession;
async function admin() {
  if (!adminSession) adminSession = await S.login({ email: 'admin@rentalshop.com', password: 'admin123' }, S.WEB_HEADERS);
  return adminSession;
}

function pricedPlan(label, limits = {}) {
  const id = S.createPlan(label, { outlets: 1, users: 3, products: -1, customers: -1, orders: -1, ...limits });
  S.sql(`UPDATE "Plan" SET "basePrice" = ${PLAN_PRICE}, currency = 'VND', "trialDays" = 0 WHERE id = ${id} AND name LIKE 'E2E %'`);
  return id;
}

/** 9 days used, 21 left of a 30-day monthly period around now (Vietnam days counted by the test, not assumed). */
function setPeriod(merchantId, { start = new Date(Date.now() - 9 * DAY_MS), end = new Date(Date.now() + 21 * DAY_MS), status = 'ACTIVE' } = {}) {
  S.sql(
    `UPDATE "Subscription" SET "currentPeriodStart" = ${q(iso(start))}::timestamp, "currentPeriodEnd" = ${q(iso(end))}::timestamp,
       interval = 'month', "intervalCount" = 1, period = 1, amount = ${PLAN_PRICE}, currency = 'VND', status = ${q(status)},
       "updatedAt" = (now() at time zone 'utc') WHERE "merchantId" = ${merchantId}`
  );
  return { start, end };
}

const subscriptionId = (merchantId) => Number(S.sql(`SELECT id FROM "Subscription" WHERE "merchantId" = ${merchantId}`));
const lastPayment = (merchantId) => {
  const [amount, type, description] = S.sql(`SELECT amount || '|' || type || '|' || coalesce(description, '') FROM "Payment" WHERE "merchantId" = ${merchantId} ORDER BY id DESC LIMIT 1`).split('|');
  return { amount: Number(amount), type, description };
};
const paymentCount = (merchantId) => Number(S.sql(`SELECT count(*) FROM "Payment" WHERE "merchantId" = ${merchantId}`));

let userSeq = 0;
const userBody = (world) => ({
  email: `add${(userSeq += 1)}.${world.id}.${Date.now()}@e2e.test`,
  password: 'secret123', firstName: 'Nv', lastName: 'E2E', role: 'OUTLET_STAFF', outletId: world.outletId
});

async function createRow(body) {
  const a = await admin();
  const r = await a.post('/api/addon-prices', { ...body, name: uniqueName(body.name) });
  expect(brief(r)).toMatchObject({ status: 201 });
  return r.body.data.addonPrice || r.body.data;
}

async function buy(merchantId, addonPriceId, packs, extra = {}) {
  const a = await admin();
  return a.post(`/api/merchants/${merchantId}/addons`, { addonPriceId, packs, method: 'TRANSFER', transactionId: `E2E-${Date.now()}`, ...extra });
}

async function shop(merchantId) {
  const a = await admin();
  const r = await a.get(`/api/merchants/${merchantId}/addons`);
  expect(r.status).toBe(200);
  return r.body.data;
}

// ============================================================================================================
// A. Price list (BF-ADD-01 .. 03)
// ============================================================================================================

describeAdd('BF-ADD price list: one kind + pack size + VND price per pack', () => {
  test('BF-ADD-01 the admin creates two users rows (+1 at 30,000, +2 at 40,000) and lists them with shops using', async () => {
    const one = await createRow({ name: 'Thêm nhân viên', limitKind: 'users', packSize: 1, monthlyPrice: 30000 });
    const two = await createRow({ name: 'Gói 2 nhân viên', limitKind: 'users', packSize: 2, monthlyPrice: 40000 });
    expect(one).toMatchObject({ limitKind: 'users', packSize: 1, monthlyPrice: 30000, currency: 'VND', isActive: true });
    expect(two).toMatchObject({ limitKind: 'users', packSize: 2, monthlyPrice: 40000 });
    const list = await (await admin()).get('/api/addon-prices');
    expect(list.status).toBe(200);
    const rows = list.body.data.addonPrices;
    const mine = rows.filter((r) => [one.id, two.id].includes(r.id));
    expect(mine).toHaveLength(2);
    for (const r of mine) expect(r.shopsUsing).toBe(0);
  });

  test('BF-ADD-02 a merchant cannot read or change the price list (403); bad input is 400', async () => {
    const row = await createRow({ name: 'Thêm sản phẩm', limitKind: 'products', packSize: 100, monthlyPrice: 20000 });
    const world = S.createWorld('add-cat', { planId: pricedPlan('add-cat') });
    const m = await S.login(world.merchant, S.WEB_HEADERS);
    expect(brief(await m.get('/api/addon-prices')).status).toBe(403);
    expect(brief(await m.post('/api/addon-prices', { name: 'x', limitKind: 'users', packSize: 1, monthlyPrice: 1 })).status).toBe(403);
    expect(brief(await m.put(`/api/addon-prices/${row.id}`, { monthlyPrice: 1 })).status).toBe(403);
    expect(brief(await m.post(`/api/merchants/${world.merchantId}/addons`, { addonPriceId: row.id, packs: 1 })).status).toBe(403);
    const a = await admin();
    expect((await a.post('/api/addon-prices', { name: uniqueName('x'), limitKind: 'loyalty', packSize: 1, monthlyPrice: 1 })).status).toBe(400);
    expect((await a.post('/api/addon-prices', { name: uniqueName('x'), limitKind: 'users', packSize: 0, monthlyPrice: 1 })).status).toBe(400);
    expect((await a.post('/api/addon-prices', { name: uniqueName('x'), limitKind: 'users', packSize: 1, monthlyPrice: -1 })).status).toBe(400);
  });

  test('BF-ADD-03 the admin pauses a row and changes its price; pack size cannot change once a shop uses it', async () => {
    const row = await createRow({ name: 'Thêm nhân viên', limitKind: 'users', packSize: 1, monthlyPrice: 30000 });
    const a = await admin();
    const r = await a.put(`/api/addon-prices/${row.id}`, { monthlyPrice: 35000, packSize: 3 });
    expect(r.status).toBe(200);
    expect(r.body.data.addonPrice || r.body.data).toMatchObject({ monthlyPrice: 35000, packSize: 3 });

    const world = S.createWorld('add-pack', { planId: pricedPlan('add-pack') });
    setPeriod(world.merchantId);
    expect(created(await buy(world.merchantId, row.id, 1))).toBe(true);
    expect(brief(await a.put(`/api/addon-prices/${row.id}`, { packSize: 1 }))).toEqual({ status: 422, code: 'ADDON_PRICE_IN_USE' });
    const off = await a.put(`/api/addon-prices/${row.id}`, { isActive: false });
    expect(off.status).toBe(200);
    expect((off.body.data.addonPrice || off.body.data).isActive).toBe(false);
  });
});

// ============================================================================================================
// B. Buying mid-period, limits (BF-ADD-04 .. 07)
// ============================================================================================================

describeAdd('BF-ADD buy mid-period: price × packs × days left ÷ days, the limit rises', () => {
  let world;
  let twoUsers;
  let m;

  beforeAll(async () => {
    twoUsers = await createRow({ name: 'Gói 2 nhân viên', limitKind: 'users', packSize: 2, monthlyPrice: 40000 });
    world = S.createWorld('add-buy', { planId: pricedPlan('add-buy', { users: 3 }) }); // merchant + staff + kho = 3 of 3
    m = await S.login(world.merchant, S.WEB_HEADERS);
  });

  test('BF-ADD-04 the quote counts Vietnam days and rounds to whole VND', async () => {
    const { start, end } = setPeriod(world.merchantId);
    const before = new Date();
    const r = await (await admin()).get(`/api/merchants/${world.merchantId}/addons/quote?addonPriceId=${twoUsers.id}&packs=2`);
    expect(r.status).toBe(200);
    const periodDays = vnDaysBetween(start, end);
    const remainingDays = vnDaysBetween(before, end);
    expect(r.body.data).toMatchObject({ periodDays, remainingDays, monthlyAmount: 80000, currency: 'VND' });
    expect(r.body.data.amountDue).toBe(Math.round((80000 * remainingDays) / periodDays));
  });

  test('BF-ADD-05 at 3 of 3 users a 4th is refused; buying 1 pack of +2 users charges the quote and allows 2 more', async () => {
    const { start, end } = setPeriod(world.merchantId);
    expect(brief(await m.post('/api/users', userBody(world)))).toEqual({ status: 422, code: 'PLAN_LIMIT_EXCEEDED' });

    const before = new Date();
    const payments = paymentCount(world.merchantId);
    const r = await buy(world.merchantId, twoUsers.id, 1);
    expect(created(r)).toBe(true);
    const expected = Math.round((40000 * vnDaysBetween(before, end)) / vnDaysBetween(start, end));
    expect(r.body.data.quote.amountDue).toBe(expected);
    expect(r.body.data.addon).toMatchObject({ limitKind: 'users', packSize: 2, packs: 1, unitPrice: 40000, users: 2 });
    expect(paymentCount(world.merchantId)).toBe(payments + 1);
    expect(lastPayment(world.merchantId)).toMatchObject({ amount: expected, type: 'PLAN_CHANGE' });

    expect(created(await m.post('/api/users', userBody(world)))).toBe(true);
    expect(created(await m.post('/api/users', userBody(world)))).toBe(true);
    expect(brief(await m.post('/api/users', userBody(world)))).toEqual({ status: 422, code: 'PLAN_LIMIT_EXCEEDED' });

    const data = await shop(world.merchantId);
    expect(data.limits.plan.users).toBe(3);
    expect(data.limits.addons.users).toBe(2);
    expect(data.limits.total.users).toBe(5);
  });

  test('BF-ADD-06 a price in the request is ignored: the list price is used', async () => {
    setPeriod(world.merchantId);
    const r = await buy(world.merchantId, twoUsers.id, 1, { unitPrice: 1, monthlyPrice: 1 });
    expect(created(r)).toBe(true);
    expect(r.body.data.addon.unitPrice).toBe(40000);
  });

  test('BF-ADD-07 a trial shop pays nothing now and no payment is written', async () => {
    const trial = S.createWorld('add-trial', { planId: pricedPlan('add-trial') });
    setPeriod(trial.merchantId, { status: 'TRIAL' });
    const payments = paymentCount(trial.merchantId);
    const r = await buy(trial.merchantId, twoUsers.id, 1);
    expect(created(r)).toBe(true);
    expect(r.body.data.quote).toMatchObject({ amountDue: 0, reason: 'trial' });
    expect(paymentCount(trial.merchantId)).toBe(payments);
  });
});

// ============================================================================================================
// C. Branch rows, paused rows (BF-ADD-08 .. 09)
// ============================================================================================================

describeAdd('BF-ADD branch rows and paused rows', () => {
  test('BF-ADD-08 an outlets row is refused on a single-branch plan and raises the outlets limit on a multi-branch plan', async () => {
    const branch = await createRow({ name: 'Thêm chi nhánh', limitKind: 'outlets', packSize: 1, monthlyPrice: 150000 });
    const single = S.createWorld('add-br1', { planId: pricedPlan('add-br1', { outlets: 1 }) });
    setPeriod(single.merchantId);
    expect(brief(await buy(single.merchantId, branch.id, 1))).toEqual({ status: 422, code: 'ADDON_OUTLETS_NEED_MULTI_BRANCH_PLAN' });

    const multi = S.createWorld('add-br3', { planId: pricedPlan('add-br3', { outlets: 3 }) });
    setPeriod(multi.merchantId);
    expect(created(await buy(multi.merchantId, branch.id, 1))).toBe(true);
    const data = await shop(multi.merchantId);
    expect(data.limits.total.outlets).toBe(4);
  });

  test('BF-ADD-09 a paused row is not sold (422) while a shop that bought it keeps it', async () => {
    const row = await createRow({ name: 'Thêm khách', limitKind: 'customers', packSize: 50, monthlyPrice: 10000 });
    const world = S.createWorld('add-pause', { planId: pricedPlan('add-pause', { customers: 3 }) });
    setPeriod(world.merchantId);
    expect(created(await buy(world.merchantId, row.id, 1))).toBe(true);
    const a = await admin();
    expect((await a.put(`/api/addon-prices/${row.id}`, { isActive: false })).status).toBe(200);
    const other = S.createWorld('add-pause2', { planId: pricedPlan('add-pause2') });
    setPeriod(other.merchantId);
    expect(brief(await buy(other.merchantId, row.id, 1))).toEqual({ status: 422, code: 'ADDON_PRICE_NOT_ON_SALE' });
    const data = await shop(world.merchantId);
    expect(data.limits.total.customers).toBe(53);
  });
});

// ============================================================================================================
// D. Price edit, removal, renewal (BF-ADD-10 .. 13)
// ============================================================================================================

describeAdd('BF-ADD price edits, removal at period end, renewal total', () => {
  test('BF-ADD-10 a price edit keeps the bought item at its price; a new purchase takes the new price', async () => {
    const row = await createRow({ name: 'Thêm nhân viên', limitKind: 'users', packSize: 1, monthlyPrice: 30000 });
    const world = S.createWorld('add-edit', { planId: pricedPlan('add-edit', { users: 5 }) });
    setPeriod(world.merchantId);
    const first = await buy(world.merchantId, row.id, 1);
    expect(first.body.data.addon.unitPrice).toBe(30000);
    expect((await (await admin()).put(`/api/addon-prices/${row.id}`, { monthlyPrice: 35000 })).status).toBe(200);
    const second = await buy(world.merchantId, row.id, 1);
    expect(second.body.data.addon.unitPrice).toBe(35000);
    const data = await shop(world.merchantId);
    const prices = data.addons.map((x) => x.unitPrice).sort();
    expect(prices).toEqual([30000, 35000]);
  });

  test('BF-ADD-11 removal counts until the period ends, undo works in the period, then the limit drops', async () => {
    const row = await createRow({ name: 'Gói 2 nhân viên', limitKind: 'users', packSize: 2, monthlyPrice: 40000 });
    const world = S.createWorld('add-rm', { planId: pricedPlan('add-rm', { users: 3 }) });
    const { end } = setPeriod(world.merchantId);
    const bought = await buy(world.merchantId, row.id, 1);
    const addonId = bought.body.data.addon.id;
    const a = await admin();

    const mark = await a.patch(`/api/merchants/${world.merchantId}/addons/${addonId}`, { removeAtPeriodEnd: true });
    expect(mark.status).toBe(200);
    expect(new Date(mark.body.data.addon.endsAt).getTime()).toBe(new Date(end).getTime());
    expect((await shop(world.merchantId)).limits.total.users).toBe(5);

    expect((await a.patch(`/api/merchants/${world.merchantId}/addons/${addonId}`, { removeAtPeriodEnd: false })).status).toBe(200);
    expect((await a.patch(`/api/merchants/${world.merchantId}/addons/${addonId}`, { removeAtPeriodEnd: true })).status).toBe(200);

    // The period ends: move the end and the item's end to an hour ago
    S.sql(`UPDATE "PlanLimitAddon" SET "endsAt" = (now() at time zone 'utc') - interval '1 hour' WHERE id = ${addonId}`);
    setPeriod(world.merchantId, { end: new Date(Date.now() - 3600 * 1000), start: new Date(Date.now() - 31 * DAY_MS) });
    const data = await shop(world.merchantId);
    expect(data.limits.total.users).toBe(3);
    expect(data.addons.find((x) => x.id === addonId)).toBeUndefined();
    expect(brief(await a.patch(`/api/merchants/${world.merchantId}/addons/${addonId}`, { removeAtPeriodEnd: false })).code).toMatch(/ADDON_ALREADY_ENDED|PLAN_LIMIT_ADDON_NOT_FOUND/);
  });

  test('BF-ADD-12 removal is refused when usage would exceed the limit without the item', async () => {
    const row = await createRow({ name: 'Thêm nhân viên', limitKind: 'users', packSize: 1, monthlyPrice: 30000 });
    const world = S.createWorld('add-rmx', { planId: pricedPlan('add-rmx', { users: 3 }) });
    setPeriod(world.merchantId);
    const addonId = (await buy(world.merchantId, row.id, 1)).body.data.addon.id;
    const m = await S.login(world.merchant, S.WEB_HEADERS);
    expect(created(await m.post('/api/users', userBody(world)))).toBe(true); // 4 of 4
    const r = await (await admin()).patch(`/api/merchants/${world.merchantId}/addons/${addonId}`, { removeAtPeriodEnd: true });
    expect(brief(r)).toEqual({ status: 422, code: 'CANNOT_DELETE_ADDON_LIMIT_EXCEEDED' });
  });

  test('BF-ADD-13 renewal = plan + add-ons at today\'s list price; marked and paused items are not renewed', async () => {
    const users = await createRow({ name: 'Thêm nhân viên', limitKind: 'users', packSize: 1, monthlyPrice: 30000 });
    const prods = await createRow({ name: 'Thêm sản phẩm', limitKind: 'products', packSize: 100, monthlyPrice: 20000 });
    const custs = await createRow({ name: 'Thêm khách', limitKind: 'customers', packSize: 50, monthlyPrice: 10000 });
    const world = S.createWorld('add-renew', { planId: pricedPlan('add-renew', { users: 5, products: 10, customers: 10 }) });
    setPeriod(world.merchantId);
    const a = await admin();
    const u = (await buy(world.merchantId, users.id, 2)).body.data.addon; // 2 × 30,000 → renewed at 32,000
    const p = (await buy(world.merchantId, prods.id, 1)).body.data.addon; // marked for removal
    const c = (await buy(world.merchantId, custs.id, 1)).body.data.addon; // row paused
    expect((await a.patch(`/api/merchants/${world.merchantId}/addons/${p.id}`, { removeAtPeriodEnd: true })).status).toBe(200);
    expect((await a.put(`/api/addon-prices/${users.id}`, { monthlyPrice: 32000 })).status).toBe(200);
    expect((await a.put(`/api/addon-prices/${custs.id}`, { isActive: false })).status).toBe(200);

    const preview = await shop(world.merchantId);
    expect(preview.renewal.monthly).toMatchObject({ planPrice: PLAN_PRICE, addonPrice: 64000, totalDue: PLAN_PRICE + 64000 });

    const r = await a.post(`/api/subscriptions/${subscriptionId(world.merchantId)}/renew`, { method: 'TRANSFER', duration: 1, transactionId: `E2E-R-${Date.now()}` });
    expect(r.status).toBe(200);
    expect(r.body.data.renewal).toMatchObject({ planPrice: PLAN_PRICE, addonPrice: 64000, totalDue: PLAN_PRICE + 64000 });
    expect(r.body.data.subscription.amount).toBe(PLAN_PRICE);
    expect(lastPayment(world.merchantId).amount).toBe(PLAN_PRICE + 64000);
    const ids = (r.body.data.addons || []).map((x) => x.id);
    expect(ids).toEqual([u.id]);
    expect(Number(S.sql(`SELECT "unitPrice" FROM "PlanLimitAddon" WHERE id = ${u.id}`))).toBe(32000);
    // the marked and the paused item end at the old period end and still count until then
    const ends = S.sql(`SELECT count(*) FROM "PlanLimitAddon" WHERE id IN (${p.id}, ${c.id}) AND "endsAt" IS NOT NULL`);
    expect(Number(ends)).toBe(2);
  });
});

// ============================================================================================================
// E. Old routes (BF-ADD-14)
// ============================================================================================================

describeAdd('BF-ADD old plan-limit-addons routes', () => {
  test('BF-ADD-14 old GET lists priced items with the new fields; old PUT / DELETE refuse them; old free items still edit', async () => {
    const row = await createRow({ name: 'Thêm nhân viên', limitKind: 'users', packSize: 1, monthlyPrice: 30000 });
    const world = S.createWorld('add-old', { planId: pricedPlan('add-old', { users: 5 }) });
    setPeriod(world.merchantId);
    const addonId = (await buy(world.merchantId, row.id, 1)).body.data.addon.id;
    const legacyId = S.addAddon(world.merchantId, { products: 5 });
    const a = await admin();
    const list = await a.get(`/api/merchants/${world.merchantId}/plan-limit-addons`);
    expect(list.status).toBe(200);
    const priced = list.body.data.addons.find((x) => x.id === addonId);
    expect(priced).toMatchObject({ users: 1, addonPriceId: row.id, packs: 1, unitPrice: 30000 });
    expect(brief(await a.put(`/api/plan-limit-addons/${addonId}`, { users: 9 }))).toEqual({ status: 422, code: 'PRICED_ADDON_READ_ONLY' });
    expect(brief(await a.delete(`/api/plan-limit-addons/${addonId}`))).toEqual({ status: 422, code: 'PRICED_ADDON_READ_ONLY' });
    expect((await a.put(`/api/plan-limit-addons/${legacyId}`, { notes: 'still editable' })).status).toBe(200);
  });
});
