#!/usr/bin/env node
/**
 * WEB-STAT: the four Overview tiles on the shop web /dashboard show the numbers the API defines, and a tap opens
 * the drawer of the same tile (#712, #711, #710; definitions in apps/api period-report.ts).
 *
 * For one custom period (the last 7 Vietnam days), the page is opened in a real browser and each tile is compared with
 * GET /api/analytics/period:
 *   Giá trị đơn mới  = revenue.totalOrderValue            (orders created in the period, cancelled excluded)
 *   Thực thu         = revenue.cashCollected              (money held, collateral included)   [known bug #708 on web]
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
const KNOWN = { 'Thực thu': '#708' };

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
    }

    // a tap opens the drawer of that tile, with its link to the orders
    const first = tiles.filter({ hasText: 'Còn phải thu' }).first();
    await first.click();
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.waitFor({ timeout: 15000 });
    check('drawer: the outstanding tile opens its drawer', await dialog.isVisible(), '');
    const link = dialog.locator('a[href*="/orders"]').first();
    const href = await link.getAttribute('href').catch(() => null);
    check('drawer: link goes to orders filtered RESERVED', !!href && href.includes('status=RESERVED'), `href=${href}`);
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
