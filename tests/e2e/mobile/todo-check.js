#!/usr/bin/env node
/**
 * MOB-TODO (#727): the "Hôm nay" counters of Tổng quan (notes `TODO <counter> | <label>`) and the lists they open
 * (`TODOLIST <counter> | rows=a,b`) equal GET /api/analytics/outlet-operations:
 *   Cần giao x/y = doneToday.pickups / (done + pickupsToday.count), Cần nhận trả likewise with returns,
 *   Trễ hạn trả = overdueReturns, Quá ngày lấy = noShows, Ngày mai = tomorrow.{pickups,returns}.
 * Account: the `ops` scenario.   node tests/e2e/mobile/todo-check.js <xcodebuild.log | android notes>
 */
const { notes, login, ZONE, report, check, fail } = require('./lib');

const ints = (s) => [...String(s).matchAll(/\d+/g)].map((m) => Number(m[0]));
const nums = (o) => (o?.orders || []).map((x) => x.orderNumber).sort().join(',');

(async () => {
  const all = notes(process.argv[2]);
  const label = (k) => (all.map((n) => new RegExp(`^TODO ${k} \\| (.*)$`).exec(n)).filter(Boolean).pop() || [])[1];
  const listLine = (k) => (all.map((n) => new RegExp(`^TODOLIST ${k} \\| rows=([^|]*?)(?: \\| first=(.*))?$`).exec(n)).filter(Boolean).pop() || []);
  const rows = (k) => listLine(k)[1];
  // the late / no-show screens list the tile's orders in their first section and more orders below it
  const first = (k) => (listLine(k)[2] !== undefined ? listLine(k)[2] : listLine(k)[1]);
  if (!label('pickups')) throw new Error('no TODO notes (run test7mTodayCounters with --scenario ops)');
  const api = await login(process.env.MOBILE_STAT_EMAIL || 'ops.owner@e2e-sub.test', process.env.MOBILE_STAT_PASSWORD || 'merchant123');
  const d = await api.get(`/api/analytics/outlet-operations?${new URLSearchParams({ timeZone: ZONE })}`);
  const results = [];
  const total = (done, pending) => (done || 0) + (pending?.count || 0);
  const pk = ints(label('pickups').replace(/^[^:]*:/, ''));
  const rt = ints(label('returns').replace(/^[^:]*:/, ''));
  results.push(check(pk[0] === d.doneToday.pickups && pk[1] === total(d.doneToday.pickups, d.pickupsToday), 'Cần giao x/y', `app="${label('pickups')}" api done=${d.doneToday.pickups} total=${total(d.doneToday.pickups, d.pickupsToday)}`));
  results.push(check(rt[0] === d.doneToday.returns && rt[1] === total(d.doneToday.returns, d.returnsToday), 'Cần nhận trả x/y', `app="${label('returns')}" api done=${d.doneToday.returns} total=${total(d.doneToday.returns, d.returnsToday)}`));
  const late = ints(label('late').replace(/^[^:]*:/, ''))[0];
  results.push(check(late === d.overdueReturns.count, 'Trễ hạn trả', `app=${late} api=${d.overdueReturns.count}`));
  const ns = ints(label('noshows').replace(/^[^:]*:/, ''))[0];
  results.push(check(ns === d.noShows.count, 'Quá ngày lấy', `app=${ns} api=${d.noShows.count}`));
  const tm = ints(label('tomorrow'));
  results.push(check(tm[0] === d.tomorrow.pickups && tm[1] === d.tomorrow.returns, 'Ngày mai line', `app="${label('tomorrow')}" api pickups=${d.tomorrow.pickups} returns=${d.tomorrow.returns}`));
  if (rows('late') !== undefined) results.push(check(first('late') === nums(d.overdueReturns), 'Trễ hạn trả list = the orders', `app=[${first('late')}] (all rows [${rows('late')}]) api=[${nums(d.overdueReturns)}]`));
  else results.push(fail('Trễ hạn trả list', 'not opened'));
  if (rows('noshows') !== undefined) results.push(check(first('noshows') === nums(d.noShows), 'Chưa lấy đồ list = the orders', `app=[${first('noshows')}] (all rows [${rows('noshows')}]) api=[${nums(d.noShows)}]`));
  else results.push(fail('Chưa lấy đồ list', 'not opened'));
  if (rows('orders-todo') !== undefined) {
    const have = new Set(rows('orders-todo').split(',').filter(Boolean));
    const need = [...(d.pickupsToday.orders || []), ...(d.returnsToday.orders || [])].map((o) => o.orderNumber);
    results.push(check(need.every((n) => have.has(n)), 'Đơn hàng > Việc cần làm lists today\'s pickups and returns', `app=[${[...have].sort()}] need=[${need.sort()}]`));
  }
  report(results);
})().catch((e) => { console.error(e); process.exit(2); });
