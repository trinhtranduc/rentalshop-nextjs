/**
 * Scenarios for the plan renewal compatibility test (#1459): GET /api/subscriptions/status and the login answer
 * (`buildAuthLoginSuccessResponse`, shared by /api/auth/login and /api/mobile/auth/login), the two answers installed apps
 * read about the plan.
 *
 * Code comes from a source tree (this checkout, or `origin/main-real` through GOLDEN_ROOT); only I/O is replaced.
 * The status route runs through the real `withPermissions` / `authenticateRequest` of that tree. Token signing is a
 * stub (same in both trees): the login logic is what is compared, not the JWT bytes.
 */
import path from 'path';
import jsonwebtoken from 'jsonwebtoken';
import { loadRoute, quietly, request, type StoreHolder, THIS_ROOT } from './load-route';

/** 2 Nov 2026, 10:00 in Vietnam */
export const NOW = new Date('2026-11-02T03:00:00.000Z');

const day = (n: number) => new Date(NOW.getTime() + n * 86400000);
const LIMITS = JSON.stringify({ outlets: 1, users: 2, products: 2000, customers: -1, orders: 2000, allowWebAccess: true, allowMobileAccess: true });
const PLANS = [
  { id: 1, name: 'Trial', description: 'Trial', basePrice: 0, currency: 'VND', trialDays: 14, limits: LIMITS, features: '[]', isActive: true, isPopular: false, sortOrder: 0, deletedAt: null },
  { id: 2, name: 'Basic', description: 'Basic', basePrice: 99000, currency: 'VND', trialDays: 14, limits: LIMITS, features: '["Mobile app access"]', isActive: true, isPopular: false, sortOrder: 1, deletedAt: null },
  { id: 3, name: 'Professional', description: 'Pro', basePrice: 179000, currency: 'VND', trialDays: 14, limits: LIMITS, features: '["Web dashboard access"]', isActive: true, isPopular: true, sortOrder: 2, deletedAt: null },
];

type Sub = Record<string, unknown>;
const sub = (over: Sub = {}): Sub => ({
  id: 70, merchantId: 1, planId: 2, status: 'ACTIVE', stripeSubscriptionId: null, lemonSubscriptionId: null,
  currentPeriodStart: day(-345), currentPeriodEnd: day(20), trialStart: null, trialEnd: null,
  cancelAtPeriodEnd: false, canceledAt: null, cancelReason: null, amount: 1799000, currency: 'VND', interval: 'annual',
  intervalCount: 1, period: 1, discount: 0, savings: 0, createdAt: day(-345), updatedAt: day(-1),
  // #1459 columns; an older tree simply never reads them
  billingChannel: null, storeProductId: null, storeOriginalTransactionId: null, autoRenew: false, billingIssueAt: null,
  ...over,
});

interface World {
  role: 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
  subscription: Sub | null;
}

const WORLDS: Record<string, World> = {
  activeBasic20Days: { role: 'MERCHANT', subscription: sub() },
  activeBasic5Days: { role: 'MERCHANT', subscription: sub({ currentPeriodEnd: day(5) }) },
  lastDayBasic: { role: 'MERCHANT', subscription: sub({ currentPeriodEnd: new Date('2026-11-02T16:00:00.000Z') }) },
  expiredBasic: { role: 'MERCHANT', subscription: sub({ status: 'EXPIRED', currentPeriodEnd: day(-2) }) },
  trial: { role: 'MERCHANT', subscription: sub({ planId: 1, status: 'TRIAL', amount: 0, trialStart: day(-4), trialEnd: day(10), currentPeriodEnd: day(10) }) },
  cancelledProfessional: {
    role: 'MERCHANT',
    subscription: sub({ planId: 3, cancelAtPeriodEnd: true, canceledAt: day(-3), cancelReason: 'UNSUBSCRIBE', currentPeriodEnd: day(40) }),
  },
  appStoreAutoRenew: {
    role: 'MERCHANT',
    subscription: sub({ billingChannel: 'APP_STORE', storeProductId: 'anyrent_merchant_annual', autoRenew: true, currentPeriodEnd: day(3), storeBonusMs: 2 * 86400000 }),
  },
  staffExpired: { role: 'OUTLET_STAFF', subscription: sub({ currentPeriodEnd: day(-1) }) },
  managerActive: { role: 'OUTLET_ADMIN', subscription: sub() },
};

function merchantRow(world: World) {
  const subscription = world.subscription ? { ...world.subscription, plan: PLANS.find((p) => p.id === world.subscription!.planId) } : null;
  return {
    id: 1, name: 'Tiệm Áo Dài', email: 'shop@test', phone: '0900000000', address: null, city: null, state: null, zipCode: null,
    country: 'VN', businessType: null, pricingType: null, taxId: null, currency: 'VND', tenantKey: 'tiem-ao-dai',
    allowOverlappingOrders: true, timezone: 'Asia/Ho_Chi_Minh',
    _count: { outlets: 1, users: 2, products: 120, customers: 40 },
    subscription,
  };
}

const OUTLET = { id: 2, name: 'Chi nhánh 1', address: null, phone: null, merchantId: 1, printBankQr: false, isActive: true, merchant: { id: 1, name: 'Tiệm Áo Dài', tenantKey: 'tiem-ao-dai' } };

function holderFor(world: World): StoreHolder {
  const user = {
    id: 7, email: 'owner@test', firstName: 'Lan', lastName: 'Nguyễn', phone: null, role: world.role, isActive: true,
    merchantId: 1, outletId: world.role === 'MERCHANT' ? null : 2, emailVerified: true, emailVerifiedAt: null,
    outlet: world.role === 'MERCHANT' ? null : { isActive: true }, passwordChangedAt: null, permissionsChangedAt: null,
  };
  const prisma: any = {
    plan: { findMany: async () => PLANS },
    merchantModule: { findMany: async () => [] },
    merchantRole: { findUnique: async () => null, findFirst: async () => null },
  };
  const db: any = {
    prisma,
    users: { findById: async () => user },
    sessions: {
      getSessionStatus: async () => 'active',
      createUserSession: async () => ({ sessionId: 'session-1' }),
    },
    refreshTokens: { create: async () => 'refresh-1' },
    merchants: { findById: async () => merchantRow(world), ensureTenantKey: async () => 'tiem-ao-dai' },
    outlets: { findById: async () => OUTLET },
    plans: { search: async () => ({ data: PLANS, total: PLANS.length, page: 1, limit: 50, hasMore: false }) },
  };
  return { db, prisma };
}

function bearer(world: World) {
  const payload = {
    userId: 7, email: 'owner@test', role: world.role, merchantId: 1, outletId: world.role === 'MERCHANT' ? null : 2,
    sessionId: 'session-1', passwordChangedAt: null, permissionsChangedAt: null,
  };
  return `Bearer ${jsonwebtoken.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1h' })}`;
}

/** `buildAuthLoginSuccessResponse` of a tree, with the same stubs `loadRoute` uses plus the login-only reads */
function loadLoginBuilder(holder: StoreHolder, root: string) {
  const pkg = (name: string) => path.join(root, 'packages', name, 'src');
  loadRoute('subscriptions/status', holder, root); // registers the shared module stubs
  jest.resetModules(); // drop the cached modules of that route; the stubs below replace two of them
  jest.doMock('@rentalshop/database', () => ({
    get db() {
      return holder.db;
    },
    get prisma() {
      return holder.prisma;
    },
    getDefaultBankAccount: async () => null,
  }));
  jest.doMock('@rentalshop/auth', () => ({ ROLE_PERMISSIONS: jest.requireActual(path.join(pkg('auth'), 'core')).ROLE_PERMISSIONS }));
  jest.doMock('@rentalshop/auth/server', () => ({
    generateToken: () => 'web-token',
    generateMobileToken: () => 'mobile-token',
    generateRefreshableToken: () => 'refreshable-token',
    getUserPermissions: async (u: any) => jest.requireActual(path.join(pkg('auth'), 'core')).ROLE_PERMISSIONS[u.role] ?? [],
  }));
  return require(path.join(root, 'apps/api/lib/build-auth-login-response')).buildAuthLoginSuccessResponse;
}

type Answer = { status: number; body: any };

export async function runSubscriptionLoginScenarios(root = THIS_ROOT): Promise<Record<string, Answer>> {
  const out: Record<string, Answer> = {};
  await quietly(async () => {
    for (const [name, world] of Object.entries(WORLDS)) {
      const holder = holderFor(world);
      const { GET } = loadRoute('subscriptions/status', holder, root, { realAuth: true });
      const status = await GET(request('/api/subscriptions/status', { headers: { authorization: bearer(world) } }));
      out[`status_${name}`] = { status: status.status, body: status.body };

      const build = loadLoginBuilder(holderFor(world), root);
      const loginRequest = request('/api/auth/login', { headers: { 'user-agent': 'AnyRent-iOS/1.0.0', 'x-client-platform': 'mobile' } });
      const user = (await holderFor(world).db.users.findById()) as any;
      const web = await build(loginRequest, user, {});
      out[`login_${name}`] = { status: web.status, body: web.body };
      const mobile = await build(loginRequest, user, {}, { issueRefreshToken: { deviceId: 'device-1' } });
      out[`mobileLogin_${name}`] = { status: mobile.status, body: mobile.body };
    }
  });
  return out;
}
