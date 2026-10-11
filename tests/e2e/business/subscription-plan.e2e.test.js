/**
 * BF-SUB — accounts that are expired, out of plan, or at a plan limit (#727).
 *
 * Rules read in code:
 *  - packages/auth/src/core.ts `checkMerchantSubscriptionStatus`, called by `authenticateRequest` for every wrapper
 *    (withAuthRoles / withPermissions) on every non-system role. Order: no row → NO_SUBSCRIPTION; PAUSED →
 *    SUBSCRIPTION_PAUSED; CANCELLED with an ended period → SUBSCRIPTION_CANCELLED; any status whose
 *    currentPeriodEnd is in the past → SUBSCRIPTION_EXPIRED; PAST_DUE → SUBSCRIPTION_PAST_DUE; then the platform
 *    flags of the plan limits (allowWebAccess / allowMobileAccess) → PLATFORM_ACCESS_DENIED. The stored status EXPIRED
 *    is ignored when the period is still in the future ("stale status"). ADMIN / OPS / ARTICLE skip all of it.
 *  - packages/auth/src/subscription-checker.ts (SUBSCRIPTION_PERIOD_ENDED / _MISSING) runs second inside
 *    withAuthRoles, so it is never reached: core.ts already answered.
 *  - packages/utils/src/core/validation/{plan-limits,check-plan-limit,entity-counts}.ts: `count >= limit` → 422
 *    PLAN_LIMIT_EXCEEDED; -1 unlimited; a total of 0 (limit 0, or orders 0) is treated as unlimited; active add-ons
 *    are added to the plan limit. Call sites: customers, products, outlets, users (2 routes), orders POST.
 *
 * Every describe makes its own merchant, plan, staff and kho (helpers/subscription.js) and sets the state with psql.
 * Nothing here touches the seeded merchants. Run with E2E_DATABASE_URL (local) next to E2E_API_URL.
 */
const {
  Session,
  describeE2E,
  must,
  futureWindow,
  rentBody,
  uniqueName
} = require('../helpers/api');
const S = require('../helpers/subscription');

const describeSub = S.hasDb ? describeE2E : describe.skip;

const brief = (r) => ({ status: r.status, code: r.body?.code });
const isOk = (r) => r.status === 200 || r.status === 201;
/** 'ok' or '403 CODE': one comparable word per call. */
const outcome = (r) => (isOk(r) ? 'ok' : `${r.status} ${r.body?.code}`);
const blocked = (code) => `403 ${code}`;
const dataOf = (r) => r.body?.data?.customer || r.body?.data;

let adminSession;
/** One ADMIN login for the whole file (single-session accounts). */
async function admin() {
  if (!adminSession) adminSession = await S.login({ email: 'admin@rentalshop.com', password: 'admin123' });
  return adminSession;
}

/** A RENT order body for the staff/kho/merchant of a world, on a window nobody else uses. */
function orderBody(ctx, from, to) {
  const win = from ? { from, to: to || from } : futureWindow(1);
  return { ...rentBody({ customer: ctx.customer, lines: [{ product: ctx.product }], from: win.from, to: win.to }).body, outletId: ctx.world.outletId };
}

/** World + sessions + one product and customer made while ACTIVE (for orders). */
async function setup(label, opts) {
  const world = S.createWorld(label, opts);
  const sessions = await S.loginWorld(world);
  const product = await sessions.merchant.createProduct({ kind: 'FIXED', price: 120000, stock: 5, outletId: world.outletId });
  const customer = await sessions.merchant.createCustomer();
  return { world, sessions, product, customer };
}

const UNLIMITED = { outlets: -1, users: -1, products: -1, customers: -1, orders: -1 };

// ============================================================================================================
// A. subscription state x who (BF-SUB-01 .. 15)
// ============================================================================================================

describeSub('BF-SUB state matrix: merchant, staff and kho under each subscription state', () => {
  let ctx;

  beforeAll(async () => {
    ctx = await setup('state', { limits: UNLIMITED });
  });

  /** Reads and writes of the three roles; returns { 'role.call': 'ok' | '403 CODE' }. */
  async function exercise() {
    const { sessions: s, world } = ctx;
    const out = {};
    for (const role of ['merchant', 'staff', 'kho']) {
      out[`${role}.products`] = outcome(await s[role].get('/api/products?limit=1'));
      out[`${role}.orders`] = outcome(await s[role].get('/api/orders?limit=1'));
      out[`${role}.customers`] = outcome(await s[role].get('/api/customers?limit=1'));
    }
    out['merchant.createProduct'] = outcome(await S.createProductRaw(s.merchant, world.outletId));
    out['merchant.createCustomer'] = outcome(await S.createCustomerRaw(s.merchant));
    out['staff.createCustomer'] = outcome(await S.createCustomerRaw(s.staff));
    out['staff.createOrder'] = outcome(await s.staff.createOrderRaw(orderBody(ctx)));
    out['kho.createProduct'] = outcome(await S.createProductRaw(s.kho, world.outletId));
    return out;
  }

  const KEYS = [
    'merchant.products', 'merchant.orders', 'merchant.customers',
    'staff.products', 'staff.orders', 'staff.customers',
    'kho.products', 'kho.orders', 'kho.customers',
    'merchant.createProduct', 'merchant.createCustomer', 'staff.createCustomer', 'staff.createOrder', 'kho.createProduct'
  ];
  const expectAll = (value) => Object.fromEntries(KEYS.map((k) => [k, value]));

  /** One state: set it, run every call, and check the rows (written when allowed, nothing left when blocked). */
  async function runState(state, expected, extra) {
    const mid = ctx.world.merchantId;
    if (state === null) S.deleteSubscription(mid);
    else S.setSubscription(mid, state);
    const before = S.rawCounts(mid);
    const out = await exercise();
    expect(out).toEqual(expectAll(expected));
    const after = S.rawCounts(mid);
    if (expected === 'ok') {
      expect({ products: after.products - before.products, customers: after.customers - before.customers, orders: after.orders - before.orders }).toEqual({ products: 2, customers: 2, orders: 1 });
    } else {
      expect(after).toEqual(before);
    }
    if (extra) await extra();
  }

  /** The status endpoint a user reads to see the reason: only reachable while access is allowed (see BF-SUB-17). */
  async function expectStatusEndpoint(dbStatus, matcher) {
    for (const role of ['merchant', 'staff', 'kho']) {
      const r = await ctx.sessions[role].get('/api/subscriptions/status');
      expect({ role, status: r.status }).toEqual({ role, status: 200 });
      expect(r.body.data).toMatchObject({ status: 'ACTIVE', hasAccess: true, dbStatus, merchantId: ctx.world.merchantId, ...matcher });
    }
  }

  test('BF-SUB-01 ACTIVE, period ends in 30 days: everything allowed', async () => {
    await runState({ status: 'ACTIVE', endInDays: 30 }, 'ok', () => expectStatusEndpoint('ACTIVE', { daysRemaining: expect.any(Number) }));
  });

  test('BF-SUB-02 TRIAL, period ends in 14 days: everything allowed', async () => {
    await runState({ status: 'TRIAL', endInDays: 14 }, 'ok', () => expectStatusEndpoint('TRIAL', {}));
  });

  test('BF-SUB-03 ACTIVE, period ends in one hour: still allowed (the instant counts, not the day)', async () => {
    await runState({ status: 'ACTIVE', endInDays: 1 / 24 }, 'ok', () => expectStatusEndpoint('ACTIVE', { isExpiringSoon: true }));
  });

  test('BF-SUB-04 ACTIVE, period ended one minute ago: SUBSCRIPTION_EXPIRED', async () => {
    await runState({ status: 'ACTIVE', endInDays: -1 / 1440 }, blocked('SUBSCRIPTION_EXPIRED'));
  });

  test('BF-SUB-05 TRIAL, period ended yesterday: SUBSCRIPTION_EXPIRED', async () => {
    await runState({ status: 'TRIAL', endInDays: -1 }, blocked('SUBSCRIPTION_EXPIRED'));
  });

  test('BF-SUB-06 ACTIVE, period ended 30 days ago: SUBSCRIPTION_EXPIRED', async () => {
    await runState({ status: 'ACTIVE', endInDays: -30 }, blocked('SUBSCRIPTION_EXPIRED'));
  });

  test('BF-SUB-07 status EXPIRED but period in the future (stale status): allowed', async () => {
    // core.ts: "DO NOT block based on DB EXPIRED status ... currentPeriodEnd is the single source of truth"
    await runState({ status: 'EXPIRED', endInDays: 10 }, 'ok', () => expectStatusEndpoint('EXPIRED', {}));
  });

  test('BF-SUB-08 status EXPIRED and period ended: SUBSCRIPTION_EXPIRED', async () => {
    await runState({ status: 'EXPIRED', endInDays: -2 }, blocked('SUBSCRIPTION_EXPIRED'));
  });

  test('BF-SUB-09 CANCELLED with the period still running: allowed until the period ends', async () => {
    await runState({ status: 'CANCELLED', endInDays: 10, canceledAt: true }, 'ok', () =>
      expectStatusEndpoint('CANCELLED', { statusReason: expect.stringContaining('Canceled but access until period end') })
    );
    S.setSubscription(ctx.world.merchantId, { canceledAt: false });
  });

  test('BF-SUB-10 CANCELLED and the period ended: SUBSCRIPTION_CANCELLED (not EXPIRED)', async () => {
    await runState({ status: 'CANCELLED', endInDays: -3 }, blocked('SUBSCRIPTION_CANCELLED'));
  });

  test('BF-SUB-11 PAUSED with the period in the future: SUBSCRIPTION_PAUSED', async () => {
    await runState({ status: 'PAUSED', endInDays: 20 }, blocked('SUBSCRIPTION_PAUSED'));
  });

  test('BF-SUB-12 PAUSED and the period ended: SUBSCRIPTION_PAUSED (pause is checked first)', async () => {
    await runState({ status: 'PAUSED', endInDays: -5 }, blocked('SUBSCRIPTION_PAUSED'));
  });

  test('BF-SUB-13 PAST_DUE with the period in the future: SUBSCRIPTION_PAST_DUE', async () => {
    await runState({ status: 'PAST_DUE', endInDays: 5 }, blocked('SUBSCRIPTION_PAST_DUE'));
  });

  test('BF-SUB-14 PAST_DUE and the period ended: SUBSCRIPTION_EXPIRED (period is checked before past-due)', async () => {
    await runState({ status: 'PAST_DUE', endInDays: -5 }, blocked('SUBSCRIPTION_EXPIRED'));
  });

  test('BF-SUB-15 merchant without a subscription row: NO_SUBSCRIPTION', async () => {
    await runState(null, blocked('NO_SUBSCRIPTION'));
    S.insertSubscription(ctx.world.merchantId, ctx.world.planId, { status: 'ACTIVE', endInDays: 30 });
    const r = await ctx.sessions.merchant.get('/api/products?limit=1');
    expect(r.status).toBe(200);
  });
});

// ============================================================================================================
// B. ADMIN / OPS, and the routes an expired merchant needs (BF-SUB-16 .. 19)
// ============================================================================================================

describeSub('BF-SUB system roles and recovery routes', () => {
  let ctx;
  let subscriptionId;

  beforeAll(async () => {
    ctx = await setup('recover', { limits: UNLIMITED });
    subscriptionId = Number(S.sql(`SELECT id FROM "Subscription" WHERE "merchantId" = ${ctx.world.merchantId}`));
    S.setSubscription(ctx.world.merchantId, { status: 'ACTIVE', endInDays: -1 });
  });

  test('BF-SUB-16 ADMIN and OPS are not blocked by an expired merchant', async () => {
    const a = await admin();
    const status = await a.get(`/api/subscriptions/status?merchantId=${ctx.world.merchantId}`);
    expect(status.status).toBe(200);
    expect(status.body.data).toMatchObject({ status: 'EXPIRED', hasAccess: false, dbStatus: 'ACTIVE', merchantId: ctx.world.merchantId });
    expect((await a.get('/api/products?limit=1')).status).toBe(200);

    const email = `sub.${ctx.world.id}.ops@e2e.test`;
    S.createUser(null, null, 'OPS', email, 'Ops');
    const ops = await S.login({ email, password: S.PASSWORD });
    expect((await ops.get('/api/products?limit=1')).status).toBe(200);
  });

  // (#728, fixed) The route comment says: requireActiveSubscription: false — "Merchants must still read status when subscription is
  // expired/paused (banner, renew CTA)". authenticateRequest (core.ts) runs the subscription check regardless of that
  // option, so every route that sets it is closed to an expired merchant too.
  test('BF-SUB-17 an expired merchant, staff and kho can read /api/subscriptions/status (reason and renew banner)', async () => {
    for (const role of ['merchant', 'staff', 'kho']) {
      const r = await ctx.sessions[role].get('/api/subscriptions/status');
      expect({ role, status: r.status }).toEqual({ role, status: 200 });
      expect(r.body.data).toMatchObject({ status: 'EXPIRED', hasAccess: false, dbStatus: 'ACTIVE' });
    }
  });

  test('BF-SUB-18 an expired merchant can list the plans to renew (GET /api/plans)', async () => {
    const r = await ctx.sessions.merchant.get('/api/plans');
    expect(r.status).toBe(200);
  });

  test('BF-SUB-19 an expired merchant can start a plan change or a checkout (not blocked by SUBSCRIPTION_EXPIRED)', async () => {
    const change = await ctx.sessions.merchant.post(`/api/subscriptions/${subscriptionId}/change-plan`, { planId: ctx.world.planId });
    const checkout = await ctx.sessions.merchant.post('/api/lemonsqueezy/subscription-checkout', { planId: ctx.world.planId });
    expect({ change: change.body?.code, checkout: checkout.body?.code }).toEqual({
      change: expect.not.stringMatching(/^SUBSCRIPTION_EXPIRED$/),
      checkout: expect.not.stringMatching(/^SUBSCRIPTION_EXPIRED$/)
    });
  });
});

// ============================================================================================================
// C. login and the session of an account that is out of plan (BF-SUB-20 .. 24)
// ============================================================================================================

describeSub('BF-SUB login and session while out of plan', () => {
  let world;

  beforeAll(() => {
    world = S.createWorld('login', { limits: UNLIMITED });
  });

  test('BF-SUB-20 login works for merchant, staff and kho of an expired shop and shows the ended period', async () => {
    S.setSubscription(world.merchantId, { status: 'ACTIVE', endInDays: -2 });
    for (const who of ['merchant', 'staff', 'kho']) {
      const r = await S.loginRaw(world[who]);
      expect({ who, status: r.status }).toEqual({ who, status: 200 });
      const sub = r.body.data.user.merchant.subscription;
      expect(sub).toMatchObject({ status: 'ACTIVE', merchantId: world.merchantId });
      expect(new Date(sub.currentPeriodEnd).getTime()).toBeLessThan(Date.now());
    }
  });

  test('BF-SUB-21 login works for PAUSED, CANCELLED (ended) and PAST_DUE shops; the status is in the login payload', async () => {
    for (const status of ['PAUSED', 'CANCELLED', 'PAST_DUE']) {
      S.setSubscription(world.merchantId, { status, endInDays: status === 'CANCELLED' ? -1 : 10 });
      const r = await S.loginRaw(world.merchant);
      expect({ status, http: r.status }).toEqual({ status, http: 200 });
      expect(r.body.data.user.merchant.subscription.status).toBe(status);
    }
  });

  test('BF-SUB-22 login works for a shop without any subscription row (subscription null)', async () => {
    S.deleteSubscription(world.merchantId);
    const r = await S.loginRaw(world.merchant);
    expect(r.status).toBe(200);
    expect(r.body.data.user.merchant.subscription).toBeNull();
    S.insertSubscription(world.merchantId, world.planId, { status: 'ACTIVE', endInDays: 30 });
  });

  test('BF-SUB-23 the token of an expired shop gets SUBSCRIPTION_EXPIRED on /api/auth/verify and /api/users/profile (Q1)', async () => {
    const s = await S.login(world.merchant);
    expect((await s.get('/api/users/profile')).status).toBe(200);
    S.setSubscription(world.merchantId, { status: 'ACTIVE', endInDays: -1 });
    expect(brief(await s.get('/api/auth/verify'))).toEqual({ status: 403, code: 'SUBSCRIPTION_EXPIRED' });
    expect(brief(await s.get('/api/users/profile'))).toEqual({ status: 403, code: 'SUBSCRIPTION_EXPIRED' });
  });

  test('BF-SUB-24 logout works while expired; a fresh login after the renewal gets a working token', async () => {
    S.setSubscription(world.merchantId, { status: 'ACTIVE', endInDays: -1 });
    const s = await S.login(world.merchant);
    expect(brief(await s.post('/api/auth/logout', {}))).toMatchObject({ status: 200, code: 'LOGOUT_SUCCESS' });
    S.setSubscription(world.merchantId, { status: 'ACTIVE', endInDays: 30 });
    const again = await S.login(world.merchant);
    expect((await again.get('/api/products?limit=1')).status).toBe(200);
  });
});

// ============================================================================================================
// D. another merchant is never affected (BF-SUB-25 .. 26)
// ============================================================================================================

describeSub('BF-SUB scope: one merchant out of plan, another untouched', () => {
  let a;
  let b;

  beforeAll(async () => {
    a = await setup('scope-a', { limits: UNLIMITED });
    b = await setup('scope-b', { limits: UNLIMITED });
  });

  afterEach(() => {
    S.setSubscription(a.world.merchantId, { status: 'ACTIVE', endInDays: 30, canceledAt: false });
    S.setSubscription(b.world.merchantId, { status: 'ACTIVE', endInDays: 30, canceledAt: false });
  });

  const probe = async (c) => ({
    list: outcome(await c.sessions.staff.get('/api/products?limit=1')),
    order: outcome(await c.sessions.staff.createOrderRaw(orderBody(c))),
    product: outcome(await S.createProductRaw(c.sessions.kho, c.world.outletId)),
    customer: outcome(await S.createCustomerRaw(c.sessions.merchant))
  });

  test('BF-SUB-25 merchant A expired / paused / past due / cancelled: merchant B reads and writes as usual', async () => {
    const states = [
      [{ status: 'ACTIVE', endInDays: -3 }, 'SUBSCRIPTION_EXPIRED'],
      [{ status: 'PAUSED', endInDays: 20 }, 'SUBSCRIPTION_PAUSED'],
      [{ status: 'PAST_DUE', endInDays: 20 }, 'SUBSCRIPTION_PAST_DUE'],
      [{ status: 'CANCELLED', endInDays: -1 }, 'SUBSCRIPTION_CANCELLED']
    ];
    for (const [state, code] of states) {
      S.setSubscription(a.world.merchantId, state);
      expect({ state: state.status, a: await probe(a) }).toEqual({ state: state.status, a: { list: blocked(code), order: blocked(code), product: blocked(code), customer: blocked(code) } });
      expect({ state: state.status, b: await probe(b) }).toEqual({ state: state.status, b: { list: 'ok', order: 'ok', product: 'ok', customer: 'ok' } });
    }
  });

  test('BF-SUB-26 merchant B expired: merchant A (same plan row) still works, and the plan row is not touched', async () => {
    expect(b.world.planId).not.toBe(a.world.planId);
    S.setSubscription(b.world.merchantId, { status: 'TRIAL', endInDays: -1 });
    expect(await probe(b)).toEqual({ list: blocked('SUBSCRIPTION_EXPIRED'), order: blocked('SUBSCRIPTION_EXPIRED'), product: blocked('SUBSCRIPTION_EXPIRED'), customer: blocked('SUBSCRIPTION_EXPIRED') });
    expect(await probe(a)).toEqual({ list: 'ok', order: 'ok', product: 'ok', customer: 'ok' });
  });
});

// ============================================================================================================
// E. platform access (BF-SUB-27 .. 33)
// ============================================================================================================

describeSub('BF-SUB platform access from the plan (allowWebAccess / allowMobileAccess)', () => {
  let ctx;
  const web = S.WEB_HEADERS;
  const mobile = S.MOBILE_HEADERS;

  beforeAll(async () => {
    ctx = await setup('platform', { limits: UNLIMITED });
  });

  const asWho = async (who, headers) => outcome(await ctx.sessions[who].asPlatform(headers).get('/api/products?limit=1'));
  const reset = () => {
    S.setPlanFlag(ctx.world.planId, 'allowWebAccess', undefined);
    S.setPlanFlag(ctx.world.planId, 'allowMobileAccess', undefined);
    S.setSubscription(ctx.world.merchantId, { status: 'ACTIVE', endInDays: 30 });
  };
  afterEach(reset);

  test('BF-SUB-27 plan without the flags: web and mobile are both allowed (default true)', async () => {
    for (const who of ['merchant', 'staff', 'kho']) {
      expect({ who, web: await asWho(who, web), mobile: await asWho(who, mobile) }).toEqual({ who, web: 'ok', mobile: 'ok' });
    }
  });

  test('BF-SUB-28 allowWebAccess false: web gets PLATFORM_ACCESS_DENIED (merchant, staff, kho), mobile works', async () => {
    S.setPlanFlag(ctx.world.planId, 'allowWebAccess', false);
    for (const who of ['merchant', 'staff', 'kho']) {
      expect({ who, web: await asWho(who, web), mobile: await asWho(who, mobile) }).toEqual({ who, web: blocked('PLATFORM_ACCESS_DENIED'), mobile: 'ok' });
    }
    const r = await ctx.sessions.merchant.asPlatform(web).get('/api/orders?limit=1');
    expect(r.body.data).toMatchObject({ currentPlatform: 'web', allowedPlatforms: ['mobile'] });
  });

  test('BF-SUB-29 allowMobileAccess false: mobile gets PLATFORM_ACCESS_DENIED, web works; writes are refused too', async () => {
    S.setPlanFlag(ctx.world.planId, 'allowMobileAccess', false);
    for (const who of ['merchant', 'staff', 'kho']) {
      expect({ who, web: await asWho(who, web), mobile: await asWho(who, mobile) }).toEqual({ who, web: 'ok', mobile: blocked('PLATFORM_ACCESS_DENIED') });
    }
    const before = S.rawCounts(ctx.world.merchantId);
    expect(outcome(await S.createCustomerRaw(ctx.sessions.staff.asPlatform(mobile)))).toBe(blocked('PLATFORM_ACCESS_DENIED'));
    expect(S.rawCounts(ctx.world.merchantId)).toEqual(before);
    const r = await ctx.sessions.merchant.asPlatform(mobile).get('/api/orders?limit=1');
    expect(r.body.data).toMatchObject({ currentPlatform: 'mobile', allowedPlatforms: ['web'] });
  });

  test('BF-SUB-30 both flags false: web and mobile are both refused', async () => {
    S.setPlanFlag(ctx.world.planId, 'allowWebAccess', false);
    S.setPlanFlag(ctx.world.planId, 'allowMobileAccess', false);
    expect({ web: await asWho('merchant', web), mobile: await asWho('merchant', mobile) }).toEqual({ web: blocked('PLATFORM_ACCESS_DENIED'), mobile: blocked('PLATFORM_ACCESS_DENIED') });
  });

  test('BF-SUB-31 how the platform is detected: x-client-platform, then the user agent; x-device-type alone and a client x-platform do not count', async () => {
    // apps/api/middleware.ts (platform-detector.ts) decides and overwrites x-platform before core.ts reads it
    S.setPlanFlag(ctx.world.planId, 'allowWebAccess', false); // only mobile is allowed
    const m = ctx.sessions.merchant;
    const call = async (headers) => outcome(await m.asPlatform(headers).get('/api/products?limit=1'));
    const denied = blocked('PLATFORM_ACCESS_DENIED');
    expect(await call({ 'x-client-platform': 'mobile' })).toBe('ok');
    expect(await call({ 'x-client-platform': 'web' })).toBe(denied);
    expect(await call({ 'x-client-platform': 'mobile', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/120' })).toBe('ok'); // header beats user agent
    expect(await call({ 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })).toBe('ok');
    expect(await call({ 'user-agent': 'okhttp/4.12.0' })).toBe('ok'); // Android builds before #343
    expect(await call({ 'user-agent': 'Mozilla/5.0 (Linux; Android 14) Mobile Safari' })).toBe('ok');
    expect(await call({})).toBe(denied); // no hint at all: web
    expect(await call({ 'x-device-type': 'ios' })).toBe(denied); // device type without x-client-platform is ignored (Q5)
    expect(await call({ 'x-platform': 'mobile' })).toBe(denied); // a client cannot forge the internal header
    expect(await call({ 'x-platform': 'mobile', 'x-client-platform': 'web' })).toBe(denied);
    expect(await call({ 'x-client-platform': 'desktop' })).toBe(denied); // unknown value falls back to the user agent: web
  });

  test('BF-SUB-32 login itself is not platform-checked (web login of a mobile-only plan works)', async () => {
    S.setPlanFlag(ctx.world.planId, 'allowWebAccess', false);
    const r = await S.loginRaw(ctx.world.merchant, web);
    expect(r.status).toBe(200);
    // the login replaced the session of the other merchant session of this world: log the world in again
    ctx.sessions = await S.loginWorld(ctx.world);
  });

  test('BF-SUB-33 an expired or paused shop gets the subscription code, not PLATFORM_ACCESS_DENIED; changing the flag works at once', async () => {
    S.setPlanFlag(ctx.world.planId, 'allowWebAccess', false);
    S.setSubscription(ctx.world.merchantId, { status: 'ACTIVE', endInDays: -1 });
    expect(await asWho('merchant', web)).toBe(blocked('SUBSCRIPTION_EXPIRED'));
    S.setSubscription(ctx.world.merchantId, { status: 'PAUSED', endInDays: 10 });
    expect(await asWho('merchant', web)).toBe(blocked('SUBSCRIPTION_PAUSED'));
    S.setSubscription(ctx.world.merchantId, { status: 'ACTIVE', endInDays: 10 });
    expect(await asWho('merchant', web)).toBe(blocked('PLATFORM_ACCESS_DENIED'));
    S.setPlanFlag(ctx.world.planId, 'allowWebAccess', true);
    expect(await asWho('merchant', web)).toBe('ok'); // same token, no new login
  });
});

// ============================================================================================================
// F. plan limits (BF-SUB-34 ..)
// ============================================================================================================

describeSub('BF-SUB plan limits per entity', () => {
  let ctx;
  let other; // a second merchant on the SAME plan row: counts are per merchant
  const mid = () => ctx.world.merchantId;

  /** Limits: everything unlimited except `entity`, which allows exactly `room` more rows than the merchant has. */
  function allowRoom(entity, room) {
    const limit = S.counts(mid())[entity] + room;
    S.setPlanLimits(ctx.world.planId, { ...UNLIMITED, [entity]: limit });
    return limit;
  }

  beforeAll(async () => {
    ctx = await setup('limits');
    S.setPlanLimits(ctx.world.planId, UNLIMITED);
    // `other` shares the plan row; it needs its own product and customer
    const world2 = S.createWorld('limits-other', { planId: ctx.world.planId });
    const sessions2 = await S.loginWorld(world2);
    other = { world: world2, sessions: sessions2 };
  });

  afterEach(() => {
    S.setPlanLimits(ctx.world.planId, UNLIMITED);
    S.deleteAddons(mid());
  });

  const PLAN_LIMIT_BODY = { success: false, code: 'PLAN_LIMIT_EXCEEDED', error: 'Plan limit exceeded' };

  /**
   * Fill an entity up to its limit with the given creators (one call each), then prove: the one after is 422 with
   * PLAN_LIMIT_EXCEEDED, nothing was written, and the counts stayed. `create[i]` are tried in turn (cycled).
   */
  async function fillAndOverflow(entity, creators, room = 2) {
    const limit = allowRoom(entity, room);
    for (let i = 0; i < room; i += 1) {
      const r = await creators[i % creators.length]();
      expect({ entity, step: i + 1, outcome: outcome(r) }).toEqual({ entity, step: i + 1, outcome: 'ok' });
    }
    expect(S.counts(mid())[entity]).toBe(limit);
    const raw = S.rawCounts(mid());
    for (const create of creators) {
      const r = await create();
      expect({ status: r.status, ...r.body }).toMatchObject({ status: 422, ...PLAN_LIMIT_BODY });
    }
    expect(S.rawCounts(mid())).toEqual(raw);
    return limit;
  }

  const customerBy = (who) => () => S.createCustomerRaw(ctx.sessions[who]);
  const productBy = (who) => () => S.createProductRaw(ctx.sessions[who], ctx.world.outletId);
  const orderBy = (who) => () => ctx.sessions[who].createOrderRaw(orderBody(ctx));
  let outletSeq = 0;
  const outletBy = (who) => () => ctx.sessions[who].post('/api/outlets', { name: uniqueName(`Outlet ${(outletSeq += 1)}`), address: 'Ha Noi' });
  let userSeq = 0;
  const userBody = () => ({ email: `u${(userSeq += 1)}.${ctx.world.id}.${Date.now()}@e2e.test`, password: 'secret123', firstName: 'Nv', lastName: 'E2E', role: 'OUTLET_STAFF', outletId: ctx.world.outletId });
  const userByUsers = () => ctx.sessions.merchant.post('/api/users', userBody());
  const userByMerchantRoute = () => ctx.sessions.merchant.post(`/api/merchants/${mid()}/users`, userBody());

  test('BF-SUB-34 customers: merchant and staff share the limit; the one after the limit is 422 and leaves no row', async () => {
    await fillAndOverflow('customers', [customerBy('merchant'), customerBy('staff')]);
  });

  test('BF-SUB-35 products: merchant, staff and kho are all stopped at the limit', async () => {
    await fillAndOverflow('products', [productBy('merchant'), productBy('staff'), productBy('kho')], 3);
  });

  test('BF-SUB-36 orders: staff, kho and merchant are stopped at the limit; stock does not move', async () => {
    const stock = await ctx.sessions.merchant.outletStock(ctx.product.id, ctx.world.outletId);
    const orders = [orderBy('staff'), orderBy('kho'), orderBy('merchant')];
    await fillAndOverflow('orders', orders, 3);
    const after = await ctx.sessions.merchant.outletStock(ctx.product.id, ctx.world.outletId);
    expect(after).toEqual(stock); // RESERVED orders do not take stock
  });

  test('BF-SUB-37 outlets: the merchant is stopped at the limit', async () => {
    await fillAndOverflow('outlets', [outletBy('merchant')], 1);
  });

  test('BF-SUB-38 users: POST /api/users and POST /api/merchants/{id}/users share the limit', async () => {
    await fillAndOverflow('users', [userByUsers, userByMerchantRoute], 2);
  });

  test('BF-SUB-39 staff and kho cannot add outlets or users at all (403, not 422), at or below the limit', async () => {
    allowRoom('outlets', 1);
    allowRoom('users', 1);
    for (const who of ['staff', 'kho']) {
      expect({ who, outlet: outcome(await outletBy(who)()) }).toEqual({ who, outlet: expect.stringMatching(/^403 /) });
      expect({ who, user: outcome(await ctx.sessions[who].post('/api/users', userBody())) }).toEqual({ who, user: expect.stringMatching(/^403 /) });
    }
  });

  test('BF-SUB-40 limit -1 is unlimited: creating far beyond any count works', async () => {
    S.setPlanLimits(ctx.world.planId, UNLIMITED);
    for (let i = 0; i < 4; i += 1) {
      expect(outcome(await S.createCustomerRaw(ctx.sessions.merchant))).toBe('ok');
      expect(outcome(await productBy('merchant')())).toBe('ok');
    }
  });

  test('BF-SUB-41 one below the limit is still allowed; exactly at the limit is refused (every entity checked with merchant)', async () => {
    const creators = { customers: customerBy('merchant'), products: productBy('merchant'), orders: orderBy('staff'), outlets: outletBy('merchant'), users: userByUsers };
    for (const [entity, create] of Object.entries(creators)) {
      const limit = allowRoom(entity, 1); // count = limit - 1
      expect({ entity, count: S.counts(mid())[entity], limit }).toEqual({ entity, count: limit - 1, limit });
      expect({ entity, at: 'limit-1', outcome: outcome(await create()) }).toEqual({ entity, at: 'limit-1', outcome: 'ok' });
      expect({ entity, count: S.counts(mid())[entity] }).toEqual({ entity, count: limit });
      expect({ entity, at: 'limit', outcome: outcome(await create()) }).toEqual({ entity, at: 'limit', outcome: '422 PLAN_LIMIT_EXCEEDED' });
    }
  });

  test('BF-SUB-42 a limit lower than the current count: existing rows stay and can be read, new ones are refused', async () => {
    await S.createCustomerRaw(ctx.sessions.merchant);
    await S.createCustomerRaw(ctx.sessions.merchant);
    const count = S.counts(mid()).customers;
    expect(count).toBeGreaterThanOrEqual(2);
    S.setPlanLimits(ctx.world.planId, { customers: 1 });
    expect(outcome(await S.createCustomerRaw(ctx.sessions.staff))).toBe('422 PLAN_LIMIT_EXCEEDED');
    const list = await ctx.sessions.merchant.get('/api/customers?limit=100');
    expect(list.status).toBe(200);
    expect(S.counts(mid()).customers).toBe(count);
  });

  test('BF-SUB-43 a plan-limit add-on raises the limit by its amount, per entity; an inactive add-on does nothing', async () => {
    const entities = { customers: customerBy('merchant'), products: productBy('kho'), orders: orderBy('staff') };
    for (const [entity, create] of Object.entries(entities)) {
      allowRoom(entity, 0); // exactly at the limit
      expect({ entity, before: outcome(await create()) }).toEqual({ entity, before: '422 PLAN_LIMIT_EXCEEDED' });
      S.addAddon(mid(), { [entity]: 5 }, { isActive: false });
      expect({ entity, inactive: outcome(await create()) }).toEqual({ entity, inactive: '422 PLAN_LIMIT_EXCEEDED' });
      S.addAddon(mid(), { [entity]: 2 });
      expect({ entity, one: outcome(await create()) }).toEqual({ entity, one: 'ok' });
      expect({ entity, two: outcome(await create()) }).toEqual({ entity, two: 'ok' });
      expect({ entity, three: outcome(await create()) }).toEqual({ entity, three: '422 PLAN_LIMIT_EXCEEDED' });
      S.deleteAddons(mid());
    }
  });

  test('BF-SUB-44 an add-on on an unlimited plan changes nothing; removing the add-on takes the extra room away again', async () => {
    S.addAddon(mid(), { customers: 3 });
    expect(outcome(await S.createCustomerRaw(ctx.sessions.merchant))).toBe('ok'); // -1 stays unlimited
    S.deleteAddons(mid());
    allowRoom('customers', 0);
    S.addAddon(mid(), { customers: 1 });
    expect(outcome(await S.createCustomerRaw(ctx.sessions.merchant))).toBe('ok');
    expect(outcome(await S.createCustomerRaw(ctx.sessions.merchant))).toBe('422 PLAN_LIMIT_EXCEEDED');
    S.deleteAddons(mid());
    expect(outcome(await S.createCustomerRaw(ctx.sessions.merchant))).toBe('422 PLAN_LIMIT_EXCEEDED'); // count now above the plan limit
  });

  test('BF-SUB-45 limit 0 counts as unlimited (current behaviour, Q2); orders 0 as well', async () => {
    S.setPlanLimits(ctx.world.planId, { ...UNLIMITED, customers: 0, products: 0, orders: 0 });
    expect(outcome(await S.createCustomerRaw(ctx.sessions.merchant))).toBe('ok');
    expect(outcome(await productBy('merchant')())).toBe('ok');
    expect(outcome(await orderBy('staff')())).toBe('ok');
  });

  test('BF-SUB-46 counts are per merchant: another merchant on the same plan row is not stopped', async () => {
    allowRoom('customers', 0);
    expect(outcome(await S.createCustomerRaw(ctx.sessions.merchant))).toBe('422 PLAN_LIMIT_EXCEEDED');
    // the other merchant has its own (few) rows against the same limit number
    S.setPlanLimits(ctx.world.planId, { ...UNLIMITED, customers: S.counts(other.world.merchantId).customers + 1 });
    expect(outcome(await S.createCustomerRaw(other.sessions.merchant))).toBe('ok');
    expect(outcome(await S.createCustomerRaw(other.sessions.merchant))).toBe('422 PLAN_LIMIT_EXCEEDED');
  });

  test('BF-SUB-47 soft-deleted products and deleted users free their slot; deactivated users still count', async () => {
    // products (#389)
    allowRoom('products', 1);
    const first = await productBy('merchant')();
    expect(outcome(first)).toBe('ok');
    expect(outcome(await productBy('merchant')())).toBe('422 PLAN_LIMIT_EXCEEDED');
    S.softDeleteProduct(mid(), first.body.data.id);
    expect(outcome(await productBy('merchant')())).toBe('ok');
    // users
    allowRoom('users', 1);
    const u = await userByUsers();
    expect(outcome(u)).toBe('ok');
    expect(outcome(await userByUsers())).toBe('422 PLAN_LIMIT_EXCEEDED');
    S.sql(`UPDATE "User" SET "isActive" = false WHERE id = ${u.body.data.id}`);
    expect(outcome(await userByUsers())).toBe('422 PLAN_LIMIT_EXCEEDED'); // deactivated still counts (Q3)
    const removed = await ctx.sessions.merchant.delete(`/api/users/${u.body.data.id}`);
    expect(removed.status).toBe(200);
    expect(outcome(await userByUsers())).toBe('ok');
  });

  test('BF-SUB-48 a deleted customer frees its slot (like a deleted product)', async () => {
    allowRoom('customers', 1);
    const c = await S.createCustomerRaw(ctx.sessions.merchant);
    expect(outcome(c)).toBe('ok');
    expect(outcome(await S.createCustomerRaw(ctx.sessions.merchant))).toBe('422 PLAN_LIMIT_EXCEEDED');
    expect((await ctx.sessions.merchant.delete(`/api/customers/${dataOf(c).id}`)).status).toBe(200);
    expect(outcome(await S.createCustomerRaw(ctx.sessions.merchant))).toBe('ok');
  });

  test('BF-SUB-49 a deleted outlet frees its slot', async () => {
    allowRoom('outlets', 1);
    const o = await outletBy('merchant')();
    expect(outcome(o)).toBe('ok');
    expect(outcome(await outletBy('merchant')())).toBe('422 PLAN_LIMIT_EXCEEDED');
    expect((await ctx.sessions.merchant.delete(`/api/outlets?id=${dataOf(o).id}`)).status).toBe(200);
    expect(outcome(await outletBy('merchant')())).toBe('ok');
  });

  test('BF-SUB-50 a deleted order frees its slot', async () => {
    allowRoom('orders', 1);
    const o = await orderBy('staff')();
    expect(outcome(o)).toBe('ok');
    expect(outcome(await orderBy('staff')())).toBe('422 PLAN_LIMIT_EXCEEDED');
    expect((await ctx.sessions.merchant.setStatus(dataOf(o).id, 'CANCELLED')).status).toBe(200);
    expect((await ctx.sessions.merchant.delete(`/api/orders/${dataOf(o).id}`)).status).toBe(200);
    expect(outcome(await orderBy('staff')())).toBe('ok');
  });

  test('BF-SUB-51 a cancelled order still counts, and the orders limit is for all time, not per period (Q4)', async () => {
    allowRoom('orders', 1);
    const o = await orderBy('staff')();
    expect(outcome(o)).toBe('ok');
    expect((await ctx.sessions.staff.setStatus(dataOf(o).id, 'CANCELLED')).status).toBe(200);
    expect(outcome(await orderBy('staff')())).toBe('422 PLAN_LIMIT_EXCEEDED');
    // an order made long ago counts the same
    S.sql(`UPDATE "Order" SET "createdAt" = "createdAt" - interval '400 days' WHERE id = ${dataOf(o).id}`);
    expect(outcome(await orderBy('staff')())).toBe('422 PLAN_LIMIT_EXCEEDED');
  });

  test('BF-SUB-52 ADMIN is not stopped by a plan limit (outlet for the merchant, body.merchantId)', async () => {
    const limit = allowRoom('outlets', 0);
    expect(outcome(await outletBy('merchant')())).toBe('422 PLAN_LIMIT_EXCEEDED');
    const a = await admin();
    const r = await a.post('/api/outlets', { name: uniqueName('Outlet admin'), address: 'Ha Noi', merchantId: mid() });
    expect(brief(r)).toMatchObject({ status: 200 });
    expect(S.counts(mid()).outlets).toBe(limit + 1);
  });

  test('BF-SUB-53 the limit check comes after the subscription check: at the limit AND expired is 403, not 422', async () => {
    allowRoom('customers', 0);
    S.setSubscription(mid(), { status: 'ACTIVE', endInDays: -1 });
    try {
      expect(outcome(await S.createCustomerRaw(ctx.sessions.merchant))).toBe(blocked('SUBSCRIPTION_EXPIRED'));
    } finally {
      S.setSubscription(mid(), { status: 'ACTIVE', endInDays: 30 });
    }
    expect(outcome(await S.createCustomerRaw(ctx.sessions.merchant))).toBe('422 PLAN_LIMIT_EXCEEDED');
  });
});

// ============================================================================================================
// G. recovery: renew, change plan (BF-SUB-54 ..)
// ============================================================================================================

describeSub('BF-SUB recovery: the same token works again after the period or the plan changes', () => {
  let ctx;
  const mid = () => ctx.world.merchantId;

  beforeAll(async () => {
    ctx = await setup('renew', { limits: UNLIMITED });
  });

  const works = async () => ({
    merchant: outcome(await ctx.sessions.merchant.get('/api/products?limit=1')),
    staff: outcome(await ctx.sessions.staff.createOrderRaw(orderBody(ctx))),
    kho: outcome(await S.createProductRaw(ctx.sessions.kho, ctx.world.outletId))
  });
  const all = (v) => ({ merchant: v, staff: v, kho: v });

  test('BF-SUB-54 expired, then a later currentPeriodEnd: merchant, staff and kho work again with the SAME tokens, data intact', async () => {
    const before = S.rawCounts(mid());
    S.setSubscription(mid(), { status: 'ACTIVE', endInDays: -1 });
    expect(await works()).toEqual(all(blocked('SUBSCRIPTION_EXPIRED')));
    S.setSubscription(mid(), { endInDays: 30 });
    expect(await works()).toEqual(all('ok'));
    const after = S.rawCounts(mid());
    expect({ products: after.products - before.products, orders: after.orders - before.orders }).toEqual({ products: 1, orders: 1 });
    const list = await must(ctx.sessions.merchant.get(`/api/products?search=${encodeURIComponent(ctx.product.name)}`), 'products');
    expect((list.products || []).map((p) => p.id)).toContain(ctx.product.id);
  });

  test('BF-SUB-55 a renewal that only moves the date keeps the old status: stale EXPIRED/TRIAL work, PAUSED and PAST_DUE do not', async () => {
    S.setSubscription(mid(), { status: 'EXPIRED', endInDays: -1 });
    expect(await works()).toEqual(all(blocked('SUBSCRIPTION_EXPIRED')));
    S.setSubscription(mid(), { endInDays: 30 }); // status stays EXPIRED
    expect(await works()).toEqual(all('ok'));
    S.setSubscription(mid(), { status: 'PAUSED', endInDays: 30 });
    expect(await works()).toEqual(all(blocked('SUBSCRIPTION_PAUSED')));
    S.setSubscription(mid(), { status: 'PAST_DUE', endInDays: 30 });
    expect(await works()).toEqual(all(blocked('SUBSCRIPTION_PAST_DUE')));
    S.setSubscription(mid(), { status: 'ACTIVE' });
    expect(await works()).toEqual(all('ok'));
  });

  test('BF-SUB-56 cancelled and ended, then resumed (ACTIVE, new period): works again with the same tokens', async () => {
    S.setSubscription(mid(), { status: 'CANCELLED', endInDays: -1, canceledAt: true });
    expect(await works()).toEqual(all(blocked('SUBSCRIPTION_CANCELLED')));
    S.setSubscription(mid(), { status: 'ACTIVE', endInDays: 30, canceledAt: false });
    expect(await works()).toEqual(all('ok'));
  });

  test('BF-SUB-57 a missing subscription row, created later: the same tokens work', async () => {
    S.deleteSubscription(mid());
    expect(await works()).toEqual(all(blocked('NO_SUBSCRIPTION')));
    S.insertSubscription(mid(), ctx.world.planId, { status: 'TRIAL', endInDays: 14 });
    expect(await works()).toEqual(all('ok'));
  });

  test('BF-SUB-58 changing the plan changes the limits at once: a bigger plan lets the merchant create again', async () => {
    const small = S.createPlan('small', { ...UNLIMITED, customers: S.counts(mid()).customers });
    const big = S.createPlan('big', { ...UNLIMITED, customers: S.counts(mid()).customers + 5 });
    S.setSubscription(mid(), { status: 'ACTIVE', endInDays: 30, planId: small });
    expect(outcome(await S.createCustomerRaw(ctx.sessions.merchant))).toBe('422 PLAN_LIMIT_EXCEEDED');
    S.setSubscription(mid(), { planId: big });
    expect(outcome(await S.createCustomerRaw(ctx.sessions.merchant))).toBe('ok');
    S.setSubscription(mid(), { planId: small });
    expect(outcome(await S.createCustomerRaw(ctx.sessions.staff))).toBe('422 PLAN_LIMIT_EXCEEDED');
    S.setSubscription(mid(), { planId: ctx.world.planId });
  });
});
