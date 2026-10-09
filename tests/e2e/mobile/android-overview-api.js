#!/usr/bin/env node
/** #722 API figures of the Android Overview default period (last 7 Vietnam days); see android-overview.sh. Env: MOBILE_STAT_API_URL */
const API = process.env.MOBILE_STAT_API_URL || 'http://localhost:3280';
const day = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
(async () => {
  const login = await fetch(API + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'merchant1@example.com', password: 'merchant123' }) }).then((r) => r.json());
  const tok = login.data.token || login.data.accessToken;
  const to = day(new Date()); const from = day(new Date(Date.now() - 6 * 86400000));
  const q = new URLSearchParams({ startDate: from, endDate: to, groupBy: 'day', limit: '50', timeZone: 'Asia/Ho_Chi_Minh' });
  const r = (await fetch(API + '/api/analytics/period?' + q, { headers: { Authorization: 'Bearer ' + tok } }).then((x) => x.json())).data;
  const v = r.revenue, f = v.collateralFlow || {}, b = v.orderValueByType || {};
  const out = { from, to, orderValue: v.totalOrderValue, newOrders: (b.rent?.orders || 0) + (b.sale?.orders || 0), cash: v.cashCollected, collected: v.collected, outstanding: v.outstanding, outstandingOrders: (v.outstandingBreakdown?.atPickup?.orders || 0) + (v.outstandingBreakdown?.overduePickup?.orders || 0), collateralNet: (f.received || 0) - (f.returned || 0) };
  console.log(JSON.stringify(out));
})();
