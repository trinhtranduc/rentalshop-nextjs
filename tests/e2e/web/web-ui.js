/**
 * Page helpers for the shop-web suites roles / plan / stock (#727): the Tạo đơn flow (rent and sale), the product
 * picker cards, the calendar, the orders list tabs and the dashboard "Đơn cần làm" panel. Vietnamese labels (vi) and
 * English labels (en) are both read from the locale files, so a label change cannot break the suite silently.
 */
const fs = require('fs');
const path = require('path');
const { dayLabel, cellLabel, addDays } = require('./web-api');

const LOCALES = path.join(__dirname, '../../../locales');
const json = (lang, file) => JSON.parse(fs.readFileSync(path.join(LOCALES, lang, `${file}.json`), 'utf8'));

/** Walk `a.b.c` in a locale file */
function tr(lang, file, key, vars = {}) {
  let o = json(lang, file);
  for (const part of key.split('.')) o = o?.[part];
  if (typeof o !== 'string') throw new Error(`locale ${lang}/${file}: no string at ${key}`);
  return o.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

const text = (page) => page.evaluate(() => document.body.innerText);

async function waitText(page, pattern, timeout = 20000) {
  const t0 = Date.now();
  let last = '';
  while (Date.now() - t0 < timeout) {
    last = await text(page).catch(() => '');
    const m = last.match(pattern);
    if (m) return m;
    await page.waitForTimeout(400);
  }
  throw new Error(`no ${pattern} in the page (${last.replace(/\s+/g, ' ').slice(0, 300)})`);
}

async function go(page, base, url, { wait = 800 } = {}) {
  await page.goto(base + url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(wait);
}

const civilDays = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000) + 1;

/** Pick the pickup and return day in the day sheet of /orders/create (vi labels) */
async function pickDays(page, P, R) {
  const sheet = page.getByRole('dialog', { name: 'Ngày giao và trả' });
  if (!(await sheet.isVisible().catch(() => false))) await page.getByRole('button', { name: /Chọn ngày giao, trả/ }).first().click();
  await sheet.waitFor({ timeout: 20000 });
  const clickDay = async (key) => {
    const cell = sheet.getByRole('button', { name: cellLabel(key), exact: true });
    for (let i = 0; i < 24 && !(await cell.isVisible().catch(() => false)); i += 1) await sheet.getByRole('button', { name: 'Tháng sau' }).click();
    await cell.click();
  };
  await clickDay(P);
  await clickDay(R);
  const days = civilDays(P, R);
  await sheet.getByText(`${dayLabel(P)} → ${dayLabel(R)} · ${days} ngày`).waitFor({ timeout: 5000 });
  await sheet.getByRole('button', { name: `Chọn · ${days} ngày` }).click();
  await sheet.waitFor({ state: 'hidden', timeout: 10000 });
}

/** The product picker card of `name`: { found, out, left, total, text } (vi) */
async function pickerCard(page, name) {
  const search = page.getByRole('searchbox', { name: 'Tìm sản phẩm' }).or(page.getByPlaceholder('Tìm tên hoặc quét mã vạch')).first();
  await search.fill(name);
  await page.waitForTimeout(900);
  const card = page.locator('article', { hasText: name }).first();
  if (!(await card.count())) return { found: false, text: '' };
  await card.waitFor({ timeout: 20000 });
  // the "Còn n/m" label can still read "…" while the availability loads
  for (let i = 0; i < 40; i += 1) {
    if (!/^…$|…\s*$/m.test(await card.innerText())) break;
    await page.waitForTimeout(250);
  }
  const t = (await card.innerText()).replace(/\s+/g, ' ');
  const left = /Còn (\d+)\/(\d+)/.exec(t);
  return { found: true, out: /Hết trong lịch này/.test(t), left: left ? Number(left[1]) : null, total: left ? Number(left[2]) : null, text: t };
}

/**
 * Create an order in the browser. `type` RENT (days P..R) or SALE. `lines` = [{ product, qty }].
 * Returns { sent (POST body), order (response data), blocked (text of a "blocked"/error notice, or null) }.
 */
async function createInUi(page, base, { type = 'RENT', P, R, lines, customer, expectFail = false }) {
  await go(page, base, '/orders/create');
  if (type === 'SALE') {
    const sheet = page.getByRole('dialog', { name: 'Ngày giao và trả' });
    if (await sheet.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape'); // the day sheet opens by itself on a new order: a sale has no days
      await sheet.waitFor({ state: 'hidden', timeout: 10000 });
    }
    await page.getByRole('tab', { name: 'Bán' }).click();
  } else {
    await pickDays(page, P, R);
  }
  for (const { product, qty = 1 } of lines) {
    const search = page.getByRole('searchbox', { name: 'Tìm sản phẩm' }).or(page.getByPlaceholder('Tìm tên hoặc quét mã vạch')).first();
    await search.fill(product.name);
    const add = page.getByRole('button', { name: `Thêm ${product.name} vào đơn` });
    await add.waitFor({ timeout: 30000 });
    await add.click();
    for (let i = 1; i < qty; i += 1) await page.getByRole('button', { name: `Thêm 1 ${product.name}` }).click();
  }
  await page.getByRole('button', { name: /Khách hàng\s*Chọn khách/ }).click();
  const cdlg = page.getByRole('dialog', { name: 'Chọn khách' });
  await cdlg.getByRole('searchbox', { name: 'Tìm tên hoặc số điện thoại' }).fill(customer.phone);
  const pick = cdlg.getByRole('button', { name: new RegExp(customer.firstName) }).first();
  await pick.waitFor({ timeout: 15000 }).catch(async () => {
    throw new Error(`customer ${customer.phone} not offered: ${(await cdlg.innerText()).replace(/\s+/g, ' ').slice(0, 300)}`);
  });
  await pick.click();
  await cdlg.waitFor({ state: 'hidden', timeout: 10000 });

  const posted = page.waitForResponse((r) => r.url().endsWith('/api/orders') && r.request().method() === 'POST', { timeout: 60000 });
  const cart = page.locator('[aria-label="Đơn đang tạo"]').first();
  await cart.getByRole('button', { name: /^Tạo đơn/ }).click();
  const confirm = page.getByRole('dialog').getByRole('button', { name: /^(Tạo đơn|Bán & thu tiền|Xác nhận|Đồng ý|Vẫn tạo đơn|Tạo)/ });
  const first = await Promise.race([posted.then(() => 'posted'), confirm.first().waitFor({ timeout: 60000 }).then(() => 'confirm')]);
  if (first === 'confirm') await confirm.first().click();
  const res = await posted;
  const body = JSON.parse(res.request().postData() || '{}');
  const j = await res.json();
  if (!j.success && !expectFail) throw new Error(`POST /api/orders failed: ${JSON.stringify(j).slice(0, 300)}`);
  return { sent: body, order: j.data, response: j, status: res.status() };
}

/** Parse "1,234" / "1.234đ" / "−50" */
function num(s) {
  const m = /([−+-]?)\s?(\d[\d.,]*)/.exec(s || '');
  if (!m) return null;
  const n = Number(m[2].replace(/[.,]/g, ''));
  return m[1] === '−' || m[1] === '-' ? -n : n;
}

/** Calendar month cell labels: { 'D/M': 'aria-label' } */
async function calendarCellLabels(page) {
  return page.evaluate(() => {
    const out = {};
    for (const b of document.querySelectorAll('button[aria-label]')) {
      const l = b.getAttribute('aria-label');
      const m = /^(\d{1,2}\/\d{1,2})(,|$)/.exec(l);
      if (m) out[m[1]] = l;
    }
    return out;
  });
}

const monthQuery = (key) => `month=${Number(key.slice(5, 7))}&year=${key.slice(0, 4)}`;

/** Sidebar links: the hrefs the signed-in role can click */
const navHrefs = (page) => page.evaluate(() => [...new Set([...document.querySelectorAll('nav a[href], aside a[href]')].map((a) => a.getAttribute('href')))]);

/**
 * The "Hôm nay" card of /dashboard: { pickups:{done,total}, returns:{done,total}, overdue, noShows, tomorrow:{pickups,returns}|null }
 * Counters are links with an aria-label "<label>: …" (labels from dashboard.json home.today.*).
 */
async function todayCard(page, lang = 'vi') {
  const L = (k) => tr(lang, 'dashboard', `home.today.${k}`);
  const get = async (label) =>
    page.evaluate((lbl) => {
      const a = [...document.querySelectorAll('a[aria-label]')].find((x) => x.getAttribute('aria-label').startsWith(`${lbl}:`));
      return a ? a.innerText.replace(/\s+/g, ' ').trim() : null;
    }, L('pickups') === label ? label : label);
  const frac = (t) => {
    const m = /(\d+)\/(\d+)/.exec(t || '');
    return m ? { done: Number(m[1]), total: Number(m[2]) } : null;
  };
  const one = (t) => {
    const m = /(\d+)\s*$/.exec(t || '');
    return m ? Number(m[1]) : null;
  };
  const body = await text(page);
  const tm = new RegExp(L('tomorrowCounts').replace('{pickups}', '(\\d+)').replace('{returns}', '(\\d+)')).exec(body);
  return {
    pickups: frac(await get(L('pickups'))),
    returns: frac(await get(L('returns'))),
    overdue: one(await get(L('overdue'))),
    noShows: one(await get(L('noShows'))),
    tomorrow: tm ? { pickups: Number(tm[1]), returns: Number(tm[2]) } : null
  };
}

/** Order numbers listed under "Đơn cần làm hôm nay" (dashboard) and the "+N đơn" overflow */
async function todayRows(page, lang = 'vi') {
  const title = tr(lang, 'dashboard', 'home.orders.title');
  return page.evaluate((ttl) => {
    const h = [...document.querySelectorAll('h2')].find((x) => x.innerText.trim() === ttl);
    const sec = h && h.closest('section');
    if (!sec) return null;
    const nums = [...sec.querySelectorAll('li a[href^="/orders/"]')].map((a) => a.getAttribute('href').split('/').pop());
    return { numbers: nums, text: sec.innerText.replace(/\s+/g, ' ') };
  }, title);
}

/** /orders tab badges and rows: { todo, noshow, all (count text), numbers: [#n …] of the rows shown } */
async function ordersView(page) {
  return page.evaluate(() => {
    const badge = (re) => {
      const b = [...document.querySelectorAll('main button')].find((x) => re.test(x.innerText.replace(/\s+/g, ' ')));
      const m = b && /(\d+)\s*$/.exec(b.innerText.replace(/\s+/g, ' ').trim());
      return b ? (m ? Number(m[1]) : 0) : null;
    };
    const body = document.body.innerText;
    const numbers = [...new Set([...body.matchAll(/#(\w+) · /g)].map((m) => m[1]))];
    return { todo: badge(/^(Việc cần làm|To do|Work today)/i), noshow: badge(/^(Chưa lấy đồ|Not picked up)/i), numbers };
  });
}

module.exports = {
  navHrefs, todayCard, todayRows, ordersView, tr, json, text, waitText, go, civilDays, pickDays, pickerCard, createInUi, num, calendarCellLabels, monthQuery, dayLabel, cellLabel, addDays };
