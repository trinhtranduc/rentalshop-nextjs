/**
 * BF-FEAT — attendance sold as a "feature" add-on (#943, owner 2026-10-13).
 *
 * - Price list: a "Tính năng" row (limitKind `feature`, featureKey `attendance`), no packs.
 * - Merchant → Add-on: charged now = monthly price ÷ 30 × Vietnam days left (#870 rule 10); trial = 0. Usable at once:
 *   login / profile `merchant.modules` has `attendance`, attendance routes stop answering MODULE_NOT_ENABLED.
 * - Renewal adds the feature price. "Tắt từ kỳ sau" keeps it until the period end, no refund, not renewed.
 * - A legacy module switch (#907) still counts; buying the add-on switches the legacy row off (row kept).
 * Expected numbers are computed here, independently of the code under test.
 * Run: scripts/e2e/business-e2e.sh -- feature-addon   (needs E2E_API_URL + a local E2E_DATABASE_URL).
 */
const { describeE2E, uniqueName } = require('../helpers/api');
const S = require('../helpers/subscription');

const describeFeat = S.hasDb ? describeE2E : describe.skip;

const VN_MS = 7 * 3600 * 1000;
const DAY_MS = 86400000;
const vnKey = (d) => new Date(new Date(d).getTime() + VN_MS).toISOString().slice(0, 10);
const vnDaysBetween = (a, b) => Math.round((Date.parse(`${vnKey(b)}T00:00:00Z`) - Date.parse(`${vnKey(a)}T00:00:00Z`)) / DAY_MS);
const iso = (d) => new Date(d).toISOString();
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const brief = (r) => ({ status: r.status, code: r.body?.code });
const created = (r) => r.status === 200 || r.status === 201;

const PLAN_PRICE = 399000;
const FEATURE_PRICE = 99000;

let adminSession;
async function admin() {
  if (!adminSession) adminSession = await S.login({ email: 'admin@rentalshop.com', password: 'admin123' }, S.WEB_HEADERS);
  return adminSession;
}

function pricedPlan(label) {
  const id = S.createPlan(label, { outlets: 1, users: 5, products: -1, customers: -1, orders: -1 });
  S.sql(`UPDATE "Plan" SET "basePrice" = ${PLAN_PRICE}, currency = 'VND', "trialDays" = 0 WHERE id = ${id} AND name LIKE 'E2E %'`);
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

const subscriptionId = (merchantId) => Number(S.sql(`SELECT id FROM "Subscription" WHERE "merchantId" = ${merchantId}`));
const paymentCount = (merchantId) => Number(S.sql(`SELECT count(*) FROM "Payment" WHERE "merchantId" = ${merchantId}`));
const lastPayment = (merchantId) => {
  const [amount, type, method] = S.sql(`SELECT amount || '|' || type || '|' || method FROM "Payment" WHERE "merchantId" = ${merchantId} ORDER BY id DESC LIMIT 1`).split('|');
  return { amount: Number(amount), type, method };
};

let featureRow;
async function attendanceRow() {
  if (featureRow) return featureRow;
  const r = await (await admin()).post('/api/addon-prices', { name: uniqueName('Chấm công'), limitKind: 'feature', featureKey: 'attendance', monthlyPrice: FEATURE_PRICE });
  expect(brief(r)).toMatchObject({ status: 201 });
  featureRow = r.body.data.addonPrice;
  return featureRow;
}

async function buy(merchantId, extra = {}) {
  const row = await attendanceRow();
  return (await admin()).post(`/api/merchants/${merchantId}/addons`, { addonPriceId: row.id, packs: 1, method: 'TRANSFER', transactionId: `E2E-F-${Date.now()}`, ...extra });
}

async function modulesOf(world) {
  const m = await S.login(world.merchant, S.WEB_HEADERS);
  const r = await m.get('/api/users/profile');
  expect(r.status).toBe(200);
  return { modules: r.body.data.merchant.modules, session: m };
}

async function shop(merchantId) {
  const r = await (await admin()).get(`/api/merchants/${merchantId}/addons`);
  expect(r.status).toBe(200);
  return r.body.data;
}

describeFeat('BF-FEAT attendance as a feature add-on (#943)', () => {
  test('BF-FEAT-01 the admin creates a "Tính năng" row: kind feature, featureKey attendance, pack size 1; a bad key is 400', async () => {
    const row = await attendanceRow();
    expect(row).toMatchObject({ limitKind: 'feature', featureKey: 'attendance', packSize: 1, monthlyPrice: FEATURE_PRICE, isActive: true });
    const a = await admin();
    expect((await a.post('/api/addon-prices', { name: uniqueName('x'), limitKind: 'feature', featureKey: 'payroll', monthlyPrice: 1 })).status).toBe(400);
    const list = await a.get('/api/addon-prices');
    expect(list.body.data.addonPrices.find((r) => r.id === row.id)).toMatchObject({ featureKey: 'attendance', shopsUsing: 0 });
  });

  test('BF-FEAT-02 buying mid-period charges price ÷ 30 × VN days left; the module is on at once; a second buy is 422', async () => {
    const world = S.createWorld('feat-buy', { planId: pricedPlan('feat-buy') });
    const { end } = setPeriod(world.merchantId);
    const before = await modulesOf(world);
    expect(before.modules).toEqual([]);
    expect(brief(await before.session.get('/api/attendance/me'))).toEqual({ status: 403, code: 'MODULE_NOT_ENABLED' });

    const at = new Date();
    const payments = paymentCount(world.merchantId);
    const r = await buy(world.merchantId, { packs: 3, method: 'CASH' });
    expect(created(r)).toBe(true);
    const expected = Math.round((FEATURE_PRICE / 30) * vnDaysBetween(at, end));
    expect(r.body.data.quote.amountDue).toBe(expected);
    expect(r.body.data.addon).toMatchObject({ featureKey: 'attendance', limitKind: 'feature', packs: 1, unitPrice: FEATURE_PRICE, users: 0, outlets: 0 });
    expect(paymentCount(world.merchantId)).toBe(payments + 1);
    expect(lastPayment(world.merchantId)).toMatchObject({ amount: expected, type: 'PLAN_CHANGE', method: 'CASH' });

    const after = await modulesOf(world);
    expect(after.modules).toEqual(['attendance']);
    expect((await after.session.get('/api/attendance/me')).status).toBe(200);

    expect(brief(await buy(world.merchantId))).toEqual({ status: 422, code: 'ADDON_FEATURE_ALREADY_ON' });
  });

  test('BF-FEAT-03 a trial shop pays 0 now and no payment is written; the module is on', async () => {
    const world = S.createWorld('feat-trial', { planId: pricedPlan('feat-trial') });
    setPeriod(world.merchantId, { status: 'TRIAL' });
    const payments = paymentCount(world.merchantId);
    const r = await buy(world.merchantId);
    expect(created(r)).toBe(true);
    expect(r.body.data.quote).toMatchObject({ amountDue: 0, reason: 'trial' });
    expect(paymentCount(world.merchantId)).toBe(payments);
    expect((await modulesOf(world)).modules).toEqual(['attendance']);
  });

  test('BF-FEAT-04 renewal preview and renew charge plan + 99.000; the feature keeps running', async () => {
    const world = S.createWorld('feat-renew', { planId: pricedPlan('feat-renew') });
    setPeriod(world.merchantId);
    expect(created(await buy(world.merchantId))).toBe(true);
    const preview = await shop(world.merchantId);
    expect(preview.renewal.monthly).toMatchObject({ planPrice: PLAN_PRICE, addonPrice: FEATURE_PRICE, totalDue: PLAN_PRICE + FEATURE_PRICE });
    const r = await (await admin()).post(`/api/subscriptions/${subscriptionId(world.merchantId)}/renew`, { method: 'TRANSFER', duration: 1, transactionId: `E2E-FR-${Date.now()}` });
    expect(r.status).toBe(200);
    expect(r.body.data.renewal).toMatchObject({ planPrice: PLAN_PRICE, addonPrice: FEATURE_PRICE, totalDue: PLAN_PRICE + FEATURE_PRICE });
    expect((await modulesOf(world)).modules).toEqual(['attendance']);
  });

  test('BF-FEAT-05 "Tắt từ kỳ sau": on until the period end, not in the renewal, no refund; off after the end', async () => {
    const world = S.createWorld('feat-off', { planId: pricedPlan('feat-off') });
    const { end } = setPeriod(world.merchantId);
    const item = (await buy(world.merchantId)).body.data.addon;
    const payments = paymentCount(world.merchantId);
    const a = await admin();
    const off = await a.patch(`/api/merchants/${world.merchantId}/addons/${item.id}`, { removeAtPeriodEnd: true });
    expect(off.status).toBe(200);
    expect(new Date(off.body.data.addon.endsAt).getTime()).toBe(new Date(end).getTime());
    expect(paymentCount(world.merchantId)).toBe(payments);
    expect((await modulesOf(world)).modules).toEqual(['attendance']);
    expect((await shop(world.merchantId)).renewal.monthly).toMatchObject({ addonPrice: 0, totalDue: PLAN_PRICE });
    expect(brief(await a.patch(`/api/merchants/${world.merchantId}/addons/${item.id}`, { packs: 2 }))).toEqual({ status: 400, code: 'INVALID_INPUT' });

    // the paid period ends: the module goes off, nothing is deleted
    S.sql(`UPDATE "PlanLimitAddon" SET "endsAt" = (now() at time zone 'utc') - interval '1 minute' WHERE id = ${item.id}`);
    expect((await modulesOf(world)).modules).toEqual([]);
    expect(Number(S.sql(`SELECT count(*) FROM "PlanLimitAddon" WHERE id = ${item.id}`))).toBe(1);
  });

  test('BF-FEAT-06 a legacy module switch still counts; buying the add-on switches the legacy row off and keeps it', async () => {
    const world = S.createWorld('feat-legacy', { planId: pricedPlan('feat-legacy') });
    setPeriod(world.merchantId);
    const a = await admin();
    expect((await a.put(`/api/merchants/${world.merchantId}/modules/attendance`, { enabled: true })).status).toBe(200);
    expect((await modulesOf(world)).modules).toEqual(['attendance']);
    expect((await shop(world.merchantId)).legacyModules).toEqual([expect.objectContaining({ key: 'attendance', active: true })]);

    expect(created(await buy(world.merchantId))).toBe(true);
    expect(S.sql(`SELECT enabled FROM "MerchantModule" WHERE "merchantId" = ${world.merchantId} AND key = 'attendance'`)).toBe('f');
    expect((await modulesOf(world)).modules).toEqual(['attendance']);
  });
});
