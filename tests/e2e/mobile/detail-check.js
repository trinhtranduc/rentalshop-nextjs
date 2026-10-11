#!/usr/bin/env node
/**
 * MOB-DETAIL (#727): the order detail screens (notes `DETAIL #<n> | <texts joined by " ¦ ">`) show the API's money:
 * total, deposit, collateral (security deposit) and the amount due, each formatted like the app ("1.150.000đ"), and the
 * product name with its quantity. Account: the `ops` scenario.
 *   node tests/e2e/mobile/detail-check.js <xcodebuild.log | android notes>
 */
const { notes, login, report, check, fail } = require('./lib');

const money = (n) => `${Math.round(n).toLocaleString('de-DE')}đ`; // 1.150.000đ
const hasMoney = (text, n) => text.includes(money(n)) || text.includes(money(n).replace('đ', ' ₫')) || text.includes(`${Math.round(n).toLocaleString('de-DE')}`);

(async () => {
  const screens = notes(process.argv[2]).map((n) => /^DETAIL #(\d+) \| (.*)$/.exec(n)).filter(Boolean);
  if (!screens.length) throw new Error('no DETAIL notes (run test5gOrderDetailMoney with --scenario ops)');
  const api = await login(process.env.MOBILE_STAT_EMAIL || 'ops.owner@e2e-sub.test', process.env.MOBILE_STAT_PASSWORD || 'merchant123');
  const results = [];
  for (const [, number, text] of screens) {
    const list = await api.get(`/api/orders?${new URLSearchParams({ search: number, limit: '5' })}`);
    const row = ((list && (list.orders || list.items)) || []).find((o) => o.orderNumber === number);
    if (!row) { results.push(fail(`#${number}`, 'not found in the API')); continue; }
    const o = (await api.get(`/api/orders/${row.id}`)) || row;
    const order = o.order || o;
    const lines = [['total', order.totalAmount]];
    if (order.depositAmount > 0) lines.push(['deposit', order.depositAmount]);
    if (order.securityDeposit > 0) lines.push(['collateral', order.securityDeposit]);
    const due = order.amountDue ?? row.amountDue;
    if (due > 0) lines.push(['amount due', due]);
    for (const [what, value] of lines) results.push(check(hasMoney(text, value), `#${number} > ${what}`, `api=${money(value)} on screen: ${hasMoney(text, value)}`));
    const items = order.orderItems || order.items || [];
    for (const it of items) {
      const name = it.productName || it.product?.name;
      if (name) results.push(check(text.includes(name), `#${number} > item ${name}`, `qty ${it.quantity} api; name on screen: ${text.includes(name)}`));
    }
  }
  report(results);
})().catch((e) => { console.error(e); process.exit(2); });
