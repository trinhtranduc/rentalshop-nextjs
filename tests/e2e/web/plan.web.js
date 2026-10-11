#!/usr/bin/env node
/**
 * WEB-SUB (#727): an expired / cancelled / paused / past-due / missing / out-of-plan merchant on the shop web.
 *
 * Every state is a DEDICATED merchant (real registration, own OUTLET_STAFF and OUTLET_INVENTORY users) whose
 * subscription / plan row is changed in SQL on the LOCAL e2e database (host check in web-fixtures.js). Checked in a
 * real browser, for the merchant, the staff and the kho of that merchant:
 *   - what the web does after login and on every page load (redirect? banner? dialog? toast? retry cards?);
 *   - the message of each state in vi and en, no raw key, no endless spinner, no 404/500 page, menu intact;
 *   - that creating anything is rejected by the API and nothing is created;
 *   - that a renew / upgrade path is reachable (merchant) and what staff / kho see;
 *   - recovery: the same browser after the period is extended in SQL.
 * Plan limits: PLAN_LIMIT_EXCEEDED on create product / customer / order / user / outlet is shown translated (vi, en)
 * and creates nothing, at the limit; one below the limit the create works.
 *
 * Run: scripts/e2e/web-e2e.sh --plan   (see --help)
 */
const U = require('./web-ui');
const F = require('./web-fixtures');

/** Checks that fail on purpose until the named issue is fixed: id -> '#N' (a pass is reported "fixed?") */
const KNOWN = {
  // #728: GET /api/subscriptions/status and /api/plans answer 403 to an expired / cancelled / paused / past-due merchant,
  // so Cài đặt > Gói dịch vụ cannot load and the web has no renew path
  ...Object.fromEntries(['01', '02', '03', '04', '05'].flatMap((n) => [[`WEB-SUB-${n}-merchant-c`, '#728'], [`WEB-SUB-${n}-merchant-d`, '#728']])),
  'WEB-SUB-08': '#738' // plan without web access: raw key errors.PLATFORM_ACCESS_DENIED
};

const only = (process.env.WEB_E2E_ONLY || '').split(/[\s,]+/).filter(Boolean);
const want = (id) => !only.length || only.some((o) => id.startsWith(o));
const brief = (t, n = 240) => String(t).replace(/\s+/g, ' ').slice(0, n);
const BAD_PAGE = /This page could not be found|Internal Server Error|Application error|404\b.*could not be found/i;

const STATES = [
  { n: '01', key: 'trial-ended', status: 'TRIAL', endDays: -3, msg: 'expired', action: 'expiredAction' },
  { n: '02', key: 'active-ended', status: 'ACTIVE', endDays: -3, msg: 'expired', action: 'expiredAction' },
  { n: '03', key: 'cancelled-ended', status: 'CANCELLED', endDays: -3, msg: 'cancelled', action: 'cancelledAction' },
  { n: '04', key: 'paused', status: 'PAUSED', endDays: 20, msg: 'paused', action: 'pausedAction' },
  { n: '05', key: 'past-due', status: 'PAST_DUE', endDays: 20, msg: 'pastDue', action: 'pastDueAction' }
];

const PAGES_MERCHANT = ['/dashboard', '/orders', '/orders/create', '/products', '/customers', '/calendar', '/availability'];
const PAGES_STAFF = ['/dashboard', '/orders', '/orders/create'];

async function main() {
  const R = F.makeReporter('WEB-SUB', KNOWN);
  const check = (id, name, ok, detail) => want(id) && R.check(id, name, ok, detail);
  const browser = await F.launch();
  const base = F.CFG.client;
  const sub = (lang, key) => U.tr(lang, 'subscription', `errors.${key}`);
  const run = F.uniqueTag();
  console.log(`run ${run}`);

  try {
    // ================================================================ expired / cancelled / paused / past due
    for (const st of STATES) {
      const acc = await F.createMerchant(`${run}${st.n}`);
      const before = F.counts(acc.merchantId);
      F.setSubscription(acc.merchantId, { status: st.status, endDays: st.endDays });
      const merchantApi = {};
      console.log(`\n${st.key}: merchant ${acc.merchantId}`);

      for (const role of ['merchant', 'staff', 'kho']) {
        // login is not blocked: the API hands a session out (current behaviour)
        const s = await F.openSession(browser, acc[role]);
        const page = await s.ctx.newPage();
        const log = F.watchPage(page);
        const pages = role === 'merchant' ? PAGES_MERCHANT : PAGES_STAFF;
        const seen = {};
        for (const u of pages) {
          log.api.length = 0;
          await U.go(page, base, u, { wait: 2800 });
          const t = await U.text(page);
          seen[u] = { t, url: page.url().replace(base, ''), api: [...new Set(log.api)], spin: await F.spinning(page) };
        }
        const dash = seen['/dashboard'];
        const msg = sub('vi', st.msg);
        const title = sub('vi', 'title');
        const idp = `WEB-SUB-${st.n}-${role}`;
        check(`${idp}-a`, `${st.key}/${role}: after login the web stays on /dashboard (no redirect to a plans page); toast "${title}: ${brief(msg, 40)}…" is shown`,
          dash.url === '/dashboard' && dash.t.includes(title) && dash.t.includes(msg), `url=${dash.url} toast=${dash.t.includes(msg)} text=${brief(dash.t.slice(-260), 200)}`);
        const okPage = (u) => {
          const x = seen[u];
          return x.t.includes(msg) && !BAD_PAGE.test(x.t) && !F.RAW_KEY.test(x.t) && !x.spin && /Tổng quan/.test(x.t) && (u === '/availability' || /Không tải được/.test(x.t));
        };
        check(`${idp}-b`, `${st.key}/${role}: every page (${pages.join(' ')}) shows the message, a retry card, no 404/500, no raw key, no spinner, menu still there`,
          pages.every(okPage),
          JSON.stringify(pages.filter((u) => !okPage(u)).map((u) => ({ u, bad: BAD_PAGE.exec(seen[u].t)?.[0], raw: F.RAW_KEY.exec(seen[u].t)?.[0], msg: seen[u].t.includes(msg), spin: seen[u].spin, retry: /Không tải được/.test(seen[u].t), menu: /Tổng quan/.test(seen[u].t), text: brief(seen[u].t.slice(-160), 100) }))));
        // renew / upgrade path
        if (role === 'merchant') {
          await U.go(page, base, '/dashboard?settings=subscription', { wait: 3000 });
          const t = await U.text(page);
          const loaded = !/Không tải được thông tin gói dịch vụ/.test(t) && /Gói dịch vụ/.test(t);
          const renewCta = /Gia hạn|Nâng cấp|Chọn gói|Đổi gói/.test(t.slice(t.indexOf('Gói dịch vụ')));
          check(`${idp}-c`, `${st.key}/merchant: Cài đặt > Gói dịch vụ loads and offers a way to renew / change plan`, loaded && renewCta, `loaded=${loaded} renewCta=${renewCta} text=${brief(t.slice(t.lastIndexOf('Gói dịch vụ')), 140)}`);
          // the plan list the renew dialog needs
          const plans = await F.raw(s.api, 'GET', '/api/plans');
          const status = await F.raw(s.api, 'GET', '/api/subscriptions/status');
          check(`${idp}-d`, `${st.key}/merchant: GET /api/subscriptions/status and /api/plans answer (the renew screen needs them)`, status.status === 200 && plans.status === 200, `status=${status.status}/${status.code} plans=${plans.status}/${plans.code}`);
        } else {
          await U.go(page, base, '/dashboard?settings=subscription', { wait: 2500 });
          const t = await U.text(page);
          const staffTexts = brief(t.slice(t.indexOf('Cài đặt')), 200);
          const renewButtons = await page.getByRole('button', { name: /gia hạn|chọn gói|nâng cấp|đổi gói/i }).count();
          const planLinks = await page.locator('a[href*="/plans"], a[href*="/pricing"]').count();
          check(`${idp}-c`, `${st.key}/${role}: Cài đặt shows no Gói dịch vụ tab and no renew / change-plan button (only the owner renews)`, renewButtons === 0 && planLinks === 0 && !/Gói dịch vụ/.test((t.split('Cài đặt')[1] || '').split('Giao diện')[0]), `${staffTexts} renewButtons=${renewButtons} planLinks=${planLinks}`);
          // OWNER QUESTION Q2: the toast tells staff to "renew" / "choose a new plan", but only the owner can
          const ownerHint = /chủ|owner|liên hệ chủ/i.test(seen['/dashboard'].t.slice(-300));
          check(`${idp}-d`, `${st.key}/${role}: CURRENT: staff and kho get the same toast as the owner ("${brief(msg, 30)}…", no "ask the owner" hint)`, seen['/dashboard'].t.includes(msg) && !ownerHint, `ownerHint=${ownerHint}`);
        }
        await s.ctx.close();
        merchantApi[role] = s.api;
      }

      // nothing can be created while blocked, and nothing is
      {
        const api = new F.WebApi(F.CFG.api);
        await api.login(acc.merchant.email, acc.merchant.password);
        const attempts = {
          product: await F.rawForm(api, 'POST', '/api/products', { name: `blocked ${run}`, rentPrice: 1, totalStock: 1, outletStock: [{ outletId: acc.outletId, stock: 1 }] }),
          customer: await F.raw(api, 'POST', '/api/customers', { firstName: 'Blocked', lastName: 'E2E', phone: F.uniquePhone() }),
          order: await F.rawForm(api, 'POST', '/api/orders', { orderType: 'SALE', customerId: 1, outletId: acc.outletId, orderItems: [], totalAmount: 0, depositAmount: 0 }),
          user: await F.raw(api, 'POST', '/api/users', { email: `blocked${run}@example.com`, password: 'e2eweb123', firstName: 'B', role: 'OUTLET_STAFF', outletId: acc.outletId })
        };
        const after = F.counts(acc.merchantId);
        const codes = Object.fromEntries(Object.entries(attempts).map(([k, v]) => [k, `${v.status}/${v.code}`]));
        check(`WEB-SUB-${st.n}-e`, `${st.key}: create product / customer / order / user are rejected (403 SUBSCRIPTION_*) and nothing is created`,
          Object.values(attempts).every((a) => a.status === 403 && /SUBSCRIPTION|TRIAL/.test(a.code)) && JSON.stringify(after) === JSON.stringify(before), `${JSON.stringify(codes)} before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
      }

      // recovery in the same browser: extend the period in SQL, reload
      {
        const s = await F.openSession(browser, acc.merchant);
        const page = await s.ctx.newPage();
        await U.go(page, base, '/orders', { wait: 2000 });
        const blocked = await U.text(page);
        F.setSubscription(acc.merchantId, { status: 'ACTIVE', endDays: 30 });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await F.settle(page, 2500);
        const t = await U.text(page);
        check(`WEB-SUB-${st.n}-f`, `${st.key}: after renewal (period extended in SQL) a reload of the same session loads /orders again, no message left`, /Không tải được danh sách đơn/.test(blocked) && !/Không tải được/.test(t) && !t.includes(sub('vi', st.msg)) && /#\w+/.test(t), `before=${/Không tải được danh sách đơn/.test(blocked)} after=${brief(t.slice(-200), 120)}`);
        await s.ctx.close();
      }
    }

    // ================================================================ English messages (expired, cancelled)
    for (const st of [STATES[1], STATES[2]]) {
      const acc = await F.createMerchant(`${run}en${st.n}`, { withStaff: false });
      F.setSubscription(acc.merchantId, { status: st.status, endDays: st.endDays });
      const s = await F.openSession(browser, acc.merchant, { lang: 'en' });
      const page = await s.ctx.newPage();
      await U.go(page, base, '/orders', { wait: 3000 });
      const t = await U.text(page);
      check(`WEB-SUB-06-${st.key}`, `${st.key}/merchant in English: toast "${sub('en', 'title')}" and "${brief(sub('en', st.msg), 40)}…", no Vietnamese, no raw key`, t.includes(sub('en', 'title')) && t.includes(sub('en', st.msg)) && !t.includes(sub('vi', st.msg)) && !F.RAW_KEY.test(t), `text=${brief(t.slice(-260), 200)}`);
      await s.ctx.close();
    }

    // ================================================================ no subscription row
    {
      const acc = await F.createMerchant(`${run}none`, { withStaff: false });
      F.deleteSubscription(acc.merchantId);
      const s = await F.openSession(browser, acc.merchant);
      const page = await s.ctx.newPage();
      await U.go(page, base, '/orders', { wait: 3000 });
      const t = await U.text(page);
      const api = await F.raw(s.api, 'GET', '/api/orders?limit=1');
      check('WEB-SUB-07', 'no subscription row: API says 403 NO_SUBSCRIPTION; the web shows a translated message, not the raw key', api.status === 403 && api.code === 'NO_SUBSCRIPTION' && !F.RAW_KEY.test(t) && /gói|Gói/.test(t), `api=${api.status}/${api.code} text=${brief(t.slice(-240), 180)}`);
      await s.ctx.close();
    }

    // ================================================================ plan without web access
    {
      const acc = await F.createMerchant(`${run}noweb`, { withStaff: false });
      const planId = F.ensurePlan('E2E Web NoWeb', { ...F.ROOMY_LIMITS, allowWebAccess: false });
      F.setSubscription(acc.merchantId, { status: 'ACTIVE', endDays: 60, planId });
      const s = await F.openSession(browser, acc.merchant);
      const page = await s.ctx.newPage();
      await U.go(page, base, '/orders', { wait: 3000 });
      const t = await U.text(page);
      const api = await F.raw(s.api, 'GET', '/api/orders?limit=1');
      check('WEB-SUB-08', 'plan with allowWebAccess=false: API 403 PLATFORM_ACCESS_DENIED; the web shows a translated message (no raw key), no 404/500', api.status === 403 && api.code === 'PLATFORM_ACCESS_DENIED' && !F.RAW_KEY.test(t) && !/PLATFORM_ACCESS_DENIED/.test(t) && !BAD_PAGE.test(t), `api=${api.status}/${api.code} raw=${F.RAW_KEY.exec(t)?.[0]} text=${brief(t.slice(-240), 180)}`);
      await s.ctx.close();
    }

    // ================================================================ plan limits per entity
    await limits(browser, base, run, check);
  } finally {
    await browser.close();
  }
  const failed = R.finish('web-plan-results.json');
  process.exit(failed ? 1 : 0);
}

// ====================================================================== plan limits

/** The toast / notice text of a blocked create, in the page body */
async function waitMessage(page, texts, timeout = 9000) {
  const t0 = Date.now();
  let last = '';
  while (Date.now() - t0 < timeout) {
    last = await U.text(page).catch(() => '');
    if (texts.some((x) => last.includes(x))) return last;
    await page.waitForTimeout(300);
  }
  return last;
}

async function addProduct(page, base, name) {
  await U.go(page, base, '/products/add', { wait: 1500 });
  await page.locator('#pf-name').fill(name);
  if (await page.locator('#pf-perRental').count()) await page.locator('#pf-perRental').fill('100000');
  if (await page.locator('#pf-salePrice').count()) await page.locator('#pf-salePrice').fill('200000');
  await page.locator('#pf-totalStock').fill('2');
  const sel = page.locator('#pf-categoryId');
  if (!(await sel.inputValue())) await sel.selectOption({ index: 1 });
  const posted = page.waitForResponse((r) => r.url().includes('/api/products') && r.request().method() === 'POST', { timeout: 30000 }).catch(() => null);
  await page.getByRole('button', { name: 'Thêm sản phẩm' }).last().click();
  const res = await posted;
  return res ? { status: res.status(), json: await res.json().catch(() => ({})) } : { status: 0, json: {} };
}

async function addCustomer(page, base, name) {
  await U.go(page, base, '/customers/add', { wait: 1500 });
  await page.locator('#cf-name').fill(name);
  await page.locator('#cf-phone').fill(F.uniquePhone());
  const posted = page.waitForResponse((r) => r.url().includes('/api/customers') && r.request().method() === 'POST', { timeout: 30000 }).catch(() => null);
  await page.getByRole('button', { name: 'Lưu khách' }).click();
  const res = await posted;
  return res ? { status: res.status(), json: await res.json().catch(() => ({})) } : { status: 0, json: {} };
}

async function addUser(page, base, local) {
  await U.go(page, base, '/users/add', { wait: 1800 });
  const inputs = page.locator('main input');
  await inputs.nth(0).fill(`Nhan vien ${local}`);
  await inputs.nth(2).fill(`${local}@example.com`);
  const pw = page.locator('main input[type=password]');
  await pw.nth(0).fill('e2eweb123');
  await pw.nth(1).fill('e2eweb123');
  await page.locator('main button, main [role=radio]').filter({ hasText: 'Tạo đơn, giao đồ, nhận trả' }).first().click();
  await page.locator('main button, main [role=checkbox], main [role=radio]').filter({ hasText: /Cửa hàng chính/ }).first().click().catch(() => {});
  const posted = page.waitForResponse((r) => /\/api\/users$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST', { timeout: 30000 }).catch(() => null);
  await page.getByRole('button', { name: 'Thêm nhân viên' }).last().click();
  const res = await posted;
  return res ? { status: res.status(), json: await res.json().catch(() => ({})) } : { status: 0, json: {} };
}

async function addOutlet(page, base, name) {
  await U.go(page, base, '/outlets', { wait: 1500 });
  await page.getByRole('button', { name: 'Thêm chi nhánh' }).first().click();
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder('Ví dụ: Chi nhánh Quận 1').fill(name);
  await dlg.locator('input[type=tel]').first().fill(F.uniquePhone());
  const posted = page.waitForResponse((r) => /\/api\/outlets$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST', { timeout: 30000 }).catch(() => null);
  await dlg.getByRole('button', { name: 'Thêm chi nhánh' }).last().click();
  const res = await posted;
  return res ? { status: res.status(), json: await res.json().catch(() => ({})) } : { status: 0, json: {} };
}

async function limits(browser, base, run, check) {
  const acc = await F.createMerchant(`${run}lim`);
  const tiny = F.ensurePlan(F.PLAN_TINY, { outlets: 99, users: 99, products: 99, customers: 99, orders: 99 });
  F.setSubscription(acc.merchantId, { status: 'ACTIVE', endDays: 60, planId: tiny });
  const setLimits = (l) => F.sql(`update "Plan" set limits='${JSON.stringify({ outlets: 99, users: 99, products: 99, customers: 99, orders: 99, ...l })}' where id=${tiny}`);
  const s = await F.openSession(browser, acc.merchant);
  const page = await s.ctx.newPage();
  const api = s.api;
  const product = await F.makeProduct(api, `SP lim ${run}`, 5, acc.outletId, { rentPrice: 100000, salePrice: 200000 });
  const customer = await F.makeCustomer(api, 'KhLim');
  console.log(`\nlimits: merchant ${acc.merchantId}`, F.counts(acc.merchantId));

  const msgVi = U.tr('vi', 'errors', 'PLAN_LIMIT_EXCEEDED');
  const msgEn = U.tr('en', 'errors', 'PLAN_LIMIT_EXCEEDED');
  const clean = (t) => !/errors\.PLAN_LIMIT_EXCEEDED|PLAN_LIMIT_EXCEEDED/.test(t);
  const blockedCheck = async (id, label, kind, run1, lang) => {
    const c0 = F.counts(acc.merchantId);
    const r1 = await run1();
    const t = await waitMessage(page, [lang === 'en' ? msgEn : msgVi]);
    const c1 = F.counts(acc.merchantId);
    const msg = lang === 'en' ? msgEn : msgVi;
    check(id, `${label} at the plan limit: API 4xx PLAN_LIMIT_EXCEEDED, the page says "${msg}" (no raw key), nothing created`,
      r1.status >= 400 && r1.json?.code === 'PLAN_LIMIT_EXCEEDED' && t.includes(msg) && clean(t) && c1[kind] === c0[kind], `status=${r1.status} code=${r1.json?.code} shown=${t.includes(msg)} raw=${!clean(t)} ${kind}: ${c0[kind]}->${c1[kind]} text=${brief(t.slice(-200), 120)}`);
  };

  // ---- products: one below the limit works, at the limit blocked
  let c = F.counts(acc.merchantId);
  setLimits({ products: c.products + 1 });
  const okP = await addProduct(page, base, `SP ok ${run}`);
  check('WEB-SUB-20a', 'products one below the limit: the add form creates it', [200, 201].includes(okP.status) && F.counts(acc.merchantId).products === c.products + 1, `status=${okP.status} ${JSON.stringify(okP.json).slice(0, 120)}`);
  await blockedCheck('WEB-SUB-20b', 'products (vi)', 'products', () => addProduct(page, base, `SP over ${run}`), 'vi');

  // ---- customers
  c = F.counts(acc.merchantId);
  setLimits({ products: 99, customers: c.customers + 1 });
  const okC = await addCustomer(page, base, `Khach ok ${run}`);
  check('WEB-SUB-21a', 'customers one below the limit: the add form creates it', [200, 201].includes(okC.status) && F.counts(acc.merchantId).customers === c.customers + 1, `status=${okC.status}`);
  await blockedCheck('WEB-SUB-21b', 'customers (vi)', 'customers', () => addCustomer(page, base, `Khach over ${run}`), 'vi');

  // ---- orders: sale through the web create flow
  c = F.counts(acc.merchantId);
  setLimits({ customers: 99, orders: c.orders + 1 });
  let okO = null;
  let errO = '';
  try {
    okO = await U.createInUi(page, base, { type: 'SALE', lines: [{ product }], customer });
  } catch (e) {
    errO = e.message;
  }
  check('WEB-SUB-22a', 'orders one below the limit: Tạo đơn (sale) creates it', !!okO && okO.status === 200 && F.counts(acc.merchantId).orders === c.orders + 1, errO || `status=${okO && okO.status}`);
  await blockedCheck('WEB-SUB-22b', 'orders (vi)', 'orders', async () => {
    const r = await U.createInUi(page, base, { type: 'SALE', lines: [{ product }], customer, expectFail: true });
    return { status: r.status, json: r.response };
  }, 'vi');

  // ---- users
  c = F.counts(acc.merchantId);
  setLimits({ orders: 99, users: c.users + 1 });
  const okU = await addUser(page, base, `u${run}`.slice(0, 14));
  check('WEB-SUB-23a', 'users one below the limit: Thêm nhân viên creates it', [200, 201].includes(okU.status) && F.counts(acc.merchantId).users === c.users + 1, `status=${okU.status} ${JSON.stringify(okU.json).slice(0, 160)}`);
  await blockedCheck('WEB-SUB-23b', 'users (vi)', 'users', () => addUser(page, base, `v${run}`.slice(0, 14)), 'vi');

  // ---- outlets
  c = F.counts(acc.merchantId);
  setLimits({ users: 99, outlets: c.outlets + 1 });
  const okOu = await addOutlet(page, base, `CN ok ${run}`);
  check('WEB-SUB-24a', 'outlets one below the limit: Thêm chi nhánh creates it', [200, 201].includes(okOu.status) && F.counts(acc.merchantId).outlets === c.outlets + 1, `status=${okOu.status} ${JSON.stringify(okOu.json).slice(0, 160)}`);
  await blockedCheck('WEB-SUB-24b', 'outlets (vi)', 'outlets', () => addOutlet(page, base, `CN over ${run}`), 'vi');

  // ---- English: products, customers, orders at the limit
  await s.ctx.close();
  const en = await F.openSession(browser, acc.merchant, { lang: 'en' });
  const pe = await en.ctx.newPage();
  // the form labels are Vietnamese keys in the helpers: switch the page language only for the message check
  setLimits({ products: F.counts(acc.merchantId).products, customers: F.counts(acc.merchantId).customers, orders: F.counts(acc.merchantId).orders });
  for (const [id, kind, fn, label] of [
    ['WEB-SUB-25a', 'products', () => addProductEn(pe, base, `SP en ${run}`), 'products (en)'],
    ['WEB-SUB-25b', 'customers', () => addCustomerEn(pe, base, `Khach en ${run}`), 'customers (en)']
  ]) {
    const c0 = F.counts(acc.merchantId);
    const r1 = await fn();
    const t = await waitMessage(pe, [msgEn]);
    const c1 = F.counts(acc.merchantId);
    check(id, `${label} at the plan limit: the page says "${msgEn}" (no raw key, no Vietnamese), nothing created`, r1.status >= 400 && t.includes(msgEn) && clean(t) && !t.includes(msgVi) && c1[kind] === c0[kind], `status=${r1.status} shown=${t.includes(msgEn)} raw=${!clean(t)} vi=${t.includes(msgVi)} text=${brief(t.slice(-200), 120)}`);
  }
  await en.ctx.close();

  // ---- staff and kho at the limit: same message, nothing created
  for (const [id, role, fn, kind] of [
    ['WEB-SUB-26', 'staff', (pg) => addCustomer(pg, base, `Khach staff ${run}`), 'customers'],
    ['WEB-SUB-27', 'kho', (pg) => addProduct(pg, base, `SP kho ${run}`), 'products']
  ]) {
    const rs = await F.openSession(browser, acc[role]);
    const pg = await rs.ctx.newPage();
    const c0 = F.counts(acc.merchantId);
    const r1 = await fn(pg);
    const t = await waitMessage(pg, [msgVi]);
    const c1 = F.counts(acc.merchantId);
    check(id, `${role} at the plan limit (${kind}): the page says "${msgVi}", no raw key, nothing created`, r1.status >= 400 && t.includes(msgVi) && clean(t) && c1[kind] === c0[kind], `status=${r1.status} shown=${t.includes(msgVi)} raw=${!clean(t)} ${kind}: ${c0[kind]}->${c1[kind]} text=${brief(t.slice(-200), 120)}`);
    await rs.ctx.close();
  }
}

// English pages use the same ids; only the button names differ
async function addProductEn(page, base, name) {
  await U.go(page, base, '/products/add', { wait: 1500 });
  await page.locator('#pf-name').fill(name);
  if (await page.locator('#pf-perRental').count()) await page.locator('#pf-perRental').fill('100000');
  if (await page.locator('#pf-salePrice').count()) await page.locator('#pf-salePrice').fill('200000');
  await page.locator('#pf-totalStock').fill('2');
  const sel = page.locator('#pf-categoryId');
  if (!(await sel.inputValue())) await sel.selectOption({ index: 1 });
  const posted = page.waitForResponse((r) => r.url().includes('/api/products') && r.request().method() === 'POST', { timeout: 30000 }).catch(() => null);
  await page.locator('main button[type=submit], form button[type=submit]').last().click();
  const res = await posted;
  return res ? { status: res.status(), json: await res.json().catch(() => ({})) } : { status: 0, json: {} };
}

async function addCustomerEn(page, base, name) {
  await U.go(page, base, '/customers/add', { wait: 1500 });
  await page.locator('#cf-name').fill(name);
  await page.locator('#cf-phone').fill(F.uniquePhone());
  const posted = page.waitForResponse((r) => r.url().includes('/api/customers') && r.request().method() === 'POST', { timeout: 30000 }).catch(() => null);
  await page.locator('main button[type=submit], form button[type=submit]').last().click();
  const res = await posted;
  return res ? { status: res.status(), json: await res.json().catch(() => ({})) } : { status: 0, json: {} };
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
