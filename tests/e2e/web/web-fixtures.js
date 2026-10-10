/**
 * Shared helpers for the shop-web e2e suites roles / plan / stock (#727): SQL on the LOCAL e2e database,
 * dedicated merchants (own staff and kho), a result collector and a browser launcher.
 * Never touches the seeded merchants other suites use: every run registers its own merchants through the real
 * POST /api/auth/register and only changes those rows in SQL (subscription period / status / plan limits).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { WebApi, assertLocal, vnDateKey, addDays } = require('./web-api');

const env = process.env;
const CFG = {
  api: env.WEB_E2E_API_URL || 'http://localhost:3280',
  client: (env.WEB_E2E_CLIENT_URL || 'http://localhost:3293').replace(/\/+$/, ''),
  db: env.E2E_DATABASE_URL || '',
  out: env.WEB_E2E_OUT || path.join(os.tmpdir(), 'anyrent-web-e2e'),
  chrome: env.WEB_E2E_CHROME || '',
  headed: env.WEB_E2E_HEADED === '1',
  zone: 'Asia/Ho_Chi_Minh'
};

// ------------------------------------------------------------------ SQL (local only)

function dbUrl() {
  if (!CFG.db) throw new Error('E2E_DATABASE_URL is not set: the plan / roles / stock suites change subscription rows in SQL');
  const u = new URL(CFG.db);
  if (!['127.0.0.1', 'localhost'].includes(u.hostname)) throw new Error(`E2E_DATABASE_URL host ${u.hostname} is not 127.0.0.1/localhost: refused`);
  if (!u.pathname.replace('/', '')) throw new Error('E2E_DATABASE_URL has no database name');
  return CFG.db;
}

/** One psql statement; rows come back as arrays of strings (tuples only, `|` separated). */
function sql(statement) {
  const out = execFileSync('psql', [dbUrl(), '-v', 'ON_ERROR_STOP=1', '-tAq', '-F', '|', '-c', statement], { encoding: 'utf8' });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('|'));
}

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;

// ------------------------------------------------------------------ plans and merchants

const PLAN_ROOMY = 'E2E Web Roomy';
const PLAN_TINY = 'E2E Web Tiny';

/** A dedicated Plan row (never one the seed or other suites use). Returns its id. */
function ensurePlan(name, limits) {
  const json = JSON.stringify(limits);
  const found = sql(`select id from "Plan" where name=${q(name)}`)[0];
  if (found) {
    sql(`update "Plan" set limits=${q(json)}, "isActive"=true, "updatedAt"=now() where id=${found[0]}`);
    return Number(found[0]);
  }
  const row = sql(
    `insert into "Plan"(name,description,"basePrice",currency,"trialDays",limits,features,"isActive","isPopular","sortOrder","updatedAt")
     values (${q(name)}, 'e2e web test plan', 0, 'USD', 14, ${q(json)}, '[]', false, false, 9000, now()) returning id`
  )[0];
  return Number(row[0]);
}

const ROOMY_LIMITS = { outlets: 5, users: 50, products: 5000, customers: 5000, orders: 5000 };

/** Subscription state of a merchant: status, days of the period end from now (negative = past), plan id */
function setSubscription(merchantId, { status, endDays = 30, planId }) {
  const sets = [`status=${q(status)}`, `"currentPeriodEnd"=now() + interval '${Math.round(endDays * 24 * 60)} minutes'`, `"updatedAt"=now()`];
  if (endDays < 0) sets.push(`"currentPeriodStart"=now() + interval '${Math.round((endDays - 30) * 24 * 60)} minutes'`);
  if (planId) sets.push(`"planId"=${planId}`);
  sql(`update "Subscription" set ${sets.join(', ')} where "merchantId"=${merchantId}`);
  if (planId) sql(`update "Merchant" set "planId"=${planId} where id=${merchantId}`);
}

function deleteSubscription(merchantId) {
  sql(`delete from "Subscription" where "merchantId"=${merchantId}`);
}

/** Current row counts the plan limit counts (merchant scoped, not deleted) */
function counts(merchantId) {
  const n = (t, where) => Number(sql(`select count(*) from "${t}" where ${where}`)[0][0]);
  return {
    outlets: n('Outlet', `"merchantId"=${merchantId}`),
    users: n('User', `"merchantId"=${merchantId}`),
    products: n('Product', `"merchantId"=${merchantId}`),
    customers: n('Customer', `"merchantId"=${merchantId}`),
    orders: Number(sql(`select count(*) from "Order" o join "Outlet" t on t.id=o."outletId" where t."merchantId"=${merchantId}`)[0][0])
  };
}

/** Remove the sample order(s) a registration creates: the merchant has NO orders afterwards */
function deleteAllOrders(merchantId) {
  sql(`delete from "Payment" where "orderId" in (select o.id from "Order" o join "Outlet" t on t.id=o."outletId" where t."merchantId"=${merchantId})`);
  sql(`delete from "OrderItem" where "orderId" in (select o.id from "Order" o join "Outlet" t on t.id=o."outletId" where t."merchantId"=${merchantId})`);
  sql(`delete from "Order" where "outletId" in (select id from "Outlet" where "merchantId"=${merchantId})`);
}

let phoneSeq = 0;
/** A phone number nobody used: ms clock + counter (phones are unique per user and customer) */
const uniquePhone = () => `09${String(Date.now()).slice(-6)}${String((phoneSeq++ % 100)).padStart(2, '0')}`;

const randomIp = () => `10.${(Math.random() * 250) | 0}.${(Math.random() * 250) | 0}.${(Math.random() * 250) | 0}`;

async function postJson(pathname, body, token) {
  const headers = { 'Content-Type': 'application/json', 'X-Forwarded-For': randomIp() };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${CFG.api}${pathname}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j };
}

/**
 * A dedicated merchant through the real registration endpoint, e-mail verified in SQL, on the roomy plan, ACTIVE for
 * 90 days, with an OUTLET_STAFF and an OUTLET_INVENTORY user of its main outlet.
 * Returns { tag, merchantId, outletId, merchant: {email,password}, staff, kho }.
 */
async function createMerchant(tag, { password = 'e2eweb123', withStaff = true } = {}) {
  const email = (role) => `${tag}.${role}@example.com`;
  const reg = await postJson('/api/auth/register', {
    email: email('merchant'),
    password,
    name: `E2E ${tag}`,
    businessName: `E2E Web ${tag}`,
    phone: uniquePhone(),
    role: 'MERCHANT'
  });
  if (!reg.body.success) throw new Error(`register ${tag}: HTTP ${reg.status} ${JSON.stringify(reg.body).slice(0, 300)}`);
  const merchantId = reg.body.data.user.merchant.id;
  const outletId = reg.body.data.user.outlet.id;
  sql(`update "User" set "emailVerified"=true, "emailVerifiedAt"=now() where email=${q(email('merchant'))}`);
  const roomy = ensurePlan(PLAN_ROOMY, ROOMY_LIMITS);
  setSubscription(merchantId, { status: 'ACTIVE', endDays: 90, planId: roomy });
  const acc = { tag, merchantId, outletId, roomyPlanId: roomy, merchant: { email: email('merchant'), password } };
  if (withStaff) {
    const api = new WebApi(CFG.api);
    await api.login(acc.merchant.email, password);
    for (const [key, role] of [['staff', 'OUTLET_STAFF'], ['kho', 'OUTLET_INVENTORY']]) {
      const r = await postJson('/api/users', { email: email(key), password, firstName: key === 'kho' ? 'Kho' : 'Staff', lastName: tag, role, outletId, phone: uniquePhone() }, api.token);
      if (!r.body.success) throw new Error(`create ${role} for ${tag}: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
      acc[key] = { email: email(key), password };
    }
  }
  return acc;
}

// ------------------------------------------------------------------ API helpers (as the signed-in user)

/** JSON call that never throws: { status, ok, code, body } */
async function raw(api, method, pathname, json) {
  const headers = { Authorization: `Bearer ${api.token}` };
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(`${CFG.api}${pathname}`, { method, headers, body: json === undefined ? undefined : JSON.stringify(json) });
  const text = await r.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: r.status, ok: r.ok && body?.success !== false, code: body?.code || '', body };
}

/** Multipart `data` call (products, orders) like the apps send it; never throws */
async function rawForm(api, method, pathname, data) {
  const fd = new FormData();
  fd.append('data', JSON.stringify(data));
  const r = await fetch(`${CFG.api}${pathname}`, { method, headers: { Authorization: `Bearer ${api.token}` }, body: fd });
  const text = await r.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: r.status, ok: r.ok && body?.success !== false, code: body?.code || '', body };
}

/** A rent + sale product with `stock` units, unique name; returns the product row (id = public id) */
async function makeProduct(api, name, stock, outletId, { rentPrice = 100000, salePrice = 300000, deposit = 0 } = {}) {
  const r = await rawForm(api, 'POST', '/api/products', {
    name,
    rentPrice,
    salePrice,
    deposit,
    totalStock: stock,
    outletStock: [{ outletId, stock }],
    pricingOptions: [{ type: 'FIXED', price: rentPrice, isDefault: true }]
  });
  if (!r.ok) throw new Error(`create product ${name}: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return r.body.data.product || r.body.data;
}

async function makeCustomer(api, firstName) {
  const r = await raw(api, 'POST', '/api/customers', { firstName, lastName: 'E2E', phone: uniquePhone() });
  if (!r.ok) throw new Error(`create customer: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return r.body.data.customer || r.body.data;
}

/** A RENT order through the API, as the apps send it. P/R are VN day keys (pickup 00:00, return 23:59:59 VN). */
async function makeRent(api, { customer, product, outletId, from, to, quantity = 1, unitPrice = 100000, deposit = 0, discount = 0, securityDeposit }) {
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
  const total = quantity * unitPrice - discount;
  const body = {
    orderType: 'RENT',
    customerId: customer.id,
    outletId,
    orderItems: [{ productId: product.id, quantity, unitPrice, totalPrice: quantity * unitPrice, deposit: 0, pricingType: 'FIXED' }],
    pickupPlanAt: new Date(`${from}T00:00:00+07:00`).toISOString(),
    returnPlanAt: new Date(`${to}T23:59:59+07:00`).toISOString(),
    totalAmount: total,
    depositAmount: deposit,
    rentalDuration: days,
    rentalDurationUnit: 'day',
    isReadyToDeliver: false
  };
  if (discount > 0) Object.assign(body, { discountType: 'amount', discountValue: discount, discountAmount: discount });
  if (securityDeposit !== undefined) body.securityDeposit = securityDeposit;
  const r = await rawForm(api, 'POST', '/api/orders', body);
  if (!r.ok) throw new Error(`create rent ${from}..${to}: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return r.body.data;
}

async function makeSale(api, { customer, product, outletId, quantity = 1, unitPrice = 300000 }) {
  const body = {
    orderType: 'SALE',
    customerId: customer.id,
    outletId,
    orderItems: [{ productId: product.id, quantity, unitPrice, totalPrice: quantity * unitPrice }],
    totalAmount: quantity * unitPrice,
    depositAmount: 0
  };
  const r = await rawForm(api, 'POST', '/api/orders', body);
  if (!r.ok) throw new Error(`create sale: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return r.body.data;
}

const setStatus = (api, id, status) => raw(api, 'PUT', `/api/orders/${id}`, { status });
const opsOf = async (api) => (await raw(api, 'GET', `/api/analytics/outlet-operations?timeZone=${encodeURIComponent(CFG.zone)}`)).body?.data;

// ------------------------------------------------------------------ browser

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

async function launch() {
  fs.mkdirSync(CFG.out, { recursive: true });
  const { chromium } = loadPlaywright();
  return chromium.launch({ executablePath: CFG.chrome || undefined, headless: !CFG.headed });
}

/**
 * A browser context signed in as `account` ({email,password}) and its API session (same token, so API calls from the
 * test do not kick the browser out). `lang` = vi | en (cookie + localStorage the web reads).
 */
async function openSession(browser, account, { lang = 'vi', apiUrl = CFG.api, loginInBrowser = false } = {}) {
  const api = new WebApi(apiUrl);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: lang === 'en' ? 'en-US' : 'vi-VN', timezoneId: CFG.zone });
  let auth = null;
  try {
    auth = await api.login(account.email, account.password);
  } catch (e) {
    if (!loginInBrowser) {
      await ctx.close();
      throw e;
    }
  }
  await ctx.addCookies([{ name: 'NEXT_LOCALE', value: lang, url: CFG.client }]);
  await ctx.addInitScript(
    ([a, l]) => {
      try {
        localStorage.setItem('anyrent-theme', 'light');
        if (a) {
          localStorage.setItem('authData', a);
          localStorage.setItem('last_login_time', String(Date.now()));
        }
        localStorage.setItem('user_language_preference', l);
      } catch (e) {
        /* storage blocked */
      }
    },
    [auth ? JSON.stringify(api.auth) : null, lang]
  );
  api.onRelogin = async (a) => {
    const pages = ctx.pages();
    for (const p of pages) await p.evaluate((x) => localStorage.setItem('authData', x), JSON.stringify(a)).catch(() => {});
  };
  return { api, ctx, auth };
}

/** Collects console errors / failed API calls of a page: used to prove "no endless spinner / no raw error" */
function watchPage(page) {
  const log = { api: [], errors: [] };
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('/api/') && r.status() >= 400) log.api.push(`${r.status()} ${r.request().method()} ${u.replace(/^https?:\/\/[^/]+/, '')}`);
  });
  page.on('pageerror', (e) => log.errors.push(String(e.message || e).slice(0, 200)));
  return log;
}

/** Visible text of the page body (innerText) */
async function bodyText(page) {
  for (let i = 0; i < 4; i++) {
    try {
      return await page.evaluate(() => document.body.innerText || '');
    } catch (e) {
      await page.waitForTimeout(1000); // a redirect was running: read again
    }
  }
  return '';
}

/** Raw translation keys / error codes a user must never see */
const RAW_KEY = /(errors\.[A-Za-z_]+|PLAN_LIMIT_EXCEEDED|SUBSCRIPTION_[A-Z_]+|TRIAL_EXPIRED|undefined|\bNaN\b|\[object Object\]|translation missing|common\.[a-z]+\.[a-zA-Z]+)/;

async function settle(page, ms = 1200) {
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

/** Open a path and wait for the page to settle; returns { text, status } */
async function visit(page, base, pathname, { wait = 1500 } = {}) {
  await page.goto(`${base}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 180000 }).catch(() => {});
  await settle(page, wait);
  return { text: await bodyText(page), url: page.url() };
}

/** true while a spinner / loading indicator is on screen */
const spinning = (page) =>
  page.evaluate(() => !!document.querySelector('[role="progressbar"], .animate-spin, [aria-busy="true"]'));

// ------------------------------------------------------------------ results

/** Collector with the pass / fail / known statuses of the other web suites. `known` maps check id -> '#N'. */
function makeReporter(suite, known = {}) {
  const results = [];
  const check = (id, name, ok, detail = '') => {
    const k = known[id];
    results.push({ id, name, status: ok ? (k ? 'fixed?' : 'pass') : k ? `known ${k}` : 'fail', detail: String(detail).slice(0, 400) });
  };
  const finish = (file) => {
    fs.mkdirSync(CFG.out, { recursive: true });
    const p = path.join(CFG.out, file);
    fs.writeFileSync(p, JSON.stringify({ at: new Date().toISOString(), suite, results }, null, 2));
    for (const r of results) console.log(`${r.status.padEnd(12)} ${r.id.padEnd(14)} ${r.name} - ${r.detail}`);
    const c = (s) => results.filter((r) => (s === 'known' ? r.status.startsWith('known') : r.status === s)).length;
    console.log(`\n${suite}: ${c('pass')} pass, ${c('fail')} fail, ${c('known')} known, ${c('fixed?')} fixed?   results: ${p}`);
    return c('fail') + c('fixed?');
  };
  return { check, finish, results };
}

async function shot(page, name) {
  fs.mkdirSync(CFG.out, { recursive: true });
  const file = path.join(CFG.out, `${name.replace(/[^\w.-]+/g, '_')}.png`);
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  return file;
}

const uniqueTag = () => `w${Date.now().toString(36)}${(Math.random() * 1296 | 0).toString(36)}`;

module.exports = {
  CFG, sql, q, ensurePlan, PLAN_ROOMY, PLAN_TINY, ROOMY_LIMITS, setSubscription, deleteSubscription, counts, deleteAllOrders,
  createMerchant, postJson, loadPlaywright, launch, openSession, watchPage, bodyText, RAW_KEY, settle, visit, spinning,
  raw, rawForm, makeProduct, makeCustomer, makeRent, makeSale, setStatus, opsOf, makeReporter, shot, uniqueTag, uniquePhone, vnDateKey, addDays, WebApi, assertLocal
};
