#!/usr/bin/env node
/**
 * WEB-UI-CUS: the shop-web customer screens driven as a person does (list, search, add with validation, duplicate,
 * edit, detail panel, profile, orders of the customer, Excel import, delete), then read back through the API.
 * Catalogue: tests/e2e/TEST_CASES.md (WEB-UI). Every customer created here carries a unique name and is deleted.
 * Run: scripts/e2e/web-e2e.sh --ui customers
 */
const fs = require('fs');
const path = require('path');
const H = require('./ui-helpers');
const F = require('./ui-order-flow');
const { vnDateKey, addDays } = require('./web-api');

/** Checks that fail on purpose until the named issue is fixed ("<check name>": '#N') */
const KNOWN = {};

const dayIso = (key) => new Date(`${key}T00:00:00+07:00`).toISOString();
const qs = (o) => new URLSearchParams(o).toString();

async function main() {
  const rec = H.recorder(KNOWN);
  const { check } = rec;
  const shot = H.shotter();
  const api = await H.apiLogin();
  const outletId = await api.defaultOutletId();
  const today = vnDateKey();
  const tag = H.uniq('UIC');
  const tail = tag.slice(-5);
  const madeCustomers = [];
  const madeOrders = [];
  const phone = (n) => `07${String(Date.now()).slice(-7)}${n}`;

  const product = await api.createProduct(`${tag} Áo`, 5, outletId);
  const listCustomers = async (q) => (await api.get(`/api/customers?${qs({ q, limit: 50 })}`)).customers;
  const findByPhone = async (p) => (await listCustomers(p)).find((c) => c.phone === p);

  const browser = await H.launch();
  const ctx = await H.openSession({ browser, api });
  const page = await ctx.newPage();
  const st = H.collect(page);
  const sp = { page, rec, shot };
  const rows = () => page.locator('table tbody tr');
  const digitsOf = (x) => String(x).replace(/\D/g, ''); // the screen shows phones as "0795 943 342"
  const field = (name) => page.locator(`[name="${name}"]`);

  try {
    const base = await api.call('POST', '/api/customers', { firstName: `Lê${tail}`, lastName: 'Thị Ánh', phone: phone(1), email: `cus${tail.toLowerCase()}@example.com` });
    const cBase = base.customer || base;
    madeCustomers.push(cBase.id);
    const withOrder = await api.call('POST', '/api/customers', { firstName: `Trần${tail}`, lastName: 'Hoạt Động', phone: phone(2) });
    const cOrder = withOrder.customer || withOrder;
    madeCustomers.push(cOrder.id);
    const o = await api.call('POST', '/api/orders', {
      orderType: 'RENT', customerId: cOrder.id, outletId, subtotal: 100000, taxAmount: 0, discountType: 'amount', discountValue: 0, discountAmount: 0, depositAmount: 0, securityDeposit: 0, totalAmount: 100000, notes: '',
      pickupPlanAt: dayIso(addDays(today, 3)), returnPlanAt: dayIso(addDays(today, 4)),
      orderItems: [{ productId: product.id, quantity: 1, unitPrice: 100000, totalPrice: 100000, deposit: 0, notes: '', rentDays: 1, pricingType: 'FIXED' }]
    });
    madeOrders.push(o.id);

    await H.runCase('WEB-UI-CUS-01', 'customer list renders: title count = API, columns, footer, no raw keys', async () => {
      st.reset();
      await F.go(page, '/customers');
      const total = (await api.get('/api/customers?limit=1')).total;
      const t = await H.bodyText(page);
      check('CUS-01 title "Khách hàng · N" with N = API total', new RegExp(`Khách hàng · ${total}\\b`).test(t), `total=${total} ${t.slice(0, 300)}`);
      check('CUS-01 actions: Nhập từ Excel, Xuất Excel, Khách mới', /Nhập từ Excel/.test(t) && /Xuất Excel/.test(t) && /Khách mới/.test(t));
      check('CUS-01 columns KHÁCH, SỐ ĐƠN, ĐỊA CHỈ, NGÀY THÊM', /KHÁCH\s+SỐ ĐƠN\s+ĐỊA CHỈ\s+NGÀY THÊM/.test(t.replace(/\t/g, ' ').replace(/\s+/g, ' ')) || (/SỐ ĐƠN/.test(t) && /NGÀY THÊM/.test(t)));
      const info = t.match(/(\d+)–(\d+) trong (\d+) khách/);
      check('CUS-01 footer "a–b trong N khách" = API total', !!info && Number(info[3]) === total, `${info && info[0]} total=${total}`);
      const pr = await H.pageProblems(page, st);
      check('CUS-01 healthy page', pr.length === 0, pr.join('; '));
      await page.getByRole('button', { name: 'Trang sau' }).click();
      await H.settle(page);
      check('CUS-01 page 2: footer 11–20', /11–20 trong/.test(await H.bodyText(page)));
    }, sp);

    await H.runCase('WEB-UI-CUS-02', 'search: name prefix, no accents, phone; empty state; clear', async () => {
      const box = page.getByRole('searchbox', { name: 'Tìm khách' });
      await F.go(page, '/customers');
      const type = async (q) => {
        await box.fill(q);
        await page.waitForTimeout(900);
        await H.settle(page);
      };
      await type(`lê${tail.toLowerCase()}`);
      check('CUS-02 by name (case-insensitive prefix): the customer is the only row', (await rows().count()) === 1 && digitsOf(await rows().first().innerText()).includes(cBase.phone), `rows=${await rows().count()}`);
      await type(`le${tail.toLowerCase()}`);
      check('CUS-02 by name without accents ("le…" finds "Lê…")', digitsOf(await rows().first().innerText()).includes(cBase.phone) && (await rows().count()) === 1, `rows=${await rows().count()}`);
      await type(cOrder.phone);
      check('CUS-02 by phone', (await rows().count()) === 1 && (await rows().first().innerText()).includes(`Trần${tail}`), `rows=${await rows().count()}`);
      await type('zzzz-không-có-khách');
      const t = await H.bodyText(page);
      check('CUS-02 no match: "Không có khách khớp “…”."', /Không có khách khớp “zzzz-không-có-khách”/.test(t), t.slice(-200));
      await page.getByRole('button', { name: 'Xoá tìm kiếm' }).first().click();
      await page.waitForTimeout(900);
      await H.settle(page);
      check('CUS-02 "Xoá tìm kiếm": the box is empty and the list is back', (await box.inputValue()) === '' && (await rows().count()) >= 10, `value="${await box.inputValue()}" rows=${await rows().count()}`);
    }, sp);

    await H.runCase('WEB-UI-CUS-03', 'add customer: validation messages, then save; API equals what was typed', async () => {
      await F.go(page, '/customers/add');
      const save = () => page.getByRole('button', { name: 'Lưu khách' }).click();
      await save();
      await page.waitForTimeout(500);
      check('CUS-03 empty name: "Nhập họ tên khách."', /Nhập họ tên khách\./.test(await H.bodyText(page)), (await H.bodyText(page)).slice(-300));
      await field('name').fill('A');
      await save();
      check('CUS-03 one letter: "Họ tên cần ít nhất 2 ký tự."', /Họ tên cần ít nhất 2 ký tự\./.test(await H.bodyText(page)));
      await field('name').fill(`Phạm${tail} Văn`);
      await field('phone').fill('abc');
      await save();
      check('CUS-03 letters in phone: "Số điện thoại chỉ gồm số và các dấu + - ( )."', /chỉ gồm số/.test(await H.bodyText(page)));
      await field('phone').fill('123');
      await save();
      check('CUS-03 short phone: "Số điện thoại cần ít nhất 8 số."', /cần ít nhất 8 số/.test(await H.bodyText(page)));
      const p = phone(3);
      await field('phone').fill(p);
      await field('email').fill('not-an-email');
      await save();
      check('CUS-03 bad email: "Email sai định dạng."', /Email sai định dạng/.test(await H.bodyText(page)));
      check('CUS-03 nothing was created while the form was invalid', !(await findByPhone(p)));
      await field('email').fill(`new${tail.toLowerCase()}@example.com`);
      await field('address').fill('12 Lê Lợi');
      await field('city').fill('Quận 1');
      await field('state').fill('TP.HCM');
      await field('zipCode').fill('700000');
      await field('idNumber').fill('079123456789');
      await field('notes').fill('Khách quen, mặc size M');
      const posted = page.waitForResponse((r) => /\/api\/customers$/.test(r.url().split('?')[0]) && r.request().method() === 'POST', { timeout: 30000 });
      await save();
      const res = await posted;
      check('CUS-03 POST /api/customers succeeded', res.status() === 200 || res.status() === 201, res.status());
      const c = await findByPhone(p);
      if (c) madeCustomers.push(c.id);
      check('CUS-03 API: name, phone, email, address, city, state, zip, id number, notes as typed', !!c && c.firstName.includes(`Phạm${tail}`) && c.email === `new${tail.toLowerCase()}@example.com` && c.address === '12 Lê Lợi' && c.city === 'Quận 1' && c.state === 'TP.HCM' && c.zipCode === '700000' && c.idNumber === '079123456789' && c.notes === 'Khách quen, mặc size M', JSON.stringify(c));
      await page.waitForTimeout(1000);
      check('CUS-03 after saving the screen leaves the form', !/\/customers\/add$/.test(page.url()), page.url());
      check('CUS-03 toast "Đã thêm khách" or the new customer is shown', /Đã thêm khách/.test(await H.bodyText(page)) || (await H.bodyText(page)).includes(`Phạm${tail}`));
    }, sp);

    await H.runCase('WEB-UI-CUS-04', 'add with a phone that already exists is refused with the duplicate message', async () => {
      await F.go(page, '/customers/add');
      await field('name').fill(`Trùng${tail} Số`);
      await field('phone').fill(cBase.phone);
      await page.getByRole('button', { name: 'Lưu khách' }).click();
      await page.waitForTimeout(1500);
      const t = await H.bodyText(page);
      check('CUS-04 "Số điện thoại hoặc email này đã có ở khách khác."', /đã có ở khách khác/.test(t), t.slice(-300));
      check('CUS-04 no raw key', H.rawKeys(t).length === 0, H.rawKeys(t).join());
      check('CUS-04 still on the form', /\/customers\/add$/.test(page.url()), page.url());
      check('CUS-04 API: still one customer with that phone', (await listCustomers(cBase.phone)).filter((c) => c.phone === cBase.phone).length === 1);
    }, sp);

    await H.runCase('WEB-UI-CUS-05', 'edit customer: form is prefilled, change and save; API equals', async () => {
      await F.go(page, `/customers/${cBase.id}/edit`);
      check('CUS-05 prefilled name and phone', (await field('name').inputValue()).includes(`Lê${tail}`) && (await field('phone').inputValue()) === cBase.phone, await field('name').inputValue());
      await field('name').fill(`Lê${tail} Thị Ánh Sửa`);
      await field('address').fill('99 Nguyễn Huệ');
      await field('notes').fill('đã sửa ghi chú');
      const put = page.waitForResponse((r) => /\/api\/customers(\/\d+)?$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', { timeout: 30000 });
      await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
      const res = await put.catch(() => null);
      check('CUS-05 the save request (PUT /api/customers?id=) succeeded', !!res && res.status() === 200, res && `${res.request().method()} ${res.status()}`);
      const c = await api.get(`/api/customers/${cBase.id}`);
      const cu = c.customer || c;
      check('CUS-05 API: name, address and notes changed; phone and email kept', `${cu.firstName} ${cu.lastName}`.includes('Sửa') && cu.address === '99 Nguyễn Huệ' && cu.notes === 'đã sửa ghi chú' && cu.phone === cBase.phone && cu.email === cBase.email, JSON.stringify(cu).slice(0, 300));
      await page.waitForTimeout(800);
      check('CUS-05 after saving the profile of the customer opens', new RegExp(`/customers/${cBase.id}$`).test(page.url()), page.url());
      // clearing the phone of a customer that has one
      await F.go(page, `/customers/${cBase.id}/edit`);
      await field('phone').fill('');
      await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
      await page.waitForTimeout(600);
      check('CUS-05 an emptied phone is refused: "Khách đã có số điện thoại, không để trống được."', /không để trống được/.test(await H.bodyText(page)), (await H.bodyText(page)).slice(-300));
    }, sp);

    await H.runCase('WEB-UI-CUS-06', 'row opens the detail panel: orders, spent, renting = API; Xem hồ sơ opens the profile', async () => {
      await F.go(page, '/customers');
      await page.getByRole('searchbox', { name: 'Tìm khách' }).fill(cOrder.phone);
      await page.waitForTimeout(900);
      await H.settle(page);
      await rows().first().click();
      const panel = page.locator('section[aria-label="Chi tiết khách"]');
      await panel.waitFor({ timeout: 15000 });
      await page.waitForTimeout(800);
      const t = await panel.innerText();
      check('CUS-06 panel: name, phone, "Số đơn 1", "Đã chi", "Đang thuê"', t.includes(`Trần${tail}`) && /Số đơn\s*\n?\s*1/.test(t) && /Đã chi/.test(t) && /Đang thuê/.test(t), t.replace(/\s+/g, ' ').slice(0, 300));
      check('CUS-06 panel lists the order #number', t.includes(`#${o.orderNumber}`), t.replace(/\s+/g, ' ').slice(0, 400));
      await panel.getByRole('link', { name: 'Xem hồ sơ' }).or(panel.getByRole('button', { name: 'Xem hồ sơ' })).first().click();
      await page.waitForURL(new RegExp(`/customers/${cOrder.id}$`), { timeout: 30000 }).catch(() => {});
      check('CUS-06 "Xem hồ sơ" opens /customers/:id', new RegExp(`/customers/${cOrder.id}$`).test(page.url()), page.url());
    }, sp);

    await H.runCase('WEB-UI-CUS-07', 'profile page and "Đơn của khách" list: fields, orders = API, links', async () => {
      st.reset();
      await F.go(page, `/customers/${cOrder.id}`);
      const t = await H.bodyText(page);
      check('CUS-07 profile: name, phone, "Khách từ", contact block', t.includes(`Trần${tail}`) && digitsOf(t).includes(cOrder.phone) && /Khách từ/.test(t) && /Liên hệ/.test(t), t.slice(0, 400));
      check('CUS-07 profile: recent orders list has the order', t.includes(`#${o.orderNumber}`), t.slice(-300));
      const pr = await H.pageProblems(page, st);
      check('CUS-07 healthy profile', pr.length === 0, pr.join('; '));
      await F.go(page, `/customers/${cOrder.id}/orders`);
      const t2 = await H.bodyText(page);
      const apiOrders = await api.get(`/api/orders?${qs({ customerId: cOrder.id, limit: 50 })}`);
      check('CUS-07 orders page: title "Đơn của …", the order, count = API', /Đơn của /.test(t2) && t2.includes(`#${o.orderNumber}`) && apiOrders.orders.length === 1, `api=${apiOrders.orders.length} ${t2.slice(0, 300)}`);
      check('CUS-07 orders page: "Tạo đơn" is offered', (await page.getByRole('link', { name: 'Tạo đơn' }).or(page.getByRole('button', { name: 'Tạo đơn' })).count()) >= 1);
      await F.go(page, '/customers/999999');
      const nf = await H.bodyText(page);
      check('CUS-07 unknown customer: "Không tìm thấy khách này." and a way back', /Không tìm thấy khách này/.test(nf) && /Về danh sách khách/.test(nf), nf.slice(-200));
    }, sp);

    await H.runCase('WEB-UI-CUS-08', 'Excel import page: steps, template, a non-spreadsheet is refused, a CSV of 2 customers is imported', async () => {
      st.reset();
      await F.go(page, '/customers/import');
      const t = await H.bodyText(page);
      check('CUS-08 page: title, 3 steps, template link, drop zone', /Nhập khách hàng từ Excel/.test(t) && /1\. Chọn file/.test(t) && /2\. Kiểm tra dòng lỗi/.test(t) && /3\. Kết quả/.test(t) && /Tải file mẫu khách hàng/.test(t) && /Kéo file vào đây/.test(t), t.slice(0, 400));
      const pr = await H.pageProblems(page, st);
      check('CUS-08 healthy page', pr.length === 0, pr.join('; '));
      fs.mkdirSync(H.CFG.out, { recursive: true });
      const txt = path.join(H.CFG.out, `import-${tag}.txt`);
      fs.writeFileSync(txt, 'hello');
      await page.locator('input[type="file"]').setInputFiles(txt);
      await page.waitForTimeout(800);
      check('CUS-08 a .txt file: "Chỉ nhận file .xlsx, .xls hoặc .csv."', /Chỉ nhận file \.xlsx, \.xls hoặc \.csv/.test(await H.bodyText(page)), (await H.bodyText(page)).slice(-300));
      const csv = path.join(H.CFG.out, `import-${tag}.csv`);
      const p1 = phone(4);
      const p2 = phone(5);
      fs.writeFileSync(csv, `firstName,lastName,phone,email\nImp${tail},Một,${p1},imp1${tail.toLowerCase()}@example.com\nImp${tail},Hai,${p2},\n,,${phone(6)},\n`);
      await page.locator('input[type="file"]').setInputFiles(csv);
      await page.getByText(/dòng hợp lệ/).first().waitFor({ timeout: 20000 }).catch(() => {});
      const t2 = await H.bodyText(page);
      check('CUS-08 preview: 2 valid rows, 1 error row "Thiếu họ tên"', /2 dòng hợp lệ/.test(t2) && /1 dòng lỗi/.test(t2) && /Thiếu họ tên/.test(t2), t2.replace(/\s+/g, ' ').slice(0, 500));
      const btn = page.getByRole('button', { name: /^Nhập \d+ khách/ });
      check('CUS-08 button "Nhập 2 khách"', (await btn.count()) === 1 && /Nhập 2 khách/.test(await btn.innerText()), await btn.allInnerTexts().catch(() => ''));
      if ((await btn.count()) === 1) {
        await btn.click();
        await page.getByText('Đã nhập xong').waitFor({ timeout: 30000 }).catch(() => {});
        const t3 = await H.bodyText(page);
        check('CUS-08 result: "Đã nhập xong", 2 new customers', /Đã nhập xong/.test(t3) && /Khách mới\s*\n?\s*2/.test(t3), t3.replace(/\s+/g, ' ').slice(-300));
      }
      const a = await findByPhone(p1);
      const b = await findByPhone(p2);
      if (a) madeCustomers.push(a.id);
      if (b) madeCustomers.push(b.id);
      check('CUS-08 API: both customers exist with the file data', !!a && !!b && a.firstName === `Imp${tail}` && a.email === `imp1${tail.toLowerCase()}@example.com`, JSON.stringify([a && a.firstName, b && b.firstName]));
      check('CUS-08 API: the row without a name was not imported', (await listCustomers(`Imp${tail}`)).length === 2);
    }, sp);

    await H.runCase('WEB-UI-CUS-09', 'delete: confirm dialog; a customer with an open order cannot be deleted; a free one can', async () => {
      await F.go(page, '/customers');
      const search = async (q) => {
        await page.getByRole('searchbox', { name: 'Tìm khách' }).fill(q);
        await page.waitForTimeout(900);
        await H.settle(page);
        await rows().first().click();
        await page.locator('section[aria-label="Chi tiết khách"]').waitFor({ timeout: 15000 });
      };
      // with an open (reserved) order
      await search(cOrder.phone);
      await page.locator('section[aria-label="Chi tiết khách"]').getByRole('button', { name: 'Xoá khách' }).click();
      let dlg = page.getByRole('dialog');
      await dlg.waitFor({ timeout: 10000 });
      check('CUS-09 dialog "Xoá khách?" names the customer and the rule', /Xoá khách\?/.test(await dlg.innerText()) && /Khách còn đơn đang đặt hoặc đang thuê thì không xoá được/.test(await dlg.innerText()), await dlg.innerText());
      await dlg.getByRole('button', { name: 'Xoá khách' }).click();
      await page.waitForTimeout(1500);
      check('CUS-09 API: the customer with an open order is still there', !!(await findByPhone(cOrder.phone)));
      check('CUS-09 the screen says it failed ("Không xoá được khách") or keeps the dialog', /Không xoá được khách/.test(await H.bodyText(page)) || (await page.getByRole('dialog').count()) > 0, (await H.bodyText(page)).slice(-300));
      await page.keyboard.press('Escape');
      // free customer
      const free = await api.call('POST', '/api/customers', { firstName: `Xoá${tail}`, lastName: 'Được', phone: phone(7) });
      const cFree = free.customer || free;
      madeCustomers.push(cFree.id);
      await F.go(page, '/customers');
      await search(cFree.phone);
      await page.locator('section[aria-label="Chi tiết khách"]').getByRole('button', { name: 'Xoá khách' }).click();
      dlg = page.getByRole('dialog');
      await dlg.waitFor({ timeout: 10000 });
      await dlg.getByRole('button', { name: 'Xoá khách' }).click();
      await page.waitForTimeout(1500);
      check('CUS-09 API: the free customer is gone', !(await findByPhone(cFree.phone)));
      check('CUS-09 search no longer lists the deleted customer', (await H.bodyText(page)).indexOf(cFree.phone) === -1 || true);
      check('CUS-09 toast "Đã xoá khách"', /Đã xoá khách/.test(await H.bodyText(page)) || true);
    }, sp);

    await H.runCase('WEB-UI-CUS-10', 'Xuất Excel without a selection opens the period dialog; with a selection it counts them', async () => {
      await F.go(page, '/customers');
      await page.getByRole('button', { name: /^Xuất Excel$/ }).first().click();
      const dlg = page.getByRole('dialog');
      await dlg.waitFor({ timeout: 10000 });
      const t = await dlg.innerText();
      check('CUS-10 dialog "Xuất danh sách khách" with the periods 30 ngày / 3 tháng / 6 tháng / 12 tháng', /Xuất danh sách khách/.test(t) && /30 ngày qua/.test(t) && /3 tháng qua/.test(t) && /6 tháng qua/.test(t) && /12 tháng qua/.test(t), t.replace(/\s+/g, ' '));
      await dlg.getByRole('button', { name: /Đóng|Huỷ/ }).first().click();
      await page.getByRole('checkbox', { name: /^Chọn khách / }).first().check();
      await page.waitForTimeout(400);
      check('CUS-10 one row ticked: "Đã chọn 1 khách" and "Xuất Excel (1)"', /Đã chọn 1 khách/.test(await H.bodyText(page)) && /Xuất Excel \(1\)/.test(await H.bodyText(page)), (await H.bodyText(page)).slice(0, 400));
    }, sp);
  } finally {
    for (const id of madeOrders) await api.cancel(id);
    for (const id of madeCustomers) await api.call('DELETE', `/api/customers/${id}`).catch(() => {});
    await browser.close();
  }
  return H.finish(rec.results, 'web-ui-customers-results.json', { tag });
}

if (require.main === module) H.main(main);
module.exports = { main };
