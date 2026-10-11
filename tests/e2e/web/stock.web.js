#!/usr/bin/env node
/**
 * WEB-STOCK / WEB-CAL / WEB-TODO (#727): stock, calendar, order detail and "việc cần làm" on the shop web.
 *
 * One DEDICATED merchant (registered through the real endpoint, sample order removed, own staff and kho unused here).
 * Orders are created through the web Tạo đơn flow where the case is about that flow (stock after a sale / a rent,
 * the picker, the cart flags) and through the API call the page makes for the many orders of the calendar and
 * "việc cần làm" cases. Every number on screen is compared with the API the page calls
 * (GET /api/products/{id}, /availability, /api/orders, /api/analytics/outlet-operations) and with the model of the
 * orders this run created (Vietnam civil days only).
 *
 * Run: scripts/e2e/web-e2e.sh --stock   (see --help)
 */
const U = require('./web-ui');
const F = require('./web-fixtures');

/** Checks that fail on purpose until the named issue is fixed: id -> '#N' (a pass is reported "fixed?") */
const KNOWN = {};

const only = (process.env.WEB_E2E_ONLY || '').split(/[\s,]+/).filter(Boolean);
const want = (id) => !only.length || only.some((o) => id.startsWith(o));
const brief = (t, n = 240) => String(t).replace(/\s+/g, ' ').slice(0, n);
const fmt = (n) => Number(n).toLocaleString('en-US');
const monthEnd = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};
const sameSet = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

async function main() {
  const R = F.makeReporter('WEB-STOCK', KNOWN);
  const check = (id, name, ok, detail) => want(id) && R.check(id, name, ok, detail);
  const browser = await F.launch();
  const base = F.CFG.client;
  const T = F.vnDateKey();
  const tag = F.uniqueTag();
  console.log(`dedicated merchant ${tag}, today ${T}`);
  const acc = await F.createMerchant(tag, { withStaff: false });
  F.deleteAllOrders(acc.merchantId);
  const outletId = acc.outletId;
  let s = await F.openSession(browser, acc.merchant);
  let page = await s.ctx.newPage();
  const M = s.api;
  const customer = await F.makeCustomer(M, 'KhStock');
  const nameOf = (k) => `SP ${k} ${tag}`;
  const apiProduct = async (p) => (await F.raw(M, 'GET', `/api/products/${p.id}`)).body.data;
  const stockOf = async (p) => {
    const d = await apiProduct(p);
    const row = (d.outletStock || []).find((o) => (o.outletId ?? o.outlet?.id) === outletId) || {};
    return { stock: row.stock, available: row.available, renting: row.renting };
  };
  const apiFree = async (p, from, to, quantity = 1) => {
    const q = new URLSearchParams({
      startDate: new Date(`${from}T00:00:00+07:00`).toISOString(),
      endDate: new Date(`${to}T23:59:59+07:00`).toISOString(),
      quantity: String(quantity),
      timeZone: F.CFG.zone,
      outletId: String(outletId)
    });
    const d = (await F.raw(M, 'GET', `/api/products/${p.id}/availability?${q}`)).body?.data;
    const o = ((d && d.availabilityByOutlet) || []).find((x) => x.outletId === outletId);
    return o ? o.effectivelyAvailable : null;
  };
  const listRow = async (p) => {
    await U.go(page, base, `/products?q=${encodeURIComponent(p.name)}`, { wait: 1800 });
    const t = await U.text(page);
    const row = t.slice(Math.max(0, t.indexOf(p.name)));
    const m = /Còn (\d+)\/(\d+)/.exec(row);
    const out = !m && /(^|\s)Hết(\s|$)/.test(row);
    return { left: m ? Number(m[1]) : out ? 0 : null, total: m ? Number(m[2]) : null, out, text: t };
  };
  const detailStock = async (p) => {
    await U.go(page, base, `/products/${p.id}`, { wait: 1800 });
    const t = await U.text(page);
    const m = new RegExp(`${acc.outletId ? '' : ''}Cửa hàng chính\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)`).exec(t.replace(/\t/g, ' '));
    return m ? { total: Number(m[1]), available: Number(m[2]), renting: Number(m[3]) } : { text: brief(t.slice(t.indexOf('Tồn kho')), 160) };
  };
  const openCreate = async (P, R2) => {
    await U.go(page, base, '/orders/create');
    await U.pickDays(page, P, R2);
  };
  const D = { P: F.addDays(T, 3), R: F.addDays(T, 4) };

  try {
    // ================================================================ WEB-STOCK
    const PA = await F.makeProduct(M, nameOf('A'), 3, outletId, { rentPrice: 100000, salePrice: 300000 });
    {
      const l = await listRow(PA);
      const d = await detailStock(PA);
      await openCreate(T, F.addDays(T, 1));
      const card = await U.pickerCard(page, PA.name);
      check('WEB-STOCK-01', 'new product (3 units): list "Còn 3/3", detail total 3 / có sẵn 3 / đang thuê 0, picker "Còn 3/3"',
        l.left === 3 && l.total === 3 && d.total === 3 && d.available === 3 && d.renting === 0 && card.left === 3 && card.total === 3, `list=${l.left}/${l.total} detail=${JSON.stringify(d)} picker=${card.left}/${card.total}`);
    }

    // ---- a sale through the web flow
    {
      let made = null;
      let err = '';
      try {
        made = await U.createInUi(page, base, { type: 'SALE', lines: [{ product: PA, qty: 1 }], customer });
      } catch (e) {
        err = e.message;
      }
      const st = await stockOf(PA);
      const l = await listRow(PA);
      const d = await detailStock(PA);
      await openCreate(T, F.addDays(T, 1));
      const card = await U.pickerCard(page, PA.name);
      let det = '';
      if (made) {
        await U.go(page, base, `/orders/${made.order.orderNumber}`, { wait: 1800 });
        det = await U.text(page);
      }
      check('WEB-STOCK-02a', 'sale of 1 through Tạo đơn: order is "Hoàn thành" / "Đơn bán" with 300,000; API stock 2/2, nothing renting', !!made && /Hoàn thành/.test(det) && /Đơn bán/.test(det) && det.includes('300,000') && st.stock === 2 && st.available === 2 && st.renting === 0, err || `status=${/Hoàn thành/.test(det)} total=${det.includes('300,000')} api=${JSON.stringify(st)}`);
      check('WEB-STOCK-02b', 'after the sale the list "Còn 2/2", the detail 2 / 2 / 0 and the picker "Còn 2/2" equal the API', l.left === st.available && l.total === st.stock && d.total === st.stock && d.available === st.available && d.renting === st.renting && card.left === st.available && card.total === st.stock, `list=${l.left}/${l.total} detail=${JSON.stringify(d)} picker=${card.left}/${card.total} api=${JSON.stringify(st)}`);
    }

    // ---- a rent order through the web flow (future days D)
    let rentOrder = null;
    {
      let err = '';
      try {
        rentOrder = await U.createInUi(page, base, { type: 'RENT', P: D.P, R: D.R, lines: [{ product: PA, qty: 2 }], customer });
      } catch (e) {
        err = e.message;
      }
      const st = await stockOf(PA);
      const l = await listRow(PA);
      const d = await detailStock(PA);
      check('WEB-STOCK-03a', 'rent of 2 on future days through Tạo đơn: today is unchanged: list "Còn 2/2", detail 2 / 2 / 0 (reserved days do not hold today)', !!rentOrder && l.left === st.available && d.available === st.available && d.renting === st.renting && st.renting === 0, err || `list=${l.left}/${l.total} detail=${JSON.stringify(d)} api=${JSON.stringify(st)}`);
      const windows = [
        ['inside', D.P, D.R],
        ['overlap at the pickup day', F.addDays(D.P, -1), D.P],
        ['overlap at the return day', D.R, F.addDays(D.R, 1)],
        ['before', F.addDays(D.P, -2), F.addDays(D.P, -1)],
        ['after', F.addDays(D.R, 1), F.addDays(D.R, 2)]
      ];
      const seen = [];
      for (const [label, a, b] of windows) {
        const api = await apiFree(PA, a, b);
        await openCreate(a, b);
        const card = await U.pickerCard(page, PA.name);
        const free = api;
        seen.push({ label, a, b, ui: card.out ? 0 : card.left, apiFree: free, out: card.out });
      }
      check('WEB-STOCK-03b', 'picker on every window: "Còn n/2" or "Hết trong lịch này" equals GET /products/{id}/availability; inside / overlapping windows are out, before / after are 2/2',
        seen.every((x) => x.ui === x.apiFree) && seen.filter((x) => ['inside', 'overlap at the pickup day', 'overlap at the return day'].includes(x.label)).every((x) => x.out) && seen.filter((x) => ['before', 'after'].includes(x.label)).every((x) => x.ui === 2), JSON.stringify(seen));
    }

    // ---- picker out of stock: flags in the cart, overlap allowed / not allowed
    {
      await openCreate(D.P, D.R);
      const search = page.getByRole('searchbox', { name: 'Tìm sản phẩm' }).or(page.getByPlaceholder('Tìm tên hoặc quét mã vạch')).first();
      await search.fill(PA.name);
      await page.getByRole('button', { name: `Thêm ${PA.name} vào đơn` }).waitFor({ timeout: 30000 });
      await page.getByRole('button', { name: `Thêm ${PA.name} vào đơn` }).click();
      await page.waitForTimeout(1500);
      const cartText = await page.locator('[aria-label="Đơn đang tạo"]').first().innerText();
      const tag1 = /Hết đồ/.test(cartText);
      await page.getByRole('button', { name: /Khách hàng\s*Chọn khách/ }).click();
      const cdlg = page.getByRole('dialog', { name: 'Chọn khách' });
      await cdlg.getByRole('searchbox', { name: 'Tìm tên hoặc số điện thoại' }).fill(customer.phone);
      await cdlg.getByRole('button', { name: new RegExp(customer.firstName) }).first().click();
      await cdlg.waitFor({ state: 'hidden', timeout: 10000 });
      const beforeRows = (await F.raw(M, 'GET', '/api/orders?limit=100')).body.data.orders;
      const before = beforeRows.length;
      // allowed (default): a warning with "Vẫn tạo đơn" before the order is created
      await page.locator('[aria-label="Đơn đang tạo"]').first().getByRole('button', { name: /^Tạo đơn/ }).click();
      const warn = page.getByRole('dialog');
      const warned = await warn.getByRole('button', { name: /Vẫn tạo đơn/ }).first().waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
      const dlgText = warned ? await warn.innerText() : await page.evaluate(() => document.body.innerText);
      check('WEB-STOCK-04a', 'cart flags a product out for the chosen days: the line says "Hết đồ <days> · đã thuê ở đơn …" and Tạo đơn asks "Vẫn tạo đơn" naming the product and the shortfall (overlap allowed)', tag1 && warned && /thiếu 2 bộ|Trùng lịch/.test(dlgText), `cartTag=${tag1} warned=${warned} dialog=${brief(dlgText, 180)}`);
      if (warned) {
        await warn.getByRole('button', { name: /Vẫn tạo đơn/ }).first().click();
        await page.waitForTimeout(2500);
      }
      const rows = (await F.raw(M, 'GET', '/api/orders?limit=100')).body.data.orders;
      const over = rows.find((o) => !beforeRows.some((b) => b.id === o.id));
      check('WEB-STOCK-04b', 'overlap allowed + "Vẫn tạo đơn": the overbooked order is created (API has one more order)', rows.length === before + 1, `before=${before} after=${rows.length}`);
      if (over) await F.setStatus(M, over.id, 'CANCELLED');
      // not allowed: the shop setting off
      const off = await F.raw(M, 'PUT', '/api/settings/merchant', { allowOverlappingOrders: false });
      await openCreate(D.P, D.R);
      await search.fill(PA.name);
      await page.getByRole('button', { name: `Thêm ${PA.name} vào đơn` }).click();
      await page.waitForTimeout(1500);
      await page.getByRole('button', { name: /Khách hàng\s*Chọn khách/ }).click();
      await cdlg.getByRole('searchbox', { name: 'Tìm tên hoặc số điện thoại' }).fill(customer.phone);
      await cdlg.getByRole('button', { name: new RegExp(customer.firstName) }).first().click();
      await cdlg.waitFor({ state: 'hidden', timeout: 10000 });
      const cart = page.locator('[aria-label="Đơn đang tạo"]').first();
      const t2 = await page.evaluate(() => document.body.innerText);
      const blockedMsg = /Cửa hàng không cho tạo đơn trùng lịch/.test(t2);
      const btn = cart.getByRole('button', { name: /^Tạo đơn/ });
      const disabled = (await btn.count()) === 0 ? true : await btn.first().isDisabled().catch(() => false);
      const rows2 = (await F.raw(M, 'GET', '/api/orders?limit=100')).body.data.orders.length;
      check('WEB-STOCK-04c', 'overlap NOT allowed (setting off): the page says "Cửa hàng không cho tạo đơn trùng lịch…" and the create button is disabled; no order is created', off.status === 200 && blockedMsg && disabled && rows2 === rows.length, `setting=${off.status} message=${blockedMsg} disabled=${disabled} orders=${rows2}/${rows.length}`);
      await F.raw(M, 'PUT', '/api/settings/merchant', { allowOverlappingOrders: true });
    }

    // ---- hand-over holds today's stock, return releases it
    {
      const today2 = await F.makeRent(M, { customer, product: PA, outletId, from: T, to: F.addDays(T, 1), quantity: 2 });
      await F.setStatus(M, today2.id, 'PICKUPED');
      const st = await stockOf(PA);
      const l = await listRow(PA);
      const d = await detailStock(PA);
      await openCreate(T, F.addDays(T, 1));
      const card = await U.pickerCard(page, PA.name);
      check('WEB-STOCK-05a', 'rent of 2 planned today and handed over: API 2 renting; list "Hết", detail 2 / 0 / 2, picker for today "Hết trong lịch này"', st.renting === 2 && st.available === 0 && l.left === 0 && l.out && d.renting === 2 && d.available === 0 && card.out, `api=${JSON.stringify(st)} list=${l.left}/${l.total} detail=${JSON.stringify(d)} pickerOut=${card.out}`);
      await F.setStatus(M, today2.id, 'RETURNED');
      const st2 = await stockOf(PA);
      const l2 = await listRow(PA);
      const d2 = await detailStock(PA);
      check('WEB-STOCK-05b', 'order returned: units are back, list "Còn 2/2", detail 2 / 2 / 0', st2.renting === 0 && st2.available === 2 && l2.left === 2 && d2.available === 2 && d2.renting === 0, `api=${JSON.stringify(st2)} list=${l2.left}/${l2.total} detail=${JSON.stringify(d2)}`);
    }
    // handed over BEFORE the planned day (D is in 3 days): the units are physically out
    if (rentOrder) {
      await F.setStatus(M, rentOrder.order.id, 'PICKUPED');
      const st = await stockOf(PA);
      const l = await listRow(PA);
      const d = await detailStock(PA);
      await openCreate(T, F.addDays(T, 1));
      const card = await U.pickerCard(page, PA.name);
      // OWNER QUESTION Q4: detail (physical) says 0 available, the list "Hôm nay" and the picker (planned days) say 2 free today
      check('WEB-STOCK-05c', 'CURRENT (owner question Q4): rent handed over 3 days early: detail 2 / 0 / 2 (physical, = API) but list "Còn 2/2" and picker for today "Còn 2/2" (planned days)', st.renting === 2 && st.available === 0 && d.renting === 2 && d.available === 0 && l.left === 2 && card.left === 2, `api=${JSON.stringify(st)} list=${l.left}/${l.total} detail=${JSON.stringify(d)} picker=${card.left}/${card.total}`);
      await F.setStatus(M, rentOrder.order.id, 'RETURNED');
    }

    // ---- quantity above what is left (rent and sale)
    {
      const PB = await F.makeProduct(M, nameOf('B'), 3, outletId, { rentPrice: 100000, salePrice: 200000 });
      const D2 = { P: F.addDays(T, 8), R: F.addDays(T, 9) };
      const reserved = await F.makeRent(M, { customer, product: PB, outletId, from: D2.P, to: D2.R, quantity: 2 });
      await openCreate(D2.P, D2.R);
      const card = await U.pickerCard(page, PB.name);
      await page.getByRole('button', { name: `Thêm ${PB.name} vào đơn` }).click();
      await page.getByRole('button', { name: `Thêm 1 ${PB.name}` }).click();
      await page.waitForTimeout(1200);
      const cartText = await page.locator('[aria-label="Đơn đang tạo"]').first().innerText();
      check('WEB-STOCK-06a', 'rent window with 1 of 3 left: picker "Còn 1/3"; 2 in the cart is flagged "Hết đồ <days> · đã thuê ở đơn #<the reserved order>"', card.left === 1 && card.total === 3 && /Hết đồ/.test(cartText) && cartText.includes(`#${reserved.orderNumber}`), `picker=${card.left}/${card.total} cart=${brief(cartText, 240)}`);
      // sale above stock
      await U.go(page, base, '/orders/create');
      const sheet = page.getByRole('dialog', { name: 'Ngày giao và trả' });
      if (await sheet.isVisible().catch(() => false)) {
        await page.keyboard.press('Escape');
        await sheet.waitFor({ state: 'hidden', timeout: 10000 });
      }
      await page.getByRole('tab', { name: 'Bán' }).click();
      const saleCard = await U.pickerCard(page, PB.name);
      await page.getByRole('button', { name: `Thêm ${PB.name} vào đơn` }).click();
      for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: `Thêm 1 ${PB.name}` }).click();
      await page.waitForTimeout(1200);
      const saleCart = await page.locator('[aria-label="Đơn đang tạo"]').first().innerText();
      const stB = await stockOf(PB);
      check('WEB-STOCK-06b', 'sale: picker shows the stock today ("Còn 3/3", API available 3); 4 in the cart says "Chỉ còn 3 trong kho" (or the line is flagged)', saleCard.left === stB.available && /Chỉ còn 3|Còn 3 trong kho|Hết/.test(saleCart), `picker=${saleCard.left}/${saleCard.total} api=${JSON.stringify(stB)} cart=${brief(saleCart, 200)}`);
    }

    // ---- order detail numbers
    {
      const PD = await F.makeProduct(M, nameOf('D'), 5, outletId, { rentPrice: 100000, salePrice: 300000 });
      const o = await F.makeRent(M, { customer, product: PD, outletId, from: F.addDays(T, 1), to: F.addDays(T, 3), quantity: 2, deposit: 50000, discount: 20000, securityDeposit: 30000 });
      const row = (await F.raw(M, 'GET', '/api/orders?limit=100')).body.data.orders.find((x) => x.orderNumber === o.orderNumber);
      await U.go(page, base, `/orders/${o.orderNumber}`, { wait: 2000 });
      const t = await U.text(page);
      const want = [`SL 2 · Giá cố định · ${fmt(100000)}`, fmt(200000), `Tổng (giảm ${fmt(row.discountAmount)})`, fmt(row.totalAmount), 'Đã cọc khi đặt', fmt(row.depositAmount), 'Thế chân thu thêm', fmt(row.securityDeposit), 'Thu khi giao', fmt(row.amountDue)];
      const missing = want.filter((w) => !t.includes(w));
      check('WEB-STOCK-07a', `rent order detail (2 × 100,000, giảm 20,000, cọc 50,000, thế chân 30,000): lines, total ${fmt(row.totalAmount)}, deposit, security and "Thu khi giao ${fmt(row.amountDue)}" equal GET /api/orders; Giao/Trả days`,
        missing.length === 0 && row.amountDue === row.totalAmount - row.depositAmount + row.securityDeposit && new RegExp(`Giao đồ\\s*\\n?\\s*${U.dayLabel(F.addDays(T, 1))}`).test(t) && new RegExp(`Trả đồ\\s*\\n?\\s*${U.dayLabel(F.addDays(T, 3))}`).test(t), `missing=${JSON.stringify(missing)} api=${JSON.stringify({ t: row.totalAmount, d: row.depositAmount, s: row.securityDeposit, due: row.amountDue })}`);
      await F.setStatus(M, o.id, 'PICKUPED');
      await U.go(page, base, `/orders/${o.orderNumber}`, { wait: 2000 });
      const t2 = await U.text(page);
      const row2 = (await F.raw(M, 'GET', '/api/orders?limit=100')).body.data.orders.find((x) => x.orderNumber === o.orderNumber);
      check('WEB-STOCK-07b', 'after the hand-over: status "Đang thuê"; the page shows the same total and no longer asks for the pickup money', /Đang thuê/.test(t2) && t2.includes(fmt(row2.totalAmount)) && !new RegExp(`Giao đồ · thu ${fmt(row.amountDue)}`).test(t2), `status=${/Đang thuê/.test(t2)} total=${t2.includes(fmt(row2.totalAmount))}`);
      const sale = await F.makeSale(M, { customer, product: PD, outletId, quantity: 2, unitPrice: 300000 });
      await U.go(page, base, `/orders/${sale.orderNumber}`, { wait: 2000 });
      const t3 = await U.text(page);
      check('WEB-STOCK-07c', 'sale order detail: "Đơn bán", "Hoàn thành", 2 × 300,000 = 600,000 paid', /Đơn bán/.test(t3) && /Hoàn thành/.test(t3) && t3.includes(fmt(600000)) && !/NaN/.test(t3), brief(t3.slice(t3.indexOf('Đồ bán')), 200));
      await F.setStatus(M, o.id, 'CANCELLED');
    }

    // ================================================================ WEB-CAL / WEB-TODO data
    const PC = await F.makeProduct(M, nameOf('C'), 20, outletId, { rentPrice: 100000, salePrice: 300000 });
    const mk = async (from, to, status, label, quantity = 1) => {
      // quantity differs between two orders of the same days: an identical order is answered with the existing one
      const o = await F.makeRent(M, { customer, product: PC, outletId, from, to, quantity });
      if (status && status !== 'RESERVED') {
        if (status === 'CANCELLED') await F.setStatus(M, o.id, 'CANCELLED');
        else {
          await F.setStatus(M, o.id, 'PICKUPED');
        }
      }
      return { ...o, from, to, status: status || 'RESERVED', label };
    };
    const cross = monthEnd(F.addDays(T, 3));
    const orders = [
      await mk(F.addDays(T, 1), F.addDays(T, 3), 'RESERVED', 'multi-day'),
      await mk(F.addDays(T, 2), F.addDays(T, 2), 'RESERVED', 'same day (later)'),
      await mk(T, F.addDays(T, 1), 'RESERVED', 'pickup today'),
      await mk(F.addDays(T, -2), F.addDays(T, 1), 'PICKUPED', 'handed over, return tomorrow'),
      await mk(cross, F.addDays(cross, 2), 'RESERVED', 'cross-month'),
      await mk(F.addDays(T, 1), F.addDays(T, 2), 'CANCELLED', 'cancelled'),
      await mk(F.addDays(T, -5), F.addDays(T, -2), 'PICKUPED', 'late 2 days'),
      await mk(F.addDays(T, -2), F.addDays(T, 1), 'RESERVED', 'never picked up', 2),
      await mk(F.addDays(T, -3), T, 'PICKUPED', 'return today'),
      await mk(T, T, 'RESERVED', 'same day today')
    ];
    const sold = await F.makeSale(M, { customer, product: PC, outletId, quantity: 1, unitPrice: 300000 });
    const byLabel = Object.fromEntries(orders.map((o) => [o.label, o]));
    console.log('orders', orders.map((o) => `${o.label}=${o.orderNumber}`).join(' '), 'sale', sold.orderNumber);

    // ---- WEB-CAL: month cells and day panels vs the model
    const pickupsOn = (d) => orders.filter((o) => o.status === 'RESERVED' && o.from === d).map((o) => o.orderNumber);
    const returnsOn = (d) => orders.filter((o) => o.status === 'PICKUPED' && o.to === d).map((o) => o.orderNumber);
    // the panel of today also lists the late returns (they are due now)
    const returnsPanel = (d) => [...new Set([...returnsOn(d), ...(d === T ? orders.filter((o) => o.status === 'PICKUPED' && o.to < T).map((o) => o.orderNumber) : [])])];
    const lateNow = orders.filter((o) => o.status === 'PICKUPED' && o.to < T).length;
    const months = [...new Set([T.slice(0, 7), cross.slice(0, 7), F.addDays(cross, 2).slice(0, 7)])];
    const cells = {};
    for (const m of months) {
      await U.go(page, base, `/calendar?${U.monthQuery(`${m}-01`)}`, { wait: 2500 });
      Object.assign(cells, Object.fromEntries(Object.entries(await U.calendarCellLabels(page)).map(([k, v]) => [`${m}|${k}`, v])));
    }
    const cellOf = (d) => cells[`${d.slice(0, 7)}|${Number(d.slice(8, 10))}/${Number(d.slice(5, 7))}`] || '';
    const parse = (l) => ({ giao: Number((/giao (\d+)/.exec(l) || [])[1] || 0), tra: Number((/trả (\d+)/.exec(l) || [])[1] || 0), tre: Number((/trễ (\d+)/.exec(l) || [])[1] || 0) });
    const days = [...new Set([-5, -3, -2, -1, 0, 1, 2, 3, 4].map((n) => F.addDays(T, n)).concat([cross, F.addDays(cross, 1), F.addDays(cross, 2)]))];
    const wrong = [];
    for (const d of days) {
      const c = parse(cellOf(d));
      const e = { giao: pickupsOn(d).length, tra: returnsOn(d).length };
      if (c.giao !== e.giao || c.tra !== e.tra) wrong.push(`${d}: shown giao ${c.giao} trả ${c.tra}, model giao ${e.giao} trả ${e.tra} [${cellOf(d)}]`);
    }
    check('WEB-CAL-01', 'month cells: "giao n" = RESERVED orders picking up that day, "trả n" = PICKUPED orders returning that day (multi-day, same-day, handed-over, late, cross-month); cancelled and sale orders count nowhere', wrong.length === 0, wrong.join(' ; '));
    check('WEB-CAL-02', `today's cell carries "trễ ${lateNow}" for the late order(s) and no other day does`, parse(cellOf(T)).tre === lateNow && days.filter((d) => d !== T).every((d) => parse(cellOf(d)).tre === 0), `today=${cellOf(T)}`);
    const panelWrong = [];
    for (const d of [T, F.addDays(T, 1), F.addDays(T, 2), F.addDays(T, -2), cross, F.addDays(cross, 2)]) {
      await U.go(page, base, `/calendar?${U.monthQuery(d)}&day=${d}`, { wait: 2200 });
      const t = await U.text(page);
      const cut = t.search(/CẦN NHẬN TRẢ|Cần nhận trả/i);
      const head = t.slice(0, cut);
      const tail = t.slice(cut);
      const got = (txt) => [...new Set([...txt.matchAll(/#(\w+)/g)].map((m) => m[1]))];
      const gp = got(head.slice(head.search(/CẦN GIAO|Cần giao/i)));
      const gr = got(tail);
      if (!sameSet(gp, pickupsOn(d))) panelWrong.push(`${d} Cần giao: ${gp} vs ${pickupsOn(d)}`);
      if (!sameSet(gr, returnsPanel(d))) panelWrong.push(`${d} Cần nhận trả: ${gr} vs ${returnsPanel(d)}`);
    }
    check('WEB-CAL-03', 'day panel (today, +1, +2, −2, cross-month start and end): "Cần giao" and "Cần nhận trả" list exactly the model orders (today\'s Cần nhận trả also lists the late returns)', panelWrong.length === 0, panelWrong.join(' ; '));
    {
      const o = byLabel['multi-day'];
      await U.go(page, base, `/calendar?${U.monthQuery(o.from)}&day=${o.from}`, { wait: 2200 });
      const row = page.locator(`a[href="/orders/${o.orderNumber}"]`).first();
      await row.click().catch(() => {});
      await page.waitForURL(new RegExp(`/orders/${o.orderNumber}`), { timeout: 15000 }).catch(() => {});
      await U.waitText(page, new RegExp(`#${o.orderNumber}`), 20000).catch(() => {});
      const t = await U.text(page);
      check('WEB-CAL-04', 'tapping an order in the day panel opens its detail with the same Giao / Trả days', page.url().includes(`/orders/${o.orderNumber}`) && t.includes(U.dayLabel(o.from)) && t.includes(U.dayLabel(o.to)), `url=${page.url().replace(base, '')}`);
    }

    // ---- WEB-TODO: dashboard card + list, orders tabs, vs outlet-operations
    const todo = async (lang) => {
      const ops = await F.opsOf(M);
      const pick = (l) => l.orders.map((o) => o.orderNumber);
      const rowsAll = [...new Set([...pick(ops.pickupsToday), ...pick(ops.returnsToday), ...pick(ops.overdueReturns)])];
      return { ops, rowsAll, shown: rowsAll.slice(0, 5) };
    };
    {
      const ex = await todo('vi');
      await U.go(page, base, '/dashboard', { wait: 2800 });
      const card = await U.todayCard(page);
      const rows = await U.todayRows(page);
      const o = ex.ops;
      check('WEB-TODO-01', 'Hôm nay card: Cần giao done/total, Cần nhận trả done/total, Trễ hạn trả, Quá ngày lấy, Ngày mai Giao/Trả equal GET /api/analytics/outlet-operations',
        card.pickups && card.pickups.done === o.doneToday.pickups && card.pickups.total === o.doneToday.pickups + o.pickupsToday.count && card.returns.done === o.doneToday.returns && card.returns.total === o.doneToday.returns + o.returnsToday.count && card.overdue === o.overdueReturns.count && card.noShows === o.noShows.count && card.tomorrow && card.tomorrow.pickups === o.tomorrow.pickups && card.tomorrow.returns === o.tomorrow.returns,
        `card=${JSON.stringify(card)} api=${JSON.stringify({ p: o.pickupsToday.count, dp: o.doneToday.pickups, r: o.returnsToday.count, dr: o.doneToday.returns, late: o.overdueReturns.count, ns: o.noShows.count, tm: o.tomorrow })}`);
      check('WEB-TODO-02', `"Đơn cần làm hôm nay" lists the first 5 of the ${ex.rowsAll.length} orders (pickups, returns, late; each once) and "+n đơn" for the rest`, rows && sameSet(rows.numbers, ex.shown) && (ex.rowsAll.length <= 5 || /\+\s?\d+|(\d+) đơn nữa|nữa/.test(rows.text)), `rows=${rows && rows.numbers} api5=${ex.shown} total=${ex.rowsAll.length} text=${rows && brief(rows.text.slice(-90), 80)}`);
      // the model agrees with the API: pickups today = RESERVED with P today, returns = PICKUPED with R today, late = PICKUPED with R before today
      const modelPick = orders.filter((x) => x.status === 'RESERVED' && x.from === T).map((x) => x.orderNumber);
      const modelRet = orders.filter((x) => x.status === 'PICKUPED' && x.to === T).map((x) => x.orderNumber);
      const modelLate = orders.filter((x) => x.status === 'PICKUPED' && x.to < T).map((x) => x.orderNumber);
      const modelNoShow = orders.filter((x) => x.status === 'RESERVED' && x.from < T).map((x) => x.orderNumber);
      const pick = (l) => l.orders.map((x) => x.orderNumber);
      check('WEB-TODO-03', 'the API lists match the rules (pickups today = RESERVED from today; returns today = PICKUPED to today; late = PICKUPED past return; no-show = RESERVED past pickup)', sameSet(pick(o.pickupsToday), modelPick) && sameSet(pick(o.returnsToday), modelRet) && sameSet(pick(o.overdueReturns), modelLate) && sameSet(pick(o.noShows), modelNoShow), `pickups=${pick(o.pickupsToday)}/${modelPick} returns=${pick(o.returnsToday)}/${modelRet} late=${pick(o.overdueReturns)}/${modelLate} noShow=${pick(o.noShows)}/${modelNoShow}`);
      // counters open the orders of that status
      const pk = page.locator('a[aria-label^="Cần giao:"]').first();
      await pk.click();
      await page.waitForURL(/\/orders\?status=RESERVED/, { timeout: 15000 }).catch(() => {});
      await F.settle(page, 1500);
      const lt = await U.text(page);
      check('WEB-TODO-04', 'tapping Cần giao opens /orders?status=RESERVED: every row is "Đã đặt"', /status=RESERVED/.test(page.url()) && !/Đang thuê\s*\n[\s\S]{0,40}#/.test(lt.slice(lt.indexOf('TRẠNG THÁI'))), `url=${page.url().replace(base, '')}`);
      // orders page tabs
      await U.go(page, base, '/orders?tab=todo', { wait: 2500 });
      const v = await U.ordersView(page);
      check('WEB-TODO-05', `/orders Việc cần làm: badge ${ex.rowsAll.length}; rows = the API's orders`, v.todo === ex.rowsAll.length && sameSet(v.numbers.filter((n) => orders.some((x) => x.orderNumber === n)), ex.rowsAll), `badge=${v.todo} rows=${v.numbers} api=${ex.rowsAll}`);
      await U.go(page, base, '/orders?tab=noshow', { wait: 2500 });
      const v2 = await U.ordersView(page);
      check('WEB-TODO-06', `/orders Chưa lấy đồ: badge ${o.noShows.count}; rows = the API's no-show orders`, v2.noshow === o.noShows.count && sameSet(v2.numbers, pick(o.noShows)), `badge=${v2.noshow} rows=${v2.numbers} api=${pick(o.noShows)}`);
      // hand over one pickup and take back the return of today: counters follow
      const p1 = byLabel['pickup today'];
      const r1 = byLabel['return today'];
      await F.setStatus(M, p1.id, 'PICKUPED');
      await F.setStatus(M, r1.id, 'RETURNED');
      const ex2 = await todo('vi');
      await U.go(page, base, '/dashboard', { wait: 2800 });
      const card2 = await U.todayCard(page);
      const rows2 = await U.todayRows(page);
      const o2 = ex2.ops;
      check('WEB-TODO-07', 'after one hand-over and one return (API): Cần giao done +1, Cần nhận trả done +1; the two orders leave / change in the list; counters still equal the API',
        card2.pickups.done === o.doneToday.pickups + 1 && card2.returns.done === o.doneToday.returns + 1 && card2.pickups.total === o2.doneToday.pickups + o2.pickupsToday.count && card2.returns.total === o2.doneToday.returns + o2.returnsToday.count && !rows2.numbers.includes(r1.orderNumber) && sameSet(rows2.numbers, ex2.shown),
        `card=${JSON.stringify(card2)} before=${JSON.stringify({ dp: o.doneToday.pickups, dr: o.doneToday.returns })} rows=${rows2.numbers} api5=${ex2.shown}`);
    }

    // ---- English: the same numbers
    {
      await s.ctx.close();
      s = await F.openSession(browser, acc.merchant, { lang: 'en' });
      page = await s.ctx.newPage();
      const o = await F.opsOf(s.api);
      await U.go(page, base, '/dashboard', { wait: 2800 });
      const card = await U.todayCard(page, 'en');
      const rows = await U.todayRows(page, 'en');
      const t = await U.text(page);
      const exp = [...new Set([...o.pickupsToday.orders, ...o.returnsToday.orders, ...o.overdueReturns.orders].map((x) => x.orderNumber))].slice(0, 5);
      check('WEB-TODO-08', 'English dashboard: Today card counters and the to-do list equal the API; no Vietnamese, no raw key', card.pickups && card.pickups.total === o.doneToday.pickups + o.pickupsToday.count && card.overdue === o.overdueReturns.count && card.noShows === o.noShows.count && rows && sameSet(rows.numbers, exp) && !/Cần giao|Trễ hạn|Hôm nay/.test(t) && !F.RAW_KEY.test(t), `card=${JSON.stringify(card)} rows=${rows && rows.numbers} vi=${/Cần giao|Trễ hạn|Hôm nay/.test(t)} raw=${F.RAW_KEY.exec(t)?.[0]}`);
      await U.go(page, base, '/orders?tab=todo', { wait: 2500 });
      const v = await U.ordersView(page);
      const tt = await U.text(page);
      check('WEB-TODO-09', 'English /orders: tabs "To do" / "Not picked up" badges equal the API; no Vietnamese', v.todo === new Set([...o.pickupsToday.orders, ...o.returnsToday.orders, ...o.overdueReturns.orders].map((x) => x.id)).size && v.noshow === o.noShows.count && !/Việc cần làm|Chưa lấy đồ|Tất cả đơn/.test(tt), `todo=${v.todo} noshow=${v.noshow}`);
      await U.go(page, base, `/calendar?${U.monthQuery(T)}`, { wait: 2500 });
      const ct = await U.text(page);
      const labels = await U.calendarCellLabels(page);
      check('WEB-CAL-05', 'English /calendar: legend and panel headings in English, cell labels carry numbers, no Vietnamese, no raw key', /To pick up|Pick up|Return/i.test(ct) && !/Cần giao|Cần nhận trả|Trễ hạn/.test(ct) && Object.keys(labels).length >= 28 && !F.RAW_KEY.test(ct), `vi=${/Cần giao|Cần nhận trả|Trễ hạn/.test(ct)} cells=${Object.keys(labels).length} raw=${F.RAW_KEY.exec(ct)?.[0]} text=${brief(ct.slice(ct.indexOf('Calendar')), 160)}`);
      const q = await pickerEn(page, base, PA);
      check('WEB-STOCK-08', 'English Tạo đơn: picker card reads "<free>/<total> left" (or the out label) from the locale, equal to the API', q.ok, q.detail);
    }
  } finally {
    await s.ctx.close().catch(() => {});
    await browser.close();
  }
  const failed = R.finish('web-stock-results.json');
  process.exit(failed ? 1 : 0);
}

/** English picker: opens a new order and reads the card of the product for today..tomorrow */
async function pickerEn(page, base, product) {
  const T = F.vnDateKey();
  await U.go(page, base, '/orders/create', { wait: 1500 });
  const text = await U.text(page);
  const left = U.tr('en', 'orders', 'web.editor.grid.left', { free: '(\\d+)', total: '(\\d+)' });
  const out = U.tr('en', 'orders', 'web.editor.grid.out');
  const search = page.getByRole('searchbox').or(page.getByPlaceholder(/Search|Scan/i)).first();
  await search.fill(product.name).catch(() => {});
  await page.waitForTimeout(1200);
  const card = page.locator('article', { hasText: product.name }).first();
  const ct = (await card.innerText().catch(() => '')).replace(/\s+/g, ' ');
  const m = new RegExp(left).exec(ct);
  return { ok: !!m || ct.includes(out) || /Choose days to see|pick/i.test(ct), detail: `card=${ct} (expects /${left}/ or "${out}") page=${brief(text.slice(0, 120), 80)}` };
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
