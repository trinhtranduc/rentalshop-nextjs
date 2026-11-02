/**
 * BF-LOYADD — Khách thân thiết (loyalty) sold as a feature add-on (#967, owner 2026-10-14), the #943 flow.
 *
 * - Loyalty on = plan `features` has `loyalty` OR an un-ended `loyalty` feature add-on.
 * - Plan without loyalty + add-on → /api/loyalty/* answer, a SALE order earns points, a later order redeems them;
 *   `merchant.modules` has `loyalty`.
 * - Add-on turned off and the period over → loyalty gone (403 PLAN_UPGRADE_REQUIRED, no earn), data kept.
 * - Plan with loyalty → works with no add-on; buying the add-on is refused (422 ADDON_FEATURE_IN_PLAN).
 * Expected numbers are computed here, independently of the code under test.
 * Run: scripts/e2e/business-e2e.sh -- loyalty-addon   (needs E2E_API_URL + a local E2E_DATABASE_URL).
 */
const { describeE2E, uniqueName, saleBody } = require('../helpers/api');
const S = require('../helpers/subscription');

const describeLoy = S.hasDb ? describeE2E : describe.skip;

const VN_MS = 7 * 3600 * 1000;
const DAY_MS = 86400000;
const vnKey = (d) => new Date(new Date(d).getTime() + VN_MS).toISOString().slice(0, 10);
const vnDaysBetween = (a, b) => Math.round((Date.parse(`${vnKey(b)}T00:00:00Z`) - Date.parse(`${vnKey(a)}T00:00:00Z`)) / DAY_MS);
const iso = (d) => new Date(d).toISOString();
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const brief = (r) => ({ status: r.status, code: r.body?.code });
const created = (r) => r.status === 200 || r.status === 201;

const PLAN_PRICE = 199000;
const LOYALTY_PRICE = 79000;
// 1 point per 10.000 ₫ on a sale; 1 point = 1.000 ₫; redeem up to 50 % of an order
const PROGRAM = {
  name: 'E2E loyalty',
  saleEarnEnabled: true,
  saleEarnRate: 1,
  saleEarnPerAmount: 10000,
  pointValue: 1000,
  minRedeemPoints: 1,
  maxRedeemPercent: 50,
  redeemOnSale: true,
};

let adminSession;
async function admin() {
  if (!adminSession) adminSession = await S.login({ email: 'admin@rentalshop.com', password: 'admin123' }, S.WEB_HEADERS);
  return adminSession;
}

function pricedPlan(label, features) {
  const id = S.createPlan(label, { outlets: 1, users: 5, products: -1, customers: -1, orders: -1 });
  S.sql(
    `UPDATE "Plan" SET "basePrice" = ${PLAN_PRICE}, currency = 'VND', "trialDays" = 0, features = ${q(JSON.stringify(features))}
     WHERE id = ${id} AND name LIKE 'E2E %'`
  );
  return id;
}

function setPeriod(merchantId, { start = new Date(Date.now() - 12 * DAY_MS), end = new Date(Date.now() + 18 * DAY_MS), status = 'ACTIVE' } = {}) {
  S.sql(
    `UPDATE "Subscription" SET "currentPeriodStart" = ${q(iso(start))}::timestamp, "currentPeriodEnd" = ${q(iso(end))}::timestamp,
       interval = 'month', "intervalCount" = 1, period = 1, amount = ${PLAN_PRICE}, currency = 'VND', status = ${q(status)},
       "updatedAt" = (now() at time zone 'utc') WHERE "merchantId" = ${merchantId}`
  );
  return { start, end };
}

const lastPayment = (merchantId) => {
  const [amount, type] = S.sql(`SELECT amount || '|' || type FROM "Payment" WHERE "merchantId" = ${merchantId} ORDER BY id DESC LIMIT 1`).split('|');
  return { amount: Number(amount), type };
};

let row;
async function loyaltyRow() {
  if (row) return row;
  const r = await (await admin()).post('/api/addon-prices', { name: uniqueName('Khách thân thiết'), limitKind: 'feature', featureKey: 'loyalty', monthlyPrice: LOYALTY_PRICE });
  expect(brief(r)).toMatchObject({ status: 201 });
  row = r.body.data.addonPrice;
  return row;
}

async function buy(merchantId) {
  const p = await loyaltyRow();
  return (await admin()).post(`/api/merchants/${merchantId}/addons`, { addonPriceId: p.id, packs: 1, method: 'TRANSFER', transactionId: `E2E-L-${Date.now()}` });
}

async function merchantSession(world) {
  const m = await S.login(world.merchant, S.WEB_HEADERS);
  const r = await m.get('/api/users/profile');
  expect(r.status).toBe(200);
  return { m, modules: r.body.data.merchant.modules };
}

/** The owner saves the rates. #782: buying the add-on already switched the program on, with no second switch. */
async function startProgram(m, world) {
  expect(S.sql(`SELECT "isActive" FROM "LoyaltyProgram" WHERE "merchantId" = ${world.merchantId}`)).toBe('t');
  expect((await m.put('/api/loyalty/program', PROGRAM)).status).toBe(200);
  expect(S.sql(`SELECT "isActive" FROM "LoyaltyProgram" WHERE "merchantId" = ${world.merchantId}`)).toBe('t');
}

async function saleProduct(m, world, price) {
  const r = await m.postForm('/api/products', {
    name: uniqueName('SP SALE'), rentPrice: 0, salePrice: price, deposit: 0, totalStock: 10, outletStock: [{ outletId: world.outletId, stock: 10 }],
  });
  expect(created(r)).toBe(true);
  return r.body.data.product || r.body.data;
}

async function customer(m) {
  const r = await S.createCustomerRaw(m);
  expect(created(r)).toBe(true);
  return r.body.data.customer || r.body.data;
}

const points = async (m, customerId) => {
  const r = await m.get(`/api/loyalty/customers/${customerId}/summary`);
  expect(r.status).toBe(200);
  return r.body.data.points;
};

async function sell(m, product, cust, extra = {}, quantity = 1) {
  const { body } = saleBody({ customer: cust, lines: [{ product, quantity }] });
  const r = await m.post('/api/orders', { ...body, ...extra });
  expect(created(r)).toBe(true);
  return r.body.data.order || r.body.data;
}

describeLoy('BF-LOYADD loyalty as a feature add-on (#967)', () => {
  test('BF-LOYADD-01 the admin creates "Khách thân thiết · Tính năng": kind feature, featureKey loyalty, pack size 1', async () => {
    const p = await loyaltyRow();
    expect(p).toMatchObject({ limitKind: 'feature', featureKey: 'loyalty', packSize: 1, monthlyPrice: LOYALTY_PRICE, isActive: true });
  });

  test('BF-LOYADD-02 plan without loyalty: off, then the add-on (charged ÷ 30 × VN days left) turns it on; earn and redeem on orders', async () => {
    const world = S.createWorld('loy-addon', { planId: pricedPlan('loy-addon', ['Quản lý đơn']) });
    const { end } = setPeriod(world.merchantId);
    const before = await merchantSession(world);
    expect(before.modules).toEqual([]);
    expect(brief(await before.m.get('/api/loyalty/program'))).toEqual({ status: 403, code: 'PLAN_UPGRADE_REQUIRED' });
    expect((await (await admin()).get(`/api/merchants/${world.merchantId}/addons`)).body.data.featureSources).toEqual(
      expect.arrayContaining([{ key: 'loyalty', active: false, plan: false, addon: false, legacy: false }])
    );

    const at = new Date();
    const r = await buy(world.merchantId);
    expect(created(r)).toBe(true);
    const expected = Math.round((LOYALTY_PRICE / 30) * vnDaysBetween(at, end));
    expect(r.body.data.quote.amountDue).toBe(expected);
    expect(lastPayment(world.merchantId)).toEqual({ amount: expected, type: 'PLAN_CHANGE' });

    const { m, modules } = await merchantSession(world);
    expect(modules).toEqual(['loyalty']);
    expect((await (await admin()).get(`/api/merchants/${world.merchantId}/addons`)).body.data.featureSources).toEqual(
      expect.arrayContaining([{ key: 'loyalty', active: true, plan: false, addon: true, legacy: false }])
    );
    await startProgram(m, world);

    // earn: a 250.000 ₫ sale → floor(250.000 / 10.000) × 1 = 25 points
    const product = await saleProduct(m, world, 250000);
    const cust = await customer(m);
    await sell(m, product, cust);
    expect(await points(m, cust.id)).toBe(25);

    // redeem 10 points (10.000 ₫) on a 2-unit sale (500.000; a different order, so the 60 s duplicate guard does not
    // replay the first one); it earns on the paid 490.000 → 49 points
    const order = await sell(m, product, cust, { loyaltyRedeem: { points: 10 } }, 2);
    expect(Number(order.loyaltyDiscount)).toBe(10000);
    expect(await points(m, cust.id)).toBe(25 - 10 + 49);
  });

  test('BF-LOYADD-03 add-on turned off: on until the period end, then gone (403, no earn); program and points kept', async () => {
    const world = S.createWorld('loy-off', { planId: pricedPlan('loy-off', []) });
    const { end } = setPeriod(world.merchantId);
    const item = (await buy(world.merchantId)).body.data.addon;
    const { m } = await merchantSession(world);
    await startProgram(m, world);
    const product = await saleProduct(m, world, 100000);
    const cust = await customer(m);
    await sell(m, product, cust);
    expect(await points(m, cust.id)).toBe(10);

    const off = await (await admin()).patch(`/api/merchants/${world.merchantId}/addons/${item.id}`, { removeAtPeriodEnd: true });
    expect(off.status).toBe(200);
    expect(new Date(off.body.data.addon.endsAt).getTime()).toBe(new Date(end).getTime());
    expect((await merchantSession(world)).modules).toEqual(['loyalty']);
    expect((await (await admin()).get(`/api/merchants/${world.merchantId}/addons`)).body.data.renewal.monthly).toMatchObject({ addonPrice: 0, totalDue: PLAN_PRICE });

    // the paid period ends
    S.sql(`UPDATE "PlanLimitAddon" SET "endsAt" = (now() at time zone 'utc') - interval '1 minute' WHERE id = ${item.id}`);
    const after = await merchantSession(world);
    expect(after.modules).toEqual([]);
    expect(brief(await after.m.get('/api/loyalty/program'))).toEqual({ status: 403, code: 'PLAN_UPGRADE_REQUIRED' });
    await sell(after.m, product, cust);
    const loyaltyRowSql = S.sql(
      `SELECT cl.points FROM "CustomerLoyalty" cl JOIN "Customer" c ON c.id = cl."customerId" WHERE cl."merchantId" = ${world.merchantId}`
    );
    expect(Number(loyaltyRowSql)).toBe(10);
    expect(Number(S.sql(`SELECT count(*) FROM "LoyaltyProgram" WHERE "merchantId" = ${world.merchantId}`))).toBe(1);
  });

  test('BF-LOYADD-05 #782 bought with no setup at all: default rates earn points on the first sale', async () => {
    const world = S.createWorld('loy-run', { planId: pricedPlan('loy-run', []) });
    setPeriod(world.merchantId);
    expect(created(await buy(world.merchantId))).toBe(true);
    const { m } = await merchantSession(world);
    const product = await saleProduct(m, world, 100000);
    const cust = await customer(m);
    await sell(m, product, cust);
    // default program: 1 point per 10.000 ₫
    expect(await points(m, cust.id)).toBe(10);
  });

  test('BF-LOYADD-06 #782 Basic: quote and purchase refused (422), nothing written, the program stays off', async () => {
    const world = S.createWorld('loy-basic', { planId: pricedPlan('basic loy', []) });
    setPeriod(world.merchantId);
    const p = await loyaltyRow();
    const before = Number(S.sql(`SELECT count(*) FROM "PlanLimitAddon" WHERE "merchantId" = ${world.merchantId}`));
    expect(brief(await (await admin()).get(`/api/merchants/${world.merchantId}/addons/quote?addonPriceId=${p.id}&packs=1`))).toEqual({ status: 422, code: 'ADDON_LOYALTY_NOT_FOR_BASIC' });
    expect(brief(await buy(world.merchantId))).toEqual({ status: 422, code: 'ADDON_LOYALTY_NOT_FOR_BASIC' });
    expect(Number(S.sql(`SELECT count(*) FROM "PlanLimitAddon" WHERE "merchantId" = ${world.merchantId}`))).toBe(before);
    expect(S.sql(`SELECT coalesce((SELECT "isActive"::text FROM "LoyaltyProgram" WHERE "merchantId" = ${world.merchantId}), 'false')`)).toBe('false');
  });

  test('BF-LOYADD-04 plan with loyalty: works with no add-on; the add-on is refused (422 ADDON_FEATURE_IN_PLAN)', async () => {
    const world = S.createWorld('loy-plan', { planId: pricedPlan('loy-plan', ['Quản lý đơn', 'loyalty']) });
    setPeriod(world.merchantId);
    const { m, modules } = await merchantSession(world);
    expect(modules).toEqual(['loyalty']);
    expect((await m.put('/api/loyalty/program', PROGRAM)).status).toBe(200);
    // a plan that includes loyalty still has its program switched on by AnyRent, as before: nothing was bought
    S.sql(`UPDATE "LoyaltyProgram" SET "isActive" = true WHERE "merchantId" = ${world.merchantId}`);
    const product = await saleProduct(m, world, 120000);
    const cust = await customer(m);
    await sell(m, product, cust);
    expect(await points(m, cust.id)).toBe(12);

    const p = await loyaltyRow();
    const a = await admin();
    expect(brief(await a.get(`/api/merchants/${world.merchantId}/addons/quote?addonPriceId=${p.id}&packs=1`))).toEqual({ status: 422, code: 'ADDON_FEATURE_IN_PLAN' });
    expect(brief(await buy(world.merchantId))).toEqual({ status: 422, code: 'ADDON_FEATURE_IN_PLAN' });
    expect((await a.get(`/api/merchants/${world.merchantId}/addons`)).body.data.featureSources).toEqual(
      expect.arrayContaining([{ key: 'loyalty', active: true, plan: true, addon: false, legacy: false }])
    );
  });
});
