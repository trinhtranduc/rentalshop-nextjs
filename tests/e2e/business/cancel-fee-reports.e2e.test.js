/**
 * BF-CANCEL-REP (#1500): a cancelled order that kept a fee (phụ thu, #1491) counts as revenue in every report, not only in
 * Tổng quan. Order of 50.000.000, deposit 50.000.000, cancelled with a fee of 20.000.000: its revenue goes 50.000.000 -> 20.000.000.
 * The amounts are large so the customer stays at the top of the (short) top customers list of a database full of test orders.
 * Expected numbers come from that case, never from the API.
 */
const { Session, describeE2E, vnDateKey, futureWindow, rentBody } = require('../helpers/api');

const num = (o, path) => path.split('.').reduce((v, k) => (v == null ? v : v[k]), o) ?? 0;

describeE2E('BF-CANCEL-REP reports count the fee of a cancelled order (#1500)', () => {
  let s;
  const day = vnDateKey();
  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  const read = async (path, pick) => {
    const r = await s.get(path);
    expect(r.status).toBe(200);
    return pick(r.body.data ?? r.body);
  };

  test('BF-CANCEL-REP-01 dashboard, top customers and top outlets', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 50000000, stock: 2 });
    const customer = await s.createCustomer();
    const w = futureWindow(5, 3);
    const { body } = rentBody({ customer, lines: [{ product }], from: w.from, to: w.to, depositAmount: 50000000 });
    const order = await s.createOrder(body);

    const dashboard = () => read('/api/analytics/dashboard?period=today', (d) => num(d, 'overview.totalRevenue'));
    const customerSpent = () =>
      read(`/api/analytics/top-customers?startDate=${day}&endDate=${day}`, (d) => {
        const rows = Array.isArray(d) ? d : d.items || d.customers || [];
        const row = rows.find((c) => c.id === customer.id || c.customerId === customer.id);
        return row ? row.totalSpent : 0;
      });
    const outlets = () =>
      read(`/api/analytics/top-outlets?startDate=${day}&endDate=${day}&limit=100`, (d) =>
        (d.items || []).reduce((sum, o) => sum + (o.totalRevenue || 0), 0),
      );

    const before = { dashboard: await dashboard(), customer: await customerSpent(), outlets: await outlets() };
    expect(before.customer).toBe(50000000);

    const r = await s.setStatus(order.id, 'CANCELLED', { cancelKeptAmount: 20000000 });
    expect(r.status).toBe(200);

    // the order's revenue is the fee: 50.000.000 -> 20.000.000
    expect(await customerSpent()).toBe(20000000);
    expect((await dashboard()) - before.dashboard).toBe(-30000000);
    expect((await outlets()) - before.outlets).toBe(-30000000);
  });

  test('BF-CANCEL-REP-02 a cancel without a fee still counts for nothing', async () => {
    const product = await s.createProduct({ kind: 'FIXED', price: 50000000, stock: 2 });
    const customer = await s.createCustomer();
    const w = futureWindow(5, 3);
    const { body } = rentBody({ customer, lines: [{ product }], from: w.from, to: w.to, depositAmount: 50000000 });
    const order = await s.createOrder(body);
    expect((await s.setStatus(order.id, 'CANCELLED', {})).status).toBe(200);
    const r = await s.get(`/api/analytics/top-customers?startDate=${day}&endDate=${day}`);
    const d = r.body.data ?? r.body;
    const rows = Array.isArray(d) ? d : d.items || d.customers || [];
    expect(rows.some((c) => c.id === customer.id || c.customerId === customer.id)).toBe(false);
  });
});
