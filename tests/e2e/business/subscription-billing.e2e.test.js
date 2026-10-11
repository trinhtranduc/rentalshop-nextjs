/**
 * BF-BILL — renew, extend and change-plan: price and dates against a LOCAL API and a LOCAL database (#779).
 *
 * Owner rules (2026-10-11):
 *  - price = plan monthly price × cycle months, discount monthly 0 %, quarterly 0 %, semi-annual 5 %, annual 10 %;
 *  - renew, not expired: the new period continues from the current end (days left kept);
 *  - renew, expired: the new period starts at renewal time;
 *  - upgrade mid-period: credit for the unused Vietnam civil days of the old period, new period from now,
 *    one cycle of calendar months (31 Jan + 1 month = 28 Feb).
 * Expected numbers and dates are computed here, independently of the code under test.
 * Every describe makes its own merchant and plans (helpers/subscription.js); nothing touches the seeded merchants.
 * Run: scripts/e2e/business-e2e.sh -- subscription-billing   (needs E2E_API_URL + a local E2E_DATABASE_URL).
 */
const { describeE2E } = require('../helpers/api');
const S = require('../helpers/subscription');

const describeBill = S.hasDb ? describeE2E : describe.skip;

const VN_MS = 7 * 3600 * 1000; // Vietnam: UTC+7, no DST
const DAY_MS = 86400000;

/** Vietnam calendar day of an instant, as YYYY-MM-DD. */
const vnKey = (d) => new Date(new Date(d).getTime() + VN_MS).toISOString().slice(0, 10);
/** Whole Vietnam civil days from the day of `a` to the day of `b`. */
const vnDaysBetween = (a, b) => Math.round((Date.parse(`${vnKey(b)}T00:00:00Z`) - Date.parse(`${vnKey(a)}T00:00:00Z`)) / DAY_MS);
/** Calendar months on the Vietnam wall clock, day clamped to the end of the month, time of day kept. */
function addMonthsVn(instant, months) {
  const wall = new Date(new Date(instant).getTime() + VN_MS);
  const y = wall.getUTCFullYear();
  const m = wall.getUTCMonth() + months;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const day = Math.min(wall.getUTCDate(), last);
  const target = Date.UTC(y, m, day, wall.getUTCHours(), wall.getUTCMinutes(), wall.getUTCSeconds(), wall.getUTCMilliseconds());
  return new Date(target - VN_MS);
}
const iso = (d) => new Date(d).toISOString();
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const MONTHLY = 100000; // VND per month

/** A plan of this suite with a price and currency (createPlan makes basePrice 0, currency USD). */
function pricedPlan(label, basePrice) {
  const id = S.createPlan(label, { outlets: -1, users: -1, products: -1, customers: -1, orders: -1 });
  S.sql(`UPDATE "Plan" SET "basePrice" = ${basePrice}, currency = 'VND', "trialDays" = 0 WHERE id = ${id} AND name LIKE 'E2E %'`);
  return id;
}

/** Put the merchant's subscription in an exact state (instants as ISO strings). */
function setPeriod(merchantId, { start, end, interval = 'monthly', intervalCount = 1, amount = MONTHLY, planId, status = 'ACTIVE' }) {
  const sets = [
    `"currentPeriodStart" = ${q(iso(start))}::timestamp`,
    `"currentPeriodEnd" = ${q(iso(end))}::timestamp`,
    `interval = ${q(interval)}`,
    `"intervalCount" = ${intervalCount}`,
    `period = ${intervalCount}`,
    `amount = ${amount}`,
    `currency = 'VND'`,
    `status = ${q(status)}`,
    `"updatedAt" = (now() at time zone 'utc')`
  ];
  if (planId) sets.push(`"planId" = ${planId}`);
  S.sql(`UPDATE "Subscription" SET ${sets.join(', ')} WHERE "merchantId" = ${merchantId}`);
}

/** The subscription row as numbers and ISO instants. */
function row(merchantId) {
  const line = S.sql(
    `SELECT id || '|' || "planId" || '|' || amount || '|' || currency || '|' || interval || '|' || "intervalCount" || '|' ||
            period || '|' || discount || '|' || status || '|' ||
            to_char("currentPeriodStart", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') || '|' ||
            to_char("currentPeriodEnd", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
       FROM "Subscription" WHERE "merchantId" = ${merchantId}`
  );
  const [id, planId, amount, currency, interval, intervalCount, period, discount, status, start, end] = line.split('|');
  return {
    id: Number(id), planId: Number(planId), amount: Number(amount), currency, interval,
    intervalCount: Number(intervalCount), period: Number(period), discount: Number(discount), status, start, end
  };
}

/** Last payment of the subscription (amount, currency). */
function lastPayment(subscriptionId) {
  const line = S.sql(
    `SELECT amount || '|' || currency FROM "Payment" WHERE "subscriptionId" = ${subscriptionId} ORDER BY id DESC LIMIT 1`
  );
  if (!line) return null;
  const [amount, currency] = line.split('|');
  return { amount: Number(amount), currency };
}
const paymentCount = (subscriptionId) => Number(S.sql(`SELECT count(*) FROM "Payment" WHERE "subscriptionId" = ${subscriptionId}`));

let adminSession;
async function admin() {
  if (!adminSession) adminSession = await S.login({ email: 'admin@rentalshop.com', password: 'admin123' });
  return adminSession;
}

const renewBody = (duration) => ({ method: 'TRANSFER', transactionId: `E2E-${Date.now()}`, duration });

// ============================================================================================================
// A. Renew (BF-BILL-01 .. 07)
// ============================================================================================================

describeBill('BF-BILL renew: price from the plan, 0/0/5/10 %, period from the end or from now', () => {
  let world;
  let subId;
  // A future end on 31 Jan 12:00 VN: + 1 month must land on 28 Feb (clamp), not 3 Mar.
  const FUTURE_END = '2027-01-31T05:00:00.000Z';
  const FUTURE_START = '2026-12-31T05:00:00.000Z';

  beforeAll(() => {
    const planId = pricedPlan('bill-renew', MONTHLY);
    world = S.createWorld('bill-renew', { planId });
    subId = row(world.merchantId).id;
  });

  test.each([
    [1, MONTHLY, 'monthly', 0],
    [3, MONTHLY * 3, 'quarterly', 0],
    [6, MONTHLY * 6 * 0.95, 'semi_annual', 5],
    [12, MONTHLY * 12 * 0.9, 'annual', 10]
  ])('BF-BILL-01 renew %i month(s) = %d VND, stored as %s with %i %% discount', async (months, price, interval, discount) => {
    // an annual subscription: before #779 the stored yearly amount was multiplied by the months
    setPeriod(world.merchantId, { start: FUTURE_START, end: FUTURE_END, interval: 'annual', intervalCount: 12, amount: MONTHLY * 12 * 0.9 });
    const a = await admin();
    const r = await a.post(`/api/subscriptions/${subId}/renew`, renewBody(months));
    expect({ status: r.status, code: r.body?.code }).toEqual({ status: 200, code: 'SUBSCRIPTION_RENEWED_SUCCESS' });
    expect(lastPayment(subId)).toEqual({ amount: price, currency: 'VND' });
    expect(row(world.merchantId)).toMatchObject({ amount: price, interval, intervalCount: months, period: months, discount, status: 'ACTIVE' });
    expect(r.body.data.renewal).toMatchObject({ totalDue: price, months, discountPercent: discount, expired: false });
  });

  test('BF-BILL-02 not expired: continues from the current end, 31 Jan + 1 month = 28 Feb (days left kept)', async () => {
    setPeriod(world.merchantId, { start: FUTURE_START, end: FUTURE_END });
    const a = await admin();
    const r = await a.post(`/api/subscriptions/${subId}/renew`, renewBody(1));
    expect(r.status).toBe(200);
    expect(row(world.merchantId)).toMatchObject({ start: FUTURE_END, end: '2027-02-28T05:00:00.000Z' });
  });

  test('BF-BILL-03 expired 30 days ago: the new period starts at renewal time, one calendar month', async () => {
    const now = Date.now();
    setPeriod(world.merchantId, { start: new Date(now - 60 * DAY_MS), end: new Date(now - 30 * DAY_MS) });
    const a = await admin();
    const before = Date.now();
    const r = await a.post(`/api/subscriptions/${subId}/renew`, renewBody(1));
    const after = Date.now();
    expect(r.status).toBe(200);
    const s = row(world.merchantId);
    const start = Date.parse(s.start);
    expect(start).toBeGreaterThanOrEqual(before - 1000);
    expect(start).toBeLessThanOrEqual(after + 1000);
    expect(s.end).toBe(iso(addMonthsVn(s.start, 1)));
    expect(Date.parse(s.end)).toBeGreaterThan(after); // no longer "ACTIVE with an end in the past"
    expect(r.body.data.renewal.expired).toBe(true);
  });

  test('BF-BILL-04 a duration other than 1/3/6/12 months: 400 INVALID_DURATION, nothing written', async () => {
    setPeriod(world.merchantId, { start: FUTURE_START, end: FUTURE_END });
    const paymentsBefore = paymentCount(subId);
    const before = row(world.merchantId);
    const a = await admin();
    const r = await a.post(`/api/subscriptions/${subId}/renew`, renewBody(2));
    expect({ status: r.status, code: r.body?.code }).toEqual({ status: 400, code: 'INVALID_DURATION' });
    expect(paymentCount(subId)).toBe(paymentsBefore);
    expect(row(world.merchantId)).toEqual(before);
  });

  test('BF-BILL-05 the merchant renews its own subscription', async () => {
    setPeriod(world.merchantId, { start: FUTURE_START, end: FUTURE_END });
    const m = await S.login(world.merchant);
    const r = await m.post(`/api/subscriptions/${subId}/renew`, renewBody(1));
    expect(r.status).toBe(200);
    expect(lastPayment(subId)).toEqual({ amount: MONTHLY, currency: 'VND' });
  });

  test("BF-BILL-06 another merchant cannot renew this subscription: 403, nothing written", async () => {
    setPeriod(world.merchantId, { start: FUTURE_START, end: FUTURE_END });
    const other = S.createWorld('bill-renew-other', { planId: pricedPlan('bill-renew-other', MONTHLY) });
    const m = await S.login(other.merchant);
    const paymentsBefore = paymentCount(subId);
    const before = row(world.merchantId);
    const r = await m.post(`/api/subscriptions/${subId}/renew`, renewBody(1));
    expect(r.status).toBe(403);
    expect(paymentCount(subId)).toBe(paymentsBefore);
    expect(row(world.merchantId)).toEqual(before);
  });
});

// ============================================================================================================
// B. Extend preview (BF-BILL-07 .. 08)
// ============================================================================================================

describeBill('BF-BILL extend preview: priced from the plan, expired counts from today', () => {
  let world;
  let subId;

  beforeAll(() => {
    world = S.createWorld('bill-extend', { planId: pricedPlan('bill-extend', MONTHLY) });
    subId = row(world.merchantId).id;
  });

  test('BF-BILL-07 one calendar month after a future end costs one month, in the plan currency (was 0 and VND)', async () => {
    const end = '2027-03-10T16:59:59.999Z'; // 10 Mar 23:59 VN
    setPeriod(world.merchantId, { start: '2027-02-10T16:59:59.999Z', end });
    const newEnd = '2027-04-10T16:59:59.999Z';
    const a = await admin();
    const r = await a.get(`/api/subscriptions/${subId}/extend/calculate?newEndDate=${encodeURIComponent(newEnd)}&billingInterval=monthly`);
    expect(r.status).toBe(200);
    const d = r.body.data;
    const total = d.totalPrice ?? d.pricing?.totalPrice ?? d.extension?.totalPrice;
    expect(total).toBeCloseTo(MONTHLY, 0);
    expect(JSON.stringify(d)).toContain('"currency":"VND"');
  });

  test('BF-BILL-08 expired 20 days ago: the extension counts from today, not from the old end', async () => {
    const now = Date.now();
    setPeriod(world.merchantId, { start: new Date(now - 50 * DAY_MS), end: new Date(now - 20 * DAY_MS) });
    const newEnd = new Date(now + 10 * DAY_MS);
    const a = await admin();
    const r = await a.get(`/api/subscriptions/${subId}/extend/calculate?newEndDate=${encodeURIComponent(iso(newEnd))}&billingInterval=monthly`);
    expect(r.status).toBe(200);
    const d = r.body.data;
    const days = d.extensionDays ?? d.extension?.extensionDays ?? d.pricing?.extensionDays;
    expect(days).toBe(vnDaysBetween(new Date(now), newEnd)); // 10, not 30
  });
});

// ============================================================================================================
// C. Change plan (BF-BILL-09 .. 11)
// ============================================================================================================

describeBill('BF-BILL change plan: credit for unused days, new period from now, cycle fields stored', () => {
  let world;
  let subId;
  let basic;
  let pro;

  beforeAll(() => {
    basic = pricedPlan('bill-basic', MONTHLY);
    pro = pricedPlan('bill-pro', MONTHLY * 3);
    world = S.createWorld('bill-change', { planId: basic });
    subId = row(world.merchantId).id;
  });

  test('BF-BILL-09 Basic 100,000 → Pro 300,000 mid-period: due = 300,000 − unused days × 100,000 / period days', async () => {
    const now = Date.now();
    const start = new Date(now - 9 * DAY_MS);
    const end = new Date(now + 22 * DAY_MS);
    setPeriod(world.merchantId, { start, end, planId: basic });
    const periodDays = vnDaysBetween(start, end);
    const a = await admin();
    const before = Date.now();
    const r = await a.post(`/api/subscriptions/${subId}/change-plan`, { planId: pro, billingInterval: 'monthly' });
    expect({ status: r.status, code: r.body?.code }).toEqual({ status: 200, code: 'PLAN_CHANGED_SUCCESS' });

    const remaining = vnDaysBetween(new Date(before), end);
    const credit = (remaining / periodDays) * MONTHLY;
    const pc = r.body.data.planChange;
    expect(pc.remainingDays).toBe(remaining);
    expect(pc.remainingCreditValue).toBeCloseTo(credit, 2);
    expect(pc.amountDue).toBeCloseTo(MONTHLY * 3 - credit, 2);
    expect(pc.currency).toBe('VND');

    const s = row(world.merchantId);
    expect(s).toMatchObject({ planId: pro, amount: MONTHLY * 3, currency: 'VND', interval: 'monthly', intervalCount: 1, period: 1, discount: 0 });
    expect(Math.abs(Date.parse(s.start) - before)).toBeLessThan(60000);
    expect(s.end).toBe(iso(addMonthsVn(s.start, 1)));
  });

  test('BF-BILL-10 quarterly: the new period is 3 calendar months (not 90 × 24h), stored as 3 months', async () => {
    const now = Date.now();
    setPeriod(world.merchantId, { start: new Date(now - 5 * DAY_MS), end: new Date(now + 25 * DAY_MS), planId: basic });
    const a = await admin();
    const r = await a.post(`/api/subscriptions/${subId}/change-plan`, { planId: pro, billingInterval: 'quarterly' });
    expect(r.status).toBe(200);
    const s = row(world.merchantId);
    expect(s).toMatchObject({ interval: 'quarterly', intervalCount: 3, period: 3, amount: MONTHLY * 3 * 3 });
    expect(s.end).toBe(iso(addMonthsVn(s.start, 3)));
  });

  test('BF-BILL-12 the admin merchant page (PUT /api/merchants/[id]/plan): the server prices it, a client total is ignored', async () => {
    const now = Date.now();
    const start = new Date(now - 9 * DAY_MS);
    const end = new Date(now + 22 * DAY_MS);
    setPeriod(world.merchantId, { start, end, planId: basic });
    const a = await admin();
    const before = Date.now();
    const r = await a.put(`/api/merchants/${world.merchantId}/plan`, {
      planId: pro, billingInterval: 'annual', totalPrice: 1, duration: 12, discount: 50
    });
    expect(r.status).toBe(200);
    const s = row(world.merchantId);
    expect(s).toMatchObject({ planId: pro, amount: MONTHLY * 3 * 12 * 0.9, discount: 10, interval: 'annual', intervalCount: 12, currency: 'VND' });
    expect(s.end).toBe(iso(addMonthsVn(s.start, 12)));
    const credit = (vnDaysBetween(new Date(before), end) / vnDaysBetween(start, end)) * MONTHLY;
    expect(r.body.data.planChange.amountDue).toBeCloseTo(MONTHLY * 3 * 12 * 0.9 - credit, 2);
  });

  test("BF-BILL-11 another merchant cannot change this subscription's plan: 403, nothing written", async () => {
    setPeriod(world.merchantId, { start: new Date(Date.now() - DAY_MS), end: new Date(Date.now() + 29 * DAY_MS), planId: basic });
    const other = S.createWorld('bill-change-other', { planId: pricedPlan('bill-change-other', MONTHLY) });
    const m = await S.login(other.merchant);
    const before = row(world.merchantId);
    const r = await m.post(`/api/subscriptions/${subId}/change-plan`, { planId: pro, billingInterval: 'annual' });
    expect(r.status).toBe(403);
    expect(row(world.merchantId)).toEqual(before);
  });
});
