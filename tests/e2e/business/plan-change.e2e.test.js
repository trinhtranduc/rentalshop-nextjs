/**
 * BF-PLAN — who may change the plan and when; the payment of an upgrade and of an extension (#785).
 *
 * Owner rules (2026-10-11):
 *  - A plan is changed only in a new period (the subscription has ended, or a trial turns paid).
 *  - A merchant never changes plan in the middle of a period.
 *  - Admin: in the middle of a period only an upgrade (credit for the unused days); a downgrade only in a new period.
 *  - An upgrade and an extension paid by the shop leave a Payment with the amount.
 * Expected numbers and dates are computed here, independently of the code under test.
 * Every describe makes its own merchant and plans (helpers/subscription.js).
 * Run: scripts/e2e/business-e2e.sh -- plan-change   (needs E2E_API_URL + a local E2E_DATABASE_URL).
 */
const { describeE2E } = require('../helpers/api');
const S = require('../helpers/subscription');

const describePlan = S.hasDb ? describeE2E : describe.skip;

const VN_MS = 7 * 3600 * 1000;
const DAY_MS = 86400000;
const vnKey = (d) => new Date(new Date(d).getTime() + VN_MS).toISOString().slice(0, 10);
const vnDaysBetween = (a, b) => Math.round((Date.parse(`${vnKey(b)}T00:00:00Z`) - Date.parse(`${vnKey(a)}T00:00:00Z`)) / DAY_MS);
const iso = (d) => new Date(d).toISOString();
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const brief = (r) => ({ status: r.status, code: r.body?.code });

const LITE = 50000;
const BASIC = 100000;
const PRO = 300000;

let adminSession;
async function admin() {
  if (!adminSession) adminSession = await S.login({ email: 'admin@rentalshop.com', password: 'admin123' });
  return adminSession;
}

function pricedPlan(label, basePrice) {
  const id = S.createPlan(label, { outlets: 1, users: 3, products: -1, customers: -1, orders: -1 });
  S.sql(`UPDATE "Plan" SET "basePrice" = ${basePrice}, currency = 'VND', "trialDays" = 14 WHERE id = ${id} AND name LIKE 'E2E %'`);
  return id;
}

function setPeriod(merchantId, { start, end, planId, status = 'ACTIVE', amount = BASIC }) {
  const sets = [
    `"currentPeriodStart" = ${q(iso(start))}::timestamp`,
    `"currentPeriodEnd" = ${q(iso(end))}::timestamp`,
    `interval = 'monthly'`, `"intervalCount" = 1`, `period = 1`, `amount = ${amount}`, `currency = 'VND'`, `status = ${q(status)}`,
    `"updatedAt" = (now() at time zone 'utc')`
  ];
  if (planId) sets.push(`"planId" = ${planId}`);
  S.sql(`UPDATE "Subscription" SET ${sets.join(', ')} WHERE "merchantId" = ${merchantId}`);
}

const midPeriod = () => ({ start: new Date(Date.now() - 9 * DAY_MS), end: new Date(Date.now() + 22 * DAY_MS) });
const expired = () => ({ start: new Date(Date.now() - 40 * DAY_MS), end: new Date(Date.now() - 10 * DAY_MS) });

const subRow = (merchantId) => {
  const [id, planId, status, amount, interval, intervalCount, end] = S.sql(
    `SELECT id || '|' || "planId" || '|' || status || '|' || amount || '|' || interval || '|' || "intervalCount" || '|' ||
            to_char("currentPeriodEnd", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') FROM "Subscription" WHERE "merchantId" = ${merchantId}`
  ).split('|');
  return { id: Number(id), planId: Number(planId), status, amount: Number(amount), interval, intervalCount: Number(intervalCount), end };
};
/** "TYPE:amount:status:method" of every Payment of the shop, oldest first. */
const paymentsOf = (merchantId) =>
  S.sql(`SELECT coalesce(string_agg("type"::text || ':' || amount || ':' || "status"::text || ':' || "method"::text, ',' ORDER BY id), '') FROM "Payment" WHERE "merchantId" = ${merchantId}`);
const payBody = { method: 'TRANSFER', transactionId: 'FT-PLAN-1' };

// ============================================================================================================
// A. Who may change the plan, when (BF-PLAN-01 .. 06)
// ============================================================================================================

describePlan('BF-PLAN rules: no change in the middle of a period for a merchant; admin only upgrades; downgrade in a new period', () => {
  let basic;
  let pro;
  let lite;
  beforeAll(() => {
    basic = pricedPlan('plan-basic', BASIC);
    pro = pricedPlan('plan-pro', PRO);
    lite = pricedPlan('plan-lite', LITE);
  });
  const newWorld = (label) => S.createWorld(label, { planId: basic });
  const changeUrl = (w) => `/api/subscriptions/${subRow(w.merchantId).id}/change-plan`;

  test('BF-PLAN-01 a merchant cannot change plan in the middle of a period: 403, nothing written', async () => {
    const w = newWorld('plan-01');
    setPeriod(w.merchantId, { ...midPeriod(), planId: basic });
    const m = await S.login(w.merchant);
    const before = subRow(w.merchantId);
    const r = await m.post(changeUrl(w), { planId: pro, billingInterval: 'monthly', ...payBody });
    expect(brief(r)).toEqual({ status: 403, code: 'PLAN_CHANGE_ONLY_AT_NEW_PERIOD' });
    expect(subRow(w.merchantId)).toEqual(before);
    expect(paymentsOf(w.merchantId)).toBe('');
  });

  test('BF-PLAN-02 an admin upgrade in the middle of a period needs the payment method and reference when money is due', async () => {
    const w = newWorld('plan-02');
    setPeriod(w.merchantId, { ...midPeriod(), planId: basic });
    const a = await admin();
    const before = subRow(w.merchantId);
    const r = await a.post(changeUrl(w), { planId: pro, billingInterval: 'monthly' });
    expect(brief(r)).toEqual({ status: 400, code: 'PAYMENT_METHOD_AND_TRANSACTION_ID_REQUIRED' });
    expect(subRow(w.merchantId)).toEqual(before);
    expect(paymentsOf(w.merchantId)).toBe('');
  });

  test('BF-PLAN-03 an admin upgrade in the middle of a period writes a Payment of 300,000 − credit and changes the plan', async () => {
    const w = newWorld('plan-03');
    const { start, end } = midPeriod();
    setPeriod(w.merchantId, { start, end, planId: basic });
    const a = await admin();
    const before = Date.now();
    const r = await a.post(changeUrl(w), { planId: pro, billingInterval: 'monthly', ...payBody });
    expect({ status: r.status, code: r.body?.code }).toEqual({ status: 200, code: 'PLAN_CHANGED_SUCCESS' });
    const credit = (vnDaysBetween(new Date(before), end) / vnDaysBetween(start, end)) * BASIC;
    const due = Math.round(PRO - credit);
    expect(paymentsOf(w.merchantId)).toBe(`PLAN_CHANGE:${due}:PENDING:TRANSFER`);
    expect(r.body.data.planChange.amountDue).toBeCloseTo(PRO - credit, 2);
    expect(subRow(w.merchantId)).toMatchObject({ planId: pro, status: 'ACTIVE' });
  });

  test('BF-PLAN-04 an admin downgrade in the middle of a period: 422 DOWNGRADE_ONLY_AT_NEW_PERIOD, nothing written', async () => {
    const w = S.createWorld('plan-04', { planId: pro });
    setPeriod(w.merchantId, { ...midPeriod(), planId: pro, amount: PRO });
    const a = await admin();
    const before = subRow(w.merchantId);
    for (const target of [basic, lite]) {
      const r = await a.post(changeUrl(w), { planId: target, billingInterval: 'monthly', ...payBody });
      expect(brief(r)).toEqual({ status: 422, code: 'DOWNGRADE_ONLY_AT_NEW_PERIOD' });
    }
    expect(subRow(w.merchantId)).toEqual(before);
    expect(paymentsOf(w.merchantId)).toBe('');
  });

  test('BF-PLAN-05 after the subscription has ended a merchant may change to any plan, a downgrade included, at the full new price from now', async () => {
    const w = S.createWorld('plan-05', { planId: pro });
    setPeriod(w.merchantId, { ...expired(), planId: pro, amount: PRO });
    const m = await S.login(w.merchant);
    const before = Date.now();
    const r = await m.post(changeUrl(w), { planId: basic, billingInterval: 'monthly', ...payBody });
    expect({ status: r.status, code: r.body?.code }).toEqual({ status: 200, code: 'PLAN_CHANGED_SUCCESS' });
    expect(paymentsOf(w.merchantId)).toBe(`PLAN_CHANGE:${BASIC}:PENDING:TRANSFER`); // no credit: the old period is over
    const s = subRow(w.merchantId);
    expect(s.planId).toBe(basic);
    expect(Date.parse(s.end)).toBeGreaterThan(before + 27 * DAY_MS);
  });

  test('BF-PLAN-06 a trial turned into a paid plan becomes ACTIVE (it was left as TRIAL)', async () => {
    const w = S.createWorld('plan-06', { planId: basic });
    setPeriod(w.merchantId, { start: new Date(Date.now() - 3 * DAY_MS), end: new Date(Date.now() + 11 * DAY_MS), planId: basic, status: 'TRIAL', amount: 0 });
    const a = await admin();
    const r = await a.post(changeUrl(w), { planId: pro, billingInterval: 'monthly', ...payBody });
    expect(r.status).toBe(200);
    expect(subRow(w.merchantId)).toMatchObject({ planId: pro, status: 'ACTIVE' });
  });

  test('BF-PLAN-07 a change that costs nothing needs no payment fields and writes no Payment (downgrade to a free plan after expiry)', async () => {
    const free = pricedPlan('plan-free', 0);
    const w = S.createWorld('plan-07', { planId: basic });
    setPeriod(w.merchantId, { ...expired(), planId: basic });
    const a = await admin();
    const r = await a.post(changeUrl(w), { planId: free, billingInterval: 'monthly' });
    expect(r.status).toBe(200);
    expect(paymentsOf(w.merchantId)).toBe('');
    expect(subRow(w.merchantId).planId).toBe(free);
  });
});

// ============================================================================================================
// B. The admin merchant page route (BF-PLAN-08 .. 09)
// ============================================================================================================

describePlan('BF-PLAN merchant plan route (PUT /api/merchants/[id]/plan) follows the same rules and prices on the server', () => {
  let basic;
  let pro;
  beforeAll(() => {
    basic = pricedPlan('planm-basic', BASIC);
    pro = pricedPlan('planm-pro', PRO);
  });

  test('BF-PLAN-08 a merchant is refused in the middle of a period (403)', async () => {
    const w = S.createWorld('plan-08', { planId: basic });
    setPeriod(w.merchantId, { ...midPeriod(), planId: basic });
    const m = await S.login(w.merchant);
    const before = subRow(w.merchantId);
    const r = await m.put(`/api/merchants/${w.merchantId}/plan`, { planId: pro, billingInterval: 'monthly', ...payBody });
    expect(brief(r)).toEqual({ status: 403, code: 'PLAN_CHANGE_ONLY_AT_NEW_PERIOD' });
    expect(subRow(w.merchantId)).toEqual(before);
  });

  test('BF-PLAN-09 an admin upgrade stores the server price and writes the Payment; a client total of 1 is ignored', async () => {
    const w = S.createWorld('plan-09', { planId: basic });
    const { start, end } = midPeriod();
    setPeriod(w.merchantId, { start, end, planId: basic });
    const a = await admin();
    const before = Date.now();
    const r = await a.put(`/api/merchants/${w.merchantId}/plan`, { planId: pro, billingInterval: 'annual', totalPrice: 1, discount: 50, ...payBody });
    expect(r.status).toBe(200);
    const credit = (vnDaysBetween(new Date(before), end) / vnDaysBetween(start, end)) * BASIC;
    const due = Math.round(PRO * 12 * 0.9 - credit);
    expect(paymentsOf(w.merchantId)).toBe(`PLAN_CHANGE:${due}:PENDING:TRANSFER`);
    expect(subRow(w.merchantId)).toMatchObject({ planId: pro, amount: PRO * 12 * 0.9 });
  });

  test('BF-PLAN-10 without the payment fields the route answers 400 and writes nothing', async () => {
    const w = S.createWorld('plan-10', { planId: basic });
    setPeriod(w.merchantId, { ...midPeriod(), planId: basic });
    const a = await admin();
    const before = subRow(w.merchantId);
    const r = await a.put(`/api/merchants/${w.merchantId}/plan`, { planId: pro, billingInterval: 'monthly' });
    expect(brief(r)).toEqual({ status: 400, code: 'PAYMENT_METHOD_AND_TRANSACTION_ID_REQUIRED' });
    expect(subRow(w.merchantId)).toEqual(before);
  });
});

// ============================================================================================================
// C. Extend (BF-PLAN-11 .. 13)
// ============================================================================================================

describePlan('BF-PLAN extend: moves the end date only; a Payment only when the payment was received', () => {
  let annualPlan;
  beforeAll(() => {
    annualPlan = pricedPlan('plan-ext', BASIC);
  });

  /** An annual subscription (price of the whole year), 20 days left. */
  const annualWorld = (label) => {
    const w = S.createWorld(label, { planId: annualPlan });
    S.sql(`UPDATE "Subscription" SET interval = 'annual', "intervalCount" = 12, period = 12, amount = ${BASIC * 12 * 0.9}, currency = 'VND', status = 'ACTIVE',
           "currentPeriodStart" = ${q(iso(new Date(Date.now() - 345 * DAY_MS)))}::timestamp, "currentPeriodEnd" = ${q(iso(new Date(Date.now() + 20 * DAY_MS)))}::timestamp
           WHERE "merchantId" = ${w.merchantId}`);
    return w;
  };
  const newEnd = (days) => iso(new Date(Date.now() + days * DAY_MS));

  test('BF-PLAN-11 "Payment Received": the Payment is written, the end moves, the annual cycle and price stay', async () => {
    const w = annualWorld('plan-11');
    const a = await admin();
    const before = subRow(w.merchantId);
    const r = await a.post(`/api/subscriptions/${before.id}/extend`, { newEndDate: newEnd(30), amount: 40000, method: 'PAYMENT_RECEIVED', sendEmail: false });
    expect(r.status).toBe(200);
    expect(paymentsOf(w.merchantId)).toBe('PLAN_EXTENSION:40000:COMPLETED:MANUAL');
    const after = subRow(w.merchantId);
    expect(Date.parse(after.end)).toBeGreaterThan(Date.parse(before.end));
    expect({ interval: after.interval, intervalCount: after.intervalCount, amount: after.amount }).toEqual({ interval: 'annual', intervalCount: 12, amount: BASIC * 12 * 0.9 });
  });

  test('BF-PLAN-12 a free grant (Manual / Admin extension, Compensation) moves the end and writes no Payment', async () => {
    const w = annualWorld('plan-12');
    const a = await admin();
    const id = subRow(w.merchantId).id;
    for (const [i, method] of ['MANUAL_EXTENSION', 'ADMIN_EXTENSION', 'COMPENSATION'].entries()) {
      const r = await a.post(`/api/subscriptions/${id}/extend`, { newEndDate: newEnd(30 + 10 * (i + 1)), amount: 40000, method, sendEmail: false });
      expect(r.status).toBe(200);
    }
    expect(paymentsOf(w.merchantId)).toBe('');
    expect(subRow(w.merchantId)).toMatchObject({ interval: 'annual', intervalCount: 12 });
  });

  test('BF-PLAN-13 extending an annual plan by 10 days does not turn it into a monthly plan', async () => {
    const w = annualWorld('plan-13');
    const a = await admin();
    const before = subRow(w.merchantId);
    const r = await a.post(`/api/subscriptions/${before.id}/extend`, { newEndDate: iso(new Date(Date.parse(before.end) + 10 * DAY_MS)), amount: 0, method: 'ADMIN_EXTENSION', sendEmail: false });
    expect(r.status).toBe(200);
    expect(subRow(w.merchantId)).toMatchObject({ interval: 'annual', intervalCount: 12, amount: BASIC * 12 * 0.9 });
  });
});
