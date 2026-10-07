/**
 * API helper for the shop-web e2e (#573): login, fixtures and cleanup over HTTP, outside the browser.
 * Only local hosts unless WEB_E2E_ALLOW_REMOTE=1. Login sends a random X-Forwarded-For so repeated runs do not
 * hit the per-IP login limit; the session is then put into the browser's localStorage (`authData`).
 */
const SHOP_TZ = 'Asia/Ho_Chi_Minh';

function assertLocal(url) {
  const host = new URL(url).hostname;
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host) && process.env.WEB_E2E_ALLOW_REMOTE !== '1') {
    throw new Error(`${url} is not local. The web e2e creates and cancels orders: run it on a local stack only.`);
  }
}

const randomIp = () => `10.${(Math.random() * 250) | 0}.${(Math.random() * 250) | 0}.${(Math.random() * 250) | 0}`;

class WebApi {
  constructor(base) {
    assertLocal(base);
    this.base = base.replace(/\/+$/, '');
    this.token = null;
    this.user = null;
  }

  /** POST /api/auth/login (the web login). Returns the `authData` the web keeps in localStorage. */
  async login(email, password) {
    const r = await fetch(`${this.base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': randomIp() },
      body: JSON.stringify({ email, password })
    });
    const j = await r.json().catch(() => ({}));
    if (!j.success) throw new Error(`login ${email}: HTTP ${r.status} ${j.code || ''} ${j.message || ''}`);
    this.token = j.data.token;
    this.user = j.data.user;
    this.creds = { email, password };
    this.auth = { token: j.data.token, user: j.data.user, expiresAt: Date.now() + 7 * 864e5 };
    return this.auth;
  }

  /**
   * One API call. Logins are single-session: when another login took the session (401), log in again once,
   * tell `onRelogin` (the browser must get the new token too) and retry.
   */
  async call(method, path, json, retried = false) {
    const headers = { Authorization: `Bearer ${this.token}` };
    if (json !== undefined) headers['Content-Type'] = 'application/json';
    const r = await fetch(`${this.base}${path}`, { method, headers, body: json === undefined ? undefined : JSON.stringify(json) });
    if (r.status === 401 && !retried && this.creds) {
      const auth = await this.login(this.creds.email, this.creds.password);
      if (this.onRelogin) await this.onRelogin(auth);
      return this.call(method, path, json, true);
    }
    const text = await r.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text.slice(0, 300) };
    }
    if (!r.ok || body?.success === false) throw new Error(`${method} ${path}: HTTP ${r.status} ${JSON.stringify(body).slice(0, 400)}`);
    return body.data;
  }

  get(path) {
    return this.call('GET', path);
  }

  async defaultOutletId() {
    if (this.user.outletId) return this.user.outletId;
    const data = await this.get('/api/outlets?limit=50');
    const outlets = data.outlets || data.items || data;
    return (outlets.find((o) => o.isDefault) || outlets[0]).id;
  }

  /** A FIXED rent product with `stock` units at the outlet, unique name (multipart `data`, like the apps). */
  async createProduct(name, stock, outletId) {
    const fd = new FormData();
    fd.append(
      'data',
      JSON.stringify({
        name,
        rentPrice: 100000,
        deposit: 0,
        totalStock: stock,
        outletStock: [{ outletId, stock }],
        pricingOptions: [{ type: 'FIXED', price: 100000, isDefault: true }]
      })
    );
    const r = await fetch(`${this.base}/api/products`, { method: 'POST', headers: { Authorization: `Bearer ${this.token}` }, body: fd });
    const j = await r.json();
    if (!j.success) throw new Error(`create product: HTTP ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
    return j.data.product || j.data;
  }

  async createCustomer(firstName) {
    const phone = `09${String(Date.now()).slice(-8)}`;
    const data = await this.call('POST', '/api/customers', { firstName, lastName: 'E2E', phone });
    return data.customer || data;
  }

  getOrder(id) {
    return this.get(`/api/orders/${id}`);
  }

  /** Cancel an order (RESERVED or PICKUPED). Never throws: cleanup must go on. */
  async cancel(id) {
    try {
      await this.call('PUT', `/api/orders/${id}`, { status: 'CANCELLED' });
      return true;
    } catch (e) {
      return e.message;
    }
  }
}

// ------------------------------------------------------------------ VN day keys (never the process zone)

function vnDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function addDays(key, n) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Weekday of a day key, 0 = Sunday (pure calendar math on the key). */
const weekdayOf = (key) => new Date(`${key}T00:00:00Z`).getUTCDay();

/** "T5 08/10" (the shop web day label, `formatDayLabel`): weekday + DD/MM. */
function dayLabel(key) {
  const wd = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][weekdayOf(key)];
  return `${wd} ${key.slice(8, 10)}/${key.slice(5, 7)}`;
}

/** "08/10/2026": the aria-label of a day cell in the range calendar. */
const cellLabel = (key) => key.split('-').reverse().join('/');

module.exports = { WebApi, SHOP_TZ, vnDateKey, addDays, weekdayOf, dayLabel, cellLabel, assertLocal };
