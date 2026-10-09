/**
 * BF-STAT: each Overview tile equals the sum of the rows its tap opens (apps: GET /api/analytics/income/orders).
 *
 * - "Giá trị đơn mới" = totalOrderValue (orders created in the period, cancelled excluded): the rows of status=new
 *   must add up to the same money, so a cancelled order must not be in that list.
 * - "Thế chân" = collateralFlow.received (security deposits of rentals picked up in the period): the rows of
 *   status=pickup must add up to it.
 * - "Thực thu" = revenue.collected: the revenue of every event in the period (status=all) must add up to it.
 */
const {
  Session,
  describeE2E,
  vnDateKey,
  rentBody,
  futureWindow,
  overviewNumbers,
  knownBug
} = require('../helpers/api');

/** Rows of GET /api/analytics/income/orders for one bucket of the period */
async function incomeRows(s, status, from, to = from) {
  const r = await s.get(`/api/analytics/income/orders?status=${status}&startDate=${from}&endDate=${to}&limit=500`);
  if (!r.ok) throw new Error(`income orders ${status} failed: HTTP ${r.status}`);
  return ((r.body.data || {}).days || []).flatMap((d) => d.orders || []);
}

describeE2E('BF-STAT Overview tiles agree with the rows their tap opens', () => {
  let s;
  const today = vnDateKey();

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  knownBug('#707', 'BF-STAT-01 Giá trị đơn mới: the new-orders rows add up to totalOrderValue (no cancelled rows)', async () => {
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
    expect(rows.some((r) => r.status === 'CANCELLED')).toBe(false);
    expect(money).toBe(report.revenue.totalOrderValue);
  });

  test('BF-STAT-02 Thế chân: the pickup rows add up to the collateral received in the period', async () => {
    const rentP = await s.createProduct({ kind: 'DAILY', price: 70000, stock: 5 });
    const c = await s.createCustomer();
    const w = futureWindow(2);
    const o = await s.createOrder(rentBody({ customer: c, lines: [{ product: rentP }], from: w.from, to: w.to }).body);
    await s.setStatus(o.id, 'PICKUPED', { securityDeposit: 300000 });

    const report = await s.period(today, today);
    const rows = await incomeRows(s, 'pickup', today);
    const collateral = rows.reduce((sum, r) => sum + (Number(r.securityDeposit) || 0), 0);
    expect(collateral).toBe(report.operational.collateralFlow?.received ?? report.revenue.collateralFlow?.received);
  });

  test('BF-STAT-03 Thực thu: the revenue of every event in the period adds up to cashCollected (collateral included)', async () => {
    const report = await s.period(today, today);
    const rows = await incomeRows(s, 'all', today);
    const revenue = rows.reduce((sum, r) => sum + (Number(r.revenue) || 0), 0);
    expect(revenue).toBe(report.revenue.cashCollected);
  });

  test('BF-STAT-04 Thế chân: the net of pickup rows and return rows equals collateralFlow received − returned', async () => {
    const report = await s.period(today, today);
    const pick = (await incomeRows(s, 'pickup', today)).reduce((sum, r) => sum + (Number(r.securityDeposit) || 0), 0);
    const back = (await incomeRows(s, 'return', today)).reduce((sum, r) => sum + (Number(r.securityDeposit) || 0), 0);
    const flow = report.revenue.collateralFlow || { received: 0, returned: 0 };
    expect(pick - back).toBe((flow.received || 0) - (flow.returned || 0));
  });
});
