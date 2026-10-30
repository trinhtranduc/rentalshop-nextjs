#!/usr/bin/env node
/**
 * Order fixtures for the Android mobile flows (epic #1309, final e2e): the staged-deposit order of #1345 / #1350 and
 * its second-stage collection, made through the API as a role that is NOT the one signed in on the device
 * (logins are single-session: a curl login of the account under test signs the device out).
 *
 *   order-fixtures-api.js staged <actor> [notes]     RENT order 1.150.000 (subtotal 1.250.000 - discount 100.000), deposit stage 1 = 20% (230.000)
 *                                                    collected, stage 2 = 30% (345.000) not collected; "Thu khi giao" = 575.000. Prints JSON.
 *   order-fixtures-api.js collect <orderId> <actor>  collect stage 2 (345.000) as <actor>; prints JSON
 *   order-fixtures-api.js notes <orderId> <actor> "<text>"   change the order note
 *   order-fixtures-api.js order <orderId> <actor>    prints total / deposit / installments
 *   order-fixtures-api.js multi <actor> <productId> <qty> <fromOffset> <toOffset>   RENT order of <qty> units over VN days today+from..today+to
 * <actor>: merchant | manager | staff | kho (outlet 1 accounts). Env: E2E_API_URL (default http://localhost:$E2E_API_PORT), PRODUCT_ID (default 5).
 */
process.env.E2E_API_URL = process.env.E2E_API_URL || `http://localhost:${process.env.E2E_API_PORT || 3180}`;
const { request, must, rentBody, Session, passwordLogin } = require('../helpers/api.js');

const ACCOUNTS = {
  merchant: { email: process.env.E2E_MERCHANT_EMAIL || 'merchant1@example.com', password: process.env.E2E_MERCHANT_PASSWORD || 'merchant123' },
  manager: { email: process.env.E2E_MANAGER_EMAIL || 'admin.outlet1@example.com', password: process.env.E2E_MANAGER_PASSWORD || 'admin123' },
  staff: { email: process.env.E2E_STAFF_EMAIL || 'staff.outlet1@example.com', password: process.env.E2E_STAFF_PASSWORD || 'staff123' },
  kho: { email: process.env.E2E_INVENTORY_EMAIL || 'inventory.outlet1@example.com', password: process.env.E2E_INVENTORY_PASSWORD || 'inventory123' },
};
const CAPS = { 'x-client-capabilities': 'installments' };
const day = (n) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);

async function session(actor) {
  const creds = ACCOUNTS[actor];
  if (!creds) throw new Error(`unknown actor ${actor}`);
  const { token, user } = await passwordLogin(creds);
  return new Session(token, user);
}
const summary = (o) => ({
  id: o.id, orderNumber: o.orderNumber, total: o.totalAmount, deposit: o.depositAmount,
  stages: (o.installments || []).map((i) => [i.key, i.amount, i.status, i.paidAmount]),
});

(async () => {
  const [verb, a, b, c, d, e] = process.argv.slice(2);
  const s = await session(verb === 'staged' || verb === 'multi' ? a : b);
  if (verb === 'staged') {
    const productId = Number(process.env.PRODUCT_ID || 5);
    const product = await s.getProduct(productId);
    const customer = await s.createCustomer(`Khach ${Date.now() % 100000}`);
    const { body } = rentBody({
      customer,
      lines: [{ product, quantity: 1, unitPrice: 1250000, pricingType: 'FIXED' }],
      from: day(3), to: day(4), discountAmount: 100000, collateralDetails: 'CCCD goc', notes: b || undefined,
    });
    body.outletId = s.user.outletId || 1;
    body.paymentPlan = {
      items: [
        { label: 'Cọc giữ chỗ', type: 'PERCENT', value: 20, dueRule: { kind: 'ON_CREATE' } },
        { label: 'Cọc trước ngày lấy', type: 'PERCENT', value: 30, dueRule: { kind: 'BEFORE_PICKUP', days: 1 } },
      ],
      collectFirstNow: { method: 'CASH', reference: `e2e-final2-stage1-${Date.now()}` },
    };
    const created = await s.createOrder(body, CAPS);
    const id = created.id || created.order?.id;
    console.log(JSON.stringify(summary((await request(s.token, 'GET', `/api/orders/${id}`, { headers: CAPS })).body.data)));
  } else if (verb === 'collect') {
    const r = await request(s.token, 'POST', `/api/orders/${a}/installments/i2/collect`, { headers: CAPS, json: { amount: 345000, method: 'CASH', reference: `e2e-final2-stage2-${Date.now()}` } });
    if (!r.ok) throw new Error(`collect failed: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
    console.log(JSON.stringify(summary((await request(s.token, 'GET', `/api/orders/${a}`, { headers: CAPS })).body.data)));
  } else if (verb === 'notes') {
    const r = await request(s.token, 'PUT', `/api/orders/${a}`, { json: { notes: c } });
    if (!r.ok) throw new Error(`notes failed: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
    console.log('ok');
  } else if (verb === 'order') {
    console.log(JSON.stringify(summary((await request(s.token, 'GET', `/api/orders/${a}`, { headers: CAPS })).body.data)));
  } else if (verb === 'multi') {
    const product = await s.getProduct(Number(b));
    const customer = await s.createCustomer(`Khach ${Date.now() % 100000}`);
    const { body } = rentBody({ customer, lines: [{ product, quantity: Number(c), unitPrice: 100000, pricingType: 'FIXED' }], from: day(Number(d)), to: day(Number(e)) });
    body.outletId = s.user.outletId || 1;
    const created = await must(s.createOrderRaw(body), 'create order');
    console.log(JSON.stringify({ id: created.id || created.order?.id, orderNumber: (created.orderNumber || created.order?.orderNumber) }));
  } else {
    console.error('usage: staged|collect|notes|order|multi (see the header)'); process.exit(64);
  }
})().catch((err) => { console.error(err.message); process.exit(1); });
