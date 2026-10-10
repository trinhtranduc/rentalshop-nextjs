/**
 * Small HTTP client for the business e2e suite (#498).
 * Talks to a LOCAL API (E2E_API_URL) with the same endpoints and payloads the iOS/Android apps send.
 * Never point E2E_API_URL at dev-api or production: the suite creates products, customers and orders.
 */
const BASE = (process.env.E2E_API_URL || '').replace(/\/+$/, '');
const SHOP_TZ = 'Asia/Ho_Chi_Minh';

function assertLocalBase() {
  if (!BASE) throw new Error('E2E_API_URL is not set');
  const host = new URL(BASE).hostname;
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host) && process.env.E2E_ALLOW_REMOTE !== '1') {
    throw new Error(`E2E_API_URL host "${host}" is not local. The business e2e suite only runs against a local API.`);
  }
}

const ACCOUNTS = {
  merchant: {
    // merchant2 is on an ACTIVE paid plan in the seed (merchant1 is TRIAL with a 500-product limit)
    email: process.env.BIZ_E2E_MERCHANT_EMAIL || 'merchant2@example.com',
    password: process.env.BIZ_E2E_MERCHANT_PASSWORD || 'merchant123'
  },
  otherMerchant: {
    email: process.env.BIZ_E2E_OTHER_MERCHANT_EMAIL || 'merchant1@example.com',
    password: process.env.BIZ_E2E_OTHER_MERCHANT_PASSWORD || 'merchant123'
  },
  staff: {
    // OUTLET_STAFF of the main merchant's default outlet
    email: process.env.BIZ_E2E_STAFF_EMAIL || 'staff.outlet2@example.com',
    password: process.env.BIZ_E2E_STAFF_PASSWORD || 'staff123'
  },
  inventory: {
    // #682 OUTLET_INVENTORY (Nhân viên kho) of the same outlet as `staff`
    email: process.env.BIZ_E2E_INVENTORY_EMAIL || 'inventory.outlet2@example.com',
    password: process.env.BIZ_E2E_INVENTORY_PASSWORD || 'inventory123'
  }
};

const fs = require('fs');
const os = require('os');
const pathLib = require('path');

/** File with { account: { token, user } } shared by global-setup.js and the test files. */
function tokenCacheFile() {
  if (process.env.BIZ_E2E_TOKENS_FILE) return process.env.BIZ_E2E_TOKENS_FILE;
  const port = BASE ? new URL(BASE).port || '80' : 'none';
  return pathLib.join(os.tmpdir(), `anyrent-business-e2e-tokens-${port}.json`);
}

function readTokenCache() {
  try {
    return JSON.parse(fs.readFileSync(tokenCacheFile(), 'utf8'));
  } catch {
    return {};
  }
}

function writeTokenCache(cache) {
  fs.writeFileSync(tokenCacheFile(), JSON.stringify(cache), { mode: 0o600 });
}

/** POST /api/mobile/auth/login, the call both apps make. */
async function passwordLogin(account) {
  const creds = ACCOUNTS[account] || account;
  const r = await request(null, 'POST', '/api/mobile/auth/login', {
    json: { email: creds.email, password: creds.password, deviceId: `business-e2e-${account}` }
  });
  if (!r.ok) throw new Error(`login ${creds.email} failed: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return { token: r.body.data.token, user: r.body.data.user };
}

/** One HTTP call. Returns { status, ok, body } and never throws on 4xx/5xx. */
async function request(token, method, path, { json, form, headers = {} } = {}) {
  assertLocalBase();
  const h = { ...headers };
  // The login limiter (10 per 15 minutes, in memory) keys on x-forwarded-for: a login of the suite gets its own address,
  // so a long run with many accounts does not trip it (a run of 650+ tests logs in far more than 10 times)
  if (/\/auth\/login\b/.test(path) && !h['x-forwarded-for']) {
    h['x-forwarded-for'] = `10.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
  }
  if (token) h.Authorization = `Bearer ${token}`;
  let body;
  if (form) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(form)) fd.append(k, typeof v === 'string' ? v : JSON.stringify(v));
    body = fd;
  } else if (json !== undefined) {
    h['content-type'] = 'application/json';
    body = JSON.stringify(json);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers: h, body });
  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  return { status: res.status, ok: res.ok && parsed?.success !== false, body: parsed };
}

/** Throws with the API error when the call fails; returns `body.data`. */
async function must(promise, label) {
  const r = await promise;
  if (!r.ok) {
    throw new Error(`${label} failed: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 600)}`);
  }
  return r.body.data;
}

/** A logged-in user. Logins are single-session: one Session per account per test file. */
class Session {
  constructor(token, user) {
    this.token = token;
    this.user = user;
  }

  /**
   * Session for a seed account. Logins are single-session and rate limited (10 per 15 min per IP), so
   * global-setup.js logs every account in once per run and caches the tokens in a file; this reads it.
   */
  static async login(account = 'merchant') {
    const cached = readTokenCache()[account];
    if (cached) return new Session(cached.token, cached.user);
    const { token, user } = await passwordLogin(account);
    return new Session(token, user);
  }

  get(path) {
    return request(this.token, 'GET', path);
  }
  post(path, json) {
    return request(this.token, 'POST', path, { json });
  }
  put(path, json) {
    return request(this.token, 'PUT', path, { json });
  }
  patch(path, json) {
    return request(this.token, 'PATCH', path, { json });
  }
  postForm(path, data, headers) {
    return request(this.token, 'POST', path, { form: { data: JSON.stringify(data) }, headers });
  }
  putForm(path, data) {
    return request(this.token, 'PUT', path, { form: { data: JSON.stringify(data) } });
  }

  // ---------------------------------------------------------------- outlets / customers

  async defaultOutletId() {
    if (this.user.outletId) return this.user.outletId;
    const data = await must(this.get('/api/outlets?limit=50'), 'list outlets');
    const outlets = data.outlets || data.items || data;
    const def = outlets.find((o) => o.isDefault) || outlets[0];
    return def.id;
  }

  async createCustomer(name = uniqueName('Khach')) {
    const phone = `09${String(Date.now()).slice(-8)}`;
    const data = await must(this.post('/api/customers', { firstName: name, lastName: 'E2E', phone }), 'create customer');
    return data.customer || data;
  }

  // ---------------------------------------------------------------- products

  /**
   * Same multipart body as the iOS v2 product form: `data` = JSON, `pricingOptions` for rent pricing.
   * kind: 'FIXED' (per rental) | 'DAILY' (per day) | 'SALE'
   */
  async createProduct({ kind = 'FIXED', price = 100000, salePrice, deposit = 0, stock = 1, outletId, name } = {}) {
    const oid = outletId || (await this.defaultOutletId());
    const body = {
      name: name || uniqueName(`SP ${kind}`),
      rentPrice: kind === 'SALE' ? 0 : price,
      deposit,
      totalStock: stock,
      outletStock: [{ outletId: oid, stock }]
    };
    if (kind === 'SALE') body.salePrice = salePrice ?? price;
    if (salePrice !== undefined && kind !== 'SALE') body.salePrice = salePrice;
    if (kind === 'DAILY') {
      body.pricingType = 'DAILY';
      body.durationConfig = JSON.stringify({ minDuration: 1, maxDuration: 365, defaultDuration: 1 });
      body.pricingOptions = [{ type: 'DAILY', price, isDefault: true }];
    } else if (kind === 'FIXED') {
      body.pricingOptions = [{ type: 'FIXED', price, isDefault: true }];
    }
    const data = await must(this.postForm('/api/products', body), 'create product');
    return { ...(data.product || data), outletId: oid };
  }

  async getProduct(id) {
    return must(this.get(`/api/products/${id}`), `get product ${id}`);
  }

  updateProduct(id, patch) {
    return this.putForm(`/api/products/${id}`, patch);
  }

  /** GET /api/products/{id}/availability for a window of VN civil days. */
  async availability(productId, { from, to, quantity = 1, outletId, excludeOrderId } = {}) {
    const { start } = vnDayRange(from);
    const { end } = vnDayRange(to || from);
    const q = new URLSearchParams({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      quantity: String(quantity),
      timeZone: SHOP_TZ
    });
    if (outletId) q.set('outletId', String(outletId));
    if (excludeOrderId) q.set('excludeOrderId', String(excludeOrderId));
    return must(this.get(`/api/products/${productId}/availability?${q}`), 'availability');
  }

  /** POST /api/products/batch-availability, the cart check of both apps. */
  async batchAvailability(products, { from, to, outletId, excludeOrderId } = {}) {
    const body = {
      products,
      startDate: vnDayRange(from).start.toISOString(),
      endDate: vnDayRange(to || from).end.toISOString()
    };
    if (outletId) body.outletId = outletId;
    if (excludeOrderId) body.excludeOrderId = excludeOrderId;
    return must(this.post('/api/products/batch-availability', body), 'batch availability');
  }

  // ---------------------------------------------------------------- orders

  /** Raw create, as the iOS cart sends it (multipart `data`). Returns the HTTP result. */
  createOrderRaw(body, headers) {
    return this.postForm('/api/orders', body, headers);
  }

  async createOrder(body, headers) {
    return must(this.createOrderRaw(body, headers), 'create order');
  }

  async getOrder(id) {
    return must(this.get(`/api/orders/${id}`), `get order ${id}`);
  }

  updateOrder(id, patch) {
    return this.put(`/api/orders/${id}`, patch);
  }

  /** Status change the way iOS/Android send it: PUT /api/orders/{id} with `status` (+ hand-over fields). */
  setStatus(id, status, extra = {}) {
    return this.put(`/api/orders/${id}`, { status, ...extra });
  }

  /** Row of GET /api/orders (carries amountDue / refundDue, #389). */
  async orderRow(id, search) {
    const q = new URLSearchParams({ limit: '50' });
    if (search) q.set('search', search);
    const data = await must(this.get(`/api/orders?${q}`), 'list orders');
    const rows = data.orders || data.items || data;
    return rows.find((o) => o.id === id) || null;
  }

  async listOrders(params = {}) {
    const q = new URLSearchParams({ limit: '100', ...params });
    const data = await must(this.get(`/api/orders?${q}`), 'list orders');
    return data.orders || data.items || data;
  }

  // ---------------------------------------------------------------- analytics

  /** GET /api/analytics/period, the Overview v2 call (VN day keys). */
  async period(from, to = from, { limit = 50, groupBy = 'day' } = {}) {
    const q = new URLSearchParams({ startDate: from, endDate: to, groupBy, limit: String(limit), timeZone: SHOP_TZ });
    return must(this.get(`/api/analytics/period?${q}`), 'analytics period');
  }

  async incomeDaily(from, to = from) {
    const q = new URLSearchParams({ startDate: from, endDate: to });
    return must(this.get(`/api/analytics/income/daily?${q}`), 'income daily');
  }

  async outletOperations() {
    return must(this.get(`/api/analytics/outlet-operations?timeZone=${encodeURIComponent(SHOP_TZ)}`), 'outlet operations');
  }

  async customerOrders(customerId) {
    return must(this.get(`/api/customers/${customerId}/orders?limit=100`), 'customer orders');
  }

  /** Row of GET /api/analytics/top-products (drill-down ranking) for one product, walking every page. */
  async topProductRow(productId, from, to = from) {
    for (let page = 1; page <= 50; page += 1) {
      const q = new URLSearchParams({ startDate: from, endDate: to, page: String(page), limit: '100', sortBy: 'revenue' });
      const data = await must(this.get(`/api/analytics/top-products?${q}`), 'top products');
      const hit = (data.items || []).find((r) => r.id === productId);
      if (hit) return hit;
      if (page >= (data.totalPages || 1)) return null;
    }
    return null;
  }

  /** OutletStock row { stock, available, renting } of a product at an outlet. */
  async outletStock(productId, outletId) {
    const p = await this.getProduct(productId);
    const row = (p.outletStock || []).find((os) => (os.outletId ?? os.outlet?.id) === outletId);
    return row ? { stock: row.stock, available: row.available, renting: row.renting } : null;
  }
}

/**
 * A price that grows through the day, so the product created last ranks first in today's
 * "top products" lists (limit 50) even after many runs on the same database.
 */
function risingPrice() {
  const now = new Date();
  const secondsOfDay = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  return 1000000000 + secondsOfDay * 1000;
}

// ------------------------------------------------------------------ dates (VN civil days)

/** `YYYY-MM-DD` of an instant in Vietnam, independent of process TZ. */
function vnDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Day key + n days (pure calendar math on the key). */
function addDays(key, n) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** UTC instants of a VN civil day: start 00:00 VN (= 17:00Z the day before), end 23:59:59.999 VN. Vietnam has no DST. */
function vnDayRange(key) {
  const start = new Date(`${key}T00:00:00+07:00`);
  const end = new Date(start.getTime() + 24 * 3600 * 1000 - 1);
  return { start, end };
}

/** An instant at hh:mm Vietnam time on a VN day key. */
function vnAt(key, hhmm = '10:00') {
  return new Date(`${key}T${hhmm}:00+07:00`);
}

/** Inclusive VN civil days between two day keys (#351: pickup and return day both count). */
function civilDays(fromKey, toKey) {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86400000) + 1;
}

let counter = 0;
function uniqueName(prefix) {
  counter += 1;
  return `${prefix} E2E ${Date.now().toString(36)}${process.pid.toString(36)}${counter}`;
}

/**
 * A future window of VN days nobody else books: products are fresh per test, so any future day works;
 * the offset keeps the windows apart inside one file.
 */
let windowCursor = 0;
function futureWindow(lengthDays = 1, gapDays = 0) {
  windowCursor += 10;
  const from = addDays(vnDateKey(), 30 + windowCursor + gapDays);
  return { from, to: addDays(from, lengthDays - 1) };
}

// ------------------------------------------------------------------ order bodies (iOS Cart.toCreateOrderRequest)

/**
 * RENT body. lines: [{ product, quantity, unitPrice?, pricingType? }]. Dates are VN day keys.
 * Pickup = 00:00 VN of `from`, return = 23:59:59 VN of `to`, like Android OrderPlanDays.
 */
function rentBody({ customer, lines, from, to, depositAmount = 0, securityDeposit, discountAmount = 0, discountType, discountValue, collateralDetails, notes }) {
  const days = civilDays(from, to);
  const orderItems = lines.map((l) => {
    const type = l.pricingType || (l.product.pricingType === 'DAILY' ? 'DAILY' : 'FIXED');
    const unitPrice = l.unitPrice ?? l.product.rentPrice;
    const qty = l.quantity || 1;
    const lineDays = type === 'DAILY' ? days : 1;
    const item = {
      productId: l.product.id,
      quantity: qty,
      unitPrice,
      totalPrice: qty * unitPrice * lineDays,
      deposit: (l.deposit || 0) * qty,
      pricingType: type
    };
    if (type === 'DAILY') item.rentDays = days;
    return item;
  });
  const subtotal = orderItems.reduce((s, i) => s + i.totalPrice, 0);
  const body = {
    orderType: 'RENT',
    customerId: customer.id,
    orderItems,
    pickupPlanAt: vnDayRange(from).start.toISOString(),
    returnPlanAt: vnDayRange(to).end.toISOString(),
    totalAmount: subtotal - discountAmount,
    depositAmount,
    rentalDuration: days,
    rentalDurationUnit: 'day',
    isReadyToDeliver: false
  };
  if (securityDeposit !== undefined) body.securityDeposit = securityDeposit;
  if (discountAmount > 0) {
    body.discountType = discountType || 'amount';
    body.discountValue = discountValue ?? discountAmount;
    body.discountAmount = discountAmount;
  }
  if (collateralDetails) body.collateralDetails = collateralDetails;
  if (notes) body.notes = notes;
  return { body, subtotal, days };
}

function saleBody({ customer, lines, discountAmount = 0 }) {
  const orderItems = lines.map((l) => {
    const unitPrice = l.unitPrice ?? l.product.salePrice;
    const qty = l.quantity || 1;
    return { productId: l.product.id, quantity: qty, unitPrice, totalPrice: qty * unitPrice };
  });
  const subtotal = orderItems.reduce((s, i) => s + i.totalPrice, 0);
  const body = { orderType: 'SALE', customerId: customer.id, orderItems, totalAmount: subtotal - discountAmount, depositAmount: 0 };
  if (discountAmount > 0) {
    body.discountType = 'amount';
    body.discountValue = discountAmount;
    body.discountAmount = discountAmount;
  }
  return { body, subtotal };
}

// ------------------------------------------------------------------ overview snapshots

/** The numbers the Overview screen shows for a range, flattened for deltas. */
function overviewNumbers(report) {
  const r = report.revenue || {};
  const op = report.operational || {};
  return {
    collected: r.collected ?? 0,
    orderValue: r.totalOrderValue ?? 0,
    outstanding: r.outstanding ?? 0,
    atPickup: r.outstandingBreakdown?.atPickup?.amount ?? 0,
    overduePickup: r.outstandingBreakdown?.overduePickup?.amount ?? 0,
    deposits: r.collectedBreakdown?.deposits ?? 0,
    pickupAndSale: r.collectedBreakdown?.pickupAndSale ?? 0,
    fees: r.collectedBreakdown?.fees ?? 0,
    refunds: r.collectedBreakdown?.refunds ?? 0,
    collateralReceived: r.collateralFlow?.received ?? 0,
    collateralReturned: r.collateralFlow?.returned ?? 0,
    totalRevenue: r.totalRevenue ?? 0,
    newOrders: op.orderCounts?.new ?? 0,
    pickups: op.orderCounts?.pickup ?? 0,
    returns: op.orderCounts?.return ?? 0,
    cancelled: op.orderCounts?.cancelled ?? 0,
    collateralHeld: op.totalCollateral ?? 0,
    seriesCollected: (report.series || []).reduce((s, p) => s + (p.collected ?? 0), 0),
    seriesNewOrders: (report.series || []).reduce((s, p) => s + (p.newOrderCount ?? 0), 0)
  };
}

function diff(after, before) {
  const out = {};
  for (const k of Object.keys(after)) out[k] = Math.round((after[k] - (before[k] || 0)) * 100) / 100;
  return out;
}

/** Overview watcher for a fixed day range: `await w.delta()` = change since the last call. */
async function watchOverview(session, from, to = from) {
  let last = overviewNumbers(await session.period(from, to));
  return {
    async delta() {
      const report = await session.period(from, to);
      const now = overviewNumbers(report);
      const d = diff(now, last);
      last = now;
      d.report = report;
      return d;
    }
  };
}

/** Only the given keys of a delta, for readable expect(...).toEqual(...). */
function pick(obj, keys) {
  const out = {};
  for (const k of keys) out[k] = obj[k];
  return out;
}

/** Fails if any string in the payload looks like a CUID (c + 24 lowercase alnum). */
function findCuids(value, path = '$', found = []) {
  if (typeof value === 'string') {
    if (/^c[a-z0-9]{24}$/.test(value)) found.push(`${path}=${value}`);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => findCuids(v, `${path}[${i}]`, found));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) findCuids(v, `${path}.${k}`, found);
  }
  return found;
}

const hasApi = Boolean(BASE);
/** `describe` when E2E_API_URL is set, otherwise `describe.skip` (the default `yarn test` has no API). */
const describeE2E = (...args) => (hasApi ? describe : describe.skip)(...args);

/**
 * A case that asserts the correct business rule while the API still has a known bug (#498 rules):
 * `test.failing` (green while the bug is there, red once it is fixed: then turn it into `test`).
 * BIZ_E2E_SHOW_BUGS=1 runs them as plain tests to see the actual numbers.
 */
function knownBug(issue, name, fn, timeout) {
  const title = `${name} [known bug ${issue}]`;
  return process.env.BIZ_E2E_SHOW_BUGS === '1' ? test(title, fn, timeout) : test.failing(title, fn, timeout);
}

module.exports = {
  knownBug,
  BASE,
  passwordLogin,
  readTokenCache,
  writeTokenCache,
  tokenCacheFile,
  SHOP_TZ,
  ACCOUNTS,
  Session,
  request,
  must,
  vnDateKey,
  vnDayRange,
  vnAt,
  addDays,
  civilDays,
  uniqueName,
  futureWindow,
  risingPrice,
  rentBody,
  saleBody,
  overviewNumbers,
  watchOverview,
  diff,
  pick,
  findCuids,
  describeE2E,
  hasApi
};
