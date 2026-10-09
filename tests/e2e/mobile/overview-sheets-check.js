#!/usr/bin/env node
/**
 * MOBILE-STAT: compares the iOS Overview tiles and their detail sheets (noted by the UI tests test7kOverviewTiles /
 * test7lOverviewSheets as `E2E_NOTE: TILE …` and `E2E_NOTE: SHEET …`) with GET /api/analytics/period and
 * GET /api/analytics/outlet-operations for the same period (the app opens on "Hôm nay").
 *
 * For each sheet: headline = tile, every row = API, rows add up to the headline.
 * Run after the UI test, with no other login of the same account in between (single session):
 *   node tests/e2e/mobile/overview-sheets-check.js <xcodebuild.log> [YYYY-MM-DD]
 * Env: MOBILE_STAT_API_URL [http://localhost:3280], MOBILE_STAT_EMAIL [merchant1@example.com], MOBILE_STAT_PASSWORD [merchant123]
 */
const fs = require('fs');

const LOG = process.argv[2];
const API = process.env.MOBILE_STAT_API_URL || 'http://localhost:3280';
const EMAIL = process.env.MOBILE_STAT_EMAIL || 'merchant1@example.com';
const PASSWORD = process.env.MOBILE_STAT_PASSWORD || 'merchant123';
/** Checks that fail on purpose until the named issue is fixed */
const KNOWN = { 'Thực thu › tile = API cashCollected': '#708', 'Giá trị đơn mới › Đơn mới count = Cho thuê + Bán orders': '#716' };

function vnToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** "1.918", "−2.124", "+64", "—" → number (null for "—") */
function num(text) {
  const m = /([−+-]?)\s?(\d[\d.,]*)/.exec(text || '');
  if (!m) return null;
  const n = Number(m[2].replace(/[.,]/g, ''));
  return m[1] === '−' || m[1] === '-' ? -n : n;
}

/** "Name, 3 đơn, 1.918" → { name, count, value } (the value is the last part) */
function row(label) {
  const parts = label.split(', ');
  const value = num(parts[parts.length - 1]);
  const countPart = parts.slice(1, -1).find((p) => /\d+\s*đơn/.test(p));
  return { name: parts[0], count: countPart ? Number(/(\d+)/.exec(countPart)[1]) : null, value };
}

async function main() {
  if (!LOG || !fs.existsSync(LOG)) throw new Error('usage: overview-sheets-check.js <xcodebuild.log> [YYYY-MM-DD]');
  const day = process.argv[3] || vnToday();
  const notes = fs.readFileSync(LOG, 'utf8').split('\n').filter((l) => l.startsWith('E2E_NOTE: TILE ') || l.startsWith('E2E_NOTE: SHEET '));
  const tiles = {};
  const sheets = {};
  for (const l of notes) {
    const m = /^E2E_NOTE: (TILE|SHEET) (.+?) \| (.+)$/.exec(l);
    if (!m) continue;
    if (m[1] === 'TILE') tiles[m[2]] = num(m[3].split(', ')[1]);
    else (sheets[m[2]] = sheets[m[2]] || []).push(m[3]);
  }

  const login = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) }).then((r) => r.json());
  const token = login.data.token || login.data.accessToken;
  const get = (p) => fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).then((b) => b.data);
  const q = new URLSearchParams({ startDate: day, endDate: day, groupBy: 'day', limit: '50', timeZone: 'Asia/Ho_Chi_Minh' });
  const report = await get(`/api/analytics/period?${q}`);
  const ops = await get('/api/analytics/outlet-operations');
  const r = report.revenue || {};
  const cb = r.collectedBreakdown || {};
  const ob = r.outstandingBreakdown || {};
  const flow = r.collateralFlow || {};
  const cash = (ops && ops.cash) || {};
  const byType = r.orderValueByType || {};

  const spec = {
    'Giá trị đơn mới': {
      tileApi: r.totalOrderValue,
      rows: { 'Đơn mới': [r.totalOrderValue, report.operational?.orderCounts?.new], 'Cho thuê': [byType.rent?.amount, byType.rent?.orders], Bán: [byType.sale?.amount, byType.sale?.orders] },
      sum: (v) => (v['Cho thuê'] ?? 0) + (v['Bán'] ?? 0)
    },
    'Thực thu': {
      tileApi: r.collected,
      tileCash: r.cashCollected,
      rows: { 'Cọc khi tạo đơn': [cb.deposits], 'Thu khi giao, bán': [cb.pickupAndSale], 'Phí hư hỏng, trễ': [cb.fees], 'Hoàn đơn huỷ': [-(cb.refunds || 0)], 'Thực thu': [r.collected] },
      sum: (v) => (v['Cọc khi tạo đơn'] ?? 0) + (v['Thu khi giao, bán'] ?? 0) + (v['Phí hư hỏng, trễ'] ?? 0) + (v['Hoàn đơn huỷ'] ?? 0)
    },
    'Còn phải thu': {
      tileApi: r.outstanding,
      rows: { 'Sẽ thu khi khách lấy đồ': [ob.atPickup?.amount, ob.atPickup?.orders], 'Quá ngày lấy, chưa thu': [ob.overduePickup?.amount, ob.overduePickup?.orders] },
      sum: (v) => (v['Sẽ thu khi khách lấy đồ'] ?? 0) + (v['Quá ngày lấy, chưa thu'] ?? 0)
    },
    'Thế chân': {
      tileApi: (flow.received || 0) - (flow.returned || 0),
      rows: {
        'Đã nhận': [flow.received],
        'Đã trả lại khách': [flow.returned],
        'Sẽ nhận khi giao': [cash.collateralToCollect?.securityDeposit, cash.collateralToCollect?.orders],
        'Đang giữ, sẽ trả lại': [cash.collateralToReturn?.securityDeposit, cash.collateralToReturn?.orders]
      },
      sum: (v) => (v['Đã nhận'] ?? 0) - (v['Đã trả lại khách'] ?? 0)
    }
  };

  const results = [];
  const check = (name, ok, detail) => {
    const known = KNOWN[name];
    results.push({ status: ok ? (known ? 'fixed?' : 'pass') : known ? `known ${known}` : 'fail', name, detail });
  };
  for (const [tile, s] of Object.entries(spec)) {
    const labels = sheets[tile] || [];
    const tileValue = tiles[tile];
    check(`${tile} › tile = API`, tileValue === s.tileApi, `tile=${tileValue} api=${s.tileApi}`);
    if (s.tileCash !== undefined) check(`${tile} › tile = API cashCollected`, tileValue === s.tileCash, `tile=${tileValue} cashCollected=${s.tileCash}`);
    const head = labels.find((l) => l.startsWith(`${tile} ·`));
    const headline = head ? num(head.slice(head.lastIndexOf(', ') + 2)) : null;
    check(`${tile} › sheet headline = tile`, headline === tileValue, `sheet=${headline} tile=${tileValue}`);
    const shown = {};
    for (const [name, [amount, count]] of Object.entries(s.rows)) {
      const label = labels.find((l) => l.startsWith(`${name},`));
      if (!label) {
        check(`${tile} › row ${name}`, amount == null, `row not shown, api=${amount}`);
        continue;
      }
      const rw = row(label);
      shown[name] = rw.value;
      check(`${tile} › row ${name}`, rw.value === (amount ?? 0), `sheet=${rw.value} api=${amount}`);
      if (count != null) check(`${tile} › row ${name} count`, rw.count === count, `sheet=${rw.count} api=${count}`);
    }
    if (tile === 'Giá trị đơn mới') {
      const total = labels.find((l) => l.startsWith('Đơn mới,'));
      const split = (byType.rent?.orders ?? 0) + (byType.sale?.orders ?? 0);
      check(`${tile} › Đơn mới count = Cho thuê + Bán orders`, !!total && row(total).count === split, `sheet=${total && row(total).count} rent+sale=${split}`);
    }
    if (Object.keys(shown).length) {
      const total = s.sum(shown);
      check(`${tile} › rows add up to the headline`, total === headline, `sum=${total} headline=${headline}`);
    }
  }
  for (const x of results) console.log(`${x.status.padEnd(14)} ${x.name} — ${x.detail}`);
  const failed = results.filter((x) => x.status === 'fail' || x.status === 'fixed?').length;
  console.log(`${results.length} checks, ${failed} failed (day ${day})`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
