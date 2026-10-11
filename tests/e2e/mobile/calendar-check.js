#!/usr/bin/env node
/**
 * MOB-CAL (#727): for every day the UI flow selected on the calendar (notes
 * `CAL <yyyy-MM-dd> | title=… | summary=… | orders=a,b`) the header summary ("giao x · trả y") and the listed order numbers
 * equal GET /api/calendar/orders/count (byDate) and /by-date (RESERVED by pickup day + returns), cancelled orders are gone.
 * Account: the `ops` scenario (ops.owner@e2e-sub.test, orders 710001..710009).
 *   node tests/e2e/mobile/calendar-check.js <xcodebuild.log | android notes>
 */
const { notes, login, ZONE, report, check, fail } = require('./lib');

(async () => {
  const days = notes(process.argv[2]).map((n) => /^CAL (\d{4}-\d{2}-\d{2}) \| title=(.*?) \| summary=(.*?) \| orders=(.*)$/.exec(n)).filter(Boolean);
  if (!days.length) throw new Error('no "CAL <day>" notes (run test6bCalendarOps with --scenario ops)');
  const api = await login(process.env.MOBILE_STAT_EMAIL || 'ops.owner@e2e-sub.test', process.env.MOBILE_STAT_PASSWORD || 'merchant123');
  const months = new Map();
  const results = [];
  for (const [, key, , summary, orders] of days) {
    const [y, m] = key.split('-').map(Number);
    const mk = `${y}-${m}`;
    if (!months.has(mk)) months.set(mk, await api.get(`/api/calendar/orders/count?${new URLSearchParams({ year: y, month: m, timeZone: ZONE })}`));
    const counts = months.get(mk)?.byDate?.[key] || { pickups: 0, returns: 0 };
    const q = (extra) => new URLSearchParams({ date: key, timeZone: ZONE, limit: '200', ...extra });
    const pick = (await api.get(`/api/calendar/orders/by-date?${q({ status: 'RESERVED' })}`))?.orders || [];
    const ret = (await api.get(`/api/calendar/orders/by-date?${q({ kind: 'return' })}`))?.orders || [];
    const want = [...new Set([...pick, ...ret].map((o) => o.orderNumber))].sort().join(',');
    results.push(check(orders === want, `${key} > listed orders`, `app=[${orders}] api=[${want}]`));
    const sp = /(?:giao|hand[- ]?over)\s*(\d+)/i.exec(summary);
    const sr = /(?:trả|return)\s*(\d+)/i.exec(summary);
    if (sp || sr) {
      results.push(check((sp ? Number(sp[1]) : 0) === counts.pickups && (sr ? Number(sr[1]) : 0) === counts.returns, `${key} > header summary`, `app="${summary}" api pickups=${counts.pickups} returns=${counts.returns}`));
    } else if (counts.pickups || counts.returns) {
      results.push(fail(`${key} > header summary`, `app has none, api pickups=${counts.pickups} returns=${counts.returns}`));
    }
    if (orders.split(',').includes('710007')) results.push(fail(`${key} > cancelled order`, '710007 (CANCELLED) is listed'));
  }
  report(results);
})().catch((e) => { console.error(e); process.exit(2); });
