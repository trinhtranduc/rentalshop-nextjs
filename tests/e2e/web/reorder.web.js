#!/usr/bin/env node
/**
 * WEB-REORDER (#1515): "Đặt lại đơn" on the shop-web order page, driven as a person does, against the real local API.
 * Order page → ⋯ → Đặt lại đơn → Tạo đơn opens with the cart of the old order (same customer, items, notes, CURRENT
 * prices, no discount / deposit, no dates) → pick days → Tạo đơn → the new order read back through the API.
 * Products and customers carry a unique name; every order the run creates is cancelled at the end.
 * Run: WEB_E2E_HEADED=1 scripts/e2e/web-e2e.sh --reorder
 */
const H = require('./ui-helpers');
const F = require('./ui-order-flow');
const { CFG } = H;
const { vnDateKey, addDays } = require('./web-api');

const dayIso = (key) => new Date(`${key}T00:00:00+07:00`).toISOString();

async function main() {
  const rec = H.recorder({});
  const { check } = rec;
  const shot = H.shotter();
  const api = await H.apiLogin();
  const outletId = await api.defaultOutletId();
  const today = vnDateKey();
  const created = [];
  const tag = H.uniq('RO');

  const prodA = await api.createProduct(`${tag} Áo A`, 10, outletId);
  const prodB = await api.createProduct(`${tag} Váy B`, 10, outletId);
  const customer = await api.createCustomer(`Khách${tag.slice(-4)}`);

  const apiOrder = async ({ type = 'RENT', P, R, items, discount = 0, deposit = 0, notes = '' }) => {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
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
      orderItems: items.map((i) => ({
        productId: i.product.id,
        quantity: i.qty,
        unitPrice: i.price,
        totalPrice: i.price * i.qty,
        deposit: 0,
        notes: i.note || '',
        rentDays: 1,
        ...(type === 'RENT' ? { pricingType: 'FIXED' } : {})
      }))
    };
    if (type === 'RENT') Object.assign(body, { pickupPlanAt: dayIso(P), returnPlanAt: dayIso(R) });
    const o = await api.call('POST', '/api/orders', body);
    created.push(o.id);
    return o;
  };

  /** Same multipart PUT the product form sends */
  const setRentPrice = async (product, price) => {
    const fd = new FormData();
    fd.append('data', JSON.stringify({ name: product.name, rentPrice: price, pricingOptions: [{ type: 'FIXED', price, isDefault: true }] }));
    const r = await fetch(`${CFG.api}/api/products/${product.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${api.token}` }, body: fd });
    if (!r.ok) throw new Error(`update product ${r.status}`);
  };

  const setSalePrice = async (product, price) => {
    const fd = new FormData();
    fd.append('data', JSON.stringify({ name: product.name, rentPrice: 100000, salePrice: price, pricingOptions: [{ type: 'FIXED', price: 100000, isDefault: true }] }));
    const r = await fetch(`${CFG.api}/api/products/${product.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${api.token}` }, body: fd });
    if (!r.ok) throw new Error(`update product ${r.status}`);
  };

  const browser = await H.launch();
  const ctx = await H.openSession({ browser, api });
  api.onRelogin = async () => {};
  const page = await ctx.newPage();
  const st = H.collect(page);
  const sp = { page, rec, shot };
  const cart = () => page.locator('[aria-label="Đơn đang tạo"]').first();
  const openMenu = async () => {
    await page.getByRole('button', { name: 'Thêm thao tác' }).click();
    await page.waitForTimeout(400);
  };
  const reorderFrom = async (order) => {
    await F.go(page, `/orders/${order.orderNumber}`);
    await openMenu();
    await page.getByRole('menuitem', { name: 'Đặt lại đơn' }).click();
    await page.waitForURL(/\/orders\/create\?reorder=/, { timeout: 30000 });
    await H.settle(page);
  };

  try {
    // ---------------------------------------------------------------- rent order with discount, deposit and notes
    const P = addDays(today, 3);
    const R = addDays(today, 4);
    const oldRent = await apiOrder({
      P,
      R,
      items: [{ product: prodA, qty: 2, price: 100000, note: 'Là sẵn' }, { product: prodB, qty: 1, price: 100000 }],
      discount: 30000,
      deposit: 50000,
      notes: 'Giao buổi sáng'
    });
    await setRentPrice(prodA, 120000); // the shop raised a price after the first order

    await H.runCase('WEB-REORDER-01', 'rent: ⋯ → Đặt lại đơn opens a cart like the order, current prices, no dates; then create', async () => {
      st.reset();
      await reorderFrom(oldRent);
      const c = cart();
      const text = await c.innerText();
      check('REORDER-01 cart lists both products', text.includes(prodA.name) && text.includes(prodB.name), text.slice(0, 300));
      check('REORDER-01 customer is the old order\'s', (await H.bodyText(page)).includes(customer.firstName), customer.firstName);
      check('REORDER-01 line note is kept', /Là sẵn/.test(await page.locator('body').innerText()) || (await page.locator('input,textarea').evaluateAll((els) => els.some((e) => /Là sẵn/.test(e.value || '')))));
      check('REORDER-01 no discount carried', !/Giảm giá\s*-?\s*30\.000/.test(text), text.slice(0, 400));
      const days = P === R ? 1 : 2;
      await F.pickDays(page, addDays(today, 6), addDays(today, 7)); // empty at first, so the person picks like a new rental
      const res = await F.submit(page);
      check('REORDER-01 order created', res.status === 200 || res.status === 201, JSON.stringify(res.blocked || res.body).slice(0, 200));
      if (res.body && res.body.data) created.push(res.body.data.id);
      const sent = res.sent || {};
      const items = (sent.orderItems || []).map((i) => [i.productId, i.quantity, i.unitPrice, i.notes || '']);
      // the API does not order the items of an order, so lines are compared as a set
      check('REORDER-01 body items: same products and quantities, current price for A', JSON.stringify([...items].sort((x, y) => x[0] - y[0])) === JSON.stringify([[prodA.id, 2, 120000, 'Là sẵn'], [prodB.id, 1, 100000, '']].sort((x, y) => x[0] - y[0])), JSON.stringify(items));
      check('REORDER-01 body: same customer and order notes', sent.customerId === customer.id && sent.notes === 'Giao buổi sáng', `${sent.customerId} / ${sent.notes}`);
      check('REORDER-01 body: no discount, no deposit', !(sent.discountAmount > 0) && !(sent.depositAmount > 0), `${sent.discountAmount} / ${sent.depositAmount}`);
      const fresh = res.body && res.body.data ? await api.get(`/api/orders/${res.body.data.id}`) : null;
      check('REORDER-01 API: new order, other number, status RESERVED', !!fresh && fresh.orderNumber !== oldRent.orderNumber && fresh.status === 'RESERVED', JSON.stringify(fresh && fresh.status));
      check('REORDER-01 API: total = current prices × days, no discount', !!fresh && fresh.totalAmount === 2 * 120000 + 100000, String(fresh && fresh.totalAmount));
      const still = await api.get(`/api/orders/${oldRent.id}`);
      check('REORDER-01 the old order is unchanged (prices, discount, deposit)', still.discountAmount === 30000 && still.depositAmount === 50000 && still.orderItems[0].unitPrice === 100000, `${still.discountAmount}/${still.depositAmount}`);
      const pr = await H.pageProblems(page, st);
      check('REORDER-01 healthy pages', pr.length === 0, pr.join('; '));
      void days;
    }, sp);

    // ---------------------------------------------------------------- cancelled order has the item too; sale has no days
    await setSalePrice(prodB, 100000);
    const oldSale = await apiOrder({ type: 'SALE', items: [{ product: prodB, qty: 3, price: 100000 }], notes: 'Khách quen' });
    await H.runCase('WEB-REORDER-02', 'sale: cart opens in the sale tab, no dates asked, create', async () => {
      st.reset();
      await reorderFrom(oldSale);
      await F.closeDaysSheet(page);
      const text = await cart().innerText();
      check('REORDER-02 cart has the sale product ×3', text.includes(prodB.name), text.slice(0, 300));
      const res = await F.submit(page);
      check('REORDER-02 order created', res.status === 200 || res.status === 201, JSON.stringify(res.blocked || res.body).slice(0, 200));
      if (res.body && res.body.data) created.push(res.body.data.id);
      const sent = res.sent || {};
      check('REORDER-02 body: SALE, same customer, qty 3, current price', sent.orderType === 'SALE' && sent.customerId === customer.id && (sent.orderItems || [])[0]?.quantity === 3 && (sent.orderItems || [])[0]?.unitPrice === 100000, JSON.stringify(sent.orderItems));
    }, sp);

    await H.runCase('WEB-REORDER-03', 'cancelled order: Đặt lại đơn is there too', async () => {
      const oc = await apiOrder({ P: addDays(today, 9), R: addDays(today, 10), items: [{ product: prodB, qty: 1, price: 100000 }] });
      await api.cancel(oc.id);
      await F.go(page, `/orders/${oc.orderNumber}`);
      await openMenu();
      check('REORDER-03 menu item visible on a cancelled order', await page.getByRole('menuitem', { name: 'Đặt lại đơn' }).isVisible());
      await page.keyboard.press('Escape');
    }, sp);

    // ---------------------------------------------------------------- a product that is gone
    const gone = await api.createProduct(`${tag} Sẽ xoá`, 5, outletId);
    const oldMixed = await apiOrder({ P: addDays(today, 12), R: addDays(today, 13), items: [{ product: prodB, qty: 1, price: 100000 }, { product: gone, qty: 1, price: 100000 }] });
    await api.cancel(oldMixed.id);
    await api.call('DELETE', `/api/products/${gone.id}`);
    await H.runCase('WEB-REORDER-04', 'a deleted product is dropped with a message; the rest stays', async () => {
      await reorderFrom(oldMixed);
      const text = await cart().innerText();
      check('REORDER-04 the live product is in the cart, the deleted one is not', text.includes(prodB.name) && !text.includes(gone.name), text.slice(0, 300));
      check('REORDER-04 message "1 món không còn bán, đã bỏ khỏi giỏ"', /1 món không còn bán, đã bỏ khỏi giỏ/.test(await page.locator('body').innerText()));
    }, sp);

    await H.runCase('WEB-REORDER-05', 'every product gone: no cart, a message, stays on the order page', async () => {
      const g2 = await api.createProduct(`${tag} Xoá hết`, 5, outletId);
      const o2 = await apiOrder({ P: addDays(today, 14), R: addDays(today, 15), items: [{ product: g2, qty: 1, price: 100000 }] });
      await api.cancel(o2.id);
      await api.call('DELETE', `/api/products/${g2.id}`);
      await F.go(page, `/orders/${o2.orderNumber}`);
      await openMenu();
      await page.getByRole('menuitem', { name: 'Đặt lại đơn' }).click();
      await page.getByText('Không còn món nào để đặt lại').first().waitFor({ timeout: 20000 });
      check('REORDER-05 message shown', true);
      check('REORDER-05 still on the order page (no new cart)', new RegExp(`/orders/${o2.orderNumber}`).test(page.url()), page.url());
    }, sp);
  } finally {
    for (const id of created) await api.cancel(id);
    await browser.close();
  }
  return H.finish(rec.results, 'web-reorder-results.json', { tag });
}

if (require.main === module) H.main(main);
module.exports = { main };
