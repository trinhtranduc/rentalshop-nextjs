/**
 * BF-STAT: each Overview tile equals the sum of the rows its tap opens (apps: GET /api/analytics/income/orders).
 *
 * - "Giá trị đơn mới" = totalOrderValue (orders created in the period, cancelled excluded): the rows of status=new
 *   add up to the same money; a cancelled order is listed and adds 0 (#707, owner decision).
 * - "Thế chân" = collateralFlow received − returned: the `collateral` of every event row (status=all, #721) must add up
 *   to it. The pickup / return buckets list orders by day and do not net a same-day pickup + return or + cancel.
 * - "Thực thu" = revenue.cashCollected: the revenue of every event in the period (status=all) must add up to it.
 */
const {
  Session,
  describeE2E,
  vnDateKey,
  rentBody,
  futureWindow,
  overviewNumbers
} = require('../helpers/api');

/** Rows of GET /api/analytics/income/orders for one bucket of the period, every page (as the apps load them) */
async function incomeRows(s, status, from, to = from) {
  const rows = [];
  for (let offset = 0; offset < 20000; offset += 200) {
    const r = await s.get(`/api/analytics/income/orders?status=${status}&startDate=${from}&endDate=${to}&limit=200&offset=${offset}&plan=false`);
    if (!r.ok) throw new Error(`income orders ${status} failed: HTTP ${r.status}`);
    const page = ((r.body.data || {}).days || []).flatMap((d) => d.orders || []);
    rows.push(...page);
    if (!r.body.data?.pagination?.hasMore || page.length === 0) break;
  }
  return rows;
}

const sumCollateral = (rows) => rows.reduce((sum, r) => sum + (Number(r.collateral) || 0), 0);

describeE2E('BF-STAT Overview tiles agree with the rows their tap opens', () => {
  let s;
  const today = vnDateKey();

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  // #707, owner decision (2026-10-09): a cancelled order is listed with value 0, the apps show it that way and the rows
  // still add up to the tile because only the orders that are not cancelled add money.
  test('BF-STAT-01 Giá trị đơn mới: the new-orders rows add up to totalOrderValue (a cancelled order is listed and adds 0)', async () => {
    const rentP = await s.createProduct({ kind: 'DAILY', price: 70000, stock: 5 });
    const c1 = await s.createCustomer();
    const c2 = await s.createCustomer();
    const w = futureWindow(2);
    await s.createOrder(rentBody({ customer: c1, lines: [{ product: rentP }], from: w.from, to: w.to, depositAmount: 20000 }).body);
    const cancelled = await s.createOrder(rentBody({ customer: c2, lines: [{ product: rentP }], from: w.from, to: w.to }).body);
    await s.setStatus(cancelled.id, 'CANCELLED');

    const report = await s.period(today, today);
    const rows = await incomeRows(s, 'new', today);
    const money = rows.filter((r) => r.status !== 'CANCELLED').reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
    expect(rows.some((r) => r.id === cancelled.id && r.status === 'CANCELLED')).toBe(true);
    expect(money).toBe(report.revenue.totalOrderValue);
  });

  test('BF-STAT-02 Thế chân: a hand-over adds its collateral to the event rows; a same-day hand-over then cancel adds none (#721)', async () => {
    const rentP = await s.createProduct({ kind: 'DAILY', price: 70000, stock: 5 });
    const w = futureWindow(2);
    const kept = await s.createOrder(rentBody({ customer: await s.createCustomer(), lines: [{ product: rentP }], from: w.from, to: w.to }).body);
    await s.setStatus(kept.id, 'PICKUPED', { securityDeposit: 300000 });
    const undone = await s.createOrder(rentBody({ customer: await s.createCustomer(), lines: [{ product: rentP }], from: w.from, to: w.to }).body);
    await s.setStatus(undone.id, 'PICKUPED', { securityDeposit: 400000 });
    await s.setStatus(undone.id, 'CANCELLED');

    const rows = await incomeRows(s, 'all', today);
    expect(sumCollateral(rows.filter((r) => r.id === kept.id))).toBe(300000);
    // handed over and cancelled the same day: the collateral went back, the tile and the rows move none
    expect(sumCollateral(rows.filter((r) => r.id === undone.id))).toBe(0);
  });

  test('BF-STAT-03 Thực thu: the revenue of every event in the period adds up to cashCollected (collateral included)', async () => {
    const report = await s.period(today, today);
    const rows = await incomeRows(s, 'all', today);
    const revenue = rows.reduce((sum, r) => sum + (Number(r.revenue) || 0), 0);
    expect(revenue).toBe(report.revenue.cashCollected);
  });

  test('BF-STAT-04 Thế chân: the collateral of every event row adds up to collateralFlow received − returned (#721)', async () => {
    const report = await s.period(today, today);
    const flow = report.revenue.collateralFlow || { received: 0, returned: 0 };
    const rows = await incomeRows(s, 'all', today);
    expect(sumCollateral(rows)).toBe((flow.received || 0) - (flow.returned || 0));
  });
});
