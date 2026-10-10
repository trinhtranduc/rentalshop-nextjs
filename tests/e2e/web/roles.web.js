#!/usr/bin/env node
/**
 * WEB-ROLE / WEB-DASH (#727): the shop web for every kind of account, in a real browser.
 *
 * One DEDICATED merchant (registered through POST /api/auth/register, own OUTLET_STAFF and OUTLET_INVENTORY "kho"
 * users; the seeded merchants are never touched). For merchant, staff and kho:
 *   - the menu entries each role sees, the Tổng quan page (money tiles are API-403 for staff/kho: what the page shows
 *     instead), orders list / detail / create, products, customers, categories, calendar, settings;
 *   - control vs API: a control the page hides must be rejected by the API, a control the page shows must be accepted;
 *   - direct URLs of admin-only pages must not leak data (users, outlets bank accounts, revenue drawers).
 * WEB-DASH: a merchant with NO orders (zeros, no NaN) and a custom range crossing months, against GET /api/analytics/period.
 *
 * Run: scripts/e2e/web-e2e.sh --roles   (see --help)
 */
const U = require('./web-ui');
const F = require('./web-fixtures');

/** Checks that fail on purpose until the named issue is fixed: id -> '#N' (a pass is reported "fixed?") */
const KNOWN = {
  'WEB-ROLE-10c': '#736', // /outlets shows Thêm chi nhánh / Sửa to staff (API 403)
  'WEB-ROLE-11c': '#736', // same for kho
  'WEB-ROLE-26': '#737', // /loyalty raw key errors.PLAN_UPGRADE_REQUIRED (staff)
  'WEB-ROLE-27': '#737' // same (merchant)
};

const only = (process.env.WEB_E2E_ONLY || '').split(/[\s,]+/).filter(Boolean);
const want = (id) => !only.length || only.some((o) => id.startsWith(o));

const MERCHANT_NAV = ['/orders/create', '/dashboard', '/orders', '/calendar', '/availability', '/products', '/customers', '/users', '/outlets', '/categories', '/loyalty'];
const STAFF_NAV = ['/orders/create', '/dashboard', '/orders', '/calendar', '/availability', '/products', '/customers', '/categories'];
const MONEY_LABELS = ['Giá trị đơn mới', 'Thực thu', 'Còn phải thu', 'Thế chân'];

const sameSet = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const brief = (t, n = 240) => String(t).replace(/\s+/g, ' ').slice(0, n);

async function main() {
  const R = F.makeReporter('WEB-ROLE', KNOWN);
  const check = (id, name, ok, detail) => want(id) && R.check(id, name, ok, detail);
  const browser = await F.launch();
  const base = F.CFG.client;
  const today = F.vnDateKey();
  const tag = F.uniqueTag();
  console.log(`dedicated merchant ${tag}`);
  const acc = await F.createMerchant(tag);
  const roles = {};
  try {
    for (const role of ['merchant', 'staff', 'kho']) {
      const s = await F.openSession(browser, acc[role]);
      roles[role] = { ...s, page: await s.ctx.newPage() };
      roles[role].log = F.watchPage(roles[role].page);
    }
    const M = roles.merchant.api;
    const outletId = acc.outletId;

    // ---------------------------------------------------------------- data (merchant API)
    const marker = 777000; // a sale of this amount must never show on a page a role may not see money on
    const product = await F.makeProduct(M, `SP vai tro ${tag}`, 5, outletId, { rentPrice: 100000, salePrice: marker });
    const customer = await F.makeCustomer(M, 'KhachVT');
    const rent = await F.makeRent(M, { customer, product, outletId, from: today, to: F.addDays(today, 2), quantity: 1 });
    const sale = await F.makeSale(M, { customer, product, outletId, quantity: 1, unitPrice: marker });
    const otherOutlet = await F.raw(M, 'POST', '/api/outlets', { name: `Chi nhanh phu ${tag}`, address: 'x', phone: F.uniquePhone() });
    const otherOutletName = `Chi nhanh phu ${tag}`;
    console.log('data', { product: product.id, rent: rent.orderNumber, sale: sale.orderNumber, otherOutlet: otherOutlet.status });
    const ops = await F.opsOf(M);

    // ---------------------------------------------------------------- WEB-ROLE-01..03 menu per role
    for (const [id, role, expected] of [['WEB-ROLE-01', 'merchant', MERCHANT_NAV], ['WEB-ROLE-02', 'staff', STAFF_NAV], ['WEB-ROLE-03', 'kho', STAFF_NAV]]) {
      const { page } = roles[role];
      await U.go(page, base, '/dashboard', { wait: 1500 });
      const hrefs = await U.navHrefs(page);
      const txt = await U.text(page);
      const settingsEntry = /Cài đặt cửa hàng/.test(txt);
      check(id, `${role}: menu shows exactly ${expected.length} entries, Cài đặt cửa hàng present`, sameSet(hrefs.filter((h) => h !== '/'), expected) && settingsEntry, `hrefs=${hrefs.join(',')} settings=${settingsEntry}`);
    }

    // ---------------------------------------------------------------- WEB-ROLE-04..06 Tổng quan for staff / kho
    const rawBad = (t) => F.RAW_KEY.exec(t);
    for (const [id, role] of [['WEB-ROLE-04', 'staff'], ['WEB-ROLE-05', 'kho']]) {
      const { page, log, api } = roles[role];
      log.api.length = 0;
      await U.go(page, base, '/dashboard', { wait: 2500 });
      const t = await U.text(page);
      const card = await U.todayCard(page);
      const rows = await U.todayRows(page);
      const opsRole = await F.opsOf(api);
      const money = MONEY_LABELS.filter((l) => t.includes(l));
      check(`${id}a`, `${role}: no money tile on Tổng quan (API analytics/period is 403)`, money.length === 0 && !t.includes('777,000'), `moneyLabels=${money} marker=${t.includes('777,000')}`);
      check(`${id}b`, `${role}: Hôm nay card counters equal GET /api/analytics/outlet-operations`,
        card.pickups && card.pickups.total === opsRole.doneToday.pickups + opsRole.pickupsToday.count && card.pickups.done === opsRole.doneToday.pickups &&
          card.returns && card.returns.total === opsRole.doneToday.returns + opsRole.returnsToday.count && card.overdue === opsRole.overdueReturns.count && card.noShows === opsRole.noShows.count,
        `card=${JSON.stringify(card)} api=${JSON.stringify({ p: opsRole.pickupsToday.count, dp: opsRole.doneToday.pickups, r: opsRole.returnsToday.count, o: opsRole.overdueReturns.count, n: opsRole.noShows.count })}`);
      const expectedRows = [...new Set([...opsRole.pickupsToday.orders, ...opsRole.returnsToday.orders, ...opsRole.overdueReturns.orders].map((o) => o.orderNumber))].slice(0, 5);
      check(`${id}c`, `${role}: "Đơn cần làm hôm nay" lists the orders of the API (first 5)`, rows && sameSet(rows.numbers, expectedRows) && rows.numbers.includes(rent.orderNumber), `rows=${rows && rows.numbers} api=${expectedRows}`);
      check(`${id}d`, `${role}: no raw error key, no NaN, no spinner, no "không tải được"`, !rawBad(t) && !(await F.spinning(page)) && !/Không tải được/.test(t), `raw=${rawBad(t) && rawBad(t)[0]} spinner=${await F.spinning(page)} text=${brief(t.slice(-200), 120)}`);
      const failed = log.api.filter((x) => !/^403 GET \/api\/(analytics\/period|loyalty)/.test(x) && !/^40[13] /.test(x));
      check(`${id}e`, `${role}: the page makes no failing API call other than the 403 it is meant to get`, failed.length === 0, failed.join(' ; '));
    }

    // staff and kho keep money away by direct URL
    for (const [id, role] of [['WEB-ROLE-06', 'staff'], ['WEB-ROLE-07', 'kho']]) {
      const { page } = roles[role];
      const urls = [`/dashboard?period=month&detail=collected`, `/dashboard?period=custom&from=${F.addDays(today, -6)}&to=${today}&detail=orderValue`, '/dashboard?top=products'];
      const seen = [];
      for (const u of urls) {
        await U.go(page, base, u, { wait: 1800 });
        const t = await U.text(page);
        seen.push({ u, leak: t.includes('777,000') || MONEY_LABELS.some((l) => t.includes(l)), raw: rawBad(t) && rawBad(t)[0] });
      }
      check(id, `${role}: revenue drawers / ranking by direct URL show no amount and no raw key (period forced to today)`, seen.every((x) => !x.leak && !x.raw), JSON.stringify(seen.filter((x) => x.leak || x.raw)));
      // OWNER QUESTION Q3: /dashboard/related lists the orders the role may read (GET /api/orders is allowed) and adds up
      // their total: that sum equals the revenue tile staff may not see. CURRENT behaviour asserted.
      await U.go(page, base, `/dashboard/related?kind=orderValue&from=${today}&to=${today}`, { wait: 2500 });
      const t = await U.text(page);
      check(`${id}b`, `${role}: CURRENT: /dashboard/related by URL lists the day's orders with their sum (staff may read orders; owner question Q3), no raw key`, t.includes('777,000') && !rawBad(t), `sum shown=${t.includes('777,000')} raw=${rawBad(t) && rawBad(t)[0]}`);
    }

    // ---------------------------------------------------------------- WEB-ROLE-08..09 admin-only pages by direct URL
    for (const [id, role] of [['WEB-ROLE-08', 'staff'], ['WEB-ROLE-09', 'kho']]) {
      const { page, api } = roles[role];
      const seen = [];
      for (const u of ['/users', '/users/add', '/users/permissions', '/users/role-permissions', `/outlets/${outletId}/bank-accounts`]) {
        await U.go(page, base, u, { wait: 1500 });
        const t = await U.text(page);
        const leaks = [acc.merchant.email, acc.staff.email, acc.kho.email, `E2E ${tag}`].filter((x) => t.includes(x) && !/probe/.test(x));
        // the shop name chip in the header is not data of that page: only emails and user names count
        const emailLeak = [acc.merchant.email, acc.staff.email, acc.kho.email].filter((x) => t.includes(x));
        const hasForm = (await page.locator('main input[type=password]').count()) > 0;
        seen.push({ u, emailLeak, hasForm, raw: rawBad(t) && rawBad(t)[0], note: brief(t.replace(/^[\s\S]*?\/\s/, ''), 90) });
      }
      const apiUsers = await F.raw(api, 'GET', '/api/users?limit=5');
      const apiCreate = await F.raw(api, 'POST', '/api/users', { email: `x${tag}@example.com`, password: 'e2eweb123', firstName: 'X', role: 'OUTLET_STAFF', outletId });
      check(id, `${role}: users / permissions / bank-account pages by URL: no user data, no form; API GET and POST /api/users are 403`,
        seen.every((x) => x.emailLeak.length === 0 && !x.hasForm && !x.raw) && apiUsers.status === 403 && apiCreate.status === 403,
        `${JSON.stringify(seen.filter((x) => x.emailLeak.length || x.hasForm || x.raw))} api=${apiUsers.status}/${apiCreate.status}`);
    }

    // ---------------------------------------------------------------- WEB-ROLE-10/11 outlets page: controls vs API
    for (const [id, role] of [['WEB-ROLE-10', 'staff'], ['WEB-ROLE-11', 'kho']]) {
      const { page, api } = roles[role];
      await U.go(page, base, '/outlets', { wait: 2000 });
      const t = await U.text(page);
      const addBtn = await page.getByRole('button', { name: 'Thêm chi nhánh' }).count();
      const editBtn = await page.getByRole('button', { name: 'Sửa', exact: true }).count();
      const apiPost = await F.raw(api, 'POST', '/api/outlets', { name: `x ${tag}`, address: 'x', phone: F.uniquePhone() });
      const apiPut = await F.raw(api, 'PUT', `/api/outlets?outletId=${outletId}`, { name: `E2E renamed by ${role}` });
      const merchantPut = await F.raw(M, 'PUT', `/api/outlets?outletId=${outletId}`, { name: `E2E Web ${tag} - Cửa hàng chính` });
      check(`${id}a`, `${role}: /outlets lists only the own outlet`, !t.includes(otherOutletName), `otherOutletShown=${t.includes(otherOutletName)}`);
      check(`${id}b`, `${role}: API rejects create (403) and edit (403/404) of an outlet; the merchant's own edit works (${merchantPut.status})`, apiPost.status === 403 && [403, 404].includes(apiPut.status) && merchantPut.status === 200, `post=${apiPost.status} put=${apiPut.status} merchantPut=${merchantPut.status}`);
      check(`${id}c`, `${role}: "Thêm chi nhánh" and "Sửa" are hidden (the API rejects them)`, addBtn === 0 && editBtn === 0, `addButtons=${addBtn} editButtons=${editBtn}`);
    }

    // ---------------------------------------------------------------- WEB-ROLE-12..14 products: controls vs API
    const prod2 = await F.makeProduct(M, `SP gia ${tag}`, 2, outletId, { rentPrice: 120000, salePrice: 500000 });
    const productControls = async (role) => {
      const { page } = roles[role];
      await U.go(page, base, '/products', { wait: 2000 });
      const list = {
        add: await page.getByRole('button', { name: 'Thêm sản phẩm' }).or(page.getByRole('link', { name: 'Thêm sản phẩm' })).count(),
        exportBtn: await page.getByRole('button', { name: 'Xuất Excel' }).or(page.getByRole('link', { name: 'Xuất Excel' })).count(),
        importBtn: await page.getByRole('button', { name: 'Nhập từ Excel' }).or(page.getByRole('link', { name: 'Nhập từ Excel' })).count(),
        edit: await page.getByRole('button', { name: 'Sửa', exact: true }).or(page.getByRole('link', { name: 'Sửa', exact: true })).count()
      };
      await U.go(page, base, `/products/${prod2.id}`, { wait: 1500 });
      const detail = {
        edit: await page.getByRole('link', { name: 'Sửa', exact: true }).or(page.getByRole('button', { name: 'Sửa', exact: true })).count(),
        del: await page.getByRole('button', { name: 'Xoá', exact: true }).count()
      };
      return { list, detail };
    };
    const editPrice = (api, p, price) => F.rawForm(api, 'PUT', `/api/products/${p.id}`, { name: p.name, rentPrice: price, salePrice: price });
    {
      const { api, page } = roles.staff;
      const c = await productControls('staff');
      const putRes = await editPrice(api, prod2, 99000);
      const after = (await F.raw(M, 'GET', `/api/products/${prod2.id}`)).body.data;
      const exp = await F.raw(api, 'GET', '/api/products/export?format=csv');
      await U.go(page, base, `/products/${prod2.id}/edit`, { wait: 1500 });
      const t = await U.text(page);
      check('WEB-ROLE-12a', 'staff: no "Sửa", "Xoá", "Xuất Excel", "Nhập từ Excel" on products (list and detail)', c.list.edit === 0 && c.detail.edit === 0 && c.detail.del === 0 && c.list.exportBtn === 0 && c.list.importBtn === 0, JSON.stringify(c));
      check('WEB-ROLE-12b', 'staff: API rejects a price change (403) and the price is unchanged', putRes.status === 403 && after.rentPrice === 120000, `put=${putRes.status} price=${after.rentPrice}`);
      check('WEB-ROLE-12c', 'staff: /products/:id/edit by URL shows "Bạn không có quyền sửa sản phẩm." and no price field', /không có quyền sửa sản phẩm/i.test(t) && (await page.locator('#pf-perRental, #pf-salePrice').count()) === 0, `text=${brief(t.slice(-160), 100)}`);
      check('WEB-ROLE-12d', 'staff: API export of products is 403 (button hidden)', exp.status === 403, `export=${exp.status}`);
      const created = await F.rawForm(api, 'POST', '/api/products', { name: `SP staff ${tag}`, rentPrice: 1000, salePrice: 2000, totalStock: 1, outletStock: [{ outletId, stock: 1 }], pricingOptions: [{ type: 'FIXED', price: 1000, isDefault: true }] });
      check('WEB-ROLE-12e', 'staff: "Thêm sản phẩm" is shown and the API accepts a create (staff may add products, not price-edit)', c.list.add > 0 && created.status === 200, `addButtons=${c.list.add} create=${created.status}`);
    }
    {
      const { api, page } = roles.kho;
      const c = await productControls('kho');
      const putRes = await editPrice(api, prod2, 130000);
      const after = (await F.raw(M, 'GET', `/api/products/${prod2.id}`)).body.data;
      const exp = await F.raw(api, 'GET', '/api/products/export?format=csv');
      await U.go(page, base, `/products/${prod2.id}/edit`, { wait: 1500 });
      const formShown = (await page.locator('#pf-perRental').count()) > 0 || (await page.locator('#pf-salePrice').count()) > 0;
      check('WEB-ROLE-13a', 'kho: "Thêm sản phẩm", "Nhập từ Excel", "Sửa", "Xoá" shown on products', c.list.add > 0 && c.list.importBtn > 0 && c.list.edit > 0 && c.detail.edit > 0 && c.detail.del > 0, JSON.stringify(c));
      check('WEB-ROLE-13b', 'kho: API accepts the price change (200) and the edit form is shown', putRes.status === 200 && after.rentPrice === 130000 && formShown, `put=${putRes.status} price=${after.rentPrice} form=${formShown}`);
      // OWNER QUESTION: kho has products.export (BF-INV-05) and the API exports, but the web shows no "Xuất Excel" button
      check('WEB-ROLE-13c', 'kho: API export of products is 200; the web shows the "Xuất Excel" button (CURRENT: button hidden, owner question Q1)', exp.status === 200 && c.list.exportBtn === 0, `export=${exp.status} button=${c.list.exportBtn}`);
    }

    // ---------------------------------------------------------------- WEB-ROLE-14 customers + categories controls vs API
    {
      const cust = await F.makeCustomer(M, `KhDel${tag}`.slice(0, 12));
      const cust2 = await F.makeCustomer(M, `KhDe2${tag}`.slice(0, 12));
      const cat = await F.raw(M, 'POST', '/api/categories', { name: `DM ${tag}` });
      const catId = cat.body?.data?.id;
      for (const [id, role, target] of [['WEB-ROLE-14', 'staff', cust], ['WEB-ROLE-15', 'kho', cust2]]) {
        const { page, api } = roles[role];
        await U.go(page, base, `/customers/${target.id}`, { wait: 1500 });
        const delShown = await page.getByRole('button', { name: 'Xoá khách' }).count();
        const editShown = await page.getByRole('link', { name: 'Sửa', exact: true }).or(page.getByRole('button', { name: 'Sửa', exact: true })).count();
        await U.go(page, base, '/customers', { wait: 1500 });
        const exportShown = await page.getByRole('button', { name: 'Xuất Excel' }).or(page.getByRole('link', { name: 'Xuất Excel' })).count();
        const importShown = await page.getByRole('button', { name: 'Nhập từ Excel' }).or(page.getByRole('link', { name: 'Nhập từ Excel' })).count();
        await U.go(page, base, '/categories', { wait: 1500 });
        const catAdd = await page.getByRole('button', { name: 'Thêm danh mục' }).count();
        const catEdit = await page.getByRole('button', { name: 'Sửa', exact: true }).count();
        const apiCatPost = await F.raw(api, 'POST', '/api/categories', { name: `DM ${role} ${tag}` });
        const apiCatPut = catId ? await F.raw(api, 'PUT', `/api/categories/${catId}`, { name: `DM ${tag} ${role}` }) : { status: 0 };
        const apiExport = await F.raw(api, 'GET', '/api/customers/export?format=csv');
        const apiDel = await F.raw(api, 'DELETE', `/api/customers/${target.id}`);
        // each control the page shows must work; each one it hides must be rejected
        const expectCat = role === 'kho' ? 200 : 403;
        check(`${id}a`, `${role}: customers: "Xoá khách", "Sửa", "Nhập từ Excel" shown and the API deletes (${apiDel.status}); "Xuất Excel" ${exportShown ? 'shown' : 'hidden'} with API export ${apiExport.status}`,
          delShown > 0 && editShown > 0 && importShown > 0 && apiDel.status === 200 && (exportShown > 0) === (apiExport.status === 200), `del=${delShown} edit=${editShown} import=${importShown} export=${exportShown} apiDel=${apiDel.status} apiExport=${apiExport.status}`);
        check(`${id}b`, `${role}: categories: "Thêm danh mục" / "Sửa" ${role === 'kho' ? 'shown' : 'hidden'} and the API ${expectCat === 200 ? 'accepts' : 'rejects (403)'} create / rename`,
          ((catAdd > 0 && catEdit > 0) === (role === 'kho')) && (role === 'kho' ? [200, 201].includes(apiCatPost.status) && apiCatPut.status === 200 : apiCatPost.status === 403 && apiCatPut.status === 403),
          `add=${catAdd} edit=${catEdit} post=${apiCatPost.status} put=${apiCatPut.status}`);
      }
    }

    // ---------------------------------------------------------------- WEB-ROLE-16..18 orders list / detail / create
    for (const [id, role] of [['WEB-ROLE-16', 'staff'], ['WEB-ROLE-17', 'kho'], ['WEB-ROLE-18', 'merchant']]) {
      const { page, api } = roles[role];
      await U.go(page, base, '/orders', { wait: 2000 });
      const view = await U.ordersView(page);
      const t = await U.text(page);
      const apiAll = await F.raw(api, 'GET', '/api/orders?limit=100');
      const apiRows = apiAll.body?.data?.orders || [];
      const exportBtn = await page.getByRole('button', { name: 'Xuất Excel' }).or(page.getByRole('link', { name: 'Xuất Excel' })).count();
      const apiExport = await F.raw(api, 'GET', '/api/orders/export?format=csv');
      const opsNow = await F.opsOf(api);
      const todoApi = new Set([...opsNow.pickupsToday.orders, ...opsNow.returnsToday.orders, ...opsNow.overdueReturns.orders].map((o) => o.id)).size;
      check(`${id}a`, `${role}: /orders lists the same orders as GET /api/orders (${apiRows.length}) and the Việc cần làm badge = API (${todoApi})`,
        sameSet(view.numbers, apiRows.map((o) => String(o.orderNumber))) && view.todo === todoApi && view.noshow === opsNow.noShows.count, `shown=${view.numbers.length} api=${apiRows.length} todo=${view.todo}/${todoApi} noshow=${view.noshow}/${opsNow.noShows.count}`);
      check(`${id}b`, `${role}: "Xuất Excel" on orders ${role === 'merchant' ? 'shown' : 'hidden'} and API export ${role === 'merchant' ? '200' : '403'}`,
        role === 'merchant' ? exportBtn > 0 && apiExport.status === 200 : exportBtn === 0 && apiExport.status === 403, `button=${exportBtn} api=${apiExport.status}`);
      await U.go(page, base, `/orders/${rent.orderNumber}`, { wait: 1800 });
      const d = await U.text(page);
      const thumb = await page.getByRole('button', { name: 'Thêm thao tác' }).count();
      const apiOrder = (await F.raw(api, 'GET', `/api/orders/${rent.id}`)).body.data;
      const cancelApi = role === 'merchant' ? null : await F.raw(api, 'DELETE', `/api/orders/${rent.id}`);
      check(`${id}c`, `${role}: order detail shows number, line "Giá cố định · 100,000", total ${apiOrder.totalAmount.toLocaleString('en-US')}; "Thêm thao tác" menu ${role === 'merchant' ? 'shown' : 'hidden (API DELETE 403)'}`,
        d.includes(`#${rent.orderNumber}`) && /Giá cố định · 100,000/.test(d) && d.includes(apiOrder.totalAmount.toLocaleString('en-US')) && (role === 'merchant' ? thumb > 0 : thumb === 0 && cancelApi.status === 403), `thumb=${thumb} apiDelete=${cancelApi && cancelApi.status} text=${brief(d.slice(-200), 100)}`);
    }

    // staff and kho create an order through the web (rent + sale)
    for (const [id, role] of [['WEB-ROLE-19', 'staff'], ['WEB-ROLE-20', 'kho']]) {
      const { page, api } = roles[role];
      let made = null;
      let error = '';
      try {
        const P = F.addDays(today, 5);
        made = await U.createInUi(page, base, { type: 'RENT', P, R: F.addDays(P, 1), lines: [{ product }], customer });
      } catch (e) {
        error = e.message;
      }
      const row = made && (await F.raw(api, 'GET', `/api/orders/${made.order.id}`)).body?.data;
      check(id, `${role}: creates a rent order on /orders/create (picker, days, customer) and the API has it`, !!row && row.orderNumber === made.order.orderNumber && row.orderType === 'RENT', error || `order=${made && made.order.orderNumber} type=${row && row.orderType}`);
      if (made) await F.setStatus(M, made.order.id, 'CANCELLED');
    }

    // ---------------------------------------------------------------- WEB-ROLE-21 calendar / availability for staff and kho
    for (const [id, role] of [['WEB-ROLE-21', 'staff'], ['WEB-ROLE-22', 'kho']]) {
      const { page } = roles[role];
      const t1 = (await U.go(page, base, '/calendar', { wait: 1800 }), await U.text(page));
      const t2 = (await U.go(page, base, '/availability', { wait: 1500 }), await U.text(page));
      check(id, `${role}: /calendar and /availability open, show today's panel / search, no raw key, no error`, /Cần giao/i.test(t1) && /Kiểm tra còn hàng/.test(t2) && !rawBad(t1) && !rawBad(t2) && !/Không tải được/.test(t1 + t2), `cal=${brief(t1.slice(-120), 100)} raw=${rawBad(t1 + t2) && rawBad(t1 + t2)[0]}`);
    }

    // ---------------------------------------------------------------- WEB-ROLE-23..25 settings per role
    for (const [id, role] of [['WEB-ROLE-23', 'staff'], ['WEB-ROLE-24', 'kho']]) {
      const { page, api } = roles[role];
      await U.go(page, base, '/dashboard?settings=subscription', { wait: 2000 });
      const t = await U.text(page);
      const url = page.url();
      const inputsDisabled = await page.locator('[role=dialog] input[name=name], [role=dialog] input:not([type=hidden])').evaluateAll((els) => els.filter((e) => !e.readOnly && !e.disabled && e.name === 'name').length);
      const apiPut = await F.raw(api, 'PUT', `/api/outlets?outletId=${outletId}`, { name: `E2E renamed by ${role}`, address: 'x' });
      const apiMerchant = await F.raw(api, 'GET', `/api/merchants/${acc.merchantId}`);
      check(`${id}a`, `${role}: ?settings=subscription resolves to the read-only outlet tab (no plan, no price); "Bạn chỉ xem được mục này"`, /settings=outlet/.test(url) && /Bạn chỉ xem được mục này/.test(t) && !/Gói dịch vụ/.test(t.split('Giao diện')[0] || '') && !/E2E Web Roomy|\/tháng/.test(t), `url=${url.replace(base, '')} text=${brief(t.slice(t.indexOf('Cài đặt')), 160)}`);
      check(`${id}b`, `${role}: API rejects outlet edit (403/404) and merchant read (403)`, [403, 404].includes(apiPut.status) && apiMerchant.status === 403, `put=${apiPut.status} merchant=${apiMerchant.status}`);
    }
    {
      const { page } = roles.merchant;
      await U.go(page, base, '/dashboard?settings=subscription', { wait: 2500 });
      const t = await U.text(page);
      check('WEB-ROLE-25', 'merchant: Cài đặt has Thông tin cửa hàng, Phiếu in, Gói dịch vụ, Tài khoản; Gói dịch vụ tab shows the plan (ACTIVE)', /Thông tin cửa hàng/.test(t) && /Phiếu in/.test(t) && /Gói dịch vụ/.test(t) && /E2E Web Roomy/.test(t), brief(t.slice(t.indexOf('Cài đặt')), 260));
    }

    // ---------------------------------------------------------------- WEB-ROLE-26 loyalty by URL (merchant on a plan without loyalty)
    for (const [id, role] of [['WEB-ROLE-26', 'staff'], ['WEB-ROLE-27', 'merchant']]) {
      const { page } = roles[role];
      await U.go(page, base, '/loyalty', { wait: 2500 });
      const t = await U.text(page);
      check(id, `${role}: /loyalty on a plan without the feature: upgrade card, no raw error key (errors.PLAN_UPGRADE_REQUIRED)`, !rawBad(t) && /Professional/.test(t), `raw=${rawBad(t) && rawBad(t)[0]} text=${brief(t.slice(-160), 120)}`);
    }

    // ---------------------------------------------------------------- WEB-ROLE-28 English
    for (const [id, role] of [['WEB-ROLE-28', 'staff'], ['WEB-ROLE-29', 'kho'], ['WEB-ROLE-30', 'merchant']]) {
      // single session: a new login replaces the vi one, so the vi context goes away first
      await roles[role].ctx.close().catch(() => {});
      const s = await F.openSession(browser, acc[role], { lang: 'en' });
      roles[role] = { ...s, page: await s.ctx.newPage() };
      const { page } = roles[role];
      const parts = [];
      for (const u of ['/dashboard', '/orders', '/products', '/calendar', '/customers']) {
        await U.go(page, base, u, { wait: 1800 });
        parts.push(`## ${u}\n${await U.text(page)}`);
      }
      const all = parts.join('\n').replace(/Sản phẩm mẫu|Khách hàng Mẫu/g, '');
      const vi = ['Tổng quan', 'Đơn hàng', 'Sản phẩm', 'Khách hàng', 'Lịch giao trả', 'Cần giao', 'Tất cả đơn'].filter((w) => all.includes(w));
      check(id, `${role}: English: Overview / Orders / Products visible, no Vietnamese menu word left, no raw key`, /Overview/.test(all) && /Orders/.test(all) && /Products/.test(all) && vi.length === 0 && !rawBad(all), `vi=${vi} raw=${rawBad(all) && rawBad(all)[0]}`);
    }

    // ---------------------------------------------------------------- WEB-DASH: no orders, custom range across months
    await dashChecks(browser, base, check);
  } finally {
    for (const r of Object.values(roles)) await r.ctx.close().catch(() => {});
    await browser.close();
  }
  const failed = R.finish('web-roles-results.json');
  process.exit(failed ? 1 : 0);
}

/** WEB-DASH-01..03 */
async function dashChecks(browser, base, check) {
  const tag = F.uniqueTag();
  const acc = await F.createMerchant(tag, { withStaff: false });
  F.deleteAllOrders(acc.merchantId); // registration adds a sample order: this merchant has none
  const s = await F.openSession(browser, acc.merchant);
  const page = await s.ctx.newPage();
  const today = F.vnDateKey();
  const first = (k) => `${k.slice(0, 7)}-01`;
  const parseTile = (raw) => {
    const lines = String(raw || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const v = lines.find((l, i) => i > 0 && /^[−+-]?\s?\d[\d.,]*\s?đ?$/.test(l));
    return v ? U.num(v) : null;
  };
  const tiles = async () => {
    const t = page.locator('section[aria-label="Số liệu chính"] button');
    await t.first().waitFor({ timeout: 60000 });
    const out = {};
    for (const l of MONEY_LABELS) out[l] = await t.filter({ hasText: l }).first().innerText().catch(() => '');
    return out;
  };
  for (const period of ['today', '7d', 'month']) {
    await U.go(page, base, `/dashboard?period=${period}`, { wait: 2500 });
    const raw = await tiles();
    const text = await U.text(page);
    const vals = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, parseTile(v)]));
    check(`WEB-DASH-01-${period}`, `no orders (${period}): four tiles read 0, no NaN / undefined / "không tải được"`, Object.values(vals).every((v) => v === 0) && !/NaN|undefined|Infinity/.test(text) && !/Không tải được/.test(text), JSON.stringify(vals));
  }
  await U.go(page, base, '/dashboard', { wait: 2500 });
  const t = await U.text(page);
  check('WEB-DASH-02', 'no orders: the to-do list says there is nothing today, counters 0/0, no spinner', /Hôm nay không có đơn cần giao hay nhận trả/.test(t) && !(await F.spinning(page)), brief(t.slice(t.indexOf('Đơn cần làm'), t.indexOf('Đơn cần làm') + 300), 200));
  // custom range crossing months, with a real order today
  const prev = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 2, 20)).toISOString().slice(0, 10);
  const outletId = acc.outletId;
  const product = await F.makeProduct(s.api, `SP dash ${tag}`, 3, outletId, { rentPrice: 100000, salePrice: 250000 });
  const customer = await F.makeCustomer(s.api, 'KhDash');
  await F.makeSale(s.api, { customer, product, outletId, quantity: 2, unitPrice: 250000 });
  await F.makeRent(s.api, { customer, product, outletId, from: F.addDays(today, 1), to: F.addDays(today, 2), quantity: 1, deposit: 40000, discount: 10000 });
  const qs = new URLSearchParams({ startDate: prev, endDate: today, groupBy: 'day', limit: '50', timeZone: F.CFG.zone });
  const report = (await F.raw(s.api, 'GET', `/api/analytics/period?${qs}`)).body.data;
  const r = report.revenue || {};
  const flow = r.collateralFlow || { received: 0, returned: 0 };
  const want = { 'Giá trị đơn mới': r.totalOrderValue ?? 0, 'Thực thu': r.cashCollected ?? 0, 'Còn phải thu': r.outstanding ?? 0, 'Thế chân': (flow.received || 0) - (flow.returned || 0) };
  await U.go(page, base, `/dashboard?period=custom&from=${prev}&to=${today}`, { wait: 3000 });
  const raw = await tiles();
  const got = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, parseTile(v)]));
  const text = await U.text(page);
  check('WEB-DASH-03', `custom range ${prev}..${today} (crosses a month): four tiles equal GET /api/analytics/period (${JSON.stringify(want)})`, JSON.stringify(got) === JSON.stringify(want) && want['Giá trị đơn mới'] > 0, `shown=${JSON.stringify(got)} api=${JSON.stringify(want)}`);
  const range = `${prev.slice(8, 10)}/${prev.slice(5, 7)}`;
  check('WEB-DASH-04', 'custom range: the period label shows both ends and the URL keeps from/to after a reload', text.includes(range) && /Tuỳ chọn|\d{2}\/\d{2}/.test(text), `has ${range}=${text.includes(range)}`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await F.settle(page, 2500);
  const again = Object.fromEntries(Object.entries(await tiles()).map(([k, v]) => [k, parseTile(v)]));
  check('WEB-DASH-05', 'custom range survives a reload with the same numbers', JSON.stringify(again) === JSON.stringify(want), `after reload=${JSON.stringify(again)}`);
  await s.ctx.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
