/**
 * BF-MOD — add-ons and modules: catalog, price, mid-period purchase, limits, renewal, removal (#782).
 *
 * Owner rules (2026-10-11): add-ons (quantity: branches, staff) and modules (features) live in one catalog with a
 * VND price each, for the whole shop. A purchase mid-period is charged for the remaining Vietnam days of the period
 * and ends with it. Renewal = plan + every active item (cycle discount 0 / 0 / 5 / 10 %). Removal only at the end
 * of the period and never below current usage. A branch add-on needs a multi-branch plan (outlets > 1).
 * Expected numbers are computed here, independently of the code under test.
 * Every describe makes its own merchant and plans (helpers/subscription.js).
 * Run: scripts/e2e/business-e2e.sh -- modules   (needs E2E_API_URL + a local E2E_DATABASE_URL).
 */
const { describeE2E, uniqueName } = require('../helpers/api');
const S = require('../helpers/subscription');

const describeMod = S.hasDb ? describeE2E : describe.skip;

const VN_MS = 7 * 3600 * 1000;
const DAY_MS = 86400000;
const vnKey = (d) => new Date(new Date(d).getTime() + VN_MS).toISOString().slice(0, 10);
const vnDaysBetween = (a, b) => Math.round((Date.parse(`${vnKey(b)}T00:00:00Z`) - Date.parse(`${vnKey(a)}T00:00:00Z`)) / DAY_MS);
const iso = (d) => new Date(d).toISOString();
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const brief = (r) => ({ status: r.status, code: r.body?.code });
/** Creating a user answers 201 Created. */
const created = (r) => r.status === 200 || r.status === 201;

const MONTHLY = 100000;
const STAFF_PRICE = 30000;
const BRANCH_PRICE = 150000;

let adminSession;
async function admin() {
  if (!adminSession) adminSession = await S.login({ email: 'admin@rentalshop.com', password: 'admin123' });
  return adminSession;
}

function pricedPlan(label, { basePrice = MONTHLY, limits = {} } = {}) {
  const id = S.createPlan(label, { outlets: 1, users: 3, products: -1, customers: -1, orders: -1, ...limits });
  S.sql(`UPDATE "Plan" SET "basePrice" = ${basePrice}, currency = 'VND', "trialDays" = 0 WHERE id = ${id} AND name LIKE 'E2E %'`);
  return id;
}

function setPeriod(merchantId, { start, end, planId }) {
  const sets = [
    `"currentPeriodStart" = ${q(iso(start))}::timestamp`,
    `"currentPeriodEnd" = ${q(iso(end))}::timestamp`,
    `interval = 'monthly'`, `"intervalCount" = 1`, `period = 1`, `amount = ${MONTHLY}`, `currency = 'VND'`, `status = 'ACTIVE'`,
    `"updatedAt" = (now() at time zone 'utc')`
  ];
  if (planId) sets.push(`"planId" = ${planId}`);
  S.sql(`UPDATE "Subscription" SET ${sets.join(', ')} WHERE "merchantId" = ${merchantId}`);
}

/** 9 days used, 22 days left of a 31-day period, around now. */
const midPeriod = () => ({ start: new Date(Date.now() - 9 * DAY_MS), end: new Date(Date.now() + 22 * DAY_MS) });

const lastPaymentAmount = (merchantId) => Number(S.sql(`SELECT amount FROM "Payment" WHERE "merchantId" = ${merchantId} ORDER BY id DESC LIMIT 1`));
const rows = (merchantId) =>
  S.sql(`SELECT coalesce(string_agg(name || '|' || quantity || '|' || "unitPrice" || '|' || "isActive" || '|' || "removeAtPeriodEnd", ';' ORDER BY id), '') FROM "MerchantModule" WHERE "merchantId" = ${merchantId}`);

let userSeq = 0;
const userBody = (world) => ({
  email: `m${(userSeq += 1)}.${world.id}.${Date.now()}@e2e.test`,
  password: 'secret123', firstName: 'Nv', lastName: 'E2E', role: 'OUTLET_STAFF', outletId: world.outletId
});

/** Catalog item made by the admin (named uniquely so reruns never collide). */
async function createCatalog(body) {
  const a = await admin();
  const r = await a.post('/api/billing-modules', { kind: 'quantity', ...body, name: uniqueName(body.name) });
  expect({ status: r.status, code: r.body?.code }).toMatchObject({ status: 200 });
  return r.body.data.module || r.body.data;
}

// ============================================================================================================
// A. Catalog (BF-MOD-01 .. 03)
// ============================================================================================================

describeMod('BF-MOD catalog: the admin defines add-ons and modules with a VND price', () => {
  test('BF-MOD-01 the admin creates and prices an add-on, a module, and lists them', async () => {
    const staff = await createCatalog({ name: 'Thêm nhân viên', limits: { users: 1 }, monthlyPrice: STAFF_PRICE });
    const loyalty = await createCatalog({ name: 'Loyalty', kind: 'feature', featureKey: 'loyalty', monthlyPrice: 50000 });
    expect(staff).toMatchObject({ kind: 'quantity', limits: { users: 1 }, monthlyPrice: STAFF_PRICE, currency: 'VND', isActive: true });
    expect(loyalty).toMatchObject({ kind: 'feature', featureKey: 'loyalty', monthlyPrice: 50000 });
    const a = await admin();
    const list = await a.get('/api/billing-modules');
    expect(list.status).toBe(200);
    const ids = (list.body.data.modules || []).map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining([staff.id, loyalty.id]));
  });

  test('BF-MOD-02 the admin changes a price and hides an item; a merchant cannot create or change the catalog (403)', async () => {
    const item = await createCatalog({ name: 'Thêm nhân viên', limits: { users: 1 }, monthlyPrice: STAFF_PRICE });
    const a = await admin();
    const r = await a.put(`/api/billing-modules/${item.id}`, { monthlyPrice: 35000, isActive: false });
    expect(r.status).toBe(200);
    expect(r.body.data.module || r.body.data).toMatchObject({ monthlyPrice: 35000, isActive: false });

    const world = S.createWorld('mod-cat', { planId: pricedPlan('mod-cat') });
    const m = await S.login(world.merchant);
    expect(brief(await m.post('/api/billing-modules', { kind: 'quantity', name: 'x', limits: { users: 1 }, monthlyPrice: 1 })).status).toBe(403);
    expect(brief(await m.put(`/api/billing-modules/${item.id}`, { monthlyPrice: 1 })).status).toBe(403);
  });

  test('BF-MOD-03 an add-on needs a positive price (0 allowed for legacy) and a name; bad input is 400', async () => {
    const a = await admin();
    expect((await a.post('/api/billing-modules', { kind: 'quantity', name: '', limits: { users: 1 }, monthlyPrice: 10 })).status).toBe(400);
    expect((await a.post('/api/billing-modules', { kind: 'quantity', name: uniqueName('x'), limits: { users: 1 }, monthlyPrice: -5 })).status).toBe(400);
    expect((await a.post('/api/billing-modules', { kind: 'quantity', name: uniqueName('x'), monthlyPrice: 10 })).status).toBe(400); // no limits
  });
});

// ============================================================================================================
// B. Buy mid-period, limits (BF-MOD-04 .. 07)
// ============================================================================================================

describeMod('BF-MOD buy mid-period: charged for the remaining days, raises the limit', () => {
  let world;
  let staff;
  let m; // merchant session
  const mid = () => world.merchantId;

  beforeAll(async () => {
    staff = await createCatalog({ name: 'Thêm nhân viên', limits: { users: 1 }, monthlyPrice: STAFF_PRICE });
    world = S.createWorld('mod-buy', { planId: pricedPlan('mod-buy', { limits: { users: 3 } }) }); // merchant + staff + kho = 3 users
    m = await S.login(world.merchant);
  });

  test('BF-MOD-04 the quote is price × quantity × remaining Vietnam days / days of the period', async () => {
    const { start, end } = midPeriod();
    setPeriod(mid(), { start, end });
    const a = await admin();
    const before = Date.now();
    const r = await a.get(`/api/merchants/${mid()}/modules/quote?moduleId=${staff.id}&quantity=2`);
    expect(r.status).toBe(200);
    const periodDays = vnDaysBetween(start, end);
    const remaining = vnDaysBetween(new Date(before), end);
    expect(r.body.data).toMatchObject({ periodDays, remainingDays: remaining, currency: 'VND' });
    expect(r.body.data.amountDue).toBeCloseTo((STAFF_PRICE * 2 * remaining) / periodDays, 0);
  });

  test('BF-MOD-05 the shop is at its user limit (3 of 3): a 4th user is refused, buying 2 staff allows 2 more', async () => {
    const { start, end } = midPeriod();
    setPeriod(mid(), { start, end });
    const refused = await m.post('/api/users', userBody(world));
    expect(brief(refused)).toEqual({ status: 422, code: 'PLAN_LIMIT_EXCEEDED' });

    const a = await admin();
    const buy = await a.post(`/api/merchants/${mid()}/modules`, { moduleId: staff.id, quantity: 2, method: 'TRANSFER', transactionId: `E2E-${Date.now()}` });
    expect({ status: buy.status, code: buy.body?.code }).toMatchObject({ status: 200 });
    expect(rows(mid())).toBe(`${staff.name}|2|${STAFF_PRICE}|true|false`);
    expect(lastPaymentAmount(mid())).toBeCloseTo(buy.body.data.quote.amountDue, 0);

    expect(created(await m.post('/api/users', userBody(world)))).toBe(true);
    expect(created(await m.post('/api/users', userBody(world)))).toBe(true);
    expect(brief(await m.post('/api/users', userBody(world)))).toEqual({ status: 422, code: 'PLAN_LIMIT_EXCEEDED' });
  });

  test('BF-MOD-06 the shop sees its own items; another merchant gets 404 (never reveals the shop)', async () => {
    const own = await m.get(`/api/merchants/${mid()}/modules`);
    expect(own.status).toBe(200);
    expect((own.body.data.modules || []).length).toBe(1);
    const other = S.createWorld('mod-other', { planId: pricedPlan('mod-other') });
    const o = await S.login(other.merchant);
    // like every merchant route: another shop's id answers 404, so it never reveals that the shop exists
    expect((await o.get(`/api/merchants/${mid()}/modules`)).status).toBe(404);
  });

  test('BF-MOD-07 the price is taken when bought: a later catalog price change does not touch the row', async () => {
    const a = await admin();
    await a.put(`/api/billing-modules/${staff.id}`, { monthlyPrice: 99000 });
    expect(rows(mid())).toBe(`${staff.name}|2|${STAFF_PRICE}|true|false`);
    await a.put(`/api/billing-modules/${staff.id}`, { monthlyPrice: STAFF_PRICE });
  });
});

// ============================================================================================================
// C. Renewal and removal at the end of the period (BF-MOD-08 .. 11)
// ============================================================================================================

describeMod('BF-MOD renewal adds the items; removal waits for the end of the period', () => {
  let world;
  let staff;
  let loyalty;
  const mid = () => world.merchantId;

  beforeEach(async () => {
    staff = await createCatalog({ name: 'Thêm nhân viên', limits: { users: 1 }, monthlyPrice: STAFF_PRICE });
    loyalty = await createCatalog({ name: 'Loyalty', kind: 'feature', featureKey: 'loyalty', monthlyPrice: 50000 });
    world = S.createWorld('mod-renew', { planId: pricedPlan('mod-renew', { limits: { users: 3 } }) });
    const { start, end } = midPeriod();
    setPeriod(mid(), { start, end });
    const a = await admin();
    for (const body of [{ moduleId: staff.id, quantity: 2 }, { moduleId: loyalty.id, quantity: 1 }]) {
      const r = await a.post(`/api/merchants/${mid()}/modules`, { ...body, method: 'TRANSFER', transactionId: `E2E-${Date.now()}` });
      expect(r.status).toBe(200);
    }
  });

  test('BF-MOD-08 renew 1 month = plan 100,000 + 2 × 30,000 + 50,000 = 210,000; the extension lists the items', async () => {
    const a = await admin();
    const subId = Number(S.sql(`SELECT id FROM "Subscription" WHERE "merchantId" = ${mid()}`));
    const r = await a.post(`/api/subscriptions/${subId}/renew`, { method: 'TRANSFER', transactionId: `E2E-R-${Date.now()}`, duration: 1 });
    expect(r.status).toBe(200);
    expect(lastPaymentAmount(mid())).toBeCloseTo(MONTHLY + 2 * STAFF_PRICE + 50000, 2);
    expect(r.body.data.renewal).toMatchObject({ planPrice: MONTHLY, addonPrice: 2 * STAFF_PRICE + 50000, totalDue: 210000 });
  });

  test('BF-MOD-09 renew 12 months applies the annual 10 % to the plan and to the items: (100,000 + 110,000) × 12 × 0.9', async () => {
    const a = await admin();
    const subId = Number(S.sql(`SELECT id FROM "Subscription" WHERE "merchantId" = ${mid()}`));
    const r = await a.post(`/api/subscriptions/${subId}/renew`, { method: 'TRANSFER', transactionId: `E2E-R-${Date.now()}`, duration: 12 });
    expect(r.status).toBe(200);
    expect(lastPaymentAmount(mid())).toBeCloseTo((MONTHLY + 110000) * 12 * 0.9, 2);
  });

  test('BF-MOD-10 renewal uses the catalog price at that moment and writes it on the row', async () => {
    const a = await admin();
    await a.put(`/api/billing-modules/${staff.id}`, { monthlyPrice: 40000 });
    const subId = Number(S.sql(`SELECT id FROM "Subscription" WHERE "merchantId" = ${mid()}`));
    const r = await a.post(`/api/subscriptions/${subId}/renew`, { method: 'TRANSFER', transactionId: `E2E-R-${Date.now()}`, duration: 1 });
    expect(r.status).toBe(200);
    expect(lastPaymentAmount(mid())).toBeCloseTo(MONTHLY + 2 * 40000 + 50000, 2);
    expect(Number(S.sql(`SELECT "unitPrice" FROM "MerchantModule" WHERE "merchantId" = ${mid()} AND name = ${q(staff.name)}`))).toBe(40000);
  });

  test('BF-MOD-11 "remove at period end": the limit stays until renewal; at renewal the item ends and is not charged', async () => {
    const a = await admin();
    const list = await a.get(`/api/merchants/${mid()}/modules`);
    const row = list.body.data.modules.find((x) => x.name === staff.name);
    const mark = await a.patch(`/api/merchants/${mid()}/modules/${row.id}`, { removeAtPeriodEnd: true });
    expect({ status: mark.status, code: mark.body?.code }).toMatchObject({ status: 200 });

    // still counted until the period ends: 3 users + 2 staff = room for 2 more
    const m = await S.login(world.merchant);
    expect(created(await m.post('/api/users', userBody(world)))).toBe(true);

    const subId = Number(S.sql(`SELECT id FROM "Subscription" WHERE "merchantId" = ${mid()}`));
    const r = await a.post(`/api/subscriptions/${subId}/renew`, { method: 'TRANSFER', transactionId: `E2E-R-${Date.now()}`, duration: 1 });
    expect(r.status).toBe(200);
    expect(lastPaymentAmount(mid())).toBeCloseTo(MONTHLY + 50000, 2); // staff no longer charged
    expect(rows(mid())).toContain(`${staff.name}|2|${STAFF_PRICE}|false|true`); // ended, kept for history
  });
});

// ============================================================================================================
// D. Safety rules (BF-MOD-12 .. 15)
// ============================================================================================================

describeMod('BF-MOD rules: never below usage, branch add-on only on a multi-branch plan, old addon API', () => {
  test('BF-MOD-12 removal is refused (422) while the shop uses what the add-on gives', async () => {
    const staff = await createCatalog({ name: 'Thêm nhân viên', limits: { users: 1 }, monthlyPrice: STAFF_PRICE });
    const world = S.createWorld('mod-use', { planId: pricedPlan('mod-use', { limits: { users: 3 } }) });
    const { start, end } = midPeriod();
    setPeriod(world.merchantId, { start, end });
    const a = await admin();
    const buy = await a.post(`/api/merchants/${world.merchantId}/modules`, { moduleId: staff.id, quantity: 1, method: 'TRANSFER', transactionId: `E2E-${Date.now()}` });
    expect(buy.status).toBe(200);
    const m = await S.login(world.merchant);
    expect(created(await m.post('/api/users', userBody(world)))).toBe(true); // 4 of 4 now
    const row = (await a.get(`/api/merchants/${world.merchantId}/modules`)).body.data.modules[0];
    const r = await a.patch(`/api/merchants/${world.merchantId}/modules/${row.id}`, { removeAtPeriodEnd: true });
    expect(brief(r)).toEqual({ status: 422, code: 'CANNOT_REMOVE_MODULE_LIMIT_EXCEEDED' });
    expect(rows(world.merchantId)).toBe(`${staff.name}|1|${STAFF_PRICE}|true|false`);
  });

  test('BF-MOD-13 a branch add-on is refused on a one-branch plan (422) and works on a multi-branch plan', async () => {
    const branch = await createCatalog({ name: 'Thêm chi nhánh', limits: { outlets: 1, users: 3 }, monthlyPrice: BRANCH_PRICE });
    const basic = S.createWorld('mod-branch1', { planId: pricedPlan('mod-branch1', { limits: { outlets: 1 } }) });
    const multi = S.createWorld('mod-branch3', { planId: pricedPlan('mod-branch3', { limits: { outlets: 3 } }) });
    const a = await admin();
    for (const w of [basic, multi]) {
      const { start, end } = midPeriod();
      setPeriod(w.merchantId, { start, end });
    }
    const no = await a.post(`/api/merchants/${basic.merchantId}/modules`, { moduleId: branch.id, quantity: 1, method: 'TRANSFER', transactionId: `E2E-${Date.now()}` });
    expect(brief(no)).toEqual({ status: 422, code: 'MODULE_NOT_AVAILABLE_FOR_PLAN' });
    expect(rows(basic.merchantId)).toBe('');
    const yes = await a.post(`/api/merchants/${multi.merchantId}/modules`, { moduleId: branch.id, quantity: 1, method: 'TRANSFER', transactionId: `E2E-${Date.now()}` });
    expect(yes.status).toBe(200);
  });

  test('BF-MOD-14 changing to a one-branch plan is refused (422) while the shop has a branch add-on', async () => {
    const branch = await createCatalog({ name: 'Thêm chi nhánh', limits: { outlets: 1, users: 3 }, monthlyPrice: BRANCH_PRICE });
    const multiPlan = pricedPlan('mod-keep3', { limits: { outlets: 3 } });
    const onePlan = pricedPlan('mod-one', { limits: { outlets: 1 } });
    const world = S.createWorld('mod-down', { planId: multiPlan });
    const { start, end } = midPeriod();
    setPeriod(world.merchantId, { start, end });
    const a = await admin();
    expect((await a.post(`/api/merchants/${world.merchantId}/modules`, { moduleId: branch.id, quantity: 1, method: 'TRANSFER', transactionId: `E2E-${Date.now()}` })).status).toBe(200);
    const subId = Number(S.sql(`SELECT id FROM "Subscription" WHERE "merchantId" = ${world.merchantId}`));
    const r = await a.post(`/api/subscriptions/${subId}/change-plan`, { planId: onePlan, billingInterval: 'monthly' });
    expect(brief(r)).toEqual({ status: 422, code: 'PLAN_HAS_BRANCH_MODULES' });
    expect(Number(S.sql(`SELECT "planId" FROM "Subscription" WHERE "merchantId" = ${world.merchantId}`))).toBe(multiPlan);
  });

  test('BF-MOD-15 the old addon routes still read, but writing answers 410 ADDONS_REPLACED_BY_MODULES', async () => {
    const world = S.createWorld('mod-old', { planId: pricedPlan('mod-old') });
    const a = await admin();
    expect((await a.get(`/api/merchants/${world.merchantId}/plan-limit-addons`)).status).toBe(200);
    const w = await a.post(`/api/merchants/${world.merchantId}/plan-limit-addons`, { users: 1 });
    expect(brief(w)).toEqual({ status: 410, code: 'ADDONS_REPLACED_BY_MODULES' });
    expect(S.sql(`SELECT count(*) FROM "PlanLimitAddon" WHERE "merchantId" = ${world.merchantId}`)).toBe('0');
  });
});
