#!/usr/bin/env node
/**
 * WEB-CANCEL-FEE (#1491): an order without a deposit plan that was not handed over is cancelled from the order page in the
 * dialog "Khách đã trả / Phụ thu / Hoàn cho khách". The owner types the fee, the refund follows, and the cancelled order
 * shows what the shop kept and what went back. Numbers are the cases the owner approved (2026-11-07).
 * Needs WEB_E2E_ORDER_ID (the order's API id) and WEB_E2E_ORDER_NUMBER (its number, the page URL is /orders/<number>): a booked
 * RENT order without a plan, rent 300.000, deposit 300.000 (merchant of WEB_E2E_EMAIL).
 * Run headed: WEB_E2E_HEADED=1 node tests/e2e/web/cancel-fee.web.js
 */
const H = require('./ui-helpers');
const { CFG } = H;

const digits = (s) => String(s || '').replace(/\D/g, '');

async function main() {
  const rec = H.recorder({});
  const { check } = rec;
  const shot = H.shotter();
  const id = process.env.WEB_E2E_ORDER_ID;
  const number = process.env.WEB_E2E_ORDER_NUMBER;
  if (!id || !number) throw new Error('WEB_E2E_ORDER_ID and WEB_E2E_ORDER_NUMBER are needed');
  const api = await H.apiLogin();
  const browser = await H.launch();
  const ctx = await H.openSession({ browser, api, lang: 'vi' });
  const page = await ctx.newPage();
  try {
    await H.runCase('WEB-CANCEL-01', 'case A: deposit 300.000, fee 100.000: refund 200.000', async () => {
      await page.goto(`${CFG.client}/orders/${number}`, { waitUntil: 'domcontentloaded' });
      await H.settle(page);
      await shot(page, 'web-cancel-1-detail');
      await page.getByRole('button', { name: 'Thêm thao tác' }).click();
      await page.getByText('Huỷ đơn', { exact: true }).first().click();
      const paid = page.locator('[data-cancel-paid]');
      await paid.waitFor({ timeout: 15000 });
      check('the fee dialog opens for an order without a plan', true);
      check('Khách đã trả shows the deposit 300.000', digits(await paid.textContent()) === '300000', await paid.textContent());
      const kept = page.getByLabel('Phụ thu').first();
      await kept.fill('100000');
      await kept.blur();
      await page.waitForTimeout(400);
      const refund = page.locator('[data-cancel-refund]');
      check('Hoàn cho khách shows 200.000 after typing 100.000', digits(await refund.textContent()) === '200000', await refund.textContent());
      await shot(page, 'web-cancel-2-fee-typed');
      // a fee above the deposit is cut to the deposit
      await kept.fill('300000');
      await kept.blur();
      await page.waitForTimeout(400);
      check('300.000 is cut to the deposit: refund 0', digits(await refund.textContent()) === '0', await refund.textContent());
      await kept.fill('100000');
      await kept.blur();
      await page.waitForTimeout(400);
      await page.locator('[data-cancel-confirm]').click();
      const card = page.locator('[data-cancel-outcome-card]');
      await card.waitFor({ timeout: 20000 });
      await H.settle(page);
      await shot(page, 'web-cancel-3-cancelled');
      check('the cancelled order shows Phụ thu 100.000', digits(await card.locator('[data-cancel-kept]').textContent()) === '100000');
      check('the cancelled order shows Hoàn cho khách 200.000', digits(await card.locator('[data-cancel-refunded]').textContent()) === '200000');
      const pay = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
      check('the payment card says the fee is revenue (not "Không tính doanh thu")', /Doanh thu \(phụ thu giữ lại\)/.test(pay) && !/Không tính doanh thu/.test(pay), pay.slice(0, 200));
    }, { page, rec, shot });

    await H.runCase('WEB-CANCEL-02', 'the order is cancelled and keeps its deposit on the server', async () => {
      const r = await fetch(`${CFG.api}/api/orders/${id}`, { headers: { Authorization: `Bearer ${api.token}` } });
      const j = await r.json();
      const o = j.data || {};
      check('status CANCELLED', o.status === 'CANCELLED', o.status);
      check('depositAmount stays 300.000', o.depositAmount === 300000, o.depositAmount);
    }, { page, rec, shot });

    await H.runCase('WEB-CANCEL-03', 'the orders list row of the cancelled order says what was kept', async () => {
      await page.goto(`${CFG.client}/orders?search=${number}`, { waitUntil: 'domcontentloaded' });
      await H.settle(page);
      const row = page.locator('tr, [role="row"], li, article').filter({ hasText: `#${number}` }).first();
      const rowText = (await row.innerText()).replace(/\s+/g, ' ');
      check('the list row shows "giữ lại" and not "không tính doanh thu"', /giữ lại/i.test(rowText) && !/không tính doanh thu/i.test(rowText), rowText.slice(0, 240));
      await shot(page, 'web-cancel-4-list');
    }, { page, rec, shot });
  } finally {
    await browser.close();
  }
  return H.finish(rec.results, 'web-cancel-fee-results.json');
}

H.main(main);
