#!/usr/bin/env node
/**
 * MOBILE-STOCK: the "● Còn N hôm nay" / "● Hết hôm nay" line of each iOS Home row (noted by the UI test
 * test1bHomeStockLines as `E2E_NOTE: STOCK Product N: <line>`) equals what GET /api/products/{id}/availability
 * says is free today (Vietnam day): `effectivelyAvailable`. The API math itself is covered by BF-DUP / BF-QTY.
 *
 * Run after the UI test, with no other login of the same account in between (single session):
 *   node tests/e2e/mobile/home-stock-check.js <xcodebuild.log>
 * Env: MOBILE_STAT_API_URL [http://localhost:3280], MOBILE_STAT_EMAIL [merchant1@example.com], MOBILE_STAT_PASSWORD [merchant123]
 */
const fs = require('fs');

const LOG = process.argv[2];
const API = process.env.MOBILE_STAT_API_URL || 'http://localhost:3280';
const EMAIL = process.env.MOBILE_STAT_EMAIL || 'merchant1@example.com';
const PASSWORD = process.env.MOBILE_STAT_PASSWORD || 'merchant123';
const ZONE = 'Asia/Ho_Chi_Minh';

function vnToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** "● Còn 3 hôm nay" → 3, "● Hết hôm nay" / "● Out today" → 0, anything else → null */
function shownFree(line) {
  const m = /(\d+)/.exec(line || '');
  if (m) return Number(m[1]);
  return /Hết|Out|None/i.test(line || '') ? 0 : null;
}

async function main() {
  if (!LOG || !fs.existsSync(LOG)) throw new Error('usage: home-stock-check.js <xcodebuild.log>');
  const notes = fs
    .readFileSync(LOG, 'utf8')
    .split('\n')
    .map((l) => /^E2E_NOTE: STOCK Product (\d+): (.*)$/.exec(l))
    .filter(Boolean);
  if (!notes.length) throw new Error('no STOCK notes in the log (run test1bHomeStockLines)');

  const login = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) }).then((r) => r.json());
  const token = login.data.token || login.data.accessToken;
  const get = (p) => fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).then((b) => b.data);
  const day = vnToday();
  // the Vietnam civil day in UTC (UTC+7, no DST)
  const start = new Date(`${day}T00:00:00+07:00`).toISOString();
  const end = new Date(`${day}T23:59:59.999+07:00`).toISOString();

  const results = [];
  for (const [, number, line] of notes) {
    const list = await get(`/api/products?${new URLSearchParams({ search: `Product ${number} -`, limit: '20' })}`);
    const items = (list && (list.products || list.items)) || [];
    const product = items.find((p) => String(p.name || '').startsWith(`Product ${number} -`));
    if (!product) {
      results.push({ status: 'fail', name: `Product ${number}`, detail: 'not found in the API' });
      continue;
    }
    const q = new URLSearchParams({ startDate: start, endDate: end, quantity: '1', timeZone: ZONE });
    const a = await get(`/api/products/${product.id}/availability?${q}`);
    const want = (a?.availabilityByOutlet || []).reduce((sum, o) => sum + (o.effectivelyAvailable ?? 0), 0); // sum over outlets
    const shown = shownFree(line);
    results.push({
      status: shown !== null && shown === want ? 'pass' : 'fail',
      name: `Product ${number} › home line = free today`,
      detail: `app="${line}" api effectivelyAvailable=${want} (stock ${a?.totalStock ?? product.totalStock ?? '?'}, renting ${a?.totalRenting ?? '?'})`,
    });
  }
  for (const r of results) console.log(`${r.status.padEnd(6)} ${r.name} — ${r.detail}`);
  const failed = results.filter((r) => r.status !== 'pass').length;
  console.log(`${results.length} checks, ${failed} failed (day ${day})`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
