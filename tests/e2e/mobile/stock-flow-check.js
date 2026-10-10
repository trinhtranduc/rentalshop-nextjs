#!/usr/bin/env node
/**
 * MOB-STOCK (#727): the stock lines the iOS/Android flow read on Home (notes `STOCKFLOW final <name>: <line>`) equal what
 * GET /api/products/{id}/availability says is free today (Vietnam day), and tomorrow is free for the product held today.
 * Account: the `stock` scenario of scripts/mobile-e2e/prepare-accounts.sh (stock.owner@e2e-sub.test).
 *   node tests/e2e/mobile/stock-flow-check.js <xcodebuild.log | android notes>
 * The flow itself creates a sale of 2 and a rent of 1 of "E2E Con5" (5 in stock): 5 - 2 - 1 = 2 free today.
 */
const { notes, login, vnDay, ZONE, report, check, fail } = require('./lib');

const free = (line) => {
  const m = /(\d+)/.exec(line || '');
  if (m) return Number(m[1]);
  return /Hết|Out|None/i.test(line || '') ? 0 : null;
};
const window = (day) => new URLSearchParams({ startDate: new Date(`${day}T00:00:00+07:00`).toISOString(), endDate: new Date(`${day}T23:59:59.999+07:00`).toISOString(), quantity: '1', timeZone: ZONE });

(async () => {
  const finals = notes(process.argv[2]).map((n) => /^STOCKFLOW final (E2E [^:]+): (.*)$/.exec(n)).filter(Boolean);
  if (!finals.length) throw new Error('no "STOCKFLOW final" notes (run test1dStockFlow with --scenario stock)');
  const api = await login(process.env.MOBILE_STAT_EMAIL || 'stock.owner@e2e-sub.test', process.env.MOBILE_STAT_PASSWORD || 'merchant123');
  const results = [];
  const today = vnDay(0);
  const tomorrow = vnDay(1);
  for (const [, name, line] of finals) {
    const list = await api.get(`/api/products?${new URLSearchParams({ search: name, limit: '10' })}`);
    const product = ((list && (list.products || list.items)) || []).find((p) => p.name === name);
    if (!product) { results.push(fail(`${name}`, 'not found in the API')); continue; }
    const a = await api.get(`/api/products/${product.id}/availability?${window(today)}`);
    const want = a?.effectivelyAvailable ?? a?.availableQuantity ?? null;
    results.push(check(free(line) === want, `${name} > Home line = free today`, `app="${line}" api=${want} (stock ${a?.totalStock}, booked ${a?.conflictingQuantity})`));
    if (name === 'E2E Het') {
      const t = await api.get(`/api/products/${product.id}/availability?${window(tomorrow)}`);
      results.push(check((t?.effectivelyAvailable ?? t?.availableQuantity) === 1, `${name} > free tomorrow`, `api=${t?.effectivelyAvailable ?? t?.availableQuantity}`));
    }
    if (name === 'E2E Con5') results.push(check(want === 2, `${name} > 5 in stock - sale 2 - rent 1`, `api free today=${want}`));
  }
  report(results, `day ${today}`);
})().catch((e) => { console.error(e); process.exit(2); });
