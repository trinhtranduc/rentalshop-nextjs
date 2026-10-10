#!/usr/bin/env node
/**
 * WEB-UI-SET: Cài đặt cửa hàng (the settings dialog, ?settings=<tab>) as the MERCHANT: every tab loads, shop info
 * save, currency follows the language, language and theme switches, profile, password validation, print settings,
 * subscription tab = API, the order-overlap setting seen from Tạo đơn. Every change is restored.
 * Catalogue: tests/e2e/TEST_CASES.md (WEB-UI). Run: scripts/e2e/web-e2e.sh --ui settings
 */
const H = require('./ui-helpers');
const F = require('./ui-order-flow');
const { vnDateKey, addDays } = require('./web-api');

/** Checks that fail on purpose until the named issue is fixed ("<check name>": '#N') */
const KNOWN = {
  'SET-06 reopening the profile shows the saved last name': '#744' // stored user not updated after a profile save
};
const qs = (o) => new URLSearchParams(o).toString();

async function main() {
  const rec = H.recorder(KNOWN);
  const { check } = rec;
  const shot = H.shotter();
  const api = await H.apiLogin();
  const outletId = await api.defaultOutletId();
  const merchantId = api.user.merchantId;
  const today = vnDateKey();
  const tag = H.uniq('UIS');

  const merchant0 = await api.get(`/api/merchants/${merchantId}`);
  const profile0 = await api.get('/api/users/profile');
  const getOutlet = async () => (await api.get('/api/outlets?limit=50')).outlets.find((o) => o.id === outletId);
  const outlet0 = await getOutlet();
  const restore = [];

  const browser = await H.launch();
  const ctx = await H.openSession({ browser, api });
  const page = await ctx.newPage();
  const st = H.collect(page);
  const sp = { page, rec, shot };
  const dlg = () => page.getByRole('dialog').first();
  /** Another login took the session (single-session): give the main browser context the newest token */
  const restoreMain = async () => {
    const a = await H.apiLogin();
    await page.evaluate((x) => localStorage.setItem('authData', x), JSON.stringify(a.auth));
    await ctx.addInitScript((x) => localStorage.setItem('authData', x), JSON.stringify(a.auth));
    Object.assign(api, { token: a.token, user: a.user, auth: a.auth });
  };
  const openTab = async (tab) => {
    await F.go(page, `/dashboard?settings=${tab}`);
    await dlg().waitFor({ timeout: 30000 });
    await page.waitForTimeout(600);
  };

  try {
    await H.runCase('WEB-UI-SET-01', 'settings dialog: every merchant tab opens, URL follows the tab, Đóng closes', async () => {
      st.reset();
      await F.go(page, '/orders');
      await page.getByRole('button', { name: 'Cài đặt cửa hàng' }).click();
      await dlg().waitFor({ timeout: 20000 });
      await page.waitForTimeout(800);
      check('SET-01 sidebar "Cài đặt cửa hàng" opens the dialog on the shop tab (?settings=merchant)', /settings=merchant/.test(page.url()), page.url());
      const tabs = [
        ['Thông tin cửa hàng', 'merchant', /Tên cửa hàng/],
        ['Phiếu in', 'receipt', /Ghi chú in hóa đơn/],
        ['Gói dịch vụ', 'subscription', /Mức sử dụng/],
        ['Tài khoản của tôi', 'profile', /Họ/],
        ['Đổi mật khẩu', 'account', /Mật khẩu hiện tại/],
        ['Ngôn ngữ', 'language', /Ngôn ngữ hiển thị/],
        ['Giao diện', 'appearance', /Theo hệ thống/]
      ];
      for (const [label, id, re] of tabs) {
        await dlg().getByRole('button', { name: new RegExp(`^${label}`) }).first().click();
        await page.waitForTimeout(700);
        const t = await dlg().innerText();
        check(`SET-01 tab "${label}": content shown and URL ?settings=${id}`, re.test(t) && page.url().includes(`settings=${id}`), `${page.url()} ${t.replace(/\s+/g, ' ').slice(-200)}`);
        check(`SET-01 tab "${label}": no raw key`, H.rawKeys(t).length === 0, H.rawKeys(t).join());
      }
      const pr = await H.pageProblems(page, st);
      check('SET-01 healthy (no console errors, failed requests)', pr.length === 0, pr.join('; '));
      await dlg().getByRole('button', { name: 'Đóng' }).first().click();
      await page.waitForTimeout(500);
      check('SET-01 Đóng closes the dialog and drops ?settings', (await page.getByRole('dialog').count()) === 0 && !/settings=/.test(page.url()), page.url());
      await openTab('receipt');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      check('SET-01 Escape closes the dialog', (await page.getByRole('dialog').count()) === 0);
      await openTab('not-a-tab');
      check('SET-01 an unknown tab falls back to the shop tab', /Tên cửa hàng/.test(await dlg().innerText()), page.url());
    }, sp);

    await H.runCase('WEB-UI-SET-02', 'shop info: change phone and description, Lưu; API equals; restored', async () => {
      await openTab('merchant');
      const f = (n) => dlg().locator(`[name="${n}"]`);
      check('SET-02 form is prefilled from the API (name, phone, tax id)', (await f('name').inputValue()) === merchant0.name && (await f('phone').inputValue()) === merchant0.phone && (await f('taxId').inputValue()) === (merchant0.taxId || ''), `${await f('name').inputValue()} ${await f('phone').inputValue()}`);
      restore.push(() => api.call('PUT', '/api/settings/merchant', { phone: merchant0.phone, description: merchant0.description || '' }).catch(() => {}));
      const newPhone = `09${String(Date.now()).slice(-8)}`;
      await f('phone').fill(newPhone);
      await f('description').fill(`mô tả e2e ${tag}`);
      const put = page.waitForResponse((r) => /\/api\/settings\/merchant/.test(r.url()) && r.request().method() === 'PUT', { timeout: 30000 });
      await dlg().getByRole('button', { name: 'Lưu', exact: true }).first().click();
      const res = await put.catch(() => null);
      check('SET-02 PUT /api/settings/merchant succeeded', !!res && res.status() === 200, res && res.status());
      const m = await api.get(`/api/merchants/${merchantId}`);
      check('SET-02 API: phone and description saved, name and tax id unchanged', m.phone === newPhone && m.description === `mô tả e2e ${tag}` && m.name === merchant0.name && m.taxId === merchant0.taxId, JSON.stringify({ p: m.phone, d: m.description }));
      // an empty shop name is refused
      await f('name').fill('');
      await dlg().getByRole('button', { name: 'Lưu', exact: true }).first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(800);
      check('SET-02 empty shop name is not saved', (await api.get(`/api/merchants/${merchantId}`)).name === merchant0.name);
      await dlg().getByRole('button', { name: 'Huỷ' }).first().click({ timeout: 3000 }).catch(() => {});
    }, sp);

    await H.runCase('WEB-UI-SET-03', 'shop tab sets the currency from the UI language (vi -> VND, en -> USD); restored', async () => {
      const cur0 = (await api.get('/api/settings/currency')).currency;
      restore.push(() => api.call('PUT', '/api/settings/currency', { currency: cur0 }).catch(() => {}));
      // the screen compares the currency in the login payload with the language's: log in again after each change
      const withCurrency = async (cur) => {
        await api.call('PUT', '/api/settings/currency', { currency: cur });
        const a2 = await H.apiLogin(); // this logs the main browser session out: it is re-seeded below
        return a2;
      };
      const a2 = await withCurrency('USD');
      const c3 = await H.openSession({ browser, api: a2 });
      const p3 = await c3.newPage();
      await F.go(p3, '/dashboard?settings=merchant');
      await p3.waitForTimeout(2500);
      const now = (await api.call('GET', '/api/settings/currency')).currency;
      check('SET-03 vi UI: opening the shop tab sets the shop currency to VND', now === 'VND', now);
      await c3.close();
      const a3 = await withCurrency('VND');
      const ctx2 = await H.openSession({ browser, api: a3, locale: 'en-US', lang: 'en' });
      const p2 = await ctx2.newPage();
      await F.go(p2, '/dashboard?settings=merchant');
      await p2.waitForTimeout(2500);
      const now2 = (await api.call('GET', '/api/settings/currency')).currency;
      check('SET-03 en UI: opening the shop tab sets the shop currency to USD', now2 === 'USD', now2);
      const t = await H.bodyText(p2);
      check('SET-03 en UI: the dialog is English', /Shop information|Store information|Shop name|Store name/i.test(t), t.slice(0, 200));
      await ctx2.close();
      await restoreMain();
      // OWNER QUESTION: merely opening the tab changes the currency; there is no currency control.
    }, sp);

    await H.runCase('WEB-UI-SET-04', 'language tab: English then Tiếng Việt; the screen, the cookie and the sidebar follow', async () => {
      await openTab('language');
      await dlg().getByRole('radio', { name: /English/ }).check({ force: true }).catch(async () => dlg().getByText('English').click());
      await page.waitForTimeout(1500);
      let t = await H.bodyText(page);
      check('SET-04 after choosing English the dialog and the sidebar are English', /Language|Orders|Customers/.test(t) && !/Đơn hàng/.test((await page.locator('aside').first().innerText().catch(() => '')) || ''), t.slice(0, 300));
      check('SET-04 cookie NEXT_LOCALE=en', (await ctx.cookies()).some((c) => c.name === 'NEXT_LOCALE' && c.value === 'en'));
      await page.keyboard.press('Escape');
      await F.go(page, '/orders');
      t = await H.bodyText(page);
      check('SET-04 orders page in English: "All orders", status chips, no raw keys', /All orders|Orders/.test(t) && H.rawKeys(t).length === 0, t.slice(0, 300));
      await F.go(page, '/orders/create');
      t = await H.bodyText(page);
      check('SET-04 create order in English: no raw key', H.rawKeys(t).length === 0, H.rawKeys(t).join());
      for (const p of ['/customers', '/products', '/calendar', '/dashboard']) {
        await F.go(page, p);
        const tt = await H.bodyText(page);
        check(`SET-04 ${p} in English: no raw key, no Vietnamese menu "Khách hàng" in the sidebar`, H.rawKeys(tt).length === 0 && !/QUẢN LÝ/.test(tt), H.rawKeys(tt).join());
      }
      await openTab('language');
      await dlg().getByRole('radio', { name: /Tiếng Việt/ }).check({ force: true }).catch(async () => dlg().getByText('Tiếng Việt').click());
      await page.waitForTimeout(1500);
      check('SET-04 back to Tiếng Việt: cookie vi and "Đơn hàng" in the sidebar', (await ctx.cookies()).some((c) => c.name === 'NEXT_LOCALE' && c.value === 'vi') && /Đơn hàng/.test(await H.bodyText(page)));
    }, sp);

    await H.runCase('WEB-UI-SET-05', 'appearance: Tối / Sáng change the page colours and are remembered; text stays readable', async () => {
      const lum = (rgb) => {
        const m = rgb.match(/\d+(\.\d+)?/g).map(Number);
        const c = m.slice(0, 3).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const probe = (pg) => pg.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        const h = document.querySelector('h1') || main;
        return { bg: getComputedStyle(main).backgroundColor, fg: getComputedStyle(h).color, stored: localStorage.getItem('anyrent-theme') };
      });
      const c5 = await H.openSession({ browser, api, theme: null });
      const p5 = await c5.newPage();
      const st5 = H.collect(p5);
      await F.go(p5, '/dashboard?settings=appearance');
      await p5.getByRole('dialog').first().waitFor({ timeout: 20000 });
      for (const [label, dark] of [['Tối', true], ['Sáng', false]]) {
        await p5.getByRole('dialog').first().getByText(label, { exact: true }).click();
        await p5.waitForTimeout(700);
        await p5.keyboard.press('Escape');
        await p5.getByRole('link', { name: 'Đơn hàng' }).first().click();
        await p5.waitForURL(/\/orders/, { timeout: 30000 });
        await H.settle(p5);
        const c = await probe(p5);
        const isDark = lum(c.bg) < 0.2;
        const r = ratio(c.bg, c.fg);
        check(`SET-05 ${label}: stored "${c.stored}" and the orders page is ${dark ? 'dark' : 'light'}`, isDark === dark && (c.stored === 'dark' || c.stored === 'light'), JSON.stringify(c));
        check(`SET-05 ${label}: heading / background contrast >= 4.5 (${r.toFixed(1)})`, r >= 4.5, JSON.stringify(c));
        const pr = await H.pageProblems(p5, st5);
        check(`SET-05 ${label}: orders page healthy`, pr.length === 0, pr.join('; '));
        await p5.reload({ waitUntil: 'domcontentloaded' });
        await H.settle(p5);
        const c2 = await probe(p5);
        check(`SET-05 ${label}: kept after a reload`, (lum(c2.bg) < 0.2) === dark, JSON.stringify(c2));
        await p5.getByRole('button', { name: /Cài đặt cửa hàng/ }).click();
        await p5.getByRole('dialog').first().waitFor({ timeout: 20000 });
        await p5.getByRole('button', { name: /^Giao diện/ }).first().click();
      }
      await p5.getByRole('dialog').first().getByText('Theo hệ thống', { exact: true }).click();
      await p5.waitForTimeout(500);
      check('SET-05 "Theo hệ thống" is selectable and stored', ['system', null].includes((await probe(p5)).stored), JSON.stringify(await probe(p5)));
      await p5.getByRole('dialog').first().getByText('Sáng', { exact: true }).click();
      await c5.close();
    }, sp);

    await H.runCase('WEB-UI-SET-06', 'profile: change name and phone, Lưu; API equals; restored', async () => {
      await openTab('profile');
      const f = (n) => dlg().locator(`[name="${n}"]`);
      check('SET-06 form shows the account name, phone, email and role "Chủ cửa hàng"', (await f('firstName').inputValue()) === profile0.firstName && (await f('phone').inputValue()) === profile0.phone && /Chủ/.test(await dlg().innerText()) && (await dlg().innerText()).includes(profile0.email) || (await dlg().locator('input[type=email]').inputValue()) === profile0.email, `${await f('firstName').inputValue()}`);
      restore.push(() => api.call('PUT', '/api/users/profile', { firstName: profile0.firstName, lastName: profile0.lastName, phone: profile0.phone }).catch(() => {}));
      await f('lastName').fill(`E2E${tag.slice(-4)}`);
      await f('phone').fill('0987654321');
      const put = page.waitForResponse((r) => /\/api\/users\/profile/.test(r.url()) && r.request().method() !== 'GET', { timeout: 30000 });
      await dlg().getByRole('button', { name: 'Lưu', exact: true }).first().click();
      const res = await put.catch(() => null);
      check('SET-06 save request succeeded', !!res && res.status() === 200, res && res.status());
      const p = await api.get('/api/users/profile');
      check('SET-06 API: last name and phone saved, email unchanged', p.lastName === `E2E${tag.slice(-4)}` && p.phone === '0987654321' && p.email === profile0.email, JSON.stringify({ l: p.lastName, p: p.phone }));
      await page.keyboard.press('Escape');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await H.settle(page);
      await openTab('profile');
      check('SET-06 reopening the profile shows the saved last name', (await dlg().locator('[name="lastName"]').inputValue()) === `E2E${tag.slice(-4)}`);
      console.log(`  info: sidebar name after a profile save + reload: ${(await H.bodyText(page)).includes(`E2E${tag.slice(-4)}`) ? 'updated' : 'still the old name (stale until the next login)'}`);
    }, sp);

    await H.runCase('WEB-UI-SET-07', 'password form validation (nothing is changed) and the delete-account confirm', async () => {
      await openTab('account');
      const pw = dlg().locator('input[type="password"]');
      const pwBefore = (await api.get('/api/users/profile')).passwordChangedAt;
      await pw.nth(0).fill('wrong-current-1');
      await pw.nth(1).fill('NewPass123');
      await pw.nth(2).fill('Different123');
      const req = [];
      const onResp = (r) => { if (/change-password/.test(r.url())) req.push(r.status()); };
      page.on('response', onResp);
      await dlg().getByRole('button', { name: 'Đổi mật khẩu' }).last().click();
      await page.getByText('Mật khẩu mới không khớp').first().waitFor({ timeout: 8000 }).catch(() => {});
      check('SET-07 mismatching confirmation: toast "Mật khẩu mới không khớp", no request sent', (await H.bodyText(page)).includes('Mật khẩu mới không khớp') && req.length === 0, `req=${req}`);
      await pw.nth(2).fill('NewPass123');
      await dlg().getByRole('button', { name: 'Đổi mật khẩu' }).last().click();
      await page.getByText('Mật khẩu hiện tại không đúng').first().waitFor({ timeout: 10000 }).catch(() => {});
      const t = await H.bodyText(page);
      check('SET-07 wrong current password: "Mật khẩu hiện tại không đúng" (HTTP 400), no raw key', t.includes('Mật khẩu hiện tại không đúng') && req.includes(400) && H.rawKeys(t).length === 0, `req=${req} ${H.rawKeys(t).join()}`);
      page.off('response', onResp);
      check('SET-07 the password was not changed', (await api.get('/api/users/profile')).passwordChangedAt === pwBefore);
      await dlg().getByRole('button', { name: 'Xoá tài khoản' }).click();
      await page.waitForTimeout(600);
      const confirmText = await page.getByRole('dialog').last().innerText();
      check('SET-07 "Xoá tài khoản" asks "Xoá tài khoản?" first; the account is still there', /Xoá tài khoản\?/.test(confirmText) && (await api.get('/api/users/profile')).email === profile0.email, confirmText.replace(/\s+/g, ' ').slice(0, 200));
      await page.getByRole('dialog').last().getByRole('button', { name: 'Huỷ' }).click();
    }, sp);

    await H.runCase('WEB-UI-SET-08', 'print settings: paper width is remembered, the outlet note is saved (API printNote); restored', async () => {
      await openTab('receipt');
      await dlg().getByRole('radio', { name: /58 mm/ }).check({ force: true }).catch(async () => dlg().getByText('58 mm').click());
      await page.waitForTimeout(500);
      const stored = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k]) => /bill|print|width/i.test(k)))));
      check('SET-08 58 mm is stored on this machine', /58/.test(stored), stored);
      await dlg().getByRole('radio', { name: /80 mm/ }).check({ force: true }).catch(() => {});
      restore.push(() => api.call('PUT', `/api/outlets?id=${outletId}`, { printNote: outlet0.printNote || '' }).catch(() => {}));
      const note = `Nhớ mang CCCD ${tag}`;
      const ta = dlg().locator('textarea').first();
      await ta.fill(note);
      const put = page.waitForResponse((r) => /\/api\/outlets/.test(r.url()) && r.request().method() !== 'GET', { timeout: 30000 });
      await dlg().getByRole('button', { name: 'Lưu', exact: true }).first().click();
      const res = await put.catch(() => null);
      check('SET-08 save request succeeded', !!res && res.status() === 200, res && res.status());
      check('SET-08 API: outlet printNote saved', ((await getOutlet()).printNote || '') === note, (await getOutlet()).printNote);
      await F.go(page, `/orders/create`);
      void 0;
    }, sp);

    await H.runCase('WEB-UI-SET-09', 'Gói dịch vụ tab: plan, price, expiry and usage equal the API', async () => {
      await openTab('subscription');
      const t = (await dlg().innerText()).replace(/\s+/g, ' ');
      const subs = await api.get('/api/subscriptions');
      const s = Array.isArray(subs) ? subs[0] : subs.subscriptions?.[0] || subs;
      check(`SET-09 plan name "${s.plan.name}" and "Đang dùng"`, t.includes(s.plan.name) && /Đang dùng/.test(t), t.slice(0, 300));
      const usage = async (label, path, key) => {
        const d = await api.get(path);
        const total = d.total ?? (Array.isArray(d) ? d.length : (d[key] || []).length);
        const m = t.match(new RegExp(`${label}\\s*(\\d+)/`));
        return { shown: m && Number(m[1]), total };
      };
      await F.go(page, '/users');
      const usersShown = Number(((await H.bodyText(page)).match(/Nhân viên · (\d+)/) || [])[1]);
      await openTab('subscription');
      const [cu, pr, ou, us0] = [await usage('Khách hàng', '/api/customers?limit=1'), await usage('Sản phẩm', '/api/products?limit=1'), await usage('Chi nhánh', '/api/outlets?limit=1'), await usage('Nhân viên', '/api/users?limit=100')];
      const us = { shown: us0.shown, total: usersShown };
      check('SET-09 usage: customers, products, outlets, users = API counts', cu.shown === cu.total && pr.shown === pr.total && ou.shown === ou.total && us.shown === us.total, JSON.stringify({ cu, pr, ou, us }));
      check('SET-09 "Vượt giới hạn" is shown for outlets and users (over the plan limit)', /Chi nhánh\s*\d+\/\d+\s*Vượt giới hạn/.test(t) && /Nhân viên\s*\d+\/\d+\s*Vượt giới hạn/.test(t), t.slice(150, 500));
      check('SET-09 payment history lists the plan payment', /Lịch sử gói/.test(t) && /Thanh toán gói/.test(t));
      st.reset();
      await F.go(page, '/plans');
      const pt = await H.bodyText(page);
      check('SET-09 /plans shows "Gói đang dùng" on the current plan and "Chọn gói" on the others; no payment is made', /Gói đang dùng/.test(pt) && /Chọn gói/.test(pt), pt.slice(0, 300));
      const pr2 = await H.pageProblems(page, st);
      check('SET-09 /plans healthy', pr2.length === 0, pr2.join('; '));
    }, sp);

    await H.runCase('WEB-UI-SET-10', 'order-overlap setting seen from Tạo đơn: off = "Cửa hàng không cho tạo đơn trùng lịch", no override button; restored', async () => {
      restore.push(() => api.call('PUT', '/api/settings/merchant', { allowOverlappingOrders: merchant0.allowOverlappingOrders !== false }).catch(() => {}));
      await api.call('PUT', '/api/settings/merchant', { allowOverlappingOrders: false });
      const small = await api.createProduct(`${tag} Một`, 1, outletId);
      const cust = await api.createCustomer(`Set${tag.slice(-4)}`);
      const P = addDays(today, 30);
      const R = addDays(today, 31);
      const body = (c) => ({ orderType: 'RENT', customerId: c.id, outletId, subtotal: 100000, taxAmount: 0, discountType: 'amount', discountValue: 0, discountAmount: 0, depositAmount: 0, securityDeposit: 0, totalAmount: 100000, notes: '', pickupPlanAt: new Date(`${P}T00:00:00+07:00`).toISOString(), returnPlanAt: new Date(`${R}T00:00:00+07:00`).toISOString(), orderItems: [{ productId: small.id, quantity: 1, unitPrice: 100000, totalPrice: 100000, deposit: 0, notes: '', rentDays: 1, pricingType: 'FIXED' }] });
      const first = await api.call('POST', '/api/orders', body(cust));
      await F.go(page, '/orders/create');
      await F.pickDays(page, P, R);
      await F.addProduct(page, small.name, 1);
      await F.pickCustomer(page, { phone: cust.phone, firstName: cust.firstName });
      const cart = page.locator('[aria-label="Đơn đang tạo"]').first();
      await page.waitForTimeout(800);
      const ct = await cart.innerText();
      check('SET-10 setting off: the cart says "Cửa hàng không cho tạo đơn trùng lịch" and the line "Hết đồ … đã thuê ở đơn #n"', /Cửa hàng không cho tạo đơn trùng lịch/.test(ct) && ct.includes(`#${first.orderNumber}`), ct.replace(/\s+/g, ' ').slice(-300));
      check('SET-10 setting off: "Tạo đơn" is disabled (no "Vẫn tạo đơn" path)', await cart.getByRole('button', { name: /^Tạo đơn/ }).isDisabled());
      const n = (await api.get(`/api/orders?${qs({ q: small.name, limit: 20 })}`)).orders.filter((o) => o.status !== 'CANCELLED').length;
      check('SET-10 setting off: still only the first order exists', n === 1, `n=${n}`);
      await api.cancel(first.id);
      await api.call('DELETE', `/api/products/${small.id}`).catch(() => {});
      await api.call('DELETE', `/api/customers/${cust.id}`).catch(() => {});
      await api.call('PUT', '/api/settings/merchant', { allowOverlappingOrders: true });
    }, sp);
  } finally {
    for (const fn of restore.reverse()) await fn();
    await browser.close();
  }
  return H.finish(rec.results, 'web-ui-settings-results.json', { tag });
}

if (require.main === module) H.main(main);
module.exports = { main };
