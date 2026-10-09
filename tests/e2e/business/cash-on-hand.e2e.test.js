/**
 * BF-CASH (#710): cash on hand for reconciliation includes collateral (thế chân).
 * - revenue.cashCollected = collected + collateral received − collateral returned (in the period)
 * - series[].expectedCash (from today on) = expectedCollected + collateral to receive on the pickup day
 *   − collateral to hand back on the return day (rentals with returnPlanAt not yet passed).
 * Old fields keep their meaning: collected, expectedCollected, collateralFlow, totalOrderValue.
 */
function addDayKey(key, n) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const {
  Session,
  describeE2E,
  vnDateKey,
  rentBody,
  futureWindow,
  overviewNumbers
} = require('../helpers/api');

/** The series point of one day (keys are `YYYY/MM/DD` or `YYYY-MM-DD`) */
function pointOf(report, day) {
  return (report.series || []).find((p) => p.date && p.date.replace(/\//g, '-') === day) || null;
}

describeE2E('BF-CASH cash on hand includes collateral (#710)', () => {
  let s;
  const today = vnDateKey();

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  test('BF-CASH-01 cashCollected = collected + collateral received − returned', async () => {
    const report = await s.period(today, today);
    const n = overviewNumbers(report);
    const flow = report.revenue.collateralFlow || { received: 0, returned: 0 };
    expect(report.revenue.cashCollected).toBe(n.collected + (flow.received || 0) - (flow.returned || 0));
  });

  test('BF-CASH-02 expectedCash on a pickup day adds the collateral to receive', async () => {
    const rentP = await s.createProduct({ kind: 'DAILY', price: 70000, stock: 5 });
    const c = await s.createCustomer();
    const w = futureWindow(2);
    // other tests may book the same day: compare the change the new order makes
    const before = pointOf(await s.period(today, w.from), w.from) || {};
    // 2 days x 70k = 140k, deposit 50k -> expected 90k on the pickup day; collateral 300k to receive that day
    await s.createOrder(rentBody({ customer: c, lines: [{ product: rentP }], from: w.from, to: w.to, depositAmount: 50000, securityDeposit: 300000 }).body);
    const after = pointOf(await s.period(today, w.from), w.from);
    expect(after.expectedCollected - (before.expectedCollected || 0)).toBe(90000);
    expect(after.expectedCash - (before.expectedCash || 0)).toBe(90000 + 300000);
  });

  test('BF-CASH-03 expectedCash on a return day subtracts the collateral handed back', async () => {
    const rentP = await s.createProduct({ kind: 'DAILY', price: 70000, stock: 5 });
    const c = await s.createCustomer();
    const w = futureWindow(2);
    const before = pointOf(await s.period(today, w.to), w.to) || {};
    const o = await s.createOrder(rentBody({ customer: c, lines: [{ product: rentP }], from: w.from, to: w.to }).body);
    // picked up with collateral 200k; due back on w.to, so that day expects 200k less
    await s.setStatus(o.id, 'PICKUPED', { securityDeposit: 200000 });
    const after = pointOf(await s.period(today, w.to), w.to);
    expect(after.expectedCash - (before.expectedCash || 0)).toBe(-200000);
  });

  test('BF-CASH-04 series cashCollected: the days add up to revenue.cashCollected (#711)', async () => {
    const report = await s.period(addDayKey(today, -6), today);
    const perDay = (report.series || []).reduce((sum, p) => sum + (p.cashCollected || 0), 0);
    expect(perDay).toBe(report.revenue.cashCollected);
  });

  test('BF-CASH-05 a pickup today adds its collateral to that day\'s cash', async () => {
    const rentP = await s.createProduct({ kind: 'DAILY', price: 70000, stock: 5 });
    const c = await s.createCustomer();
    const w = futureWindow(2);
    const o = await s.createOrder(rentBody({ customer: c, lines: [{ product: rentP }], from: w.from, to: w.to }).body);
    const before = pointOf(await s.period(today, today), today) || {};
    await s.setStatus(o.id, 'PICKUPED', { securityDeposit: 120000 });
    const after = pointOf(await s.period(today, today), today);
    expect(after.cashCollected - (before.cashCollected || 0)).toBe((after.collected - (before.collected || 0)) + 120000);
  });
});

