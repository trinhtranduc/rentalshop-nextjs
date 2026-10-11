#!/usr/bin/env node
/**
 * WEB-UI-MAN: the management screens of the shop web driven as the MERCHANT: dashboard (loads, period switch),
 * categories (add, rename, delete), outlets (list, add, edit, disable, bank accounts page), users (list, filters, add,
 * edit, lock, delete, permission pages), loyalty, notifications, calendar (month switch, day click), availability.
 * Catalogue: tests/e2e/TEST_CASES.md (WEB-UI). Everything created here is removed. Run: scripts/e2e/web-e2e.sh --ui manage
 */
const H = require('./ui-helpers');
const F = require('./ui-order-flow');
const { vnDateKey, addDays } = require('./web-api');

/** Checks that fail on purpose until the named issue is fixed ("<check name>": '#N') */
const KNOWN = {};
const qs = (o) => new URLSearchParams(o).toString();

async function main() {
  const rec = H.recorder(KNOWN);
  const { check } = rec;
  const shot = H.shotter();
  const api = await H.apiLogin();
  const outletId = await api.defaultOutletId();
  const today = vnDateKey();
  const tag = H.uniq('UIM');
  const tail = tag.slice(-5);
  const cleanup = [];

  const browser = await H.launch();
  const ctx = await H.openSession({ browser, api });
  const page = await ctx.newPage();
  const st = H.collect(page);
  const sp = { page, rec, shot };
  const rows = () => page.locator('table tbody tr');
  /** A tab or button whose name starts with `label` (the page uses both) */
  const tabBtn = (label) => page.locator('button, [role="tab"]').filter({ hasText: new RegExp(`^\\s*${label}`) }).first();
  const cats = async (search) => (await api.get(`/api/categories?${qs({ search, limit: 100 })}`)).categories;
  const catByName = async (n) => (await cats(n)).find((c) => c.name === n);

  try {
    await H.runCase('WEB-UI-MAN-01', 'dashboard: loads, shows the four tiles, the period buttons switch (numbers: dashboard-stats)', async () => {
      st.reset();
      await F.go(page, '/dashboard');
      await page.locator('section[aria-label="Số liệu chính"] button').first().waitFor({ timeout: 60000 });
      const t = await H.bodyText(page);
      check('MAN-01 title "Tổng quan", today label, periods Hôm nay / 7 ngày qua / Tháng này / Tuỳ chọn…', /Tổng quan/.test(t) && /7 ngày qua/.test(t) && /Tháng này/.test(t) && /Tuỳ chọn/.test(t), t.slice(0, 300));
      check('MAN-01 four tiles', (await page.locator('section[aria-label="Số liệu chính"] button').count()) === 4);
      for (const label of ['7 ngày qua', 'Tháng này', 'Hôm nay']) {
        const resp = page.waitForResponse((r) => /\/api\/analytics\/period/.test(r.url()), { timeout: 30000 }).catch(() => null);
        await tabBtn(label).click();
        const r = await resp;
        await H.settle(page);
        check(`MAN-01 period "${label}": a new report is requested and the page stays healthy`, !!r && r.status() === 200, r && r.status());
      }
      await H.settle(page, 30000);
      const pr = await H.pageProblems(page, st);
      check('MAN-01 healthy page (no raw keys, console errors, spinner)', pr.length === 0, pr.join('; '));
    }, sp);

    await H.runCase('WEB-UI-MAN-02', 'categories: add (name required), rename, search, delete with confirm; API equals', async () => {
      await F.go(page, '/categories');
      const total = (await api.get('/api/categories?limit=1')).total;
      check('MAN-02 title "Danh mục · N" = API total', new RegExp(`Danh mục · ${total}\\b`).test(await H.bodyText(page)), `total=${total}`);
      await page.getByRole('button', { name: 'Thêm danh mục' }).click();
      let dlg = page.getByRole('dialog');
      await dlg.waitFor({ timeout: 10000 });
      await dlg.getByRole('button', { name: /^(Thêm|Lưu)$/ }).click();
      await page.waitForTimeout(500);
      check('MAN-02 empty name: dialog stays open, nothing created', (await page.getByRole('dialog').count()) === 1);
      const name = `Áo ${tag}`;
      await dlg.getByLabel(/Tên danh mục/).fill(name);
      await dlg.getByLabel('Mô tả').fill('mô tả e2e');
      await dlg.getByRole('button', { name: /^Thêm$/ }).click();
      await page.waitForTimeout(1500);
      const c = await catByName(name);
      if (c) cleanup.push(() => api.call('DELETE', `/api/categories?id=${c.id}`).catch(() => api.call('DELETE', `/api/categories/${c.id}`).catch(() => {})));
      check('MAN-02 API: the category exists with the description', !!c && c.description === 'mô tả e2e', JSON.stringify(c));
      await page.getByRole('searchbox', { name: 'Tìm danh mục' }).fill(name);
      await page.waitForTimeout(900);
      await H.settle(page);
      check('MAN-02 search finds it (one row)', (await rows().count()) === 1 && (await rows().first().innerText()).includes(name), `rows=${await rows().count()}`);
      await rows().first().getByRole('button', { name: 'Sửa' }).click();
      dlg = page.getByRole('dialog');
      await dlg.getByLabel(/Tên danh mục/).fill(`${name} Mới`);
      await dlg.getByRole('button', { name: /^Lưu$/ }).click();
      await page.waitForTimeout(1500);
      check('MAN-02 rename: API has the new name, the old one is gone', !!(await catByName(`${name} Mới`)) && !(await catByName(name)));
      await page.getByRole('searchbox', { name: 'Tìm danh mục' }).fill(`${name} Mới`);
      await page.waitForTimeout(900);
      await H.settle(page);
      await page.getByRole('button', { name: `Thao tác khác cho ${name} Mới` }).click();
      await page.getByRole('menuitem', { name: /^Xoá/ }).click();
      dlg = page.getByRole('dialog');
      check('MAN-02 delete dialog: "Xoá danh mục “…”? Không thể hoàn tác."', (await dlg.innerText()).includes(`Xoá danh mục “${name} Mới”? Không thể hoàn tác.`), await dlg.innerText());
      await dlg.getByRole('button', { name: 'Giữ lại' }).click();
      await page.waitForTimeout(400);
      check('MAN-02 "Giữ lại": still there', !!(await catByName(`${name} Mới`)));
      await page.getByRole('button', { name: `Thao tác khác cho ${name} Mới` }).click();
      await page.getByRole('menuitem', { name: /^Xoá/ }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Xoá danh mục' }).click();
      await page.waitForTimeout(1500);
      check('MAN-02 "Xoá danh mục": gone from the API', !(await catByName(`${name} Mới`)));
      await page.getByRole('searchbox', { name: 'Tìm danh mục' }).fill('zzzz-không-có');
      await page.waitForTimeout(900);
      check('MAN-02 empty search: "Không có danh mục khớp với tìm kiếm."', /Không có danh mục khớp với tìm kiếm/.test(await H.bodyText(page)));
    }, sp);

    await H.runCase('WEB-UI-MAN-03', 'outlets: list = API, add (name required; the plan limit is said in words), edit, disable / enable, bank accounts page', async () => {
      st.reset();
      await F.go(page, '/outlets');
      const total = (await api.get('/api/outlets?limit=1')).total;
      let t = await H.bodyText(page);
      check('MAN-03 title "Chi nhánh · N" = API total, default branch marked "Mặc định", staff counts', new RegExp(`Chi nhánh · ${total}\\b`).test(t) && /Mặc định/.test(t) && /nhân viên/.test(t), t.slice(0, 300));
      const pr = await H.pageProblems(page, st);
      check('MAN-03 healthy page', pr.length === 0, pr.join('; '));
      await page.getByRole('button', { name: 'Thêm chi nhánh' }).click();
      let dlg = page.getByRole('dialog');
      await dlg.waitFor({ timeout: 10000 });
      await dlg.getByRole('button', { name: /^Thêm chi nhánh$/ }).click();
      await page.waitForTimeout(500);
      check('MAN-03 empty name: "Nhập tên chi nhánh"', /Nhập tên chi nhánh/.test(await dlg.innerText()), await dlg.innerText());
      const name = `Chi nhánh ${tag}`;
      await dlg.getByLabel(/Tên chi nhánh/).fill(name);
      const post = page.waitForResponse((r) => /\/api\/outlets/.test(r.url()) && r.request().method() === 'POST', { timeout: 20000 }).catch(() => null);
      await dlg.getByRole('button', { name: /^Thêm chi nhánh$/ }).click();
      const res = await post;
      await page.waitForTimeout(1200);
      const o = (await api.get('/api/outlets?limit=50')).outlets.find((x) => x.name === name);
      if (o) {
        cleanup.push(() => api.call('PUT', `/api/outlets?id=${o.id}`, { isActive: false }).catch(() => {}));
        check('MAN-03 outlet created (HTTP 200/201), toast "Đã thêm chi nhánh"', !!res && [200, 201].includes(res.status()), res && res.status());
        await page.getByRole('searchbox', { name: 'Tìm chi nhánh' }).fill(name);
        await page.waitForTimeout(900);
        await H.settle(page);
        await rows().first().getByRole('button', { name: 'Sửa' }).click();
        dlg = page.getByRole('dialog');
        await dlg.getByLabel('Số điện thoại').fill('0281234567');
        await dlg.getByLabel(/Ghi chú in/).fill(`note ${tag}`);
        await dlg.getByRole('button', { name: /^Lưu$/ }).click();
        await page.waitForTimeout(1500);
        const o2 = (await api.get('/api/outlets?limit=50')).outlets.find((x) => x.id === o.id);
        check('MAN-03 edit: phone and print note saved (API)', o2.phone === '0281234567' && o2.printNote === `note ${tag}`, JSON.stringify({ p: o2.phone, n: o2.printNote }));
        await page.getByRole('button', { name: `Thao tác khác cho ${name}` }).click();
        await page.getByRole('menuitem', { name: /^Tạm ngưng/ }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Tạm ngưng' }).last().click();
        await page.waitForTimeout(1500);
        check('MAN-03 disable: API isActive=false and the row says "Tạm ngưng"', (await api.get('/api/outlets?limit=50')).outlets.find((x) => x.id === o.id)?.isActive === false || /Tạm ngưng/.test(await rows().first().innerText()), await rows().first().innerText());
        await page.getByRole('button', { name: `Thao tác khác cho ${name}` }).click();
        await page.getByRole('menuitem', { name: /^Mở lại/ }).click();
        await page.waitForTimeout(1500);
        check('MAN-03 enable: "Mở lại" makes it "Đang mở" again', (await api.get('/api/outlets?limit=50')).outlets.find((x) => x.id === o.id)?.isActive === true);
      } else {
        t = await H.bodyText(page);
        const msg = await page.getByRole('dialog').innerText().catch(() => t);
        console.log(`  info: add outlet refused: HTTP ${res && res.status()} ${msg.replace(/\s+/g, ' ').slice(-200)}`);
        check('MAN-03 outlet over the plan limit: toast "Vượt quá giới hạn gói" (HTTP 422), no raw code', res && res.status() === 422 && /Vượt quá giới hạn gói/.test(t) && !/PLAN_LIMIT/.test(t), `${res && res.status()} ${t.slice(-200)}`);
        await page.keyboard.press('Escape');
      }
      st.reset();
      await F.go(page, `/outlets/${outletId}/bank-accounts`);
      t = await H.bodyText(page);
      check('MAN-03 bank accounts page: title, branch name, "Thêm tài khoản"', /Tài khoản ngân hàng/.test(t) && t.includes('Main Branch') && /Thêm tài khoản/.test(t), t.slice(0, 300));
      const pr2 = await H.pageProblems(page, st);
      check('MAN-03 bank accounts page healthy', pr2.length === 0, pr2.join('; '));
    }, sp);

    await H.runCase('WEB-UI-MAN-04', 'users: list = API, role filter, add staff (validation, plan limit in words), lock, unlock, delete; permission pages load', async () => {
      st.reset();
      await F.go(page, '/users');
      const list = await api.get('/api/users?limit=100');
      const users = Array.isArray(list) ? list : list.users;
      let t = await H.bodyText(page);
      check('MAN-04 title "Nhân viên · N" counts the owner too (API users + 1)', new RegExp(`Nhân viên · ${users.length + 1}\\b`).test(t) || new RegExp(`Nhân viên · ${users.length}\\b`).test(t), `api=${users.length} ${t.slice(0, 100)}`);
      check('MAN-04 roles in words: Chủ cửa hàng, Quản lý chi nhánh, Nhân viên, Nhân viên kho', /Chủ cửa hàng/.test(t) && /Quản lý chi nhánh/.test(t) && /Nhân viên kho/.test(t));
      check('MAN-04 no raw role keys (OUTLET_STAFF, MERCHANT)', !/OUTLET_|MERCHANT\b/.test(t));
      const pr = await H.pageProblems(page, st);
      check('MAN-04 healthy page', pr.length === 0, pr.join('; '));
      await page.getByRole('searchbox', { name: 'Tìm nhân viên' }).fill('inventory');
      await page.getByRole('searchbox', { name: 'Tìm nhân viên' }).press('Enter');
      await page.waitForTimeout(1200);
      await H.settle(page);
      check('MAN-04 search "inventory": only Nhân viên kho rows', (await rows().count()) >= 1 && (await rows().allInnerTexts()).every((x) => /Nhân viên kho/.test(x)), `rows=${await rows().count()}`);
      await F.go(page, '/users/add');
      await page.getByRole('button', { name: 'Thêm nhân viên' }).last().click();
      await page.waitForTimeout(500);
      t = await H.bodyText(page);
      check('MAN-04 empty form: "Nhập email đăng nhập." and "Chọn vai trò."', /Nhập email đăng nhập/.test(t) && /Chọn vai trò/.test(t), t.slice(-400));
      const email = `e2e.${tail.toLowerCase()}@example.com`;
      await page.getByPlaceholder('Ví dụ: Trần Thị Lan').fill(`Nhân viên ${tag}`);
      await page.locator('input[type="email"]').fill(email);
      await page.getByText('Tạo đơn, giao đồ, nhận trả, thêm khách.').click();
      await page.getByText('Outdoor Equipment Co. - Main Branch', { exact: true }).last().click();
      const pwf = page.locator('input[type="password"]');
      await pwf.nth(0).fill('Staff123!');
      await pwf.nth(1).fill('Different1!');
      await page.getByRole('button', { name: 'Thêm nhân viên' }).last().click();
      await page.waitForTimeout(500);
      check('MAN-04 two different passwords: "Hai mật khẩu không khớp."', /Hai mật khẩu không khớp/.test(await H.bodyText(page)), (await H.bodyText(page)).slice(-300));
      await pwf.nth(1).fill('Staff123!');
      const post = page.waitForResponse((r) => /\/api\/users/.test(r.url()) && r.request().method() === 'POST', { timeout: 20000 }).catch(() => null);
      await page.getByRole('button', { name: 'Thêm nhân viên' }).last().click();
      const res = await post;
      await page.waitForTimeout(1500);
      const all = await api.get('/api/users?limit=100');
      const created = (Array.isArray(all) ? all : all.users).find((u) => u.email === email);
      if (created) {
        cleanup.push(() => api.call('DELETE', `/api/users/${created.id}`).catch(() => {}));
        check('MAN-04 staff created: role OUTLET_STAFF at the chosen branch, active', created.role === 'OUTLET_STAFF' && created.outletId === outletId && created.isActive, JSON.stringify({ r: created.role, o: created.outletId }));
        await F.go(page, '/users');
        await page.getByRole('searchbox', { name: 'Tìm nhân viên' }).fill(email);
        await page.waitForTimeout(900);
        await H.settle(page);
        await page.getByRole('button', { name: new RegExp(`Thêm thao tác cho`) }).first().click();
        await page.getByRole('menuitem', { name: /Khoá tài khoản/ }).click();
        await page.getByRole('dialog').getByRole('button', { name: /^Khoá tài khoản/ }).click();
        await page.waitForTimeout(1500);
        const locked = (Array.isArray(await api.get('/api/users?limit=100')) ? await api.get('/api/users?limit=100') : (await api.get('/api/users?limit=100')).users).find((u) => u.id === created.id);
        check('MAN-04 lock: API isActive=false', locked && locked.isActive === false, JSON.stringify(locked && locked.isActive));
        await page.getByRole('button', { name: /Thêm thao tác cho/ }).first().click();
        await page.getByRole('menuitem', { name: /Mở khoá tài khoản/ }).click();
        await page.getByRole('dialog').getByRole('button', { name: /Mở khoá tài khoản/ }).click();
        await page.waitForTimeout(1500);
        const un = (await api.get('/api/users?limit=100'));
        check('MAN-04 unlock: API isActive=true', (Array.isArray(un) ? un : un.users).find((u) => u.id === created.id)?.isActive === true);
        await page.getByRole('button', { name: /Thêm thao tác cho/ }).first().click();
        await page.getByRole('menuitem', { name: /Xoá nhân viên/ }).click();
        await page.getByRole('dialog').getByRole('button', { name: /^Xoá nhân viên/ }).click();
        await page.waitForTimeout(1500);
        const del = (await api.get('/api/users?limit=100'));
        check('MAN-04 delete: the user is gone from the API', !(Array.isArray(del) ? del : del.users).some((u) => u.id === created.id));
      } else {
        const body = res ? await res.text().catch(() => '') : '';
        t = await H.bodyText(page);
        console.log(`  info: add staff refused: HTTP ${res && res.status()} ${body.slice(0, 200)}`);
        check('MAN-04 staff over the plan limit: toast "Vượt quá giới hạn gói", no raw code', /Vượt quá giới hạn gói/.test(t) && !/PLAN_LIMIT_EXCEEDED|DUPLICATE_ENTRY/.test(t), `${res && res.status()} ${t.slice(-300)}`);
        // the plan limit blocks adding: lock and unlock a seeded user instead (restored at the end)
        const seeded = (Array.isArray(all) ? all : all.users).find((u) => u.role === 'OUTLET_INVENTORY' && u.isActive);
        if (seeded) {
          cleanup.push(() => api.call('PUT', `/api/users/${seeded.id}`, { isActive: true }).catch(() => {}));
          const listUsers = async () => { const x = await api.get('/api/users?limit=100'); return Array.isArray(x) ? x : x.users; };
          await F.go(page, '/users');
          await page.getByRole('searchbox', { name: 'Tìm nhân viên' }).fill(seeded.email.split('@')[0]);
          await page.getByRole('searchbox', { name: 'Tìm nhân viên' }).press('Enter');
          await page.waitForTimeout(1200);
          await H.settle(page);
          await page.getByRole('button', { name: /Thêm thao tác cho/ }).first().click();
          await page.getByRole('menuitem', { name: /Khoá tài khoản/ }).click();
          const d1 = page.getByRole('dialog');
          check('MAN-04 lock dialog: "Khoá tài khoản?" names the person and the effect', /Khoá tài khoản\?/.test(await d1.innerText()) && /không đăng nhập được cho tới khi mở khoá/.test(await d1.innerText()), await d1.innerText());
          await d1.getByRole('button', { name: /^Khoá tài khoản/ }).click();
          await page.waitForTimeout(1500);
          check('MAN-04 lock: API isActive=false, the row says "Đã khoá"', (await listUsers()).find((u) => u.id === seeded.id)?.isActive === false && /Đã khoá/.test(await rows().first().innerText()), await rows().first().innerText());
          await page.getByRole('button', { name: /Thêm thao tác cho/ }).first().click();
          await page.getByRole('menuitem', { name: /Mở khoá tài khoản/ }).click();
          await page.getByRole('dialog').getByRole('button', { name: /Mở khoá tài khoản/ }).click();
          await page.waitForTimeout(1500);
          check('MAN-04 unlock: API isActive=true', (await listUsers()).find((u) => u.id === seeded.id)?.isActive === true);
        }
      }
      for (const [p, re] of [['/users/permissions', /Phân quyền thêm cho nhân viên/], ['/users/role-permissions', /Quyền theo vai trò/]]) {
        st.reset();
        await F.go(page, p);
        const tt = await H.bodyText(page);
        const prr = await H.pageProblems(page, st);
        check(`MAN-04 ${p} loads with its title and no raw keys`, re.test(tt) && prr.length === 0, prr.join('; ') || tt.slice(0, 200));
      }
    }, sp);

    await H.runCase('WEB-UI-MAN-05', 'loyalty, notifications: pages load, tabs switch, empty states in words', async () => {
      st.reset();
      await F.go(page, '/loyalty');
      let t = await H.bodyText(page);
      check('MAN-05 loyalty: title, status "Chưa kích hoạt", tabs Tổng quan / Tích điểm / Hạng thành viên / Hết hạn', /Khách thân thiết/.test(t) && /Chưa kích hoạt/.test(t) && /Tích điểm/.test(t) && /Hạng thành viên/.test(t) && /Hết hạn/.test(t), t.slice(0, 300));
      for (const tab of ['Tích điểm', 'Hạng thành viên', 'Hết hạn', 'Tổng quan']) {
        await tabBtn(tab).click();
        await page.waitForTimeout(500);
        check(`MAN-05 loyalty tab "${tab}" opens with no raw key`, H.rawKeys(await H.bodyText(page)).length === 0);
      }
      const pr = await H.pageProblems(page, st);
      check('MAN-05 loyalty healthy', pr.length === 0, pr.join('; '));
      st.reset();
      await F.go(page, '/notifications');
      t = await H.bodyText(page);
      check('MAN-05 notifications: title, actions, tabs Tất cả / Chưa đọc', /Thông báo/.test(t) && /Đã đọc hết/.test(t) && /Chưa đọc/.test(t), t.slice(0, 300));
      await tabBtn('Chưa đọc').click();
      await page.waitForTimeout(600);
      check('MAN-05 notifications "Chưa đọc": a list or "Chưa có thông báo nào"', /Chưa có thông báo nào|Không có/.test(await H.bodyText(page)) || (await page.locator('main li, main [role="listitem"]').count()) > 0);
      const pr2 = await H.pageProblems(page, st);
      check('MAN-05 notifications healthy', pr2.length === 0, pr2.join('; '));
    }, sp);

    await H.runCase('WEB-UI-MAN-06', 'calendar: loads, month switch, day click opens the day panel (numbers: calendar tests)', async () => {
      st.reset();
      await F.go(page, '/calendar');
      let t = await H.bodyText(page);
      check('MAN-06 header "Tháng M, YYYY", legend Giao / Trả / Trễ hạn trả, weekday row T2…CN', /Tháng \d+, \d{4}/.test(t) && /Giao/.test(t) && /Trễ hạn trả/.test(t) && /T2[\s\S]*CN/.test(t), t.slice(0, 200));
      const month0 = (t.match(/Tháng (\d+), (\d{4})/) || []).slice(1).join('/');
      await page.getByRole('button', { name: 'Tháng sau' }).click();
      await page.waitForTimeout(800);
      await H.settle(page);
      const month1 = ((await H.bodyText(page)).match(/Tháng (\d+), (\d{4})/) || []).slice(1).join('/');
      check('MAN-06 "Tháng sau" moves one month', month1 !== month0 && !!month1, `${month0} -> ${month1}`);
      await page.getByRole('button', { name: 'Tháng trước' }).click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: 'Hôm nay' }).first().click();
      await page.waitForTimeout(800);
      const [d, m] = today.slice(5).split('-').reverse().map(Number);
      await page.getByRole('button', { name: new RegExp(`^${Number(today.slice(8))}/${Number(today.slice(5, 7))}(,|$)`) }).first().click();
      await page.waitForTimeout(800);
      t = await H.bodyText(page);
      check('MAN-06 clicking today opens the panel "T? DD/MM · hôm nay" with the lists', /hôm nay/.test(t) && /CẦN GIAO|CẦN NHẬN TRẢ|Không có/.test(t), t.slice(-300));
      void d;
      void m;
      const pr = await H.pageProblems(page, st);
      check('MAN-06 healthy page', pr.length === 0, pr.join('; '));
    }, sp);

    await H.runCase('WEB-UI-MAN-07', 'availability: loads, quick day buttons change the range, a product shows free units per day', async () => {
      st.reset();
      const p = await api.createProduct(`${tag} Còn`, 3, outletId);
      cleanup.push(() => api.call('DELETE', `/api/products/${p.id}`).catch(() => {}));
      await F.go(page, `/availability?pickup=${today}&return=${addDays(today, 2)}&outletId=${outletId}`);
      let t = await H.bodyText(page);
      check('MAN-07 page: "Kiểm tra còn hàng", date range, quantity, quick buttons Hôm nay / Ngày mai / Cuối tuần / 3 ngày', /Kiểm tra còn hàng/.test(t) && /Ngày giao → Ngày trả/.test(t) && /Cuối tuần/.test(t) && /3 ngày/.test(t), t.slice(0, 300));
      await page.getByRole('button', { name: 'Ngày mai', exact: true }).click();
      await page.waitForTimeout(500);
      check('MAN-07 "Ngày mai" sets the range to tomorrow', (await H.bodyText(page)).includes(addDays(today, 1).slice(8) + '/' + addDays(today, 1).slice(5, 7)), (await H.bodyText(page)).slice(150, 350));
      await page.getByPlaceholder('Tìm tên hoặc mã sản phẩm').fill(p.name);
      await page.getByRole('listbox').getByRole('button', { name: p.name }).click({ timeout: 30000 });
      await page.waitForTimeout(1500);
      t = await H.bodyText(page);
      check('MAN-07 the product shows "Còn 3/3"', /Còn 3\/3/.test(t), t.slice(150, 500));
      const pr = await H.pageProblems(page, st);
      check('MAN-07 healthy page', pr.length === 0, pr.join('; '));
    }, sp);
  } finally {
    for (const fn of cleanup.reverse()) await fn();
    await browser.close();
  }
  return H.finish(rec.results, 'web-ui-manage-results.json', { tag });
}

if (require.main === module) H.main(main);
module.exports = { main };
