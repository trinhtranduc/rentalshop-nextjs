/**
 * Drive the shop-web "Tạo đơn" screen like a person (shared by ui-orders / ui-customers / ui-products).
 * Labels come from locales/vi/orders.json (web.editor.*). Nothing here changes app code.
 */
const { CFG, settle } = require('./ui-helpers');
const { cellLabel, vnDateKey, addDays } = require('./web-api');

/** Digits of a money text: "1.250.000đ" / "1,250,000" -> 1250000 */
const digits = (s) => Number(String(s || '').replace(/[^\d]/g, '')) || 0;

async function go(page, path) {
  await page.goto(CFG.client + path, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await settle(page, 30000);
}

async function pickDays(page, P, R) {
  const sheet = page.getByRole('dialog', { name: 'Ngày giao và trả' });
  if (!(await sheet.isVisible().catch(() => false))) await page.getByRole('button', { name: /Chọn ngày giao, trả|Giao .* → Trả/ }).first().click();
  await sheet.waitFor({ timeout: 20000 });
  const clickDay = async (key) => {
    const cell = sheet.getByRole('button', { name: cellLabel(key), exact: true });
    for (let i = 0; i < 24 && !(await cell.isVisible().catch(() => false)); i += 1) await sheet.getByRole('button', { name: 'Tháng sau' }).click();
    await cell.click();
  };
  await clickDay(P);
  await clickDay(R);
  await sheet.getByRole('button', { name: /^Chọn · \d+ ngày$/ }).click();
  await sheet.waitFor({ state: 'hidden', timeout: 10000 });
}

async function addProduct(page, name, qty = 1) {
  await page.getByPlaceholder('Tìm tên hoặc quét mã vạch').fill(name);
  const add = page.getByRole('button', { name: `Thêm ${name} vào đơn` });
  await add.waitFor({ timeout: 30000 });
  await add.click();
  const more = page.getByRole('button', { name: `Thêm 1 ${name}` });
  for (let i = 1; i < qty; i += 1) await more.click();
}

/** Existing customer: search by phone and pick. New customer: "Thêm khách mới" in the same dialog. */
async function pickCustomer(page, { phone, firstName, newName, newPhone }) {
  await page.getByRole('button', { name: /Khách hàng\s*Chọn khách|Khách hàng\s*\S+.*Đổi/ }).first().click();
  const dlg = page.getByRole('dialog', { name: 'Chọn khách' });
  await dlg.waitFor({ timeout: 15000 });
  if (newName) {
    const search = dlg.getByRole('searchbox', { name: 'Tìm tên hoặc số điện thoại' });
    await search.fill(newPhone || newName);
    await dlg.getByRole('button', { name: /Thêm khách mới/ }).first().click();
    const nd = page.getByRole('dialog', { name: 'Khách mới' });
    await nd.waitFor({ timeout: 10000 });
    await nd.getByLabel('Họ tên').fill(newName);
    if (newPhone) await nd.getByLabel('Số điện thoại').fill(newPhone);
    await nd.getByRole('button', { name: 'Lưu và chọn' }).click();
    await nd.waitFor({ state: 'hidden', timeout: 15000 });
  } else {
    await dlg.getByRole('searchbox', { name: 'Tìm tên hoặc số điện thoại' }).fill(phone);
    await dlg.getByRole('button', { name: new RegExp(firstName) }).first().click();
  }
  await dlg.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
}

/**
 * Press "Tạo đơn" in the cart and go through the confirm / overlap dialogs.
 * Returns { sent, order } of POST /api/orders (or { blocked: text } when the screen refused).
 */
async function submit(page, { acceptOverlap = true } = {}) {
  const posted = page.waitForResponse((r) => /\/api\/orders$/.test(r.url().split('?')[0]) && r.request().method() === 'POST', { timeout: 45000 });
  posted.catch(() => {});
  const cart = page.locator('[aria-label="Đơn đang tạo"]').first();
  await cart.getByRole('button', { name: /^Tạo đơn/ }).click();
  for (let i = 0; i < 6; i += 1) {
    const dlg = page.getByRole('dialog').last();
    const btn = dlg.getByRole('button', { name: /^(Tạo đơn|Vẫn tạo đơn|Bán & thu tiền|Xác nhận|Đồng ý)/ });
    const state = await Promise.race([
      posted.then(() => 'posted'),
      btn.first().waitFor({ timeout: 4000 }).then(() => 'dialog').catch(() => 'wait')
    ]);
    if (state === 'posted') break;
    if (state === 'dialog') {
      const text = await dlg.innerText();
      if (/Trùng lịch/.test(text) && !acceptOverlap) return { blocked: text };
      await btn.first().click();
    }
  }
  const res = await posted.catch(() => null);
  if (!res) return { blocked: (await page.locator('body').innerText()).slice(-400) };
  return { sent: JSON.parse(res.request().postData() || '{}'), status: res.status(), body: await res.json() };
}

/** The day sheet opens by itself on a new order: close it (sale orders have no days) */
async function closeDaysSheet(page) {
  const sheet = page.getByRole('dialog', { name: 'Ngày giao và trả' });
  if (await sheet.isVisible().catch(() => false)) {
    await sheet.getByRole('button', { name: 'Huỷ' }).click();
    await sheet.waitFor({ state: 'hidden', timeout: 10000 });
  }
}

module.exports = { closeDaysSheet, go, pickDays, addProduct, pickCustomer, submit, digits, vnDateKey, addDays };
