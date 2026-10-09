#!/usr/bin/env node
/**
 * WEB-STAT: the four Overview tiles on the shop web /dashboard show the numbers the API defines, and a tap opens
 * the drawer of the same tile (#712, #711, #710; definitions in apps/api period-report.ts).
 *
 * For one custom period (the last 7 Vietnam days), the page is opened in a real browser and each tile is compared with
 * GET /api/analytics/period:
 *   Giá trị đơn mới  = revenue.totalOrderValue            (orders created in the period, cancelled excluded)
 *   Thực thu         = revenue.cashCollected              (money held, collateral included)
 *   Còn phải thu     = revenue.outstanding
 *   Thế chân         = collateralFlow.received − returned
 *
 * Run: scripts/e2e/web-e2e.sh --stats  (see --help)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { WebApi, vnDateKey, addDays } = require('./web-api');

const env = process.env;
const CFG = {
  api: env.WEB_E2E_API_URL || 'http://localhost:3280',
  client: (env.WEB_E2E_CLIENT_URL || 'http://localhost:3293').replace(/\/+$/, ''),
  email: env.WEB_E2E_EMAIL || 'merchant1@example.com',
  password: env.WEB_E2E_PASSWORD || 'merchant123',
  zone: env.WEB_E2E_TZ || 'Asia/Ho_Chi_Minh',
  out: env.WEB_E2E_OUT || path.join(os.tmpdir(), 'anyrent-web-e2e'),
  chrome: env.WEB_E2E_CHROME || '',
  headed: env.WEB_E2E_HEADED === '1'
};

/** Checks that fail on purpose until the named issue is fixed (a pass there is reported as "fixed?") */
const KNOWN = {};

function loadPlaywright() {
  for (const p of [env.PLAYWRIGHT_CORE_PATH, 'playwright-core'].filter(Boolean)) {
    try {
      return require(p);
    } catch {
      /* next */
    }
  }
  throw new Error('playwright-core not found: cd tests && yarn install --frozen-lockfile (or set PLAYWRIGHT_CORE_PATH)');
}

/**
 * The tile's value line: the line right after its label, e.g. "5,047", "-18", "+600.000đ", "−356đ".
 * Thousand separators (`.` or `,`) are dropped; the first line with a number is the value (not a chip such as "6 đơn chờ lấy").
 */
/** "+1,234", "−50", "1.918đ" → number */
function parseNum(text) {
  const m = /([−+-]?)\s?(\d[\d.,]*)/.exec(text || '');
  if (!m) return null;
  const n = Number(m[2].replace(/[.,]/g, ''));
  return m[1] === '−' || m[1] === '-' ? -n : n;
}

function parseTileValue(raw) {
  const lines = String(raw || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const value = lines.find((l, i) => i > 0 && /^[−+-]?\s?\d[\d.,]*\s?đ?$/.test(l));
  if (!value) return null;
  const m = /^([−+-]?)\s?(\d[\d.,]*)/.exec(value);
  const n = Number(m[2].replace(/[.,]/g, ''));
  return m[1] === '−' || m[1] === '-' ? -n : n;
}

/** The four expected numbers from one API period report */
function expectedTiles(report) {
  const r = report.revenue || {};
  const flow = r.collateralFlow || { received: 0, returned: 0 };
  return {
    'Giá trị đơn mới': r.totalOrderValue ?? 0,
    'Thực thu': r.cashCollected ?? null,
    'Còn phải thu': r.outstanding ?? 0,
    'Thế chân': (flow.received || 0) - (flow.returned || 0)
  };
}

async function main() {
  fs.mkdirSync(CFG.out, { recursive: true });
  const { chromium } = loadPlaywright();
  const api = new WebApi(CFG.api);
  await api.login(CFG.email, CFG.password);

  const today = vnDateKey();
  const from = addDays(today, -6);
  const q = new URLSearchParams({ startDate: from, endDate: today, groupBy: 'day', limit: '50', timeZone: CFG.zone });
  const report = await api.get(`/api/analytics/period?${q}`);
  const expected = expectedTiles(report);

  const browser = await chromium.launch({ executablePath: CFG.chrome || undefined, headless: !CFG.headed });
  const results = [];
  const check = (name, ok, detail) => {
    const known = KNOWN[name];
    results.push({ name, status: ok ? (known ? 'fixed?' : 'pass') : known ? `known ${known}` : 'fail', detail });
  };
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN', timezoneId: CFG.zone });
    await ctx.addInitScript(
      ([a]) => {
        localStorage.setItem('anyrent-theme', 'light');
        localStorage.setItem('authData', a);
        localStorage.setItem('last_login_time', String(Date.now()));
      },
      [JSON.stringify(api.auth)]
    );
    const page = await ctx.newPage();
    await page.goto(`${CFG.client}/dashboard?period=custom&from=${from}&to=${today}`, { waitUntil: 'networkidle', timeout: 180000 });
    const tiles = page.locator('section[aria-label="Số liệu chính"] button');
    await tiles.first().waitFor({ timeout: 60000 });
    const count = await tiles.count();
    check('tiles: four tiles', count === 4, `count=${count}`);

    for (const label of Object.keys(expected)) {
      const tile = tiles.filter({ hasText: label }).first();
      const raw = await tile.innerText().catch(() => '');
      const shown = parseTileValue(raw);
      const want = expected[label];
      check(label, want !== null && shown === want, `shown=${shown} expected=${want} raw=${JSON.stringify(raw).slice(0, 160)}`);
      if (label === 'Giá trị đơn mới') {
        // #719: "N đơn mới" = rent + sale orders behind the money (cancelled left out)
        const byType = report.revenue?.orderValueByType || {};
        const wantCount = (byType.rent?.orders ?? 0) + (byType.sale?.orders ?? 0);
        const m = /(\d+) đơn mới/.exec(raw);
        check(`${label} › tile new-order count`, !!m && Number(m[1]) === wantCount, `shown=${m && m[1]} rent+sale=${wantCount}`);
      }
    }

    // A tap on each tile opens its drawer: every row must match the API, and the rows must add up to the
    // drawer's headline, which must equal the tile
    const ops = await api.get('/api/analytics/outlet-operations');
    const r = report.revenue || {};
    const cb = r.collectedBreakdown || {};
    const ob = r.outstandingBreakdown || {};
    const flow = r.collateralFlow || {};
    const cash = (ops && ops.cash) || {};
    const drawers = [
      {
        tile: 'Giá trị đơn mới',
        rows: { 'Đơn mới': r.totalOrderValue },
        // the orders behind the money: created in the period, not cancelled (rent + sale)
        counts: { 'Đơn mới': (r.orderValueByType?.rent?.orders ?? 0) + (r.orderValueByType?.sale?.orders ?? 0) },
        sum: (v) => v['Đơn mới'],
        headline: r.totalOrderValue
      },
      {
        tile: 'Thực thu',
        rows: {
          'Cọc khi tạo đơn': cb.deposits,
          'Thu khi giao, bán': cb.pickupAndSale,
          'Phí hư hỏng, trễ hạn': cb.fees,
          'Hoàn tiền đơn huỷ': -(cb.refunds || 0),
          'Thế chân nhận − trả': (flow.received || 0) - (flow.returned || 0)
        },
        sum: (v) => v['Cọc khi tạo đơn'] + v['Thu khi giao, bán'] + v['Phí hư hỏng, trễ hạn'] + v['Hoàn tiền đơn huỷ'] + v['Thế chân nhận − trả'],
        headline: r.cashCollected
      },
      {
        tile: 'Còn phải thu',
        rows: { 'Sẽ thu khi khách lấy đồ': ob.atPickup?.amount, 'Quá ngày lấy, chưa thu': ob.overduePickup?.amount },
        counts: { 'Sẽ thu khi khách lấy đồ': ob.atPickup?.orders, 'Quá ngày lấy, chưa thu': ob.overduePickup?.orders },
        sum: (v) => v['Sẽ thu khi khách lấy đồ'] + v['Quá ngày lấy, chưa thu'],
        headline: r.outstanding
      },
      {
        tile: 'Thế chân',
        rows: {
          'Đã nhận': flow.received,
          'Đã trả lại khách': flow.returned,
          'Sẽ nhận khi giao': cash.collateralToCollect?.securityDeposit,
          'Đang giữ, sẽ trả lại': cash.collateralToReturn?.securityDeposit
        },
        counts: { 'Sẽ nhận khi giao': cash.collateralToCollect?.orders, 'Đang giữ, sẽ trả lại': cash.collateralToReturn?.orders },
        sum: (v) => v['Đã nhận'] - v['Đã trả lại khách'],
        headline: (flow.received || 0) - (flow.returned || 0)
      }
    ];
    for (const d of drawers) {
      const tileEl = tiles.filter({ hasText: d.tile }).first();
      const tileValue = parseTileValue(await tileEl.innerText());
      await tileEl.click();
      const dialog = page.locator('[role="dialog"]').first();
      await dialog.waitFor({ timeout: 15000 });
      await page.waitForTimeout(400);
      const lines = (await dialog.innerText()).split('\n').map((l) => l.trim()).filter(Boolean);
      const headline = parseNum(lines.find((l) => /^[−+-]?\s?\d/.test(l)));
      check(`${d.tile} › drawer headline = tile`, headline === tileValue, `drawer=${headline} tile=${tileValue}`);
      check(`${d.tile} › drawer headline = API`, headline === d.headline, `drawer=${headline} api=${d.headline}`);
      const shown = {};
      for (const [label, want] of Object.entries(d.rows)) {
        const i = lines.findIndex((l, k) => k > 0 && l.startsWith(label));
        if (i < 0) {
          check(`${d.tile} › row ${label}`, want == null, `row not shown, api=${want}`);
          continue;
        }
        const own = /([−+-]?\s?\d[\d.,]*)\s*đ?$/.exec(lines[i].replace(/·.*$/, ''));
        const value = parseNum(lines.slice(i + 1).find((l) => /^[−+-]?\s?\d[\d.,]*\s*đ?$/.test(l)) ?? (own && own[1]));
        shown[label] = value;
        check(`${d.tile} › row ${label}`, value === (want ?? 0), `shown=${value} api=${want}`);
        const wantCount = d.counts && d.counts[label];
        if (wantCount != null) {
          const m = /·\s*(\d+)/.exec(lines[i]);
          check(`${d.tile} › row ${label} count`, !!m && Number(m[1]) === wantCount, `shown=${m && m[1]} api=${wantCount}`);
        }
      }
      if (d.sum && Object.keys(d.rows).every((k) => shown[k] !== undefined || k.startsWith('Sẽ') || k.startsWith('Đang'))) {
        const total = d.sum(shown);
        check(`${d.tile} › rows add up to the headline`, total === headline, `sum=${total} headline=${headline}`);
      }
      // "Xem các đơn liên quan" opens the orders behind the number: their total equals the tile (#708)
      const link = dialog.locator('a[href*="/dashboard/related"]').first();
      if ((await link.count()) === 0) {
        check(`${d.tile} › related orders link`, false, 'no link to /dashboard/related in the drawer');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        continue;
      }
      await link.click();
      const totalCell = page.locator('[data-related-total]');
      const empty = page.getByText(/Không có đơn|No orders/);
      await Promise.race([totalCell.waitFor({ timeout: 60000 }), empty.waitFor({ timeout: 60000 })]).catch(() => {});
      const listTotal = (await totalCell.count()) ? parseNum(await totalCell.innerText()) : 0;
      const rowCount = await page.locator('[data-related-row]').count();
      check(`${d.tile} › related orders total = tile`, listTotal === tileValue, `list=${listTotal} (${rowCount} rows) tile=${tileValue}`);
      // back reopens the drawer (?detail= is in the URL): close it and wait for the tiles to load again
      await page.goBack({ waitUntil: 'networkidle' });
      await page.locator('[role="dialog"]').first().waitFor({ timeout: 30000 }).catch(() => {});
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]') && !document.querySelector('section[aria-label="Số liệu chính"] button[disabled]'), null, { timeout: 60000 });
    }
    await ctx.close();
  } finally {
    await browser.close();
  }

  const file = path.join(CFG.out, 'web-stat-results.json');
  fs.writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), period: [from, today], expected, results }, null, 2));
  for (const r of results) console.log(`${r.status.padEnd(14)} ${r.name} — ${r.detail}`);
  console.log(`results: ${file}`);
  const failed = results.filter((r) => r.status === 'fail' || r.status === 'fixed?').length;
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
