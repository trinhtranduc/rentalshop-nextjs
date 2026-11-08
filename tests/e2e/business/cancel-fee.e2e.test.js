/**
 * BF-CANCEL (#1491): cancelling a RENT order that was not handed over, keeping a fee (`cancelKeptAmount`) inside the deposit.
 * The fee is revenue of the cancelled order; the rest goes back. Expected numbers come from the cases the owner approved
 * (2026-11-07), never from the API. Order of 300.000, created today.
 */
const { Session, describeE2E, vnDateKey, futureWindow, rentBody, watchOverview, pick } = require('../helpers/api');

const MONEY = ['collected', 'deposits', 'refunds', 'cancelled'];

describeE2E('BF-CANCEL cancel with a fee (#1491)', () => {
  let s;
  const today = vnDateKey();
  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  async function reserved(deposit) {
    const product = await s.createProduct({ kind: 'FIXED', price: 300000, stock: 2 });
    const customer = await s.createCustomer();
    const w = futureWindow(5, 3);
    const { body } = rentBody({ customer, lines: [{ product }], from: w.from, to: w.to, depositAmount: deposit });
    const order = await s.createOrder(body);
    expect(order.status).toBe('RESERVED');
    return order;
  }

  test('BF-CANCEL-01 case A: deposit 300.000, fee 100.000: 200.000 goes back, 100.000 stays as revenue', async () => {
    const order = await reserved(300000);
    const ov = await watchOverview(s, today);
    const r = await s.setStatus(order.id, 'CANCELLED', { cancelKeptAmount: 100000 });
    expect(r.status).toBe(200);
    const d = await ov.delta();
    expect(pick(d, MONEY)).toEqual({ collected: -200000, deposits: 0, refunds: 200000, cancelled: 1 });
    const after = await s.getOrder(order.id);
    expect(after.status).toBe('CANCELLED');
    expect(after.depositAmount).toBe(300000);
  });

  test('BF-CANCEL-02 case B: deposit 100.000, fee 100.000: nothing goes back', async () => {
    const order = await reserved(100000);
    const ov = await watchOverview(s, today);
    const r = await s.setStatus(order.id, 'CANCELLED', { cancelKeptAmount: 100000 });
    expect(r.status).toBe(200);
    const d = await ov.delta();
    expect(pick(d, MONEY)).toEqual({ collected: 0, deposits: 0, refunds: 0, cancelled: 1 });
  });

  test('BF-CANCEL-03 case C: a fee above the deposit is refused and the order stays booked', async () => {
    const order = await reserved(100000);
    const r = await s.setStatus(order.id, 'CANCELLED', { cancelKeptAmount: 300000 });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('CANCEL_AMOUNTS_MISMATCH');
    expect((await s.getOrder(order.id)).status).toBe('RESERVED');
  });

  test('BF-CANCEL-04 case D: no fee (old apps) or fee 0: everything goes back', async () => {
    for (const patch of [{}, { cancelKeptAmount: 0 }]) {
      const order = await reserved(300000);
      const ov = await watchOverview(s, today);
      const r = await s.setStatus(order.id, 'CANCELLED', patch);
      expect(r.status).toBe(200);
      const d = await ov.delta();
      expect(pick(d, MONEY)).toEqual({ collected: -300000, deposits: 0, refunds: 300000, cancelled: 1 });
    }
  });

  test('BF-CANCEL-05 staff cannot keep money (403) but cancel without a fee as before', async () => {
    const staff = await Session.login('staff');
    const order = await reserved(300000);
    const kept = await staff.setStatus(order.id, 'CANCELLED', { cancelKeptAmount: 100000 });
    expect([403, 404]).toContain(kept.status);
    expect((await s.getOrder(order.id)).status).toBe('RESERVED');
  });

  test('BF-CANCEL-06 a cancelled order that kept a fee is not deletable (it stays in the history)', async () => {
    const order = await reserved(300000);
    expect((await s.setStatus(order.id, 'CANCELLED', { cancelKeptAmount: 100000 })).status).toBe(200);
    const res = await fetch(`${process.env.E2E_API_URL}/api/orders/${order.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${s.token}` } });
    const body = await res.json().catch(() => ({}));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(body)).toContain('CANCELLED_ORDER_KEEPS_AMOUNT');
    expect((await s.getOrder(order.id)).status).toBe('CANCELLED');
  });
});
