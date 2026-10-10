/**
 * Helper for the subscription / plan e2e suite (BF-SUB, #727).
 *
 * These tests MUTATE subscription and plan rows, so they never use the shared seed merchants. Every describe makes
 * its own world: one Plan row with small limits, one Merchant (+ default outlet, category), a MERCHANT user, an
 * OUTLET_STAFF and an OUTLET_INVENTORY user. Rows are inserted with psql (E2E_DATABASE_URL, local host only) because
 * the real registration endpoint seeds demo data and needs email verification. Subscription and plan state is set
 * with psql too (there is no merchant-facing API to expire an account); everything else goes through the real API.
 *
 * Passwords are copied from a seeded account (merchant123) so no hash is computed here.
 * Logins are single-session and rate limited per IP (in memory, key = x-forwarded-for), so every login here sends its
 * own x-forwarded-for.
 */
const { execFileSync } = require('child_process');
const { Session, request, ACCOUNTS, uniqueName } = require('./api');

const DB_URL = process.env.E2E_DATABASE_URL || '';
const PASSWORD = 'merchant123';
/** What the iOS / Android apps send on every call (BaseService.swift, ApiClient.kt). */
const MOBILE_HEADERS = { 'x-client-platform': 'mobile', 'x-device-type': 'ios' };
/** What the web apps send (packages/utils/src/core/common.ts). */
const WEB_HEADERS = { 'x-client-platform': 'web', 'x-device-type': 'browser' };

/** Throws unless E2E_DATABASE_URL points at 127.0.0.1 / localhost. Never touches another host. */
function assertLocalDb() {
  if (!DB_URL) throw new Error('E2E_DATABASE_URL is not set (the subscription suite needs psql access to the local e2e database)');
  const host = new URL(DB_URL).hostname;
  if (!['127.0.0.1', 'localhost'].includes(host)) {
    throw new Error(`E2E_DATABASE_URL host "${host}" is not local: the subscription suite only mutates a local database`);
  }
}

/** Run SQL with psql and return the trimmed output (-tA: no headers, unaligned; -q: no command tags). */
function sql(query) {
  assertLocalDb();
  return execFileSync('psql', [DB_URL, '-X', '-q', '-tA', '-v', 'ON_ERROR_STOP=1', '-c', query], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const nowUtc = "(now() at time zone 'utc')";
/** SQL timestamp `days` days from now (UTC wall clock, the way Prisma stores DateTime). Negative = past. */
const inDays = (days) => `(${nowUtc} + interval '${days * 86400} seconds')`;

let seq = 0;
function runId() {
  seq += 1;
  return `${Date.now().toString(36)}${process.pid.toString(36)}${seq}`;
}

let hashCache;
function passwordHash() {
  if (!hashCache) hashCache = sql(`SELECT password FROM "User" WHERE email = ${q(ACCOUNTS.merchant.email)} LIMIT 1`);
  if (!hashCache) throw new Error('seeded merchant not found: run scripts/mobile-e2e/seed-local.sh first');
  return hashCache;
}

/** false when the suite cannot reach the database (E2E_DATABASE_URL unset): the describes are skipped. */
const hasDb = Boolean(DB_URL);

const DEFAULT_LIMITS = { outlets: 1, users: 3, products: 3, customers: 3, orders: 3 };

/** Insert a dedicated Plan. limits: { outlets, users, products, customers, orders, allowWebAccess, allowMobileAccess }. */
function createPlan(label, limits = {}) {
  const name = `E2E ${label} ${runId()}`;
  const body = { ...DEFAULT_LIMITS, ...limits };
  const features = ['Mobile app access', 'Web dashboard access'];
  return Number(
    sql(
      `INSERT INTO "Plan"(name, description, "basePrice", limits, features, "sortOrder", "isActive", "updatedAt")
       VALUES (${q(name)}, 'e2e plan', 0, ${q(JSON.stringify(body))}, ${q(JSON.stringify(features))}, 9999, true, ${nowUtc}) RETURNING id`
    )
  );
}

/** Replace some limit keys of a plan (merges into the JSON). Only ever called on plans this suite created. */
/** Set one flag of the plan's JSON limits to a value, or remove the key (value undefined). */
function setPlanFlag(planId, key, value) {
  const cur = JSON.parse(sql(`SELECT limits FROM "Plan" WHERE id = ${planId} AND name LIKE 'E2E %'`));
  if (value === undefined) delete cur[key];
  else cur[key] = value;
  sql(`UPDATE "Plan" SET limits = ${q(JSON.stringify(cur))}, "updatedAt" = ${nowUtc} WHERE id = ${planId} AND name LIKE 'E2E %'`);
}

function setPlanLimits(planId, patch) {
  const cur = JSON.parse(sql(`SELECT limits FROM "Plan" WHERE id = ${planId} AND name LIKE 'E2E %'`));
  const next = { ...cur, ...patch };
  sql(`UPDATE "Plan" SET limits = ${q(JSON.stringify(next))}, "updatedAt" = ${nowUtc} WHERE id = ${planId} AND name LIKE 'E2E %'`);
  return next;
}

function createUser(merchantId, outletId, role, email, name) {
  return Number(
    sql(
      `INSERT INTO "User"(email, password, "firstName", "lastName", role, "isActive", "emailVerified", "emailVerifiedAt",
                          "merchantId", "outletId", "updatedAt")
       VALUES (${q(email)}, ${q(passwordHash())}, ${q(name)}, 'E2E', ${q(role)}::"UserRole", true, true, ${nowUtc},
               ${merchantId == null ? 'NULL' : merchantId}, ${outletId == null ? 'NULL' : outletId}, ${nowUtc}) RETURNING id`
    )
  );
}

/**
 * A fresh merchant on `planId` (a new plan with small limits when omitted), ACTIVE for 30 more days, with a default
 * outlet and category plus a merchant, staff and kho user. Returns the ids and credentials (not logged in yet).
 */
function createWorld(label, { planId, limits, status = 'ACTIVE', endInDays = 30 } = {}) {
  const id = runId();
  const plan = planId || createPlan(label, limits);
  const merchantEmail = `sub.${id}.merchant@e2e.test`;
  const merchantId = Number(
    sql(
      `INSERT INTO "Merchant"(name, email, "tenantKey", "planId", "updatedAt")
       VALUES (${q(`E2E ${label} ${id}`)}, ${q(merchantEmail)}, ${q(`e2e-sub-${id}`)}, ${plan}, ${nowUtc}) RETURNING id`
    )
  );
  const outletId = Number(
    sql(
      `INSERT INTO "Outlet"(name, address, "isDefault", "merchantId", "updatedAt")
       VALUES (${q(`E2E outlet ${id}`)}, 'Ha Noi', true, ${merchantId}, ${nowUtc}) RETURNING id`
    )
  );
  sql(
    `INSERT INTO "Category"(name, "merchantId", "isDefault", "updatedAt") VALUES (${q(`E2E category ${id}`)}, ${merchantId}, true, ${nowUtc})`
  );
  const world = {
    id,
    planId: plan,
    merchantId,
    outletId,
    merchant: { email: merchantEmail, password: PASSWORD },
    staff: { email: `sub.${id}.staff@e2e.test`, password: PASSWORD },
    kho: { email: `sub.${id}.kho@e2e.test`, password: PASSWORD }
  };
  createUser(merchantId, outletId, 'MERCHANT', world.merchant.email, 'Merchant');
  createUser(merchantId, outletId, 'OUTLET_STAFF', world.staff.email, 'Staff');
  createUser(merchantId, outletId, 'OUTLET_INVENTORY', world.kho.email, 'Kho');
  insertSubscription(merchantId, plan, { status, endInDays });
  return world;
}

/**
 * Set the merchant's subscription row. status: ACTIVE | TRIAL | EXPIRED | CANCELLED | PAUSED | PAST_DUE.
 * endInDays: currentPeriodEnd relative to now (negative = already ended, fractions allowed: -1/24 = 1 hour ago).
 */
function setSubscription(merchantId, { status, endInDays, planId, canceledAt } = {}) {
  const sets = [`"updatedAt" = ${nowUtc}`];
  if (status !== undefined) sets.push(`status = ${q(status)}`);
  if (endInDays !== undefined) sets.push(`"currentPeriodEnd" = ${inDays(endInDays)}`);
  if (planId !== undefined) sets.push(`"planId" = ${planId}`);
  if (canceledAt === true) sets.push(`"canceledAt" = ${nowUtc}`);
  if (canceledAt === false) sets.push(`"canceledAt" = NULL`);
  sql(`UPDATE "Subscription" SET ${sets.join(', ')} WHERE "merchantId" = ${merchantId}`);
}

/** Remove the subscription row (a merchant that never subscribed). */
function deleteSubscription(merchantId) {
  sql(`DELETE FROM "Subscription" WHERE "merchantId" = ${merchantId}`);
}

/** Insert the subscription row again after deleteSubscription. */
function insertSubscription(merchantId, planId, { status = 'ACTIVE', endInDays = 30 } = {}) {
  sql(
    `INSERT INTO "Subscription"("merchantId", "planId", status, "currentPeriodStart", "currentPeriodEnd", amount, "updatedAt")
     VALUES (${merchantId}, ${planId}, ${q(status)}, ${inDays(-5)}, ${inDays(endInDays)}, 0, ${nowUtc})`
  );
}

function subscriptionRow(merchantId) {
  return sql(`SELECT status || '|' || "currentPeriodEnd" FROM "Subscription" WHERE "merchantId" = ${merchantId}`);
}

/** PlanLimitAddon (add-on that raises limits). Pass the amounts per entity. */
function addAddon(merchantId, amounts = {}, { isActive = true } = {}) {
  const a = { outlets: 0, users: 0, products: 0, customers: 0, orders: 0, ...amounts };
  return Number(
    sql(
      `INSERT INTO "PlanLimitAddon"("merchantId", outlets, users, products, customers, orders, notes, "isActive", "updatedAt")
       VALUES (${merchantId}, ${a.outlets}, ${a.users}, ${a.products}, ${a.customers}, ${a.orders}, 'e2e', ${isActive}, ${nowUtc}) RETURNING id`
    )
  );
}

function deleteAddons(merchantId) {
  sql(`DELETE FROM "PlanLimitAddon" WHERE "merchantId" = ${merchantId}`);
}

/** The counts the API compares with the limit (packages/utils/src/core/validation/entity-counts.ts, #729: a deleted
 * customer / outlet is isActive false, a deleted order has deletedAt). */
function counts(merchantId) {
  const row = sql(
    `SELECT
       (SELECT count(*) FROM "Outlet" WHERE "merchantId" = ${merchantId} AND "isActive" = true),
       (SELECT count(*) FROM "User" WHERE "merchantId" = ${merchantId} AND "deletedAt" IS NULL
          AND role IN ('MERCHANT','OUTLET_ADMIN','OUTLET_STAFF','OUTLET_INVENTORY')),
       (SELECT count(*) FROM "Product" WHERE "merchantId" = ${merchantId} AND "deletedAt" IS NULL),
       (SELECT count(*) FROM "Customer" WHERE "merchantId" = ${merchantId} AND "isActive" = true AND "deletedAt" IS NULL),
       (SELECT count(*) FROM "Order" o JOIN "Outlet" t ON t.id = o."outletId" WHERE t."merchantId" = ${merchantId} AND o."deletedAt" IS NULL)`
  ).split('|');
  const [outlets, users, products, customers, orders] = row.map(Number);
  return { outlets, users, products, customers, orders };
}

/** Raw row counts, including soft-deleted rows (to prove a failed create left nothing behind). */
function rawCounts(merchantId) {
  const row = sql(
    `SELECT
       (SELECT count(*) FROM "Outlet" WHERE "merchantId" = ${merchantId}),
       (SELECT count(*) FROM "User" WHERE "merchantId" = ${merchantId}),
       (SELECT count(*) FROM "Product" WHERE "merchantId" = ${merchantId}),
       (SELECT count(*) FROM "Customer" WHERE "merchantId" = ${merchantId}),
       (SELECT count(*) FROM "Order" o JOIN "Outlet" t ON t.id = o."outletId" WHERE t."merchantId" = ${merchantId})`
  ).split('|');
  const [outlets, users, products, customers, orders] = row.map(Number);
  return { outlets, users, products, customers, orders };
}

/** Soft-delete (deletedAt) every product / user matching, to check the counting rules. */
function softDeleteProduct(merchantId, publicId) {
  sql(`UPDATE "Product" SET "deletedAt" = ${nowUtc} WHERE "merchantId" = ${merchantId} AND id = ${publicId}`);
}
function softDeleteUser(merchantId, email) {
  sql(`UPDATE "User" SET "deletedAt" = ${nowUtc} WHERE "merchantId" = ${merchantId} AND email = ${q(email)}`);
}
function customerColumns() {
  return sql(`SELECT string_agg(column_name, ',') FROM information_schema.columns WHERE table_name = 'Customer'`);
}

/** Session whose every call carries `headers` (default: the mobile apps' platform headers). */
class SubSession extends Session {
  constructor(token, user, headers = MOBILE_HEADERS) {
    super(token, user);
    this.headers = headers;
  }
  asPlatform(headers) {
    this.headers = headers;
    return this;
  }
  get(path) {
    return request(this.token, 'GET', path, { headers: this.headers });
  }
  post(path, json) {
    return request(this.token, 'POST', path, { json, headers: this.headers });
  }
  put(path, json) {
    return request(this.token, 'PUT', path, { json, headers: this.headers });
  }
  patch(path, json) {
    return request(this.token, 'PATCH', path, { json, headers: this.headers });
  }
  delete(path) {
    return request(this.token, 'DELETE', path, { headers: this.headers });
  }
  postForm(path, data, headers) {
    return request(this.token, 'POST', path, { form: { data: JSON.stringify(data) }, headers: { ...this.headers, ...headers } });
  }
  putForm(path, data) {
    return request(this.token, 'PUT', path, { form: { data: JSON.stringify(data) }, headers: this.headers });
  }
}

let ipSeq = 0;
/** POST /api/mobile/auth/login with its own x-forwarded-for (the rate limiter keys on it). Returns the raw result. */
function loginRaw(creds, headers = MOBILE_HEADERS) {
  ipSeq += 1;
  const ip = `10.${process.pid % 250}.${Math.floor(Date.now() / 1000) % 250}.${ipSeq % 250}`;
  return request(null, 'POST', '/api/mobile/auth/login', {
    json: { email: creds.email, password: creds.password, deviceId: `sub-e2e-${ipSeq}` },
    headers: { ...headers, 'x-forwarded-for': ip }
  });
}

async function login(creds, headers = MOBILE_HEADERS) {
  const r = await loginRaw(creds, headers);
  if (!r.ok) throw new Error(`login ${creds.email} failed: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return new SubSession(r.body.data.token, r.body.data.user, headers);
}

/** Merchant, staff and kho sessions of a world. */
async function loginWorld(world) {
  const [merchant, staff, kho] = await Promise.all([login(world.merchant), login(world.staff), login(world.kho)]);
  return { merchant, staff, kho };
}

let phoneSeq = 0;
/** Customer through the API, with a phone no other row has. */
async function createCustomerRaw(session, name = uniqueName('Khach')) {
  phoneSeq += 1;
  const phone = `08${String(Date.now()).slice(-6)}${String(phoneSeq).padStart(2, '0')}`;
  return session.post('/api/customers', { firstName: name, lastName: 'E2E', phone });
}

/** Product body of the iOS form, raw result (the helper in api.js throws on failure). */
function createProductRaw(session, outletId, name = uniqueName('SP')) {
  return session.postForm('/api/products', {
    name,
    rentPrice: 100000,
    deposit: 0,
    totalStock: 5,
    outletStock: [{ outletId, stock: 5 }],
    pricingOptions: [{ type: 'FIXED', price: 100000, isDefault: true }]
  });
}

module.exports = {
  assertLocalDb,
  hasDb,
  sql,
  runId,
  MOBILE_HEADERS,
  WEB_HEADERS,
  PASSWORD,
  createPlan,
  createUser,
  setPlanLimits,
  setPlanFlag,
  createWorld,
  setSubscription,
  deleteSubscription,
  insertSubscription,
  subscriptionRow,
  addAddon,
  deleteAddons,
  counts,
  rawCounts,
  softDeleteProduct,
  softDeleteUser,
  customerColumns,
  SubSession,
  loginRaw,
  login,
  loginWorld,
  createCustomerRaw,
  createProductRaw
};
