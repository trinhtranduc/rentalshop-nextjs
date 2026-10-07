#!/usr/bin/env node
/**
 * WEB-RT: shop web round trip of the chosen rental days (#573), in a real browser.
 * Owner: "lúc tạo đơn chọn ngày này nọ thì lúc load về, check calendar có chuẩn không, cần có test kỹ".
 *
 * Per browser time zone (the device may not be in Vietnam) and per case:
 *   1. /orders/create: click the pickup and return day cells, add the test product, pick the test customer, create
 *      (a confirm dialog, if one appears, is accepted). The POST body must carry 00:00 VN of both days.
 *   2. Read back: order page progress dates, Sửa đơn prefill, orders list row, /calendar month cells and day panel,
 *      /availability per-day strip for the product, /dashboard "Việc hôm nay" (today / tomorrow cases).
 *   3. Hand the order over through the API, check the return day on /calendar, then cancel it through the API.
 * Every order the run creates is cancelled, also on failure. Day logic uses `YYYY-MM-DD` keys of Asia/Ho_Chi_Minh only.
 *
 * Run: scripts/e2e/web-e2e.sh --help
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { WebApi, vnDateKey, addDays, dayLabel, cellLabel } = require('./web-api');

// ------------------------------------------------------------------ config

const env = process.env;
const CFG = {
  api: env.WEB_E2E_API_URL || 'http://localhost:3280',
  client: (env.WEB_E2E_CLIENT_URL || 'http://localhost:3293').replace(/\/+$/, ''),
  email: env.WEB_E2E_EMAIL || 'agent3.merchant@example.com',
  password: env.WEB_E2E_PASSWORD || 'merchant123',
  zones: (env.WEB_E2E_TZS || 'Asia/Ho_Chi_Minh UTC America/Los_Angeles').split(/[\s,]+/).filter(Boolean),
  cases: (env.WEB_E2E_CASES || '').split(/[\s,]+/).filter(Boolean),
  out: env.WEB_E2E_OUT || path.join(os.tmpdir(), 'anyrent-web-e2e'),
  chrome:
    env.WEB_E2E_CHROME ||
    path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  headed: env.WEB_E2E_HEADED === '1',
  showBugs: env.WEB_E2E_SHOW_BUGS === '1'
};

function loadPlaywright() {
  const tries = [env.PLAYWRIGHT_CORE_PATH, 'playwright-core'].filter(Boolean);
  for (const p of tries) {
    try {
      return require(p);
    } catch {
      /* next */
    }
  }
  throw new Error('playwright-core not found: cd tests && yarn install --frozen-lockfile (or set PLAYWRIGHT_CORE_PATH)');
}

/**
 * Known bugs: `<caseId>:<check>` or `*:<check>` (optionally `@<zone>`) → issue. A known check that fails counts as
 * "known"; one that passes is reported as "fixed?" and fails the run (like jest test.failing), so the entry is removed.
 */
const CHECK_DEEP_LINK = 'availability: the product page link (?productId=) opens that product';
// #579 fixed in #589: the deep link check is a normal check now
const KNOWN = {};

function knownIssue(caseId, check, zone) {
  for (const key of [`${caseId}:${check}@${zone}`, `${caseId}:${check}`, `*:${check}@${zone}`, `*:${check}`]) {
    if (KNOWN[key]) return KNOWN[key];
  }
  return null;
}

// ------------------------------------------------------------------ cases (VN day keys)

/** Last day key of the month of `key`. */
function monthEnd(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

function buildCases(today) {
  const crossP = monthEnd(addDays(today, 3));
  return [
    { id: 'WEB-RT-01', title: 'pickup today, return tomorrow', P: today, R: addDays(today, 1) },
    { id: 'WEB-RT-02', title: 'same-day pickup and return', P: addDays(today, 2), R: addDays(today, 2) },
    { id: 'WEB-RT-03', title: 'pickup tomorrow, 3 days', P: addDays(today, 1), R: addDays(today, 3) },
    { id: 'WEB-RT-04', title: 'cross-month', P: crossP, R: addDays(crossP, 2) }
  ].filter((c) => !CFG.cases.length || CFG.cases.includes(c.id));
}

const civilDays = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000) + 1;
/** 00:00 Vietnam of a day key, as the web Tạo đơn sends it (`dayStartIso`). */
const vnStartIso = (key) => new Date(`${key}T00:00:00+07:00`).toISOString();
const vnKeyOf = (iso) => (iso ? vnDateKey(new Date(iso)) : null);
const monthQuery = (key) => `month=${Number(key.slice(5, 7))}&year=${key.slice(0, 4)}`;

// ------------------------------------------------------------------ results

const results = [];
let current = null;

async function check(name, fn) {
  const { caseId, zone, page } = current;
  const issue = knownIssue(caseId, name, zone);
  let ok = true;
  let detail = '';
  try {
    await fn();
  } catch (e) {
    ok = false;
    detail = e.message;
  }
  let status = ok ? 'pass' : 'fail';
  if (issue && !CFG.showBugs) status = ok ? 'fixed?' : 'known';
  let shot = null;
  if (!ok && page) {
    shot = path.join(CFG.out, `${caseId}-${zone.replace(/\//g, '_')}-${name.replace(/[^a-z0-9]+/gi, '-')}.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => (shot = null));
  }
  results.push({ caseId, zone, check: name, status, issue, detail, shot });
  const mark = { pass: 'ok  ', fail: 'FAIL', known: 'KNOWN', 'fixed?': 'FIXED?' }[status];
  console.log(`  ${mark} ${caseId} ${name}${issue ? ` [${issue}]` : ''}${ok ? '' : `\n       ${detail.split('\n')[0]}${shot ? `\n       screenshot ${shot}` : ''}`}`);
  return ok;
}

function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}: expected ${b}, got ${a}`);
}

// ------------------------------------------------------------------ page helpers

let API = null;

/** Puts the current API session into the browser (after a re-login took the old one). */
async function syncSession(page) {
  await page.evaluate((a) => localStorage.setItem('authData', a), JSON.stringify(API.auth));
}

async function go(page, url) {
  const want = url.split('?')[0];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(CFG.client + url, { waitUntil: 'networkidle', timeout: 180000 });
    await page.waitForTimeout(800);
    const at = new URL(page.url()).pathname;
    if (at === want || attempt === 1) return;
    // Sent to /login or /dashboard: the session was taken by another login (single session). Log in again.
    console.log(`  (session lost on ${url}: landed on ${at}; logging in again)`);
    await API.call('GET', '/api/outlets?limit=1');
    await syncSession(page);
  }
}

const text = (page) => page.evaluate(() => document.body.innerText);

/** Waits until `pattern` shows in the page text, returns the match. */
async function waitText(page, pattern, timeout = 20000) {
  const t0 = Date.now();
  let last = '';
  while (Date.now() - t0 < timeout) {
    last = await text(page);
    const m = last.match(pattern);
    if (m) return m;
    await page.waitForTimeout(400);
  }
  throw new Error(`no ${pattern} in the page (${last.replace(/\s+/g, ' ').slice(0, 300)}…)`);
}

/** Month cell counts on /calendar for the given day keys: { key: { pickups, returns } }. */
async function calendarCells(page, keys) {
  const out = {};
  const months = [...new Set(keys.map((k) => k.slice(0, 7)))];
  for (const m of months) {
    await go(page, `/calendar?${monthQuery(`${m}-01`)}`);
    await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(500);
    for (const k of keys.filter((x) => x.startsWith(m))) {
      const short = `${Number(k.slice(8, 10))}/${Number(k.slice(5, 7))}`;
      const label = await page.evaluate((s) => {
        const b = [...document.querySelectorAll('button[aria-label]')].find((x) => x.getAttribute('aria-label') === s || x.getAttribute('aria-label').startsWith(`${s},`));
        return b ? b.getAttribute('aria-label') : null;
      }, short);
      if (!label) throw new Error(`no calendar cell ${short}`);
      out[k] = { pickups: Number((label.match(/giao (\d+)/) || [])[1] || 0), returns: Number((label.match(/trả (\d+)/) || [])[1] || 0) };
    }
  }
  return out;
}

/** /calendar day panel of `key`: { pickups: text of "Cần giao", returns: text of "Cần nhận trả" }. */
async function dayPanel(page, key) {
  await go(page, `/calendar?${monthQuery(key)}&day=${key}`);
  const m = await waitText(page, /Cần giao · \d+[\s\S]*?Cần nhận trả · \d+[\s\S]*/i);
  const all = m[0];
  const cut = all.search(/Cần nhận trả · \d+/i);
  return { pickups: all.slice(0, cut), returns: all.slice(cut) };
}

/** Dashboard "Việc hôm nay": today label, hand-overs today, tomorrow counts, the to-do list text. */
async function todayWork(page) {
  await go(page, '/dashboard');
  const t = (await waitText(page, /Việc hôm nay[\s\S]*/))[0];
  const today = (t.match(/Việc hôm nay\s*\n\s*((?:CN|T\d) \d\d\/\d\d)/) || [])[1] || null;
  const pickupsToday = Number((t.match(/Cần giao hôm nay\s*\n\s*(\d+)/) || [])[1] ?? NaN);
  const tm = t.match(/Ngày mai · ((?:CN|T\d) \d\d\/\d\d)\s*\n\s*Giao (\d+) · Trả (\d+)/);
  return { today, pickupsToday, tomorrow: tm ? { day: tm[1], pickups: Number(tm[2]), returns: Number(tm[3]) } : null, text: t };
}

/** /availability strip: free units per day key for the product (aria "T5 08/10: còn N. …"). */
async function availabilityStrip(page, product, outletId, P, R) {
  // Picks the product in the search box (the ?productId= deep link has its own check below)
  await go(page, `/availability?pickup=${P}&return=${R}&outletId=${outletId}`);
  await page.getByPlaceholder('Tìm tên hoặc mã sản phẩm').fill(product.name);
  await page.getByRole('listbox').getByRole('button', { name: product.name }).click({ timeout: 30000 });
  await waitText(page, /Còn \d+\/\d+|Thiếu \d+/, 30000);
  await page.waitForTimeout(800);
  const labels = await page.evaluate(() => [...document.querySelectorAll('button[aria-label]')].map((b) => b.getAttribute('aria-label')).filter((l) => /: còn \d+/.test(l)));
  const out = {};
  for (const l of labels) {
    const m = l.match(/^((?:CN|T\d) (\d\d)\/(\d\d)): còn (\d+)/);
    if (m) out[`${m[3]}/${m[2]}`] = Number(m[4]); // keyed by MM/DD, mapped below
  }
  return out;
}

const mmdd = (key) => `${key.slice(5, 7)}/${key.slice(8, 10)}`;

// ------------------------------------------------------------------ create through the UI

async function createInUi(page, { P, R, product, customer }) {
  await go(page, '/orders/create');
  // the day sheet opens by itself on a new order; open it when it does not
  const sheet = page.getByRole('dialog', { name: 'Ngày giao và trả' });
  if (!(await sheet.isVisible().catch(() => false))) await page.getByRole('button', { name: /Chọn ngày giao, trả/ }).first().click();
  await sheet.waitFor({ timeout: 20000 });
  const clickDay = async (key) => {
    const cell = sheet.getByRole('button', { name: cellLabel(key), exact: true });
    for (let i = 0; i < 24 && !(await cell.isVisible().catch(() => false)); i += 1) {
      await sheet.getByRole('button', { name: 'Tháng sau' }).click();
    }
    await cell.click();
  };
  await clickDay(P);
  await clickDay(R); // same day: the pickup day again
  const days = civilDays(P, R);
  await sheet.getByText(`${dayLabel(P)} → ${dayLabel(R)} · ${days} ngày`).waitFor({ timeout: 5000 });
  await sheet.getByRole('button', { name: `Chọn · ${days} ngày` }).click();
  await sheet.waitFor({ state: 'hidden', timeout: 10000 });

  // product
  const search = page.getByRole('searchbox', { name: 'Tìm sản phẩm' }).or(page.getByPlaceholder('Tìm tên hoặc quét mã vạch')).first();
  await search.fill(product.name);
  const add = page.getByRole('button', { name: `Thêm ${product.name} vào đơn` });
  await add.waitFor({ timeout: 30000 });
  await add.click();

  // customer
  await page.getByRole('button', { name: /Khách hàng\s*Chọn khách/ }).click();
  const cdlg = page.getByRole('dialog', { name: 'Chọn khách' });
  await cdlg.getByRole('searchbox', { name: 'Tìm tên hoặc số điện thoại' }).fill(customer.phone);
  await cdlg.getByRole('button', { name: new RegExp(customer.firstName) }).first().click();
  await cdlg.waitFor({ state: 'hidden', timeout: 10000 });

  // create; accept a confirm dialog if this build has one (another PR adds it)
  const posted = page.waitForResponse((r) => r.url().endsWith('/api/orders') && r.request().method() === 'POST', { timeout: 60000 });
  const cart = page.getByRole('complementary', { name: 'Đơn đang tạo' }).or(page.locator('[aria-label="Đơn đang tạo"]')).first();
  await cart.getByRole('button', { name: /^Tạo đơn/ }).click();
  const confirm = page.getByRole('dialog').getByRole('button', { name: /^(Tạo đơn|Xác nhận|Đồng ý|Tạo)/ });
  const first = await Promise.race([posted.then(() => 'posted'), confirm.first().waitFor({ timeout: 60000 }).then(() => 'confirm')]);
  if (first === 'confirm') await confirm.first().click();
  const res = await posted;
  const body = JSON.parse(res.request().postData() || '{}');
  const json = await res.json();
  if (!json.success) throw new Error(`POST /api/orders failed: ${JSON.stringify(json).slice(0, 300)}`);
  return { sent: body, order: json.data };
}

// ------------------------------------------------------------------ one case

async function runCase(page, api, fx, c, zone) {
  const { P, R } = c;
  const today = vnDateKey();
  const days = civilDays(P, R);
  current = { caseId: c.id, zone, page };
  console.log(`\n${c.id} ${c.title}: ${P} → ${R} (browser ${zone})`);

  const calKeys = [...new Set([addDays(P, -1), P, addDays(P, 1), R, addDays(R, 1)])];
  const calBefore = await calendarCells(page, calKeys);
  const dashBefore = P <= addDays(today, 1) ? await todayWork(page) : null;

  let created;
  const ok = await check('create: click the days, POST carries 00:00 VN of both days', async () => {
    created = await createInUi(page, { P, R, product: fx.product, customer: fx.customer });
    fx.orders.add(created.order.id);
    eq([created.sent.pickupPlanAt, created.sent.returnPlanAt], [vnStartIso(P), vnStartIso(R)], 'POST /api/orders days');
    eq([vnKeyOf(created.order.pickupPlanAt), vnKeyOf(created.order.returnPlanAt)], [P, R], 'saved VN days');
  });
  if (!ok) return;
  const n = created.order.orderNumber;
  const id = created.order.id;

  try {
    await check('order page: progress shows Giao P and Trả R', async () => {
      await go(page, `/orders/${n}`);
      // "T5 08/10", or "Hôm nay · T3 06/10" / "Ngày mai · T4 07/10"
      const day = (step) => new RegExp(`${step}\\s*\\n[^\\n]*?((?:CN|T\\d) \\d\\d\\/\\d\\d)`);
      const t = (await waitText(page, new RegExp(`${day('Giao đồ').source}[\\s\\S]*?${day('Trả đồ').source}`)))[0];
      eq([(t.match(day('Giao đồ')) || [])[1], (t.match(day('Trả đồ')) || [])[1]], [dayLabel(P), dayLabel(R)], 'progress');
    });

    await check('edit: Sửa đơn opens with the same range', async () => {
      await go(page, `/orders/${n}/edit`);
      await waitText(page, new RegExp(`Giao ${dayLabel(P)} → Trả ${dayLabel(R)} · ${days} ngày`.replace(/\//g, '\\/')));
    });

    await check('list: row shows "Giao P · trả R"', async () => {
      await go(page, `/orders?q=${n}`);
      await waitText(page, new RegExp(`#${n}`));
      const cells = (await text(page)).split(/[\n\t]/).map((l) => l.trim());
      eq(cells.filter((l) => /^Giao .* · trả /.test(l)), [`Giao ${dayLabel(P)} · trả ${dayLabel(R)}`], 'row schedule');
    });

    await check('calendar: month cell counts +1 hand-over on P only', async () => {
      const after = await calendarCells(page, calKeys);
      const delta = {};
      for (const k of calKeys) delta[k] = after[k].pickups - calBefore[k].pickups;
      const want = Object.fromEntries(calKeys.map((k) => [k, k === P ? 1 : 0]));
      eq(delta, want, 'Giao count change per day');
    });

    await check('calendar: day panel lists it on P, not on P-1 / P+1', async () => {
      const onP = await dayPanel(page, P);
      if (!onP.pickups.includes(`#${n}`)) throw new Error(`#${n} not in "Cần giao" of ${P}`);
      const sub = P === R ? 'giao và trả trong ngày' : `trả ${dayLabel(R)}`;
      if (!onP.pickups.includes(sub)) throw new Error(`"${sub}" not on the row of ${P}`);
      for (const k of [addDays(P, -1), addDays(P, 1)]) {
        const panel = await dayPanel(page, k);
        if ((panel.pickups + panel.returns).includes(`#${n}`)) throw new Error(`#${n} listed on ${k}`);
      }
    });

    await check('availability: one unit held on P..R, all free on P-1 and R+1', async () => {
      const strip = await availabilityStrip(page, fx.product, fx.outletId, P, R);
      const want = {};
      const got = {};
      for (const k of [addDays(P, -1), P, R, addDays(R, 1)]) {
        want[k] = k >= P && k <= R ? fx.stock - 1 : fx.stock;
        got[k] = strip[mmdd(k)];
      }
      eq(got, want, 'free units per day');
    });

    if (!fx.deepLinkDone.has(zone)) {
      fx.deepLinkDone.add(zone);
      // #579 was a race (the URL sync dropped productId before the product loaded): 5 tries, all must open the product
      await check(CHECK_DEEP_LINK, async () => {
        for (let i = 1; i <= 5; i += 1) {
          await go(page, `/availability?productId=${fx.product.id}&pickup=${P}&return=${R}&outletId=${fx.outletId}`);
          await waitText(page, /Còn \d+\/\d+|Thiếu \d+/, 10000).catch((e) => {
            throw new Error(`try ${i}/5: product not selected; ${e.message}`);
          });
        }
      });
    }

    if (dashBefore) {
      await check('dashboard: Việc hôm nay counts it on the VN day', async () => {
        const d = await todayWork(page);
        eq(d.today, dayLabel(today), 'today label');
        if (P === today) {
          eq(d.pickupsToday - dashBefore.pickupsToday, 1, 'Cần giao hôm nay change');
          if (!d.text.includes(n)) throw new Error(`#${n} not in "Đơn cần làm hôm nay"`);
        } else {
          eq(d.tomorrow && d.tomorrow.day, dayLabel(addDays(today, 1)), 'tomorrow label');
          eq(d.tomorrow.pickups - dashBefore.tomorrow.pickups, 1, 'Ngày mai Giao change');
          eq(d.pickupsToday - dashBefore.pickupsToday, 0, 'Cần giao hôm nay change');
        }
      });
    }

    await check('after hand-over: calendar shows the return on R', async () => {
      await api.call('PUT', `/api/orders/${id}`, { status: 'PICKUPED' });
      const after = await calendarCells(page, calKeys);
      const delta = {};
      for (const k of calKeys) delta[k] = after[k].returns - calBefore[k].returns;
      eq(delta, Object.fromEntries(calKeys.map((k) => [k, k === R ? 1 : 0])), 'Trả count change per day');
      const onR = await dayPanel(page, R);
      if (!onR.returns.includes(`#${n}`)) throw new Error(`#${n} not in "Cần nhận trả" of ${R}`);
      const next = await dayPanel(page, addDays(R, 1));
      if (next.returns.includes(`#${n}`)) throw new Error(`#${n} in "Cần nhận trả" of ${addDays(R, 1)}`);
    });
  } finally {
    const r = await api.cancel(id);
    if (r === true) fx.orders.delete(id);
    else console.log(`  cleanup: cancel #${n} failed: ${r}`);
  }
}

// ------------------------------------------------------------------ WEB-RT-05: today rolls over with the tab open

/** 23:30 Vietnam on Mon 05/10/2026; one hour later it is 00:30 on Tue 06/10. */
const CLOCK_START = '2026-10-05T16:30:00.000Z';

/** The dashboard subtitle under the title: the period label ("T2 05/10" for today). */
const dashboardDayLabel = (page) => page.locator('h1').first().locator('xpath=following-sibling::span[1]').innerText({ timeout: 30000 });

/**
 * WEB-2 (#589): the browser clock is set to 23:30 VN, the dashboard loads "today" = 05/10; the clock runs 1 hour
 * (the midnight timer fires) and the tab gets focus: the dashboard shows 06/10 and asks the API for 2026-10-06.
 */
async function runRollover(browser, api, zone) {
  current = { caseId: 'WEB-RT-05', zone, page: null };
  console.log(`\nWEB-RT-05 today rolls over at Vietnam midnight with the tab open (browser ${zone})`);
  const ctx = await newContext(browser, zone, api);
  const page = await ctx.newPage();
  current.page = page;
  try {
    await check('dashboard: an open tab moves to the new Vietnam day at midnight', async () => {
      await page.clock.install({ time: new Date(CLOCK_START) });
      await go(page, '/dashboard');
      eq((await dashboardDayLabel(page)).trim(), dayLabel('2026-10-05'), 'label at 23:30 VN');
      const asked = page.waitForRequest((r) => r.url().includes('/api/analytics/period?') && new URL(r.url()).searchParams.get('startDate') === '2026-10-06', {
        timeout: 60000
      });
      await page.clock.fastForward('01:00:00');
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await asked;
      const t0 = Date.now();
      let label = '';
      while (Date.now() - t0 < 20000 && label !== dayLabel('2026-10-06')) {
        label = (await dashboardDayLabel(page)).trim();
        if (label !== dayLabel('2026-10-06')) await page.waitForTimeout(300);
      }
      eq(label, dayLabel('2026-10-06'), 'label at 00:30 VN');
    });
  } finally {
    await ctx.close().catch(() => {});
  }
}

// ------------------------------------------------------------------ main

async function newContext(browser, zone, api) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN', timezoneId: zone, colorScheme: 'light' });
  await ctx.addInitScript(
    ([a]) => {
      try {
        localStorage.setItem('anyrent-theme', 'light');
        if (!localStorage.getItem('authData')) {
          localStorage.setItem('authData', a);
          localStorage.setItem('last_login_time', String(Date.now()));
        }
      } catch {
        /* storage blocked */
      }
    },
    [JSON.stringify(api.auth)]
  );
  return ctx;
}

async function main() {
  fs.mkdirSync(CFG.out, { recursive: true });
  const { chromium } = loadPlaywright();
  const api = new WebApi(CFG.api);
  await api.login(CFG.email, CFG.password);
  API = api;
  api.onRelogin = async () => {
    if (current && current.page) await syncSession(current.page).catch(() => {});
  };
  const stamp = Date.now().toString(36);
  const fx = { orders: new Set(), stock: 3, deepLinkDone: new Set() };
  fx.outletId = await api.defaultOutletId();
  fx.product = await api.createProduct(`RT web ${stamp}`, fx.stock, fx.outletId);
  fx.customer = await api.createCustomer(`RT web ${stamp}`);
  console.log(`web e2e: client ${CFG.client}, API ${CFG.api}, ${CFG.email}; product #${fx.product.id} "${fx.product.name}", customer ${fx.customer.phone}`);

  const cleanup = async () => {
    for (const id of [...fx.orders]) {
      const r = await api.cancel(id);
      console.log(`cleanup: cancel order ${id}: ${r === true ? 'ok' : r}`);
      if (r === true) fx.orders.delete(id);
    }
  };
  process.on('SIGINT', () => cleanup().finally(() => process.exit(130)));

  const browser = await chromium.launch({ executablePath: CFG.chrome, headless: !CFG.headed });
  try {
    for (const zone of CFG.zones) {
      const ctx = await newContext(browser, zone, api);
      const page = await ctx.newPage();
      for (const c of buildCases(vnDateKey())) {
        try {
          await runCase(page, api, fx, c, zone);
        } catch (e) {
          current = { caseId: c.id, zone, page };
          await check('case ran to the end', async () => {
            throw e;
          });
        }
      }
      await ctx.close();
      if (!CFG.cases.length || CFG.cases.includes('WEB-RT-05')) {
        try {
          await runRollover(browser, api, zone);
        } catch (e) {
          current = { caseId: 'WEB-RT-05', zone, page: null };
          await check('case ran to the end', async () => {
            throw e;
          });
        }
      }
    }
  } finally {
    await browser.close().catch(() => {});
    await cleanup();
  }

  // summary
  const by = (s) => results.filter((r) => r.status === s).length;
  const lines = [`WEB-RT summary: ${results.length} checks, pass ${by('pass')}, fail ${by('fail')}, known ${by('known')}, fixed? ${by('fixed?')}`];
  for (const zone of CFG.zones) {
    const z = results.filter((r) => r.zone === zone);
    lines.push(`  ${zone}: pass ${z.filter((r) => r.status === 'pass').length}, fail ${z.filter((r) => r.status === 'fail').length}, known ${z.filter((r) => r.status === 'known').length}`);
  }
  for (const r of results.filter((x) => x.status !== 'pass')) lines.push(`  ${r.status.toUpperCase()} ${r.caseId} @${r.zone} ${r.check}${r.issue ? ` [${r.issue}]` : ''}: ${r.detail.split('\n')[0]}${r.shot ? ` (${r.shot})` : ''}`);
  console.log(`\n${lines.join('\n')}`);
  fs.writeFileSync(path.join(CFG.out, 'web-rt-results.json'), JSON.stringify({ config: { ...CFG, password: '***' }, results }, null, 2));
  process.exit(by('fail') || by('fixed?') ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
