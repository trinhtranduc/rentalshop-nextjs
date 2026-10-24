#!/usr/bin/env node
/**
 * ADM-STAT (#1190): click each admin dashboard tile / plan chip, land on /merchants
 * with the matching filter, and every visible row matches that bucket.
 *
 * Oracle = GET /api/merchants?status=&plan=&limit=1 (same query the list uses).
 * Tile number, list `data-total`, and API `total` must be equal. A row that
 * violates the bucket (expired shop on In use, Basic chip showing Pro, …) fails.
 *
 * Run headed: WEB_E2E_HEADED=1 scripts/e2e/admin-e2e.sh
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { WebApi } = require('./web-api');

const env = process.env;
const CFG = {
  api: env.WEB_E2E_API_URL || 'http://localhost:3280',
  admin: (env.WEB_E2E_ADMIN_URL || 'http://localhost:3301').replace(/\/+$/, ''),
  email: env.WEB_E2E_ADMIN_EMAIL || 'admin@rentalshop.com',
  password: env.WEB_E2E_ADMIN_PASSWORD || 'admin123',
  zone: env.WEB_E2E_TZ || 'Asia/Ho_Chi_Minh',
  out: env.WEB_E2E_OUT || path.join(os.tmpdir(), 'anyrent-admin-e2e'),
  chrome: env.WEB_E2E_CHROME || '',
  headed: env.WEB_E2E_HEADED !== '0',
  slow: Number(env.WEB_E2E_SLOW_MS || 80),
};

const EXPIRING_MS = 7 * 24 * 60 * 60 * 1000;

const CASES = [
  { id: 'ADM-STAT-01', title: 'In use', testId: 'dash-tile-in-use-open', href: '/merchants?status=current', query: { status: 'current' } },
  { id: 'ADM-STAT-02', title: 'Basic', testId: 'dash-chip-basic', href: '/merchants?status=current&plan=Basic', query: { status: 'current', plan: 'Basic' } },
  { id: 'ADM-STAT-03', title: 'Pro', testId: 'dash-chip-pro', href: '/merchants?status=current&plan=Professional', query: { status: 'current', plan: 'Professional' } },
  { id: 'ADM-STAT-04', title: 'Enterprise', testId: 'dash-chip-enterprise', href: '/merchants?status=current&plan=Enterprise', query: { status: 'current', plan: 'Enterprise' } },
  { id: 'ADM-STAT-05', title: 'Trial', testId: 'dash-tile-trial', href: '/merchants?status=trial', query: { status: 'trial' } },
  { id: 'ADM-STAT-06', title: 'Expiring', testId: 'dash-tile-expiring', href: '/merchants?status=expiring', query: { status: 'expiring' } },
  { id: 'ADM-STAT-07', title: 'Expired', testId: 'dash-tile-expired', href: '/merchants?status=expired', query: { status: 'expired' } },
  { id: 'ADM-STAT-08', title: 'Cancelled', testId: 'dash-tile-cancelled', href: '/merchants?status=cancelled', query: { status: 'cancelled' } },
  { id: 'ADM-STAT-09', title: 'Merchants', testId: 'dash-tile-merchants', href: '/merchants', query: {} },
];

function loadPlaywright() {
  for (const p of [env.PLAYWRIGHT_CORE_PATH, 'playwright-core'].filter(Boolean)) {
    try {
      return require(p);
    } catch {
      /* next */
    }
  }
  throw new Error('playwright-core not found: cd tests && yarn install --frozen-lockfile');
}

function rowMatches(query, row, nowMs) {
  const status = String(row.status || '').toUpperCase();
  const plan = String(row.plan || '').toLowerCase();
  const end = row.periodEnd ? new Date(row.periodEnd).getTime() : NaN;
  const st = query.status;
  const planQ = query.plan;
  if (st === 'current') {
    if (status === 'CANCELLED' || status === 'PAUSED') return `cancelled/paused ${status}`;
    if (!(end > nowMs)) return `period ended ${row.periodEnd}`;
  } else if (st === 'trial') {
    if (status !== 'TRIAL') return `status ${status}`;
  } else if (st === 'cancelled') {
    if (status !== 'CANCELLED') return `status ${status}`;
  } else if (st === 'expired') {
    if (!(end < nowMs)) return `period not ended ${row.periodEnd}`;
  } else if (st === 'expiring') {
    if (!(end > nowMs && end <= nowMs + EXPIRING_MS)) return `not in 7d window ${row.periodEnd}`;
  }
  if (planQ === 'Basic' && plan !== 'basic') return `plan ${row.plan}`;
  if (planQ === 'Professional' && !plan.includes('pro')) return `plan ${row.plan}`;
  if (planQ === 'Enterprise' && !plan.includes('enterprise')) return `plan ${row.plan}`;
  return null;
}

async function merchantTotal(api, query) {
  const params = new URLSearchParams({ limit: '1', page: '1' });
  if (query.status) params.set('status', query.status);
  if (query.plan) params.set('plan', query.plan);
  const data = await api.get(`/api/merchants?${params}`);
  return data?.total ?? 0;
}

async function main() {
  fs.mkdirSync(CFG.out, { recursive: true });
  const { chromium } = loadPlaywright();
  const api = new WebApi(CFG.api);
  await api.login(CFG.email, CFG.password);

  const browser = await chromium.launch({
    executablePath: CFG.chrome || undefined,
    headless: !CFG.headed,
    slowMo: CFG.headed ? CFG.slow : 0,
  });
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, status: ok ? 'pass' : 'fail', detail: ok ? '' : String(detail).replace(/\s+/g, ' ').slice(0, 400) });
    return ok;
  };

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: CFG.zone });
  await ctx.addInitScript(
    ([a]) => {
      localStorage.setItem('anyrent-theme', 'light');
      localStorage.setItem('authData', a);
      localStorage.setItem('last_login_time', String(Date.now()));
    },
    [JSON.stringify(api.auth)]
  );

  const page = await ctx.newPage();
  try {
    for (const c of CASES) {
      const t0 = Date.now();
      const wantTotal = await merchantTotal(api, c.query);
      await page.goto(`${CFG.admin}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      const clickTarget = page.getByTestId(c.testId);
      await clickTarget.waitFor({ state: 'visible', timeout: 60000 });
      const tileText = await clickTarget.innerText().catch(() => '');
      const waitList = page.waitForURL((u) => u.pathname === '/merchants', { timeout: 30000 });
      // List hook always sends `page=`. Dashboard tile totals do not — ignore those in-flight calls.
      const waitApi = page.waitForResponse((r) => {
        if (!r.ok() || !r.url().includes('/api/merchants')) return false;
        const u = new URL(r.url());
        if (!u.searchParams.has('page')) return false;
        if (c.query.status && u.searchParams.get('status') !== c.query.status) return false;
        if (c.query.plan && u.searchParams.get('plan') !== c.query.plan) return false;
        if (!c.query.status && u.searchParams.has('status')) return false;
        if (!c.query.plan && u.searchParams.has('plan')) return false;
        return true;
      }, { timeout: 30000 });
      await clickTarget.click();
      await waitList;
      const listRes = await waitApi;
      const url = page.url();
      const pathQuery = url.replace(/^https?:\/\/[^/]+/, '');
      check(`${c.id} ${c.title} › url`, pathQuery === c.href || pathQuery.startsWith(`${c.href}&`) || (c.href === '/merchants' && pathQuery === '/merchants'), `url=${pathQuery} want=${c.href}`);
      check(`${c.id} ${c.title} › not subscriptions`, !/\/subscriptions/.test(url), url);

      let apiTotal = wantTotal;
      const body = await listRes.json().catch(() => ({}));
      apiTotal = body?.data?.total ?? wantTotal;
      const reqUrl = listRes.url();
      if (c.query.status) {
        check(`${c.id} ${c.title} › list request status`, new URL(reqUrl).searchParams.get('status') === c.query.status, reqUrl);
      }
      if (c.query.plan) {
        check(`${c.id} ${c.title} › list request plan`, new URL(reqUrl).searchParams.get('plan') === c.query.plan, reqUrl);
      }

      await page.waitForFunction(
        (n) => {
          const el = document.querySelector('[data-testid="merchant-list-total"]');
          return el && el.getAttribute('data-ready') === '1' && Number(el.getAttribute('data-total')) === n;
        },
        apiTotal,
        { timeout: 15000 }
      );

      const listTotalAttr = await page.getByTestId('merchant-list-total').getAttribute('data-total').catch(() => null);
      const listTotal = listTotalAttr == null ? null : Number(listTotalAttr);
      check(`${c.id} ${c.title} › list total = API`, listTotal === apiTotal, `list=${listTotal} api=${apiTotal} tile=${JSON.stringify(tileText).slice(0, 80)}`);

      const rows = page.getByTestId('merchant-row');
      const n = await rows.count();
      if (apiTotal === 0) {
        check(`${c.id} ${c.title} › empty list`, n === 0, `rows=${n}`);
      } else {
        check(`${c.id} ${c.title} › has rows`, n > 0, `rows=${n} apiTotal=${apiTotal}`);
        const nowMs = Date.now();
        const sample = Math.min(n, 50);
        const bad = [];
        for (let i = 0; i < sample; i++) {
          const row = rows.nth(i);
          const info = {
            plan: await row.getAttribute('data-plan'),
            status: await row.getAttribute('data-sub-status'),
            periodEnd: await row.getAttribute('data-period-end'),
          };
          const why = rowMatches(c.query, info, nowMs);
          if (why) bad.push(`${info.plan}/${info.status}/${why}`);
        }
        check(`${c.id} ${c.title} › rows match filter`, bad.length === 0, bad.slice(0, 5).join('; '));
      }
      console.log(`  ${results.slice(-4).some((r) => r.status === 'fail') ? 'FAIL' : 'ok  '} ${c.id} ${c.title} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    }
  } catch (e) {
    check('ADM-STAT crashed', false, e.message.split('\n')[0]);
    try {
      await page.screenshot({ path: path.join(CFG.out, 'ADM-STAT.png'), fullPage: false });
    } catch {
      /* ignore */
    }
  } finally {
    await browser.close();
  }

  const file = path.join(CFG.out, 'admin-stat-results.json');
  fs.writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
  for (const r of results) console.log(`${r.status.padEnd(8)} ${r.name} — ${r.detail}`);
  const failed = results.filter((r) => r.status === 'fail').length;
  console.log(`results: ${file} — pass ${results.length - failed}, fail ${failed}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
