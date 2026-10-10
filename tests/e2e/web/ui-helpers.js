/**
 * Shared helpers of the shop-web UI e2e (WEB-UI, #727): config, browser session, error collector,
 * raw-i18n-key detector, screenshot on failure, check recorder with the same pass/fail/known output
 * as dashboard-stats.web.js. Nothing here touches app code.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { WebApi } = require('./web-api');

const env = process.env;
const CFG = {
  api: env.WEB_E2E_API_URL || 'http://localhost:3280',
  client: (env.WEB_E2E_CLIENT_URL || 'http://localhost:3293').replace(/\/+$/, ''),
  email: env.WEB_E2E_EMAIL || 'merchant2@example.com',
  password: env.WEB_E2E_PASSWORD || 'merchant123',
  staffEmail: env.WEB_E2E_STAFF_EMAIL || '',
  staffPassword: env.WEB_E2E_STAFF_PASSWORD || 'staff123',
  zone: env.WEB_E2E_TZ || 'Asia/Ho_Chi_Minh',
  out: env.WEB_E2E_OUT || env.E2E_OUT || path.join(os.tmpdir(), 'anyrent-web-e2e'),
  chrome: env.WEB_E2E_CHROME || '',
  headed: env.WEB_E2E_HEADED === '1',
  cases: (env.WEB_E2E_CASES || '').split(',').map((s) => s.trim()).filter(Boolean)
};

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

/** i18n keys that leaked to the screen: `errors.X`, `common.x`, `orders.create.title`, ... */
const RAW_KEY = /(?<![\w./@-])(?:errors|common|orders|customers|products|categories|outlets|users|settings|calendar|dashboard|auth|validation|notifications|loyalty|subscription|plans|pricing|landing|nav|availability|merchant)\.[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*(?![\w@/-])/g;
function rawKeys(text) {
  const found = new Set();
  for (const m of String(text || '').matchAll(RAW_KEY)) {
    // skip file names / domains / decimals (anyrent.shop, e.g.)
    if (/\.(shop|com|vn|org|net|png|jpg|svg|pdf|csv|xlsx)$/i.test(m[0])) continue;
    found.add(m[0]);
  }
  return [...found];
}

/** Records console errors, page errors and failed requests of a page (4xx are collected apart: expected ones are listed by the test) */
function collect(page) {
  const st = { console: [], pageErrors: [], failed: [], http4xx: [], http5xx: [] };
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // the browser logs every 4xx/5xx fetch as a console error; they are counted from `response`
    if (/Failed to load resource/.test(t)) return;
    if (/Download the React DevTools|Fast Refresh|webpack-hmr/.test(t)) return;
    st.console.push(t.slice(0, 300));
  });
  page.on('pageerror', (e) => st.pageErrors.push(String(e.message || e).slice(0, 300)));
  // third-party scripts (ads, analytics, fonts) are not ours: only localhost requests count
  const ours = (u) => /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(u);
  page.on('requestfailed', (r) => {
    if (!ours(r.url())) return;
    const f = r.failure()?.errorText || '';
    if (/ERR_ABORTED|NS_BINDING_ABORTED/.test(f)) return; // navigation / cancelled by the app
    st.failed.push(`${r.method()} ${r.url().slice(0, 140)} ${f}`);
  });
  page.on('response', (r) => {
    if (!ours(r.url())) return;
    const s = r.status();
    const line = `${s} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 140)}`;
    if (s >= 500) st.http5xx.push(line);
    else if (s >= 400) st.http4xx.push(line);
  });
  st.reset = () => {
    for (const k of ['console', 'pageErrors', 'failed', 'http4xx', 'http5xx']) st[k].length = 0;
  };
  return st;
}

/** Visible text of the page, without script / style */
const bodyText = (page) => page.evaluate(() => document.body.innerText || '');

/**
 * "Page is healthy": no raw i18n key, no console / page error, no failed request, no 5xx, no spinner left.
 * `allow4xx` is a list of regexes for expected 4xx lines. Returns the problems (empty = healthy).
 */
async function pageProblems(page, st, { allow4xx = [] } = {}) {
  const out = [];
  const text = await bodyText(page).catch(() => '');
  const keys = rawKeys(text);
  if (keys.length) out.push(`raw keys: ${keys.slice(0, 5).join(', ')}`);
  if (st.pageErrors.length) out.push(`page errors: ${st.pageErrors[0]}`);
  if (st.console.length) out.push(`console errors: ${st.console[0]}`);
  if (st.failed.length) out.push(`failed requests: ${st.failed[0]}`);
  if (st.http5xx.length) out.push(`5xx: ${st.http5xx[0]}`);
  const bad4 = st.http4xx.filter((l) => !allow4xx.some((re) => re.test(l)));
  if (bad4.length) out.push(`4xx: ${bad4[0]}`);
  const spin = await page.locator('[role="progressbar"], .animate-spin').filter({ visible: true }).count().catch(() => 0);
  if (spin) out.push(`spinner still visible (${spin})`);
  return out;
}

/** Wait for the network to go quiet and the spinners to go away; never throws */
async function settle(page, ms = 20000) {
  await page.waitForTimeout(350);
  await page.waitForLoadState('networkidle', { timeout: ms }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('.animate-spin, [role="progressbar"]'), null, { timeout: ms }).catch(() => {});
}

/**
 * A recorder of checks. `KNOWN` maps check name -> '#N' (a failing check is "known"; a passing one "fixed?").
 * A check whose case id (the part before ' › ' or the first token) is not in WEB_E2E_CASES is skipped when cases are set.
 */
function recorder(KNOWN = {}) {
  const results = [];
  const check = (name, ok, detail = '') => {
    const known = KNOWN[name];
    results.push({ name, status: ok ? (known ? 'fixed?' : 'pass') : known ? `known ${known}` : 'fail', detail: ok ? '' : String(detail).replace(/\s+/g, ' ').slice(0, 400) });
    return ok;
  };
  return { results, check };
}

/** One case = an async function; a throw is a failure with the screenshot of the page (named `id`) */
async function runCase(id, title, fn, { page, rec, shot }) {
  if (CFG.cases.length && !CFG.cases.some((c) => id === c || id.startsWith(c))) return;
  const t0 = Date.now();
  const before = rec.results.length;
  try {
    await fn();
  } catch (e) {
    rec.check(`${id} ${title} › crashed`, false, e.message.split('\n')[0]);
  }
  const failed = rec.results.slice(before).some((r) => r.status === 'fail');
  if (failed && page && shot) await shot(page, id);
  console.log(`  ${failed ? 'FAIL' : 'ok  '} ${id} ${title} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

function shotter() {
  fs.mkdirSync(CFG.out, { recursive: true });
  return async (page, id) => {
    try {
      await page.screenshot({ path: path.join(CFG.out, `${id}.png`), fullPage: false });
    } catch {
      /* page closed */
    }
  };
}

/** Log in over HTTP and put the session into localStorage of a new context (like the other web tests) */
async function openSession({ browser, api, viewport = { width: 1440, height: 900 }, locale = 'vi-VN', theme = 'light', lang } = {}) {
  const ctx = await browser.newContext({ viewport, locale, timezoneId: CFG.zone });
  await ctx.addInitScript(
    ([a, th]) => {
      if (a) {
        localStorage.setItem('authData', a);
        localStorage.setItem('last_login_time', String(Date.now()));
      }
      if (th) localStorage.setItem('anyrent-theme', th);
    },
    [api && api.auth ? JSON.stringify(api.auth) : '', theme]
  );
  // the language is the NEXT_LOCALE cookie (packages/hooks useLocale)
  if (lang) await ctx.addCookies([{ name: 'NEXT_LOCALE', value: lang, url: CFG.client }]);
  return ctx;
}

async function launch() {
  fs.mkdirSync(CFG.out, { recursive: true });
  const { chromium } = loadPlaywright();
  return chromium.launch({ executablePath: CFG.chrome || undefined, headless: !CFG.headed, slowMo: CFG.headed ? 60 : 0 });
}

/** Login to the API and return the WebApi; the browser context gets the new token when a call re-logs in */
async function apiLogin(email = CFG.email, password = CFG.password) {
  const api = new WebApi(CFG.api);
  await api.login(email, password);
  return api;
}

const uniq = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();

function finish(results, file, extra = {}) {
  fs.mkdirSync(CFG.out, { recursive: true });
  const f = path.join(CFG.out, file);
  fs.writeFileSync(f, JSON.stringify({ at: new Date().toISOString(), ...extra, results }, null, 2));
  for (const r of results) console.log(`${r.status.padEnd(12)} ${r.name} — ${r.detail}`);
  const c = (s) => results.filter((r) => r.status === s).length;
  const known = results.filter((r) => r.status.startsWith('known')).length;
  console.log(`results: ${file} — pass ${c('pass')}, fail ${c('fail')}, known ${known}, fixed? ${c('fixed?')}`);
  console.log(`json: ${f}`);
  return c('fail') + c('fixed?');
}

/** Standard main() wrapper: crash = exit 2, failures = exit 1 */
function main(fn) {
  fn().then(
    (failed) => process.exit(failed ? 1 : 0),
    (e) => {
      console.error(e);
      process.exit(2);
    }
  );
}

module.exports = { CFG, loadPlaywright, rawKeys, collect, bodyText, pageProblems, settle, recorder, runCase, shotter, openSession, launch, apiLogin, uniq, finish, main };
