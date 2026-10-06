/**
 * BF-DAY: Vietnam civil days (Asia/Ho_Chi_Minh, UTC+7) everywhere a day is shown (#355, skill timezone-dates).
 * scripts/e2e/business-e2e.sh runs this suite twice, with the API and Jest under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
const { Session, describeE2E, vnDateKey, vnAt, addDays, futureWindow, rentBody, watchOverview, pick } = require('../helpers/api');

describeE2E('BF-DAY Vietnam day boundaries', () => {
  let s;
  const today = vnDateKey();

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  const rentOrder = async (w, extra = {}) => {
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
    const o = await s.createOrder(rentBody({ customer: await s.createCustomer(), lines: [{ product: p }], from: w.from, to: w.to, ...extra }).body);
    return { p, o };
  };

  test('BF-DAY-01 a hand-over at 06:30 VN (23:30 UTC the day before) counts on the VN day', async () => {
    const w = futureWindow(2);
    const P = w.from;
    const ovP = await watchOverview(s, P);
    const ovBefore = await watchOverview(s, addDays(P, -1));
    const { o } = await rentOrder(w);
    const at = vnAt(P, '06:30');
    expect(at.toISOString().slice(0, 10)).toBe(addDays(P, -1)); // the UTC date is the day before
    await s.setStatus(o.id, 'PICKUPED', { pickedUpAt: at.toISOString() });
    expect(pick(await ovP.delta(), ['collected', 'pickups', 'seriesCollected'])).toEqual({ collected: 100000, pickups: 1, seriesCollected: 100000 });
    expect(pick(await ovBefore.delta(), ['collected', 'pickups'])).toEqual({ collected: 0, pickups: 0 });
    const daily = await s.incomeDaily(P);
    const row = daily.days.find((d) => d.date === P.replace(/-/g, '/'));
    expect(row.orders.some((x) => x.id === o.id && x.revenueType === 'RENT_PICKUP')).toBe(true);
  });

  test('BF-DAY-02 a return at 23:30 VN stays on that VN day; 00:15 VN is the next VN day', async () => {
    const w = futureWindow(3);
    const R = w.to;
    const ovR = await watchOverview(s, R);
    const ovNext = await watchOverview(s, addDays(R, 1));
    const a = await rentOrder(w);
    const b = await rentOrder(w);
    for (const { o } of [a, b]) await s.setStatus(o.id, 'PICKUPED', { pickedUpAt: vnAt(w.from, '09:00').toISOString() });
    await s.updateOrder(a.o.id, { lateFee: 11000 });
    await s.updateOrder(b.o.id, { lateFee: 22000 });
    await s.setStatus(a.o.id, 'RETURNED', { returnedAt: vnAt(R, '23:30').toISOString() });
    await s.setStatus(b.o.id, 'RETURNED', { returnedAt: vnAt(addDays(R, 1), '00:15').toISOString() });
    expect(pick(await ovR.delta(), ['collected', 'returns'])).toEqual({ collected: 11000, returns: 1 });
    expect(pick(await ovNext.delta(), ['collected', 'returns'])).toEqual({ collected: 22000, returns: 1 });
  });

  test('BF-DAY-03 an order created now is a new order of today in Vietnam', async () => {
    const utcKey = new Date().toISOString().slice(0, 10);
    const ovToday = await watchOverview(s, today);
    const ovUtc = utcKey !== today ? await watchOverview(s, utcKey) : null;
    await rentOrder(futureWindow(1), { depositAmount: 5000 });
    expect(pick(await ovToday.delta(), ['newOrders', 'collected'])).toEqual({ newOrders: 1, collected: 5000 });
    if (ovUtc) expect(pick(await ovUtc.delta(), ['newOrders', 'collected'])).toEqual({ newOrders: 0, collected: 0 });
  });

  test('BF-DAY-04 availability reads days in Vietnam, also for the old apps\' UTC day windows', async () => {
    const w = futureWindow(1); // X .. X
    const { p } = await rentOrder(w);
    const X = w.from;
    const utcWindow = (key) =>
      s.get(`/api/products/${p.id}/availability?startDate=${key}T00:00:00.000Z&endDate=${key}T23:59:59.999Z&quantity=1`);
    let r = await utcWindow(X);
    expect([r.status, r.body.data.isAvailable]).toEqual([200, false]);
    // The UTC day X-1 ends at 06:59 VN on X: read as VN day X-1, so it is free
    r = await utcWindow(addDays(X, -1));
    expect([r.status, r.body.data.isAvailable]).toEqual([200, true]);
    r = await utcWindow(addDays(X, 1));
    expect(r.body.data.isAvailable).toBe(true);
    // the Order Check screen asks with date=YYYY-MM-DD
    r = await s.get(`/api/products/${p.id}/availability?date=${X}&quantity=1&timeZone=Asia/Ho_Chi_Minh`);
    expect(r.body.data.isAvailable).toBe(false);
  });

  test('BF-DAY-05 calendar day lists use the VN day of the planned pickup and return', async () => {
    const w = futureWindow(2);
    const { o } = await rentOrder(w);
    const byDate = async (date, extra = '') => {
      const r = await s.get(`/api/calendar/orders/by-date?date=${date}&timeZone=Asia/Ho_Chi_Minh&limit=200${extra}`);
      expect(r.status).toBe(200);
      return (r.body.data.orders || []).map((x) => x.id);
    };
    expect(await byDate(w.from, '&status=RESERVED')).toContain(o.id);
    expect(await byDate(addDays(w.from, -1), '&status=RESERVED')).not.toContain(o.id);
    await s.setStatus(o.id, 'PICKUPED');
    expect(await byDate(w.to, '&kind=return')).toContain(o.id);
    expect(await byDate(addDays(w.to, 1), '&kind=return')).not.toContain(o.id);
    const [y, m] = w.from.split('-').map(Number);
    const count = await s.get(`/api/calendar/orders/count?month=${m}&year=${y}&timeZone=Asia/Ho_Chi_Minh`);
    expect(count.status).toBe(200);
    expect(count.body.data.byDate[w.to]?.returns || 0).toBeGreaterThanOrEqual(1);
  });

  test('BF-DAY-06 outstanding is "overdue" only when the planned pickup day is before today (VN)', async () => {
    const ov = await watchOverview(s, today);
    // pickup planned yesterday, still RESERVED
    await rentOrder({ from: addDays(today, -1), to: today }, { depositAmount: 0 });
    // pickup planned today (00:00 VN), not overdue
    await rentOrder({ from: today, to: today }, { depositAmount: 0 });
    expect(pick(await ov.delta(), ['outstanding', 'overduePickup', 'atPickup'])).toEqual({
      outstanding: 200000,
      overduePickup: 100000,
      atPickup: 100000
    });
  });
});
