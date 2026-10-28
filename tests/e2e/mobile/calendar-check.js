#!/usr/bin/env node
/**
 * MOB-CAL (#727): for every day the UI flow selected on the calendar (notes
 * `CAL <yyyy-MM-dd> | title=… | summary=… | rows=out:300000,back:200000`) the header summary ("lấy x · trả y", on today
 * "N trễ · lấy x · trả y") and the day rows equal GET /api/calendar/orders/count (byDate, lateReturns) and /by-date
 * (RESERVED by pickup day + returns); on today the late returns of /api/analytics/outlet-operations follow (#938).
 * The rows show no order number since #893, so a row is its tag (out = Giao, back = Trả) and its total; the ops totals
 * are unique per day. Cancelled orders are gone.
 * Account: the `ops` scenario (ops.owner@e2e-sub.test, orders 710001..710009).
 *   node tests/e2e/mobile/calendar-check.js <xcodebuild.log | android notes>
 */
const { notes, login, ZONE, vnDay, report, check, fail } = require('./lib');

const row = (kind, o) => `${kind}:${Math.round(Number(o.totalAmount) || 0)}`;

(async () => {
  const days = notes(process.argv[2]).map((n) => /^CAL (\d{4}-\d{2}-\d{2}) \| title=(.*?) \| summary=(.*?) \| rows=(.*)$/.exec(n)).filter(Boolean);
  if (!days.length) throw new Error('no "CAL <day> | … | rows=" notes (run test6bCalendarOps with --scenario ops, or android-flows.sh calendar)');
  const api = await login(process.env.MOBILE_STAT_EMAIL || 'ops.owner@e2e-sub.test', process.env.MOBILE_STAT_PASSWORD || 'merchant123');
  const today = vnDay(0);
  const late = (await api.get(`/api/analytics/outlet-operations?${new URLSearchParams({ timeZone: ZONE })}`))?.overdueReturns?.orders || [];
  const months = new Map();
  const results = [];
  for (const [, key, , summary, rows] of days) {
    const [y, m] = key.split('-').map(Number);
    const mk = `${y}-${m}`;
    if (!months.has(mk)) months.set(mk, await api.get(`/api/calendar/orders/count?${new URLSearchParams({ year: y, month: m, timeZone: ZONE })}`));
    const counts = months.get(mk)?.byDate?.[key] || { pickups: 0, returns: 0 };
    const q = (extra) => new URLSearchParams({ date: key, timeZone: ZONE, limit: '200', ...extra });
    const pick = (await api.get(`/api/calendar/orders/by-date?${q({ status: 'RESERVED' })}`))?.orders || [];
    const ret = (await api.get(`/api/calendar/orders/by-date?${q({ kind: 'return' })}`))?.orders || [];
    const listed = new Set([...pick, ...ret].map((o) => o.id));
    const extra = key === today ? late.filter((o) => !listed.has(o.id)) : [];
    const want = [...pick.map((o) => row('out', o)), ...ret.map((o) => row('back', o)), ...extra.map((o) => row('back', o))].sort().join(',');
    const numbers = [...pick, ...ret, ...extra].map((o) => `${o.orderNumber}=${o.totalAmount}`).join(' ');
    results.push(check(rows === want, `${key} > day rows`, `app=[${rows}] api=[${want}] (${numbers || 'no orders'})`));
    const sp = /(?:lấy|giao|out|hand[- ]?over)\s*(\d+)/i.exec(summary);
    const sr = /(?:trả|back|return)\s*(\d+)/i.exec(summary);
    if (sp || sr) {
      results.push(check((sp ? Number(sp[1]) : 0) === counts.pickups && (sr ? Number(sr[1]) : 0) === counts.returns, `${key} > header summary`, `app="${summary}" api pickups=${counts.pickups} returns=${counts.returns}`));
    } else if (counts.pickups || counts.returns) {
      results.push(fail(`${key} > header summary`, `app has none, api pickups=${counts.pickups} returns=${counts.returns}`));
    }
    if (key === today) {
      const lateApi = months.get(mk)?.lateReturns || 0;
      const sl = /(\d+)\s*(?:trễ|late)/i.exec(summary);
      results.push(check((sl ? Number(sl[1]) : 0) === lateApi, `${key} > late count on today`, `app="${summary}" api lateReturns=${lateApi}`));
    }
    // 710007 (CANCELLED, 150.000) would be picked up tomorrow and returned the day after: never a row
    if ((key === vnDay(1) || key === vnDay(2)) && rows.split(',').some((r) => r.endsWith(':150000'))) results.push(fail(`${key} > cancelled order`, 'a 150.000 row (710007, CANCELLED) is listed'));
  }
  report(results);
})().catch((e) => { console.error(e); process.exit(2); });
