/**
 * BF-BOOK: online booking requests, "Đặt đơn online" (#1124, PR1: database + API).
 * A customer sends a request from the public shop page; the shop confirms it (POST /api/orders with
 * `bookingRequestId` → RESERVED order) or rejects it; an unanswered request expires after 24 h.
 * Public calendar = free / full per Vietnam civil day only. Runs against a LOCAL API and a LOCAL seeded database:
 * the booking switch and the expiry fixture are set with psql (E2E_DATABASE_URL, local host only).
 * Run with scripts/e2e/booking-e2e.sh (both time zones).
 */
const { execFileSync } = require('child_process');
const { Session, describeE2E, passwordLogin, request, vnDateKey, addDays, rentBody } = require('../helpers/api');

const DB_URL = process.env.E2E_DATABASE_URL || '';

function sql(query) {
  if (!DB_URL) throw new Error('E2E_DATABASE_URL is not set (the booking suite sets the switch and the expiry with psql)');
  const host = new URL(DB_URL).hostname;
  if (!['127.0.0.1', 'localhost'].includes(host)) throw new Error(`E2E_DATABASE_URL host "${host}" is not local`);
  return execFileSync('psql', [DB_URL, '-X', '-q', '-tA', '-v', 'ON_ERROR_STOP=1', '-c', query], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

// Every run gets its own phones and client addresses: the phone limit counts rows of the last hour in the database
// and the address limit is in memory per API process.
const run = Date.now() % 1_000_000;
let phoneSeq = 0;
const newPhone = () => `09${String(run).padStart(6, '0')}${String(++phoneSeq).padStart(2, '0')}`;
let ipSeq = 0;
const newIp = () => `10.${(run >> 16) & 255}.${(run >> 8) & 255}.${++ipSeq % 250}`;
const masked = (p) => `${p.slice(0, 3)}${'*'.repeat(p.length - 6)}${p.slice(-3)}`;

describeE2E('BF-BOOK online booking requests (#1124)', () => {
  let owner;
  let staff;
  let otherOutletStaff;
  let merchantId;
  let tenantKey;
  let otherTenantKey;
  let outletId;
  let p1; // stock 2
  let p2; // stock 1, full on day+1 (a RESERVED order)
  const today = vnDateKey();
  const day = addDays(today, 3);
  const created = {}; // label → { code, id, phone }

  const pub = (method, path, { json, ip } = {}) =>
    request(null, method, `/api/public/${tenantKey}${path}`, { json, headers: { 'x-forwarded-for': ip || newIp() } });
  const send = (extra = {}, ip) =>
    pub('POST', '/booking-requests', {
      ip,
      json: {
        outletId,
        pickupDate: day,
        returnDate: day,
        items: [
          { productId: p1.id, quantity: 1 },
          { productId: p2.id, quantity: 1 }
        ],
        name: 'Nguyễn Thị Mai',
        phone: newPhone(),
        note: 'E2E booking',
        website: '',
        ...extra
      }
    });
  const requestId = (code) => Number(sql(`SELECT id FROM "BookingRequest" WHERE code = ${q(code)}`));
  const orderBody = (customer, bookingRequestId) => ({
    ...rentBody({ customer, lines: [{ product: p1 }, { product: p2 }], from: day, to: day }).body,
    outletId,
    bookingRequestId
  });

  beforeAll(async () => {
    owner = await Session.login('merchant');
    staff = await Session.login('staff');
    merchantId = Number(owner.user.merchantId || sql(`SELECT "merchantId" FROM "User" WHERE id = ${owner.user.id}`));
    outletId = await owner.defaultOutletId();
    tenantKey = sql(`SELECT "tenantKey" FROM "Merchant" WHERE id = ${merchantId}`);
    otherTenantKey = sql(`SELECT "tenantKey" FROM "Merchant" WHERE id <> ${merchantId} AND "tenantKey" IS NOT NULL ORDER BY id LIMIT 1`);
    if (!tenantKey) throw new Error(`merchant ${merchantId} has no tenantKey in the seed`);
    // OUTLET_STAFF of another outlet of the same shop
    const otherEmail = sql(`SELECT u.email FROM "User" u JOIN "Outlet" o ON o.id = u."outletId"
      WHERE u.role = 'OUTLET_STAFF' AND o."merchantId" = ${merchantId} AND o.id <> ${outletId} AND u."isActive" AND u."deletedAt" IS NULL
      ORDER BY o.id LIMIT 1`);
    if (!otherEmail) throw new Error('no OUTLET_STAFF on a second outlet of the main merchant');
    const login = await passwordLogin({ email: otherEmail, password: process.env.BIZ_E2E_STAFF_PASSWORD || 'staff123' });
    otherOutletStaff = new Session(login.token, login.user);
    // Start from "off" so a rerun on the same database proves the switch again
    sql(`UPDATE "Merchant" SET "onlineBookingEnabled" = false WHERE id = ${merchantId}`);
    p1 = await owner.createProduct({ kind: 'FIXED', price: 250000, stock: 2, name: `Áo dài E2E ${run}` });
    p2 = await owner.createProduct({ kind: 'FIXED', price: 30000, stock: 1, name: `Khăn đóng E2E ${run}` });
    const c = await owner.createCustomer();
    await owner.createOrder(rentBody({ customer: c, lines: [{ product: p2 }], from: addDays(day, 1), to: addDays(day, 1) }).body);
  });

  afterAll(() => {
    if (merchantId) sql(`UPDATE "Merchant" SET "onlineBookingEnabled" = false WHERE id = ${merchantId}`);
  });

  test('BF-BOOK-01 booking is off by default (403 BOOKING_DISABLED); the owner turns it on in settings', async () => {
    const off = await pub('GET', `/availability?productId=${p1.id}&outletId=${outletId}&from=${today}&to=${day}`);
    expect(off.status).toBe(403);
    expect(off.body.code).toBe('BOOKING_DISABLED');
    const products = await pub('GET', '/products?limit=1');
    expect(products.body.data.merchant.onlineBooking).toBe(false);

    const staffTry = await staff.put('/api/settings/merchant', { onlineBookingEnabled: true });
    expect(staffTry.status).toBe(403);
    const on = await owner.put('/api/settings/merchant', { onlineBookingEnabled: true });
    expect(on.status).toBe(200);
    expect(on.body.data.onlineBookingEnabled).toBe(true);
    const profile = await owner.get('/api/users/profile');
    expect(profile.body.data.merchant.onlineBookingEnabled).toBe(true);
    const after = await pub('GET', '/products?limit=1');
    expect(after.body.data.merchant.onlineBooking).toBe(true);
    expect(after.body.data.outlets.find((o) => o.id === outletId).acceptsOnlineBooking).toBe(true);
  });

  test('BF-BOOK-02 public calendar: free / full per Vietnam day, past days full, no quantities', async () => {
    const from = addDays(today, -1);
    const to = addDays(day, 2);
    const r = await pub('GET', `/availability?productId=${p2.id}&outletId=${outletId}&from=${from}&to=${to}`);
    expect(r.status).toBe(200);
    const byDay = Object.fromEntries(r.body.data.days.map((d) => [d.date, d.status]));
    expect(byDay[from]).toBe('full');
    expect(byDay[today]).toBe('free');
    expect(byDay[day]).toBe('free');
    expect(byDay[addDays(day, 1)]).toBe('full');
    expect(byDay[addDays(day, 2)]).toBe('free');
    expect(Object.keys(byDay)).toHaveLength(r.body.data.days.length);
    expect(JSON.stringify(r.body.data)).not.toMatch(/available|booked|stock/);
  });

  test('BF-BOOK-03 a valid request: 201 PENDING, 5-letter code, 24 h expiry, inbox row for the outlet', async () => {
    const phone = newPhone();
    const r = await send({ phone });
    expect(r.status).toBe(201);
    expect(r.body.code).toBe('BOOKING_REQUEST_CREATED');
    expect(r.body.data.code).toMatch(/^[A-Z2-9]{5}$/);
    expect(r.body.data.status).toBe('PENDING');
    const ttl = new Date(r.body.data.expiresAt).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(23.9 * 3600e3);
    expect(ttl).toBeLessThanOrEqual(24 * 3600e3);
    created.a = { code: r.body.data.code, id: requestId(r.body.data.code), phone };
    // pickup / return stored at the start of the Vietnam day
    const [pickup] = sql(`SELECT to_char("pickupPlanAt", 'YYYY-MM-DD"T"HH24:MI') FROM "BookingRequest" WHERE id = ${created.a.id}`).split('\n');
    expect(pickup).toBe(`${addDays(day, -1)}T17:00`);
    // fire-and-forget inbox row for the outlet's users
    let rows = 0;
    for (let i = 0; i < 20 && rows === 0; i++) {
      rows = Number(sql(`SELECT count(*) FROM "Notification" WHERE type = 'BOOKING_REQUEST' AND data->>'code' = ${q(created.a.code)}`));
      if (rows === 0) await new Promise((res) => setTimeout(res, 250));
    }
    expect(rows).toBeGreaterThan(0);
  });

  test('BF-BOOK-04 a filled honeypot answers 201 but saves nothing', async () => {
    const before = Number(sql(`SELECT count(*) FROM "BookingRequest" WHERE "merchantId" = ${merchantId}`));
    const r = await send({ website: 'http://spam.example' });
    expect(r.status).toBe(201);
    expect(Number(sql(`SELECT count(*) FROM "BookingRequest" WHERE "merchantId" = ${merchantId}`))).toBe(before);
    expect((await pub('GET', `/booking-requests/${r.body.data.code}`)).status).toBe(404);
  });

  test('BF-BOOK-05 a product full on one of the days: 409 BOOKING_NOT_AVAILABLE with the product and the day', async () => {
    const r = await send({ returnDate: addDays(day, 1) });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('BOOKING_NOT_AVAILABLE');
    expect(r.body.data).toEqual({ productId: p2.id, date: addDays(day, 1) });
  });

  test('BF-BOOK-06 rate limits: 4th request of one phone in an hour, 6th of one address in 10 minutes → 429', async () => {
    const phone = newPhone();
    for (let i = 0; i < 3; i++) expect((await send({ phone })).status).toBe(201);
    const byPhone = await send({ phone });
    expect(byPhone.status).toBe(429);
    expect(byPhone.body.code).toBe('BOOKING_RATE_LIMITED');

    const ip = newIp();
    for (let i = 0; i < 5; i++) expect((await send({}, ip)).status).toBe(201);
    const byIp = await send({}, ip);
    expect(byIp.status).toBe(429);
    expect(byIp.body.code).toBe('BOOKING_RATE_LIMITED');
  });

  test('BF-BOOK-07 tracking by code: status, days and items, phone masked; another shop’s key → 404', async () => {
    const r = await pub('GET', `/booking-requests/${created.a.code}`);
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ code: created.a.code, status: 'PENDING', pickupDate: day, returnDate: day, customerPhone: masked(created.a.phone) });
    expect(r.body.data.items.map((i) => i.productId)).toEqual([p1.id, p2.id]);
    expect(JSON.stringify(r.body)).not.toContain(created.a.phone);
    // another shop (booking off → 403 BOOKING_DISABLED; on → the code is not theirs → 404)
    const off = await request(null, 'GET', `/api/public/${otherTenantKey}/booking-requests/${created.a.code}`);
    expect(off.status).toBe(403);
    sql(`UPDATE "Merchant" SET "onlineBookingEnabled" = true WHERE "tenantKey" = ${q(otherTenantKey)}`);
    try {
      const other = await request(null, 'GET', `/api/public/${otherTenantKey}/booking-requests/${created.a.code}`);
      expect(other.status).toBe(404);
      expect(other.body.code).toBe('BOOKING_REQUEST_NOT_FOUND');
    } finally {
      sql(`UPDATE "Merchant" SET "onlineBookingEnabled" = false WHERE "tenantKey" = ${q(otherTenantKey)}`);
    }
  });

  test('BF-BOOK-08 shop list: owner and the outlet’s staff see it; staff of another outlet do not', async () => {
    const mine = await owner.get('/api/booking-requests?status=PENDING&limit=100');
    expect(mine.status).toBe(200);
    expect(mine.body.code).toBe('BOOKING_REQUESTS_FOUND');
    const row = mine.body.data.requests.find((x) => x.code === created.a.code);
    expect(row).toMatchObject({ id: created.a.id, customerPhone: created.a.phone, outlet: { id: outletId }, pickupDate: day, returnDate: day, itemCount: 2 });
    expect(mine.body.data.counts.PENDING).toBeGreaterThanOrEqual(1);
    const sameOutlet = await staff.get('/api/booking-requests?status=PENDING&limit=100');
    expect(sameOutlet.body.data.requests.some((x) => x.code === created.a.code)).toBe(true);
    const otherOutlet = await otherOutletStaff.get('/api/booking-requests?limit=100');
    expect(otherOutlet.status).toBe(200);
    expect(otherOutlet.body.data.requests.some((x) => x.code === created.a.code)).toBe(false);
    expect((await otherOutletStaff.get(`/api/booking-requests/${created.a.id}`)).status).toBe(404);
  });

  test('BF-BOOK-09 prepare: the customer is created from the phone and the cart is prefilled', async () => {
    const r = await owner.post(`/api/booking-requests/${created.a.id}/prepare`, {});
    expect(r.status).toBe(200);
    expect(r.body.code).toBe('BOOKING_REQUEST_PREPARED');
    expect(r.body.data).toMatchObject({ bookingRequestId: created.a.id, orderType: 'RENT', outletId, customerCreated: true });
    expect(r.body.data.customer).toMatchObject({ phone: created.a.phone });
    expect(r.body.data.items.map((i) => [i.productId, i.quantity])).toEqual([
      [p1.id, 1],
      [p2.id, 1]
    ]);
    created.a.customer = r.body.data.customer;
    // a second prepare finds the same customer
    const again = await owner.post(`/api/booking-requests/${created.a.id}/prepare`, {});
    expect(again.body.data.customerCreated).toBe(false);
    expect(again.body.data.customer.id).toBe(created.a.customer.id);
  });

  test('BF-BOOK-10 POST /api/orders with bookingRequestId: RESERVED order, request CONFIRMED; a second confirm 409', async () => {
    const r = await owner.createOrderRaw(orderBody(created.a.customer, created.a.id));
    expect(r.status).toBe(200);
    const order = r.body.data;
    expect(order.status).toBe('RESERVED');
    const detail = await owner.get(`/api/booking-requests/${created.a.id}`);
    expect(detail.body.data).toMatchObject({ status: 'CONFIRMED', orderId: order.id });
    const track = await pub('GET', `/booking-requests/${created.a.code}`);
    expect(track.body.data).toMatchObject({ status: 'CONFIRMED', orderNumber: order.orderNumber });

    const twice = await owner.createOrderRaw(orderBody(created.a.customer, created.a.id));
    expect(twice.status).toBe(409);
    expect(twice.body.code).toBe('BOOKING_REQUEST_CLOSED');
    expect((await owner.post(`/api/booking-requests/${created.a.id}/prepare`, {})).status).toBe(409);
    expect(Number(sql(`SELECT count(*) FROM "Order" WHERE "customerId" = ${created.a.customer.id}`))).toBe(1);
  });

  // After BF-BOOK-10 the confirmed order holds the only p2 on `day`: later requests ask for p1 only
  const p1Only = () => ({ items: [{ productId: p1.id, quantity: 1 }] });

  test('BF-BOOK-11 reject: staff of the outlet rejects with a reason; other outlet 404; closed after', async () => {
    const full = await send();
    expect(full.status).toBe(409);
    expect(full.body.data).toEqual({ productId: p2.id, date: day });
    const r = await send(p1Only());
    expect(r.status).toBe(201);
    const b = { code: r.body.data.code, id: requestId(r.body.data.code) };
    expect((await otherOutletStaff.post(`/api/booking-requests/${b.id}/reject`, { reason: 'OTHER' })).status).toBe(404);
    expect((await staff.post(`/api/booking-requests/${b.id}/reject`, { reason: 'BORED' })).status).toBe(400);
    const ok = await staff.post(`/api/booking-requests/${b.id}/reject`, { reason: 'OUT_OF_STOCK', note: 'Hết size M' });
    expect(ok.status).toBe(200);
    expect(ok.body.code).toBe('BOOKING_REQUEST_REJECTED');
    const track = await pub('GET', `/booking-requests/${b.code}`);
    expect(track.body.data).toMatchObject({ status: 'REJECTED', rejectReason: 'OUT_OF_STOCK' });
    const again = await staff.post(`/api/booking-requests/${b.id}/reject`, { reason: 'OTHER' });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('BOOKING_REQUEST_CLOSED');
    const customer = await owner.createCustomer();
    expect((await owner.createOrderRaw(orderBody(customer, b.id))).status).toBe(409);
  });

  test('BF-BOOK-12 expiry: 24 h after sending a PENDING request reads EXPIRED and cannot be confirmed', async () => {
    const r = await send(p1Only());
    expect(r.status).toBe(201);
    const c = { code: r.body.data.code, id: requestId(r.body.data.code) };
    // time travel: the request was sent 24 h and 1 minute ago
    sql(`UPDATE "BookingRequest" SET "expiresAt" = (now() at time zone 'utc') - interval '1 minute' WHERE id = ${c.id}`);
    expect((await pub('GET', `/booking-requests/${c.code}`)).body.data.status).toBe('EXPIRED');
    expect((await owner.post(`/api/booking-requests/${c.id}/prepare`, {})).status).toBe(409);
    const customer = await owner.createCustomer();
    const order = await owner.createOrderRaw(orderBody(customer, c.id));
    expect(order.status).toBe(409);
    expect(order.body.code).toBe('BOOKING_REQUEST_CLOSED');
    const list = await owner.get('/api/booking-requests?status=EXPIRED&limit=100');
    expect(list.body.data.requests.some((x) => x.code === c.code)).toBe(true);
    expect(sql(`SELECT status FROM "BookingRequest" WHERE id = ${c.id}`)).toBe('EXPIRED');
  });

  test('BF-BOOK-13 an outlet that stops taking requests: calendar and create refuse it', async () => {
    sql(`UPDATE "Outlet" SET "acceptsOnlineBooking" = false WHERE id = ${outletId}`);
    try {
      const cal = await pub('GET', `/availability?productId=${p1.id}&outletId=${outletId}&from=${today}&to=${day}`);
      expect(cal.status).toBe(400);
      expect(cal.body.code).toBe('BOOKING_OUTLET_UNAVAILABLE');
      expect((await send()).status).toBe(400);
    } finally {
      sql(`UPDATE "Outlet" SET "acceptsOnlineBooking" = true WHERE id = ${outletId}`);
    }
  });
});
