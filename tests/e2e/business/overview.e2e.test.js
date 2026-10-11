/**
 * BF-OVR: every Overview number agrees with the others and with the money computed in the test (#498).
 * Screens: Overview v2 (GET /api/analytics/period + /outlet-operations), income by day (/analytics/income/daily),
 * ranking drill-down (/analytics/top-products), customer orders ("Đã chi", /customers/{id}/orders).
 */
const {
  Session,
  describeE2E,
  vnDateKey,
  vnAt,
  addDays,
  futureWindow,
  rentBody,
  saleBody,
  watchOverview,
  overviewNumbers,
  pick,
  risingPrice
} = require('../helpers/api');

/** percentChange of packages/utils/src/analytics/period-report.ts */
function percentChange(current, previous) {
  if (previous > 0) return Math.round(((current - previous) / previous) * 10000) / 100;
  return current > 0 ? 100 : 0;
}

describeE2E('BF-OVR Overview agrees with itself and with the orders', () => {
  let s;
  const today = vnDateKey();

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  test('BF-OVR-01 internal identities of the period report (today and a 7-day range)', async () => {
    for (const [from, to] of [
      [today, today],
      [addDays(today, -6), today]
    ]) {
      const report = await s.period(from, to);
      const r = report.revenue;
      const n = overviewNumbers(report);
      // breakdowns add up (#492, #494)
      expect(n.deposits + n.pickupAndSale + n.fees - n.refunds).toBe(n.collected);
      expect(n.atPickup + n.overduePickup).toBe(n.outstanding);
      expect(n.totalRevenue - n.collected).toBe(n.collateralReceived - n.collateralReturned);
      // chart = headline
      expect(n.seriesCollected).toBe(n.collected);
      expect(n.seriesNewOrders).toBe(n.newOrders);
      expect(report.series).toHaveLength(Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1);
      // growth current = headline
      expect(report.growth.collected.current).toBe(n.collected);
      expect(report.growth.orderValue.current).toBe(r.totalOrderValue);
      expect(report.growth.collected.growth).toBe(percentChange(report.growth.collected.current, report.growth.collected.previous));
      // income by day (old Overview) = period totals
      const daily = await s.incomeDaily(from, to);
      const dailyRevenue = daily.days.reduce((sum, d) => sum + d.totalRevenue, 0);
      expect(dailyRevenue).toBe(r.totalRevenue);
      expect(daily.days.reduce((sum, d) => sum + d.newOrderCount, 0)).toBe(n.newOrders);
    }
  });

  test('BF-OVR-02 one day of business: every tile matches the expected money', async () => {
    const ov = await watchOverview(s, today);
    const rentP = await s.createProduct({ kind: 'DAILY', price: 70000, stock: 3 });
    const saleP = await s.createProduct({ kind: 'SALE', price: 45000, stock: 10 });
    const c1 = await s.createCustomer();
    const c2 = await s.createCustomer();
    const c3 = await s.createCustomer();
    const w = futureWindow(2);

    // 1. booked, deposit 50k, not picked up yet: 2 x 70k x 2 days = 280k
    const o1 = await s.createOrder(rentBody({ customer: c1, lines: [{ product: rentP, quantity: 2 }], from: w.from, to: w.to, depositAmount: 50000 }).body);
    // 2. booked and handed over today with collateral 300k: 70k x 2 = 140k
    const o2 = await s.createOrder(rentBody({ customer: c2, lines: [{ product: rentP }], from: w.from, to: w.to }).body);
    await s.setStatus(o2.id, 'PICKUPED', { securityDeposit: 300000 });
    // 3. sale 3 x 45k = 135k
    await s.createOrder(saleBody({ customer: c3, lines: [{ product: saleP, quantity: 3 }] }).body);
    // 4. booked and cancelled: excluded everywhere
    const o4 = await s.createOrder(rentBody({ customer: c3, lines: [{ product: saleP }], from: w.from, to: w.to, depositAmount: 10000 }).body);
    await s.setStatus(o4.id, 'CANCELLED');

    const d = await ov.delta();
    expect(pick(d, ['collected', 'orderValue', 'outstanding', 'atPickup', 'deposits', 'pickupAndSale', 'refunds', 'collateralReceived', 'collateralHeld', 'newOrders', 'pickups', 'cancelled'])).toEqual({
      collected: 50000 + 140000 + 135000,
      orderValue: 280000 + 140000 + 135000,
      outstanding: 280000 - 50000,
      atPickup: 280000 - 50000,
      deposits: 50000 + 10000,
      pickupAndSale: 140000 + 135000,
      refunds: 10000,
      collateralReceived: 300000,
      collateralHeld: 300000,
      newOrders: 4,
      pickups: 1,
      cancelled: 1
    });
    // "Đã chi" per customer excludes cancelled orders (#405)
    expect((await s.customerOrders(c3.id)).summary).toEqual({ totalOrders: 2, totalAmount: 135000 });
    expect((await s.customerOrders(c1.id)).summary).toEqual({ totalOrders: 1, totalAmount: 280000 });
    // rented out now ("Đang thuê"): stock 3, 2 booked (not out), 1 out
    expect(await s.outletStock(rentP.id, rentP.outletId)).toEqual({ stock: 3, available: 2, renting: 1 });
    // order list per status for this product
    const rows = await s.listOrders({ productId: String(rentP.id) });
    expect(rows.map((o) => o.status).sort()).toEqual(['PICKUPED', 'RESERVED']);
    expect(rows.find((o) => o.id === o1.id).amountDue).toBe(280000 - 50000);
  });

  test('BF-OVR-03 top products: Overview tile and ranking drill-down agree; cancelled lines drop out', async () => {
    const price = risingPrice();
    const p = await s.createProduct({ kind: 'FIXED', price, salePrice: price, stock: 10 });
    const ca = await s.createCustomer();
    const cb = await s.createCustomer();
    const w = futureWindow(1);
    await s.createOrder(rentBody({ customer: ca, lines: [{ product: p, quantity: 3 }], from: w.from, to: w.to }).body);
    await s.createOrder(saleBody({ customer: cb, lines: [{ product: p, quantity: 1, unitPrice: price }] }).body);
    const cancelled = await s.createOrder(rentBody({ customer: cb, lines: [{ product: p, quantity: 2 }], from: w.from, to: w.to }).body);
    await s.setStatus(cancelled.id, 'CANCELLED');

    const report = await s.period(today);
    const tile = report.topProducts.find((x) => x.id === p.id);
    // Overview: rentalCount/saleCount = number of order LINES (#429)
    expect(tile).toMatchObject({ rentalCount: 1, saleCount: 1, totalRevenue: 4 * price });
    expect(report.topProducts[0].id).toBe(p.id);
    // Drill-down: rentalCount/saleCount = QUANTITY (#429), quantity = all units
    const drill = await s.topProductRow(p.id, today);
    expect(drill).toMatchObject({ rentalCount: 3, saleCount: 1, quantity: 4, totalRevenue: 4 * price });
    const orders = await s.listOrders({ productId: String(p.id) });
    expect(orders).toHaveLength(3); // the list still shows the cancelled one
  });

  // #506: period topCustomers[].totalSpent used to sum revenue events WITH collateral (securityDeposit at pickup),
  // so a customer holding collateral looked like a bigger spender.
  test('BF-OVR-04 top customers: spent = rent paid, collateral is not spending (#506)', async () => {
    const A = risingPrice();
    const S = 5000000;
    const p = await s.createProduct({ kind: 'FIXED', price: A, stock: 1 });
    const c = await s.createCustomer();
    const w = futureWindow(1);
    const o = await s.createOrder(rentBody({ customer: c, lines: [{ product: p }], from: w.from, to: w.to }).body);
    await s.setStatus(o.id, 'PICKUPED', { securityDeposit: S });
    const report = await s.period(today);
    const row = report.topCustomers.find((x) => x.id === c.id);
    expect(row).toMatchObject({ orderCount: 1, rentalCount: 1, saleCount: 0 });
    expect(row.totalSpent).toBe(A);
  });

  test('BF-OVR-05 top customers: counts, and a cancelled order is not spending', async () => {
    const A = risingPrice();
    const p = await s.createProduct({ kind: 'FIXED', price: A, salePrice: 1000, stock: 5 });
    const c = await s.createCustomer();
    const w = futureWindow(1);
    await s.createOrder(rentBody({ customer: c, lines: [{ product: p }], from: w.from, to: w.to, depositAmount: A }).body);
    await s.createOrder(saleBody({ customer: c, lines: [{ product: p, unitPrice: 1000 }] }).body);
    const x = await s.createOrder(rentBody({ customer: c, lines: [{ product: p, quantity: 2 }], from: w.from, to: w.to, depositAmount: 7000 }).body);
    await s.setStatus(x.id, 'CANCELLED');
    const report = await s.period(today);
    const row = report.topCustomers.find((r) => r.id === c.id);
    expect(row).toMatchObject({ orderCount: 2, rentalCount: 1, saleCount: 1, totalSpent: A + 1000 });
  });

  test('BF-OVR-06 growth compares with the previous period of the same length', async () => {
    // Growth only counts money already received (realIncome): use today vs yesterday, not future days.
    const day = today;
    const prev = addDays(today, -1);
    const ovDay = await watchOverview(s, day);
    const ovPrev = await watchOverview(s, prev);
    const p = await s.createProduct({ kind: 'FIXED', price: 200000, stock: 2 });
    const w = futureWindow(1);
    const a = await s.createOrder(rentBody({ customer: await s.createCustomer(), lines: [{ product: p }], from: w.from, to: w.to }).body);
    const b = await s.createOrder(rentBody({ customer: await s.createCustomer(), lines: [{ product: p }], from: w.from, to: w.to }).body);
    // a was handed over "yesterday" (back-dated pickedUpAt), b now
    await s.setStatus(a.id, 'PICKUPED', { pickedUpAt: vnAt(prev, '10:00').toISOString() });
    await s.setStatus(b.id, 'PICKUPED');
    expect((await ovPrev.delta()).collected).toBe(200000);
    const d = await ovDay.delta();
    expect(d.collected).toBe(200000);
    const g = d.report.growth.collected;
    expect(g.current).toBe(d.report.revenue.collected);
    expect(g.previous).toBe((await s.period(prev)).revenue.collected);
    expect(g.growth).toBe(percentChange(g.current, g.previous));
    const ov = d.report.growth.orderValue;
    expect(ov.current).toBe(d.report.revenue.totalOrderValue);
    expect(ov.previous).toBe((await s.period(prev)).revenue.totalOrderValue);
  });

  test('BF-OVR-07 income by day = period series, day by day, over a multi-day window', async () => {
    const w = futureWindow(3);
    const ovFrom = await watchOverview(s, w.from);
    const ovTo = await watchOverview(s, w.to);
    const p = await s.createProduct({ kind: 'DAILY', price: 50000, stock: 1 });
    const o = await s.createOrder(rentBody({ customer: await s.createCustomer(), lines: [{ product: p }], from: w.from, to: w.to, depositAmount: 20000 }).body);
    await s.setStatus(o.id, 'PICKUPED', { pickedUpAt: vnAt(w.from, '11:00').toISOString(), securityDeposit: 100000 });
    await s.updateOrder(o.id, { damageFee: 15000 });
    await s.setStatus(o.id, 'RETURNED', { returnedAt: vnAt(w.to, '17:00').toISOString() });
    const report = await s.period(w.from, w.to);
    const daily = await s.incomeDaily(w.from, w.to);
    for (const point of report.series) {
      const day = daily.days.find((d) => d.date === point.date);
      expect([point.date, day ? day.totalRevenue : 0]).toEqual([point.date, point.realIncome]);
    }
    // this order alone: pickup day collects rent - deposit, return day the damage fee
    expect(pick(await ovFrom.delta(), ['collected', 'seriesCollected', 'collateralReceived'])).toEqual({
      collected: 150000 - 20000,
      seriesCollected: 150000 - 20000,
      collateralReceived: 100000
    });
    expect(pick(await ovTo.delta(), ['collected', 'seriesCollected', 'collateralReturned'])).toEqual({
      collected: 15000,
      seriesCollected: 15000,
      collateralReturned: 100000
    });
  });

  test('BF-OVR-08 operations tiles: collateral held now and to take at hand-over', async () => {
    const before = (await s.outletOperations()).cash;
    const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2 });
    const w = futureWindow(1);
    const toTake = await s.createOrder(rentBody({ customer: await s.createCustomer(), lines: [{ product: p }], from: w.from, to: w.to, securityDeposit: 250000 }).body);
    const held = await s.createOrder(rentBody({ customer: await s.createCustomer(), lines: [{ product: p }], from: w.from, to: w.to }).body);
    await s.setStatus(held.id, 'PICKUPED', { securityDeposit: 400000 });
    const after = (await s.outletOperations()).cash;
    expect(after.collateralToCollect.securityDeposit - before.collateralToCollect.securityDeposit).toBe(250000);
    expect(after.collateralToCollect.orders - before.collateralToCollect.orders).toBe(1);
    expect(after.depositsHeld.securityDeposit - before.depositsHeld.securityDeposit).toBe(400000);
    expect(after.depositsHeld.orders - before.depositsHeld.orders).toBe(1);
    await s.setStatus(held.id, 'RETURNED');
    await s.setStatus(toTake.id, 'CANCELLED');
    const end = (await s.outletOperations()).cash;
    expect(end.depositsHeld.securityDeposit).toBe(before.depositsHeld.securityDeposit);
    expect(end.collateralToCollect.securityDeposit).toBe(before.collateralToCollect.securityDeposit);
  });
  test('BF-OVR-09 expected collections on the pickup day, new order value and rent/sale split (#605)', async () => {
    const w = futureWindow(2);
    const sumOf = (report, field) => report.series.reduce((sum, x) => sum + (x[field] || 0), 0);
    const pickupDay = async () => (await s.period(w.from)).series[0];
    const todayReport = async () => s.period(today);
    const beforeDay = await pickupDay();
    const beforeToday = await todayReport();

    const p = await s.createProduct({ kind: 'DAILY', price: 70000, stock: 2 });
    // 2 days x 70k = 140k, deposit 50k, collateral 300k (collateral is not expected money)
    const o = await s.createOrder(
      rentBody({ customer: await s.createCustomer(), lines: [{ product: p }], from: w.from, to: w.to, depositAmount: 50000, securityDeposit: 300000 }).body
    );

    const day = await pickupDay();
    expect(day.expectedCollected - beforeDay.expectedCollected).toBe(140000 - 50000);
    expect(day.futureIncome).toBe(0);
    const t = await todayReport();
    expect(sumOf(t, 'newOrderValue') - sumOf(beforeToday, 'newOrderValue')).toBe(140000);
    expect(sumOf(t, 'newOrderValue')).toBe(t.revenue.totalOrderValue);
    const byType = t.revenue.orderValueByType;
    expect(byType.rent.amount + byType.sale.amount).toBe(t.revenue.totalOrderValue);
    expect(byType.rent.amount - beforeToday.revenue.orderValueByType.rent.amount).toBe(140000);
    expect(byType.rent.orders - beforeToday.revenue.orderValueByType.rent.orders).toBe(1);

    // cancelled: no longer expected, no longer order value
    await s.setStatus(o.id, 'CANCELLED');
    expect((await pickupDay()).expectedCollected).toBe(beforeDay.expectedCollected);
    expect((await todayReport()).revenue.orderValueByType.rent.amount).toBe(beforeToday.revenue.orderValueByType.rent.amount);
  });
});
