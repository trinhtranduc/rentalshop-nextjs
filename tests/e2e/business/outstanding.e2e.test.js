/**
 * BF-OUT: "Còn phải thu" on Overview is the same money and the same orders as the list a tap opens.
 *
 * The tile is `revenue.outstanding` of the period: orders CREATED in the period, not cancelled, owing
 * (rent RESERVED: total - deposit; sale not COMPLETED: total), split into atPickup / overduePickup (#494).
 * The tap must list exactly those orders: GET /api/orders with status RESERVED, the same civil days on
 * createdAt, and rows that still owe money. Orders from other days or fully deposited rentals are not in it.
 */
const {
  Session,
  describeE2E,
  vnDateKey,
  rentBody,
  futureWindow,
  overviewNumbers
} = require('../helpers/api');

/** What an order still owes, as the period report counts it (packages/utils/src/analytics/order-value.ts) */
function owedOf(order) {
  if (order.status === 'CANCELLED') return 0;
  const total = Number(order.totalAmount) || 0;
  if (order.orderType === 'RENT' && order.status === 'RESERVED') return Math.max(0, total - (Number(order.depositAmount) || 0));
  if (order.orderType === 'SALE' && order.status !== 'COMPLETED') return total;
  return 0;
}

/** The orders the tap opens: RESERVED, created on the period's days, still owing money */
async function listedOutstanding(s, from, to) {
  // every page: the shared e2e database holds more than one page of booked orders by the end of a run
  const rows = [];
  for (let page = 1; page <= 100; page++) {
    const data = await s.get(
      `/api/orders?${new URLSearchParams({ status: 'RESERVED', startDate: from, endDate: to, dateField: 'createdAt', sortBy: 'pickupPlanAt', sortOrder: 'asc', limit: '100', page: String(page) })}`
    );
    if (!data.ok) throw new Error(`list orders failed: HTTP ${data.status}`);
    const body = data.body.data || {};
    const items = body.orders || body.items || [];
    rows.push(...items);
    if (!body.hasMore || items.length === 0) break;
  }
  return rows.map((o) => ({ id: o.id, owed: owedOf(o), orderType: o.orderType, pickupPlanAt: o.pickupPlanAt })).filter((r) => r.owed > 0);
}

describeE2E('BF-OUT Còn phải thu: tile and tap show the same orders and money', () => {
  let s;
  const today = vnDateKey();

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  test('BF-OUT-01 a booked rental owes total - deposit, and a fully deposited one owes nothing', async () => {
    const rentP = await s.createProduct({ kind: 'DAILY', price: 70000, stock: 5 });
    const c1 = await s.createCustomer();
    const c2 = await s.createCustomer();
    const w = futureWindow(2);

    // 2 days x 70k = 140k; deposit 50k -> owes 90k
    const partly = await s.createOrder(rentBody({ customer: c1, lines: [{ product: rentP }], from: w.from, to: w.to, depositAmount: 50000 }).body);
    // deposit = total -> owes 0, not listed
    const paid = await s.createOrder(rentBody({ customer: c2, lines: [{ product: rentP }], from: w.from, to: w.to, depositAmount: 140000 }).body);

    const a = await s.getOrder(partly.id);
    const b = await s.getOrder(paid.id);
    expect(owedOf(a)).toBe(90000);
    expect(owedOf(b)).toBe(0);
  });

  test('BF-OUT-02 the tile equals the money of the orders the tap lists', async () => {
    const rentP = await s.createProduct({ kind: 'DAILY', price: 70000, stock: 5 });
    const c = await s.createCustomer();
    const w = futureWindow(3);
    await s.createOrder(rentBody({ customer: c, lines: [{ product: rentP }], from: w.from, to: w.to, depositAmount: 20000 }).body);

    const report = await s.period(today, today);
    const n = overviewNumbers(report);
    const listed = await listedOutstanding(s, today, today);

    const listedMoney = listed.reduce((sum, r) => sum + r.owed, 0);
    expect(listedMoney).toBe(n.outstanding);
    expect(listed.length).toBe(report.revenue.outstandingBreakdown.atPickup.orders + report.revenue.outstandingBreakdown.overduePickup.orders);
  });

  test('BF-OUT-03 orders created on other days are not in the tap (the list is filtered by creation day)', async () => {
    const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
    const report = await s.period(yesterday, yesterday);
    const listed = await listedOutstanding(s, yesterday, yesterday);
    const n = overviewNumbers(report);
    expect(listed.reduce((sum, r) => sum + r.owed, 0)).toBe(n.outstanding);
    // the period's list must not contain today's orders
    const todays = await listedOutstanding(s, today, today);
    const ids = new Set(listed.map((r) => r.id));
    for (const r of todays) expect(ids.has(r.id)).toBe(false);
  });
});
