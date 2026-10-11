#!/usr/bin/env node
/**
 * #722 #725 API figures of the Android Overview: the Hôm nay chip (default) and 7 ngày (Vietnam days), plus the Hôm nay
 * card of outlet-operations; see android-overview.sh. Env: MOBILE_STAT_API_URL
 */
const API = process.env.MOBILE_STAT_API_URL || 'http://localhost:3280';
const day = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
(async () => {
  const login = await fetch(API + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'merchant1@example.com', password: 'merchant123' }) }).then((r) => r.json());
  const tok = login.data.token || login.data.accessToken;
  const get = (path) => fetch(API + path, { headers: { Authorization: 'Bearer ' + tok } }).then((x) => x.json()).then((x) => x.data);
  const period = async (from, to) => {
    const q = new URLSearchParams({ startDate: from, endDate: to, groupBy: 'day', limit: '5', timeZone: 'Asia/Ho_Chi_Minh' });
    const v = (await get('/api/analytics/period?' + q)).revenue, f = v.collateralFlow || {}, b = v.orderValueByType || {};
    return { from, to, orderValue: v.totalOrderValue, newOrders: (b.rent?.orders || 0) + (b.sale?.orders || 0), cash: v.cashCollected, collected: v.collected, outstanding: v.outstanding, outstandingOrders: (v.outstandingBreakdown?.atPickup?.orders || 0) + (v.outstandingBreakdown?.overduePickup?.orders || 0), collateralNet: (f.received || 0) - (f.returned || 0) };
  };
  const to = day(new Date());
  const ops = await get('/api/analytics/outlet-operations?timeZone=Asia%2FHo_Chi_Minh');
  const done = ops.doneToday || {};
  const todayCard = { pickups: `${done.pickups || 0}/${(ops.pickupsToday?.count || 0) + (done.pickups || 0)}`, returns: `${done.returns || 0}/${(ops.returnsToday?.count || 0) + (done.returns || 0)}`, late: ops.overdueReturns?.count, noShows: ops.noShows?.count, tomorrow: ops.tomorrow, held: ops.cash?.depositsHeld?.orders };
  console.log(JSON.stringify({ today: await period(to, to), last7: await period(day(new Date(Date.now() - 6 * 86400000)), to), todayCard }));
})();
