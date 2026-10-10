#!/usr/bin/env node
/**
 * WEB-UI-ORD: the shop-web order screens driven as a person does (list, search, filters, pagination, Tạo đơn rent and
 * sale, Chi tiết đơn actions, Sửa đơn, hoá đơn), then read back through the API. Catalogue: tests/e2e/TEST_CASES.md (WEB-UI).
 * Every order the run creates is cancelled at the end; products and customers carry a unique name.
 * Run: scripts/e2e/web-e2e.sh --ui orders
 */
const H = require('./ui-helpers');
const F = require('./ui-order-flow');
const { CFG } = H;
const { vnDateKey, addDays } = require('./web-api');

/** Checks that fail on purpose until the named issue is fixed ("<check name>": '#N') */
const KNOWN = {};

/** 00:00 Vietnam of a day key as an ISO instant (what the web sends) */
const dayIso = (key) => new Date(`${key}T00:00:00+07:00`).toISOString();
const qs = (o) => new URLSearchParams(o).toString();

async function main() {
  const rec = H.recorder(KNOWN);
  const { check } = rec;
  const shot = H.shotter();
  const api = await H.apiLogin();
  const outletId = await api.defaultOutletId();
  const today = vnDateKey();
  const created = []; // order ids to cancel at the end
  const tag = H.uniq('UIO');

  // ---------------------------------------------------------------- fixtures (API)
  const prodA = await api.createProduct(`${tag} Áo A`, 10, outletId);
  const prodB = await api.createProduct(`${tag} Váy B`, 10, outletId);
  const accentName = `Nguyễn${tag.slice(-4)}`;
  const cusA = (await api.call('POST', '/api/customers', { firstName: accentName, lastName: 'Văn Ơn', phone: `09${String(Date.now()).slice(-8)}` }));
  const custA = cusA.customer || cusA;
  const custB = await api.createCustomer(`Bình${tag.slice(-4)}`);

  const apiOrder = async ({ type = 'RENT', P, R, product = prodA, qty = 1, price = 100000, customer = custA, deposit = 0, discount = 0, notes = '' }) => {
    const subtotal = price * qty;
    const body = {
      orderType: type,
      customerId: customer.id,
      outletId,
      subtotal,
      taxAmount: 0,
      discountType: 'amount',
      discountValue: discount,
      discountAmount: discount,
      depositAmount: deposit,
      securityDeposit: 0,
      totalAmount: subtotal - discount,
      notes,
      orderItems: [{ productId: product.id, quantity: qty, unitPrice: price, totalPrice: subtotal, deposit: 0, notes: '', rentDays: 1, ...(type === 'RENT' ? { pricingType: 'FIXED' } : {}) }]
    };
    if (type === 'RENT') Object.assign(body, { pickupPlanAt: dayIso(P), returnPlanAt: dayIso(R) });
    const o = await api.call('POST', '/api/orders', body);
    created.push(o.id);
    return o;
  };
  const getOrder = (idOrNumber) => api.get(`/api/orders/${idOrNumber}`);

  const browser = await H.launch();
  const ctx = await H.openSession({ browser, api });
  api.onRelogin = async () => {};
  const page = await ctx.newPage();
  const st = H.collect(page);
  const sp = { page, rec, shot };
  const rows = () => page.locator('table tbody tr');

  try {
    // ---- seed a few orders the list cases read
    const oRes = await apiOrder({ P: addDays(today, 1), R: addDays(today, 2), deposit: 30000, qty: 1 });
    const oPick = await apiOrder({ P: today, R: addDays(today, 1), customer: custB, product: prodB, qty: 2, price: 80000 });
    const oSale = await apiOrder({ type: 'SALE', product: prodB, qty: 1, price: 50000, customer: custB });

    // ================================================================ list
    await H.runCase('WEB-UI-ORD-01', 'orders list renders: tabs, status counts = API, no raw keys', async () => {
      st.reset();
      await F.go(page, '/orders');
      const t = await H.bodyText(page);
      check('ORD-01 tabs Việc cần làm / Tất cả đơn / Chưa lấy đồ', /Việc cần làm/.test(t) && /Tất cả đơn/.test(t) && /Chưa lấy đồ/.test(t), t.slice(0, 300));
      check('ORD-01 table header', /TRẠNG THÁI/.test(t) && /KHÁCH · MÃ ĐƠN/.test(t));
      const pr = await H.pageProblems(page, st);
      check('ORD-01 healthy page', pr.length === 0, pr.join('; '));
      await page.getByRole('tab', { name: /^Tất cả đơn/ }).click().catch(() => {});
      await H.settle(page);
      for (const [label, status] of [['Đã đặt', 'RESERVED'], ['Đang thuê', 'PICKUPED'], ['Đã trả', 'RETURNED'], ['Hoàn thành', 'COMPLETED'], ['Đã huỷ', 'CANCELLED']]) {
        const chip = page.getByRole('button', { name: new RegExp(`^${label}\\d+`) }).first();
        const shown = Number(((await chip.innerText().catch(() => '')).match(/(\d+)\s*$/) || [])[1]);
        const d = await api.get(`/api/orders?${qs({ status, limit: 1, page: 1 })}`);
        check(`ORD-01 chip "${label}" = API ${status}`, shown === (d.total ?? d.pagination?.total), `shown=${shown} api=${d.total}`);
      }
    }, sp);

    await H.runCase('WEB-UI-ORD-02', 'search by order number, customer name (accent-insensitive prefix) and phone', async () => {
      const box = page.getByRole('searchbox', { name: 'Tìm kiếm' });
      const search = async (q) => {
        await F.go(page, '/orders');
        await box.fill(q);
        await box.press('Enter');
        await page.waitForURL(/q=/, { timeout: 15000 }).catch(() => {});
        await H.settle(page);
      };
      await search(oRes.orderNumber);
      check('ORD-02 by number: one row, the order', (await rows().count()) === 1 && /#/.test(await rows().first().innerText()) && (await rows().first().innerText()).includes(oRes.orderNumber), await H.bodyText(page).then((x) => x.slice(-200)));
      check('ORD-02 "Kết quả cho" shows the query', (await H.bodyText(page)).includes(`Kết quả cho “${oRes.orderNumber}”`));
      await search(accentName.toLowerCase());
      check('ORD-02 by name (prefix, case-insensitive): the customer\'s order is listed', (await rows().filter({ hasText: oRes.orderNumber }).count()) === 1, `rows=${await rows().count()}`);
      check('ORD-02 by name: another customer\'s order is not listed', (await rows().filter({ hasText: oPick.orderNumber }).count()) === 0);
      await search('nguyen' + accentName.slice(-4).toLowerCase());
      check('ORD-02 by name without accents ("nguyen…" finds "Nguyễn…")', (await rows().filter({ hasText: oRes.orderNumber }).count()) === 1, `rows=${await rows().count()}`);
      await search(custB.phone);
      check('ORD-02 by phone: that customer\'s orders', (await rows().filter({ hasText: oPick.orderNumber }).count()) === 1 && (await rows().filter({ hasText: oRes.orderNumber }).count()) === 0);
      await search(prodA.name.slice(0, 14));
      check('ORD-02 by product name', (await rows().filter({ hasText: oRes.orderNumber }).count()) === 1, `rows=${await rows().count()}`);
      await search('zzzz-no-such-order-9');
      const t = await H.bodyText(page);
      check('ORD-02 no match: empty state, no rows', (await rows().count()) <= 1 && /Không có đơn nào khớp bộ lọc/.test(t), t.slice(-200));
      await page.getByRole('button', { name: 'Xoá tìm kiếm' }).click().catch(() => {});
      await H.settle(page);
      check('ORD-02 "Xoá tìm kiếm" clears the query', !/q=/.test(page.url()), page.url());
    }, sp);

    await H.runCase('WEB-UI-ORD-03', 'filters: status chip, type, sort; each result equals the API', async () => {
      await F.go(page, `/orders?q=${encodeURIComponent(tag)}`);
      const all = await rows().count();
      check('ORD-03 the three seeded orders match the tag', all === 3, `rows=${all}`);
      await page.getByRole('button', { name: /^Đã đặt\d+/ }).click();
      await H.settle(page);
      check('ORD-03 status "Đã đặt": only RESERVED rows', (await rows().count()) === 2 && /Đã đặt/.test(await rows().first().innerText()), `rows=${await rows().count()}`);
      await page.getByRole('button', { name: /^Tất cả\d+/ }).click();
      await H.settle(page);
      await page.getByRole('button', { name: /^Loại:/ }).click();
      await page.getByRole('menuitem', { name: 'Bán', exact: true }).or(page.getByRole('option', { name: 'Bán', exact: true })).first().click();
      await H.settle(page);
      check('ORD-03 type "Bán": the sale order only', (await rows().count()) === 1 && (await rows().first().innerText()).includes(oSale.orderNumber), `rows=${await rows().count()}`);
      await page.getByRole('button', { name: /^Loại:/ }).click();
      await page.getByRole('menuitem', { name: 'Thuê', exact: true }).or(page.getByRole('option', { name: 'Thuê', exact: true })).first().click();
      await H.settle(page);
      check('ORD-03 type "Thuê": the 2 rent orders', (await rows().count()) === 2, `rows=${await rows().count()}`);
      await page.getByRole('button', { name: /^Loại:/ }).click();
      await page.getByRole('menuitem', { name: 'Thuê, Bán', exact: true }).or(page.getByRole('option', { name: 'Thuê, Bán', exact: true })).first().click();
      await H.settle(page);
      await page.getByRole('button', { name: /^Sắp xếp:/ }).click();
      await page.getByRole('menuitem', { name: 'Tổng tiền cao nhất' }).or(page.getByRole('option', { name: 'Tổng tiền cao nhất' })).first().click();
      await H.settle(page);
      const first = await rows().first().innerText();
      check('ORD-03 sort "Tổng tiền cao nhất": 160.000 order (qty 2 × 80.000) first', first.includes(oPick.orderNumber), first.slice(0, 120));
      await page.getByRole('button', { name: /^Ngày tạo:/ }).click();
      await page.getByRole('menuitem', { name: 'Tháng này' }).or(page.getByRole('option', { name: 'Tháng này' })).first().click();
      await H.settle(page);
      check('ORD-03 created "Tháng này" keeps today\'s orders', (await rows().count()) === 3, `rows=${await rows().count()}`);
    }, sp);

    await H.runCase('WEB-UI-ORD-04', 'pagination and page size', async () => {
      await F.go(page, '/orders');
      const total = (await api.get('/api/orders?limit=1&page=1')).total;
      const info = (await H.bodyText(page)).match(/(\d+)–(\d+) trong (\d+) đơn/);
      check('ORD-04 footer "a–b trong N đơn" matches the API total', !!info && Number(info[3]) === total, `${info && info[0]} api=${total}`);
      check('ORD-04 10 rows on page 1', (await rows().count()) === 10, `rows=${await rows().count()}`);
      const firstNumber = (await rows().first().innerText()).match(/#(\S+)/)?.[1];
      await page.getByRole('button', { name: 'Trang sau' }).click();
      await H.settle(page);
      const f2 = (await rows().first().innerText()).match(/#(\S+)/)?.[1];
      check('ORD-04 page 2 shows other orders', !!f2 && f2 !== firstNumber, `${firstNumber} / ${f2}`);
      check('ORD-04 footer reads 11–20', /11–20 trong/.test(await H.bodyText(page)));
      await page.getByRole('button', { name: 'Trang trước' }).click();
      await H.settle(page);
      check('ORD-04 back to page 1', (await rows().first().innerText()).includes(firstNumber || '?'));
      await page.getByLabel('Số dòng mỗi trang').selectOption('50');
      await H.settle(page);
      check('ORD-04 50 rows per page', (await rows().count()) === Math.min(50, total), `rows=${await rows().count()}`);
    }, sp);

    await H.runCase('WEB-UI-ORD-05', 'tab "Việc cần làm" lists today\'s hand-overs and "Chưa lấy đồ" the missed pickups', async () => {
      await F.go(page, '/orders');
      await page.getByRole('tab', { name: /^Việc cần làm/ }).click();
      await H.settle(page);
      check('ORD-05 todo tab: today\'s pickup order is listed', (await rows().filter({ hasText: oPick.orderNumber }).count()) === 1, `rows=${await rows().count()}`);
      check('ORD-05 todo tab: tomorrow\'s order is not', (await rows().filter({ hasText: oRes.orderNumber }).count()) === 0);
      await page.getByRole('tab', { name: /^Chưa lấy đồ/ }).click();
      await H.settle(page);
      const t = await H.bodyText(page);
      check('ORD-05 noshow tab: today\'s order is not a missed pickup', (await rows().filter({ hasText: oPick.orderNumber }).count()) === 0);
      check('ORD-05 noshow tab: a list or the empty state', (await rows().count()) > 0 || /Không có đơn quá ngày lấy/.test(t), t.slice(-200));
    }, sp);

    // ================================================================ create
    await H.runCase('WEB-UI-ORD-06', 'Tạo đơn RENT: customer, 2 products, days, qty, price override, discount, deposit -> API equals what was typed', async () => {
      await F.go(page, '/orders/create');
      const P = addDays(today, 3), R = addDays(today, 5);
      await F.pickDays(page, P, R);
      await F.addProduct(page, prodA.name, 2);
      await F.addProduct(page, prodB.name, 1);
      await F.pickCustomer(page, { phone: custA.phone, firstName: accentName });
      const cart = page.locator('[aria-label="Đơn đang tạo"]').first();
      await cart.getByRole('button', { name: new RegExp(`^Cách tính giá ${prodA.name}`) }).click();
      await page.getByLabel(`Giá cho đơn này · ${prodA.name}`).fill('150000');
      await cart.getByRole('button', { name: 'Xong' }).click();
      await cart.getByRole('button', { name: 'Thêm', exact: true }).click();
      await cart.getByLabel('Giảm giá', { exact: true }).fill('20000');
      await cart.getByLabel('Thu cọc ngay').fill('50000');
      await cart.getByRole('button', { name: /Thêm ghi chú, ảnh/ }).click();
      await page.getByPlaceholder('Ví dụ: giao trước 9 giờ, sửa lại váy').fill('ghi chú e2e rent');
      await page.getByRole('button', { name: /^(Xong|Lưu|Đóng)/ }).last().click().catch(() => {});
      const subtotal = 150000 * 2 + 100000;
      const r = await F.submit(page);
      check('ORD-06 POST /api/orders succeeded', r.status === 200 && r.body?.success, JSON.stringify(r).slice(0, 300));
      if (!r.body?.success) return;
      created.push(r.body.data.id);
      const o = await getOrder(r.body.data.id);
      const item = (n) => o.orderItems.find((i) => i.productName === n);
      check('ORD-06 API: type RENT, status RESERVED', o.orderType === 'RENT' && o.status === 'RESERVED', `${o.orderType} ${o.status}`);
      check('ORD-06 API: customer is the picked one', o.customerId === custA.id, o.customerId);
      check('ORD-06 API: pickup / return = 00:00 VN of the clicked days', o.pickupPlanAt === dayIso(P) && o.returnPlanAt === dayIso(R), `${o.pickupPlanAt} ${o.returnPlanAt}`);
      check('ORD-06 API: product A qty 2 at the overridden 150.000', item(prodA.name)?.quantity === 2 && item(prodA.name)?.unitPrice === 150000, JSON.stringify(item(prodA.name)));
      check('ORD-06 API: product B qty 1 at the catalogue price 100.000 (override is for the one line)', item(prodB.name)?.quantity === 1 && item(prodB.name)?.unitPrice === 100000, JSON.stringify(item(prodB.name)));
      check('ORD-06 API: discount 20.000, deposit 50.000, total = lines − discount', o.discountAmount === 20000 && o.depositAmount === 50000 && o.totalAmount === subtotal - 20000, `${o.discountAmount} ${o.depositAmount} ${o.totalAmount}`);
      check('ORD-06 API: the order note', (o.notes || '').includes('ghi chú e2e rent'), o.notes);
      check('ORD-06 the catalogue price did not change', (await api.get(`/api/products/${prodA.id}`)).rentPrice === 100000);
      // after Tạo đơn: success toast and the hoá đơn of the new order
      const receipt = page.getByRole('dialog', { name: new RegExp(`Hoá đơn #${o.orderNumber}`) });
      await receipt.waitFor({ timeout: 15000 }).catch(() => {});
      const rt = (await receipt.innerText().catch(() => '')) || '';
      check('ORD-06 hoá đơn dialog opens with the new order number', rt.includes(`#${o.orderNumber}`), rt.slice(0, 120));
      check('ORD-06 hoá đơn: customer, total and the discount', rt.includes(accentName) && /Giảm giá/.test(rt) && /380\.000/.test(rt.replace(/,/g, '.')), rt.replace(/\s+/g, ' ').slice(0, 500));
      await receipt.getByRole('button', { name: 'Đóng' }).first().click();
      await page.waitForTimeout(500);
      const afterClose = await H.bodyText(page);
      check('ORD-06 after Đóng the cart is empty again', /Bấm \+ ở sản phẩm để thêm vào đơn/.test(afterClose) || !afterClose.includes(prodB.name.slice(0, 12) + ' ') , afterClose.slice(-300));
    }, sp);

    await H.runCase('WEB-UI-ORD-07', 'Tạo đơn RENT with a NEW customer typed in the picker', async () => {
      await F.go(page, '/orders/create');
      await F.pickDays(page, addDays(today, 6), addDays(today, 6));
      await F.addProduct(page, prodB.name, 1);
      const newName = `Mới${tag.slice(-4)} Khách`;
      const newPhone = `08${String(Date.now()).slice(-8)}`;
      await F.pickCustomer(page, { newName, newPhone });
      const r = await F.submit(page);
      check('ORD-07 POST /api/orders succeeded', r.status === 200 && r.body?.success, JSON.stringify(r).slice(0, 300));
      if (!r.body?.success) return;
      created.push(r.body.data.id);
      const o = await getOrder(r.body.data.id);
      const c = await api.get(`/api/customers/${o.customerId}`);
      const cu = c.customer || c;
      check('ORD-07 the new customer exists with the typed name and phone', `${cu.firstName} ${cu.lastName}`.trim().includes('Khách') && cu.phone === newPhone, JSON.stringify({ n: cu.firstName, l: cu.lastName, p: cu.phone }));
      check('ORD-07 same-day rental: pickup and return are the same day', o.pickupPlanAt === dayIso(addDays(today, 6)) && o.returnPlanAt === dayIso(addDays(today, 6)), `${o.pickupPlanAt} ${o.returnPlanAt}`);
      await api.call('DELETE', `/api/customers/${cu.id}`).catch(() => {});
    }, sp);

    await H.runCase('WEB-UI-ORD-08', 'Tạo đơn SALE: no days, paid at once, status COMPLETED', async () => {
      await F.go(page, '/orders/create');
      await F.closeDaysSheet(page);
      await page.locator('[aria-label="Đơn đang tạo"]').getByRole('tab', { name: 'Bán' }).click();
      await F.addProduct(page, prodA.name, 3);
      await F.pickCustomer(page, { phone: custB.phone, firstName: custB.firstName });
      const cart = page.locator('[aria-label="Đơn đang tạo"]').first();
      const text = await cart.innerText();
      check('ORD-08 cart shows Tiền hàng and no rental days', /Tiền hàng/.test(text) && !/ngày/.test(text.replace(/Chọn ngày/g, '')), text.slice(0, 300));
      const r = await F.submit(page);
      check('ORD-08 POST /api/orders succeeded', r.status === 200 && r.body?.success, JSON.stringify(r).slice(0, 300));
      if (!r.body?.success) return;
      created.push(r.body.data.id);
      const o = await getOrder(r.body.data.id);
      check('ORD-08 API: SALE, COMPLETED, qty 3, total 3 × price', o.orderType === 'SALE' && o.status === 'COMPLETED' && o.orderItems[0].quantity === 3 && o.totalAmount === o.orderItems[0].unitPrice * 3, JSON.stringify({ t: o.orderType, s: o.status, tot: o.totalAmount }));
      check('ORD-08 API: sale has no return date', !o.returnPlanAt, o.returnPlanAt);
    }, sp);

    await H.runCase('WEB-UI-ORD-09', 'Tạo đơn validation: missing days / items / customer are said, nothing is sent', async () => {
      await F.go(page, '/orders/create');
      const cart = page.locator('[aria-label="Đơn đang tạo"]').first();
      const t0 = await H.bodyText(page);
      check('ORD-09 empty cart says what to do', /Bấm \+ ở sản phẩm để thêm vào đơn|Thêm ít nhất một món|Chọn ngày giao, trả để tạo đơn/.test(t0), t0.slice(-200));
      st.reset();
      const btn = cart.getByRole('button', { name: /^Tạo đơn/ });
      const disabled = await btn.isDisabled().catch(() => false);
      if (!disabled) await btn.click().catch(() => {});
      await page.waitForTimeout(800);
      const posts = st.http4xx.length + st.http5xx.length;
      check('ORD-09 empty order: button disabled or refused, no POST sent', disabled || (await H.bodyText(page)).match(/Chọn ngày|Thêm ít nhất|Chọn khách/) !== null, `disabled=${disabled}`);
      check('ORD-09 no failed request', posts === 0, `${posts}`);
      await F.pickDays(page, addDays(today, 2), addDays(today, 3));
      await F.addProduct(page, prodA.name, 1);
      const t1 = await H.bodyText(page);
      check('ORD-09 with days and a product but no customer: "Chọn khách cho đơn."', /Chọn khách cho đơn/.test(t1) || (await cart.getByRole('button', { name: /^Tạo đơn/ }).isDisabled()), t1.slice(-300));
      check('ORD-09 no raw keys', H.rawKeys(t1).length === 0, H.rawKeys(t1).join());
    }, sp);

    await H.runCase('WEB-UI-ORD-10', 'overlap: a booked piece shows "Trùng lịch"; Huỷ creates nothing, "Vẫn tạo đơn" creates', async () => {
      const small = await api.createProduct(`${tag} Hiếm`, 1, outletId);
      const P = addDays(today, 8), R = addDays(today, 9);
      const first = await apiOrder({ P, R, product: small, customer: custA });
      await F.go(page, '/orders/create');
      await F.pickDays(page, P, R);
      await F.addProduct(page, small.name, 1);
      await F.pickCustomer(page, { phone: custB.phone, firstName: custB.firstName });
      const cart = page.locator('[aria-label="Đơn đang tạo"]').first();
      const t = await cart.innerText();
      check('ORD-10 cart warns the product is out for those days', /Hết trong lịch này|Chỉ còn 0|Hết đồ/.test(t) || /Hết trong lịch này/.test(await H.bodyText(page)), t.slice(0, 300));
      const r = await F.submit(page, { acceptOverlap: false });
      check('ORD-10 confirm dialog has the "Trùng lịch" block naming the missing set, days and the other order', !!r.blocked && /Trùng lịch/.test(r.blocked) && /thiếu 1 bộ/.test(r.blocked) && r.blocked.includes(`#${first.orderNumber}`), JSON.stringify(r).slice(0, 400));
      check('ORD-10 "Vẫn tạo đơn" is offered (this shop allows double bookings)', !!r.blocked && /Vẫn tạo đơn/.test(r.blocked));
      // Huỷ in the dialog: nothing is created
      await page.getByRole('dialog').last().getByRole('button', { name: 'Huỷ' }).click();
      await page.waitForTimeout(500);
      const list1 = await api.get(`/api/orders?${qs({ q: small.name, limit: 20 })}`);
      check('ORD-10 after Huỷ only the first order exists', list1.orders.filter((x) => x.status !== 'CANCELLED').length === 1, `n=${list1.orders.length}`);
      const r2 = await F.submit(page, { acceptOverlap: true });
      check('ORD-10 "Vẫn tạo đơn" creates the second order', r2.status === 200 && r2.body?.success, JSON.stringify(r2).slice(0, 300));
      if (r2.body?.success) created.push(r2.body.data.id);
      const list2 = await api.get(`/api/orders?${qs({ q: small.name, limit: 20 })}`);
      check('ORD-10 API now has two open orders for the one-piece product', list2.orders.filter((x) => x.status !== 'CANCELLED').length === 2, `n=${list2.orders.length}`);
    }, sp);

    // ================================================================ detail and actions
    /** Open the order page; the page needs a moment before its buttons react */
    const openOrder = async (o, path = '') => {
      await F.go(page, `/orders/${o.orderNumber}${path}`);
      await page.getByText(`#${o.orderNumber}`).first().waitFor({ timeout: 30000 }).catch(() => {});
    };
    const openMenu = async () => {
      await page.getByRole('button', { name: 'Thêm thao tác' }).click();
      await page.waitForTimeout(400);
    };

    await H.runCase('WEB-UI-ORD-11', 'order page: header, items, payment, customer link, not-found page', async () => {
      st.reset();
      await openOrder(oRes);
      const t = await H.bodyText(page);
      check('ORD-11 header: customer name, "Đơn thuê", #number, status', t.includes(accentName) && /Đơn thuê/.test(t) && t.includes(`#${oRes.orderNumber}`) && /Đã đặt/.test(t), t.slice(0, 300));
      check('ORD-11 items: product name, "SL 1", line total 100.000', t.includes(prodA.name) && /100[.,]000/.test(t));
      check('ORD-11 payment card: total 100.000, deposit 30.000, due 70.000', /30[.,]000/.test(t) && /70[.,]000/.test(t));
      check('ORD-11 buttons: In phiếu, Sửa đơn, Thêm thao tác, Giao đồ', (await page.getByRole('button', { name: 'In phiếu' }).count()) === 1 && (await page.getByRole('link', { name: 'Sửa đơn' }).or(page.getByRole('button', { name: 'Sửa đơn' })).count()) >= 1 && (await page.getByRole('button', { name: 'Thêm thao tác' }).count()) === 1);
      const pr = await H.pageProblems(page, st);
      check('ORD-11 healthy page', pr.length === 0, pr.join('; '));
      await page.getByRole('link', { name: 'Xem khách' }).click();
      await page.waitForURL(new RegExp(`/customers/${custA.id}$`), { timeout: 30000 }).catch(() => {});
      check('ORD-11 "Xem khách" opens that customer', new RegExp(`/customers/${custA.id}$`).test(page.url()), page.url());
      await F.go(page, '/orders/000000');
      const nf = await H.bodyText(page);
      check('ORD-11 unknown number: "Không tìm thấy đơn này." and a way back', /Không tìm thấy đơn này/.test(nf) && /Về danh sách đơn/.test(nf), nf.slice(-200));
      check('ORD-11 unknown number: no raw key', H.rawKeys(nf).length === 0, H.rawKeys(nf).join());
    }, sp);

    // an overdue order (pickup 3 days ago, return yesterday) for the hand-over / return flows
    const oFlow = await apiOrder({ P: addDays(today, -3), R: addDays(today, -1), deposit: 20000, customer: custA });
    await H.runCase('WEB-UI-ORD-12', 'collateral on the order page, then Giao đồ: money rows, API status PICKUPED', async () => {
      await openOrder(oFlow);
      const t0 = await H.bodyText(page);
      check('ORD-12 overdue pickup says so ("Quá 3 ngày chưa giao")', /Quá 3 ngày chưa giao/.test(t0), t0.slice(0, 200));
      for (let i = 0; i < 4; i += 1) {
        await page.getByRole('button', { name: 'Sửa thế chấp & phí' }).click();
        if (await page.getByLabel('Tiền thế chấp').isVisible({ timeout: 2000 }).catch(() => false)) break;
      }
      await page.getByLabel('Tiền thế chấp').fill('200000');
      await page.getByLabel('Loại thế chấp').selectOption({ label: 'CCCD' });
      await page.getByLabel('Chi tiết thế chấp').fill('CCCD 079123');
      await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
      await page.getByText(/Giữ/).first().waitFor({ timeout: 15000 }).catch(() => {});
      let o = await getOrder(oFlow.id);
      check('ORD-12 API: securityDeposit 200.000, type ID_CARD, details saved', o.securityDeposit === 200000 && o.collateralType === 'ID_CARD' && o.collateralDetails === 'CCCD 079123', `${o.securityDeposit} ${o.collateralType} ${o.collateralDetails}`);
      const t1 = await H.bodyText(page);
      check('ORD-12 payment card: Thế chân thu thêm 200.000, Thu khi giao 280.000', /Thế chân thu thêm/.test(t1) && /280[.,]000/.test(t1), t1.slice(-500));
      await page.getByRole('button', { name: /^Giao đồ · thu/ }).click();
      const dlg = page.getByRole('dialog');
      await dlg.waitFor({ timeout: 10000 });
      const dt = await dlg.innerText();
      check('ORD-12 dialog: total 100.000, deposit 20.000, collateral 200.000, "Thu bây giờ" 280.000, papers kept', /Giao đồ cho khách/.test(dt) && /Thu bây giờ/.test(dt) && /280[.,]000/.test(dt) && /Giấy tờ để lại: CCCD/.test(dt), dt.replace(/\s+/g, ' ').slice(0, 400));
      await dlg.getByRole('button', { name: /^Giao đồ · thu/ }).click();
      await page.getByText('Đang thuê').first().waitFor({ timeout: 20000 }).catch(() => {});
      o = await getOrder(oFlow.id);
      check('ORD-12 API: status PICKUPED, pickedUpAt set, collateral kept', o.status === 'PICKUPED' && !!o.pickedUpAt && o.securityDeposit === 200000, `${o.status} ${o.pickedUpAt} ${o.securityDeposit}`);
      const t2 = await H.bodyText(page);
      check('ORD-12 page: "Đang thuê", next step "Trễ trả 1 ngày", "Nhận trả · hoàn 200.000"', /Đang thuê/.test(t2) && /Trễ trả 1 ngày/.test(t2) && /Nhận trả · hoàn 200[.,]000/.test(t2), t2.slice(-600));
      check('ORD-12 history: "Đã giao đồ cho khách"', /Đã giao đồ cho khách/.test(t2));
    }, sp);

    await H.runCase('WEB-UI-ORD-13', 'Nhận trả with a late fee and a damage fee: refund = collateral − fees; API RETURNED with both fees', async () => {
      await openOrder(oFlow);
      await page.getByRole('button', { name: /^Nhận trả/ }).first().click();
      const dlg = page.getByRole('dialog');
      await dlg.waitFor({ timeout: 10000 });
      check('ORD-13 dialog says "trả trễ 1 ngày" and has a late-fee row', /trả trễ 1 ngày/.test(await dlg.innerText()) && /Phí trễ \(1 ngày\)/.test(await dlg.innerText()));
      await dlg.locator('input').nth(0).fill('10000');
      await dlg.locator('input').nth(1).fill('30000');
      await page.waitForTimeout(300);
      const dt = await dlg.innerText();
      check('ORD-13 dialog: fees 40.000, collateral 200.000, "Trả lại khách" 160.000', /40[.,]000/.test(dt) && /Trả lại khách/.test(dt) && /160[.,]000/.test(dt), dt.replace(/\s+/g, ' ').slice(0, 400));
      await dlg.getByRole('button', { name: /^Nhận trả · trả khách/ }).click();
      await page.getByText('Đã trả').first().waitFor({ timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(800);
      const o = await getOrder(oFlow.id);
      check('ORD-13 API: RETURNED, returnedAt set', o.status === 'RETURNED' && !!o.returnedAt, `${o.status} ${o.returnedAt}`);
      check('ORD-13 API: lateFee 10.000 and damageFee 30.000 as typed', o.lateFee === 10000 && o.damageFee === 30000, `${o.lateFee} ${o.damageFee}`);
      const t = await H.bodyText(page);
      check('ORD-13 page shows "Đã trả" and the fees', /Đã trả/.test(t) && /Phí trễ/.test(t) && /Phí hư hỏng/.test(t), t.slice(-500));
    }, sp);

    await H.runCase('WEB-UI-ORD-14', 'Huỷ đơn: "Giữ đơn" keeps it, "Huỷ đơn" cancels (API CANCELLED, stock freed)', async () => {
      const o1 = await apiOrder({ P: addDays(today, 12), R: addDays(today, 13), customer: custB });
      await openOrder(o1);
      await openMenu();
      const items = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].map((e) => e.innerText.trim()));
      check('ORD-14 menu offers "Huỷ đơn"', items.some((x) => /Huỷ đơn/.test(x)), items.join(' | '));
      await page.getByRole('menuitem', { name: /Huỷ đơn/ }).click();
      const dlg = page.getByRole('dialog');
      await dlg.waitFor({ timeout: 10000 });
      check('ORD-14 confirm dialog names the order', new RegExp(`Bạn có muốn huỷ đơn hàng .*${o1.orderNumber}`).test(await dlg.innerText()), await dlg.innerText());
      await dlg.getByRole('button', { name: 'Giữ đơn' }).click();
      await page.waitForTimeout(600);
      check('ORD-14 "Giữ đơn": still RESERVED', (await getOrder(o1.id)).status === 'RESERVED');
      await openMenu();
      await page.getByRole('menuitem', { name: /Huỷ đơn/ }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Huỷ đơn' }).click();
      await page.getByText('Đã huỷ').first().waitFor({ timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(500);
      check('ORD-14 "Huỷ đơn": API CANCELLED', (await getOrder(o1.id)).status === 'CANCELLED');
      check('ORD-14 page shows "Đã huỷ" and no Giao đồ button', /Đã huỷ/.test(await H.bodyText(page)) && (await page.getByRole('button', { name: /^Giao đồ/ }).count()) === 0);
      // the menu of a cancelled order
      await openMenu();
      const items2 = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].map((e) => e.innerText.trim()));
      check('ORD-14 cancelled order: no "Huỷ đơn" in the menu', !items2.some((x) => /^Huỷ đơn/.test(x)), items2.join(' | '));
      console.log('  info: menu of a cancelled order:', items2.join(' | '));
      await page.keyboard.press('Escape');
    }, sp);

    await H.runCase('WEB-UI-ORD-15', 'order note: typed on the order page is saved (API notes) and shown', async () => {
      await openOrder(oRes);
      for (let i = 0; i < 4; i += 1) {
        await page.getByRole('button', { name: 'Sửa ghi chú' }).first().click();
        if (await page.getByPlaceholder('Nhập ghi chú đơn hàng...').isVisible({ timeout: 2000 }).catch(() => false)) break;
      }
      await page.getByPlaceholder('Nhập ghi chú đơn hàng...').fill('Khách hẹn lấy sau 5 giờ');
      const saved = page.waitForResponse((r) => /\/api\/orders\/\d+$/.test(r.url().split('?')[0]) && r.request().method() === 'PUT', { timeout: 20000 });
      await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
      check('ORD-15 save sends PUT /api/orders/:id and succeeds', (await saved.catch(() => null))?.status() === 200);
      await page.waitForTimeout(800);
      const o = await getOrder(oRes.id);
      check('ORD-15 API: notes saved', (o.notes || '').includes('Khách hẹn lấy sau 5 giờ'), o.notes);
      check('ORD-15 the page shows the note (not "Chưa có ghi chú.")', (await H.bodyText(page)).includes('Khách hẹn lấy sau 5 giờ') && !/Chưa có ghi chú\./.test(await H.bodyText(page)));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await H.settle(page);
      check('ORD-15 the note survives a reload', (await H.bodyText(page)).includes('Khách hẹn lấy sau 5 giờ'));
    }, sp);

    await H.runCase('WEB-UI-ORD-16', 'Sửa đơn: change quantity and discount, save; API equals, "Về đơn" returns', async () => {
      const oe = await apiOrder({ P: addDays(today, 14), R: addDays(today, 15), customer: custB, product: prodA, qty: 1, price: 100000 });
      await openOrder(oe, '/edit');
      const t = await H.bodyText(page);
      check('ORD-16 edit screen titled "Sửa đơn #number" with a way back', t.includes(`Sửa đơn #${oe.orderNumber}`) && t.includes(`Về đơn #${oe.orderNumber}`), t.slice(0, 300));
      check('ORD-16 prefilled: product line, customer', t.includes(prodA.name) && t.includes(custB.firstName), t.slice(0, 600));
      const cart = page.locator('[aria-label="Đơn đang tạo"]').first();
      await cart.getByRole('button', { name: `Thêm 1 ${prodA.name}` }).click();
      await cart.getByRole('button', { name: 'Thêm', exact: true }).click().catch(() => {});
      await cart.getByLabel('Giảm giá', { exact: true }).fill('10000');
      const put = page.waitForResponse((r) => /\/api\/orders\/\d+$/.test(r.url().split('?')[0]) && r.request().method() === 'PUT', { timeout: 30000 });
      await cart.getByRole('button', { name: /^Lưu thay đổi/ }).click();
      const dlg = page.getByRole('dialog').getByRole('button', { name: /^(Vẫn lưu thay đổi|Lưu thay đổi|Xác nhận)/ });
      if (await dlg.count()) await dlg.first().click().catch(() => {});
      const res = await put.catch(() => null);
      check('ORD-16 PUT /api/orders/:id succeeded', !!res && res.status() === 200, res && res.status());
      const o = await getOrder(oe.id);
      check('ORD-16 API: quantity 2, discount 10.000, total 190.000', o.orderItems[0].quantity === 2 && o.discountAmount === 10000 && o.totalAmount === 190000, `${o.orderItems[0].quantity} ${o.discountAmount} ${o.totalAmount}`);
      check('ORD-16 API: dates unchanged', o.pickupPlanAt === dayIso(addDays(today, 14)) && o.returnPlanAt === dayIso(addDays(today, 15)), `${o.pickupPlanAt} ${o.returnPlanAt}`);
      await page.waitForTimeout(1000);
      check('ORD-16 after saving the screen is the order page or shows the saved order', page.url().includes(`/orders/${oe.orderNumber}`), page.url());
    }, sp);

    await H.runCase('WEB-UI-ORD-17', 'In phiếu: hoá đơn dialog shows the order, closes, and the print button is there', async () => {
      await openOrder(oRes);
      await page.evaluate(() => {
        window.__printed = 0;
        window.print = () => { window.__printed += 1; };
      });
      await page.getByRole('button', { name: 'In phiếu' }).click();
      const dlg = page.getByRole('dialog', { name: new RegExp(`Hoá đơn #${oRes.orderNumber}`) });
      await dlg.waitFor({ timeout: 15000 });
      const t = await dlg.innerText();
      check('ORD-17 hoá đơn shows the customer, the product, the deposit and the total', t.includes(accentName) && t.includes(prodA.name) && /Tiền cọc/.test(t) && /100\.000/.test(t), t.replace(/\s+/g, ' ').slice(0, 400));
      check('ORD-17 rental dates on the slip (Ngày thuê / Ngày trả)', /Ngày thuê/.test(t) && /Ngày trả/.test(t));
      check('ORD-17 no raw key on the slip', H.rawKeys(t).length === 0, H.rawKeys(t).join());
      check('ORD-17 print button present', (await dlg.getByRole('button', { name: 'In' }).count()) === 1);
      await dlg.getByRole('button', { name: 'Đóng' }).first().click();
      await dlg.waitFor({ state: 'hidden', timeout: 5000 });
      check('ORD-17 Đóng closes the dialog', true);
    }, sp);


    await H.runCase('WEB-UI-ORD-18', 'Xoá đơn (cancelled order): "Giữ lại" keeps it, "Xoá đơn" removes it for good and returns to the list', async () => {
      const od = await apiOrder({ P: addDays(today, 20), R: addDays(today, 21), customer: custB });
      await api.cancel(od.id);
      await openOrder(od);
      await openMenu();
      await page.getByRole('menuitem', { name: /^Xoá đơn/ }).click();
      const dlg = page.getByRole('dialog');
      await dlg.waitFor({ timeout: 10000 });
      check('ORD-18 dialog "Xoá hẳn đơn <number>? Không hoàn tác được."', new RegExp(`Xoá hẳn đơn #?${od.orderNumber}`).test(await dlg.innerText()), await dlg.innerText());
      await dlg.getByRole('button', { name: 'Giữ lại' }).click();
      await page.waitForTimeout(500);
      check('ORD-18 "Giữ lại": the order still exists', (await getOrder(od.id)).orderNumber === od.orderNumber);
      await openMenu();
      await page.getByRole('menuitem', { name: /^Xoá đơn/ }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Xoá đơn' }).click();
      await page.waitForURL(/\/orders(\?|$)/, { timeout: 30000 }).catch(() => {});
      check('ORD-18 after deleting the screen goes back to the order list', new URL(page.url()).pathname === '/orders', page.url());
      const is404 = (p) => api.get(p).then(() => false).catch((e) => /404/.test(e.message));
      check('ORD-18 API: by number the order is gone (404)', await is404(`/api/orders/${od.orderNumber}`));
      check('ORD-18 API: the list does not return it', (await api.get(`/api/orders?${qs({ q: od.orderNumber })}`)).orders.length === 0);
      check('ORD-18 API: by id the order is gone (404)', await is404(`/api/orders/${od.id}`)); // #739
      const idx = created.indexOf(od.id);
      if (idx >= 0) created.splice(idx, 1);
    }, sp);

  } finally {
    for (const id of created) await api.cancel(id);
    await browser.close();
  }
  return H.finish(rec.results, 'web-ui-orders-results.json', { tag });
}

if (require.main === module) H.main(main);
module.exports = { main };
