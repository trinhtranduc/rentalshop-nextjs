/**
 * #1470 (owner, 2026-11-03): "khi tôi gia hạn hay nâng cấp manual thì nó không tính từ ngày kết thúc. ví dụ 5/11 hết hạn
 * mà gia hạn từ 3/11 thì nó tính từ 3/11".
 *
 * Rule: while the plan still runs, renewal, extension and upgrade count from the current end; an upgrade applies the
 * new plan now and the days left become days of the new plan (no money credit); expired = from now; calendar months on
 * the Vietnam day. Hotfix on main-real: no store credit (storeBonusMs / manualExtensionBilling exist only on dev).
 *
 * Example used everywhere: plan ends 05/11/2026 (VN), the admin acts on 03/11/2026 (VN), 12 months → ends 05/11/2027.
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh: the answers must not change.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
const mockValidateMerchantAccess = jest.fn();
jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: () => (handler: any) => (request: any) => handler(request, ctx),
  validateMerchantAccess: (...args: any[]) => mockValidateMerchantAccess(...args),
}));

// changePlan() runs for real (packages/database/src/subscription.ts) on a mocked Prisma client
const mockTx: any = {
  subscription: { update: jest.fn() },
  payment: { create: jest.fn() },
};
const mockPrisma: any = {
  subscription: { findUnique: jest.fn() },
  plan: { findUnique: jest.fn() },
  $transaction: jest.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
};
jest.mock('../../packages/database/src/client', () => ({ prisma: mockPrisma }));
jest.mock('../../packages/database/src/addon-price', () => ({
  simplifiedMerchantAddons: {
    renewalItems: jest.fn(async () => ({ items: [], catalog: new Map() })),
    applyRenewal: jest.fn(),
  },
}));

// The routes get the real changePlan and a mocked `db`
const mockDb: any = {
  subscriptions: { findById: jest.fn(), update: jest.fn() },
  plans: { findById: jest.fn() },
  merchants: { findById: jest.fn(), update: jest.fn() },
  sessions: { invalidateAllMerchantUserSessions: jest.fn(async () => 0) },
  subscriptionActivities: { create: jest.fn() },
  payments: { create: jest.fn(async (data: any) => ({ id: 1, ...data })) },
  auditLogs: { create: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({
  db: mockDb,
  changePlan: (...args: any[]) => jest.requireActual('../../packages/database/src/subscription').changePlan(...args),
}));

// The real billing helpers, straight from source; the emails are stubbed (the utils index pulls .tsx that Jest does not transform)
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/api/response-builder'),
  ...jest.requireActual('../../packages/utils/src/core/errors'),
  ...jest.requireActual('../../packages/utils/src/core/date-range'),
  ...jest.requireActual('../../packages/utils/src/core/billing-dates'),
  ...jest.requireActual('../../packages/utils/src/core/billing-interval'),
  ...jest.requireActual('../../packages/utils/src/core/pricing-calculator'),
  ...jest.requireActual('../../packages/utils/src/core/subscription-billing-calculations'),
  ...jest.requireActual('../../packages/utils/src/core/addon-pricing'),
  ...jest.requireActual('../../packages/utils/src/core/plan-change-rules'),
  ...jest.requireActual('../../packages/utils/src/core/plan-addon-rules'),
  sendPlanChangeEmail: jest.fn(() => Promise.resolve({ success: true })),
  sendSubscriptionRenewalEmail: jest.fn(() => Promise.resolve({ success: true })),
  sendSubscriptionStatusChangeEmail: jest.fn(() => Promise.resolve({ success: true })),
}));

import { addMonthsInTimeZone } from '../../packages/utils/src/core/billing-dates';
import { formatDateKeyInTimeZone } from '../../packages/utils/src/core/date-range';
import { calculatePlanChangeTotal, calculateRenewalTotal } from '../../packages/utils/src/core/subscription-billing-calculations';
import { extensionEndKeyForMonths } from '../../packages/ui/src/components/features/Subscriptions/components/subscription-dates';
import { POST as changePlanRoute } from '../../apps/api/app/api/subscriptions/[id]/change-plan/route';
import { PUT as updateSubscriptionRoute } from '../../apps/api/app/api/subscriptions/[id]/route';
import { PUT as merchantPlanRoute } from '../../apps/api/app/api/merchants/[id]/plan/route';
import { POST as manualPaymentRoute } from '../../apps/api/app/api/payments/manual/route';

const NOW = new Date('2026-11-03T03:00:00.000Z'); // 03/11/2026 10:00 VN
const END = new Date('2026-11-05T16:59:59.999Z'); // 05/11/2026 23:59:59.999 VN (how an extension stores an end)
const NEW_END = '2027-11-05T16:59:59.999Z'; // 05/11/2027, same wall time
const START = new Date('2025-11-05T16:59:59.999Z');
const vnDay = (d: Date | string) => formatDateKeyInTimeZone(new Date(d), 'Asia/Ho_Chi_Minh');

// Plan rows as Prisma returns them (limits and features are JSON text)
const BASIC = { id: 1, name: 'Basic', basePrice: 199000, currency: 'VND', limits: '{}', features: '[]' };
const PRO = { id: 2, name: 'Professional', basePrice: 399000, currency: 'VND', limits: '{}', features: '[]' };
const TRIAL = { id: 9, name: 'Trial', basePrice: 0, currency: 'VND', limits: '{}', features: '[]' };
const PRO_ANNUAL = 399000 * 12 * 0.9; // 4.309.200: the annual cycle, 10 % off
const BASIC_ANNUAL = 199000 * 12 * 0.9; // 2.149.200

const admin = { user: { id: 1, role: 'ADMIN', email: 'a@x', firstName: 'A', lastName: 'B' }, userScope: {} };
const pay = { method: 'TRANSFER', transactionId: 'FT26110300001' };

/** A Basic annual plan paid by hand, ending 05/11/2026 */
function subscriptionRow(over: Record<string, unknown> = {}) {
  return {
    id: 70,
    merchantId: 5,
    planId: 1,
    status: 'ACTIVE',
    amount: BASIC_ANNUAL,
    currency: 'VND',
    interval: 'annual',
    intervalCount: 12,
    currentPeriodStart: START,
    currentPeriodEnd: END,
    cancelAtPeriodEnd: false,
    merchant: { id: 5, name: 'Tiệm Áo Dài', email: null },
    plan: BASIC,
    ...over,
  };
}

function given(row: Record<string, any>, newPlan: Record<string, any>) {
  mockPrisma.subscription.findUnique.mockResolvedValue(row);
  mockPrisma.plan.findUnique.mockResolvedValue(newPlan);
  mockDb.subscriptions.findById.mockResolvedValue(row);
  mockDb.plans.findById.mockImplementation(async (id: number) => [BASIC, PRO, TRIAL].find((p) => p.id === id) ?? null);
  mockTx.subscription.update.mockImplementation(async ({ data }: any) => ({ ...row, ...data, plan: newPlan, merchant: row.merchant }));
}

const written = () => mockTx.subscription.update.mock.calls[0][0].data;
const paid = () => mockTx.payment.create.mock.calls[0]?.[0]?.data;
const req = (body: any, url = 'http://localhost/api') => ({ url, json: async () => body, headers: { get: () => null } } as any);

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }).setSystemTime(NOW);
  ctx = admin;
});
afterEach(() => jest.useRealTimers());

// ─── The shared formula: changePlan() and the admin change-plan dialog both use it ───────────────────────────────

describe('calculatePlanChangeTotal (changePlan and the admin dialog preview)', () => {
  const sub = { currentPeriodStart: START, currentPeriodEnd: END, billingInterval: 'annual', plan: { basePrice: 199000 }, status: 'ACTIVE' } as any;

  it('upgrade on 03/11 of a plan ending 05/11, 12 months: the new plan starts now and ends 05/11/2027', () => {
    const r = calculatePlanChangeTotal({ subscription: sub, newPlan: { basePrice: 399000 }, selectedInterval: 'annual', now: NOW });
    expect(vnDay(r.newPeriodEnd)).toBe('2027-11-05');
    expect(r.newPeriodEnd.toISOString()).toBe(NEW_END);
    expect(r.newPeriodStart.toISOString()).toBe(NOW.toISOString());
  });

  it('the days left become days of the new plan: no money credit, the full new cycle price is due', () => {
    const r = calculatePlanChangeTotal({ subscription: sub, newPlan: { basePrice: 399000 }, selectedInterval: 'annual', now: NOW });
    expect(r.remainingDays).toBe(2);
    expect(r.remainingCreditValue).toBe(0);
    expect(r.totalDue).toBeCloseTo(PRO_ANNUAL, 2);
  });

  it('add-ons: the cycle price of the add-ons is added, no add-on credit (their days are kept too)', () => {
    const r = calculatePlanChangeTotal({
      subscription: sub, newPlan: { basePrice: 399000 }, selectedInterval: 'monthly', addonMonthlyTotal: 40000, paidAddonMonthlyTotal: 40000, now: NOW,
    });
    expect(vnDay(r.newPeriodEnd)).toBe('2026-12-05');
    expect(r.addonCreditValue).toBe(0);
    expect(r.totalDue).toBeCloseTo(399000 + 40000, 2);
  });

  it('a trial still running turned into a paid plan: counted from the trial end', () => {
    const trial = { ...sub, status: 'TRIAL', plan: { basePrice: 0 }, currentPeriodStart: new Date('2026-10-22T03:00:00Z') };
    const r = calculatePlanChangeTotal({ subscription: trial, newPlan: { basePrice: 199000 }, selectedInterval: 'annual', now: NOW });
    expect(vnDay(r.newPeriodEnd)).toBe('2027-11-05');
    expect(r.totalDue).toBeCloseTo(BASIC_ANNUAL, 2);
  });

  it('expired (ended 01/11): from now, 03/11/2026 → 03/11/2027', () => {
    const expired = { ...sub, currentPeriodEnd: new Date('2026-11-01T16:59:59.999Z') };
    const r = calculatePlanChangeTotal({ subscription: expired, newPlan: { basePrice: 399000 }, selectedInterval: 'annual', now: NOW });
    expect(r.newPeriodStart.toISOString()).toBe(NOW.toISOString());
    expect(r.newPeriodEnd.toISOString()).toBe(addMonthsInTimeZone(NOW, 12).toISOString());
    expect(vnDay(r.newPeriodEnd)).toBe('2027-11-03');
    expect(r.totalDue).toBeCloseTo(PRO_ANNUAL, 2);
  });
});

// ─── changePlan(): what is written ─────────────────────────────────────────────────────────────────────────────────

describe('changePlan() writes the period from the current end', () => {
  const { changePlan } = jest.requireActual('../../packages/database/src/subscription');

  it('Basic → Professional, 12 months, on 03/11 of a plan ending 05/11: ends 05/11/2027, Payment = full annual price', async () => {
    given(subscriptionRow(), PRO);
    const result = await changePlan(70, 2, 'annual', { actorRole: 'ADMIN', payment: pay });
    const data = written();
    expect(vnDay(data.currentPeriodEnd)).toBe('2027-11-05');
    expect(data.currentPeriodEnd.toISOString()).toBe(NEW_END);
    expect(data.currentPeriodStart.toISOString()).toBe(NOW.toISOString());
    expect(data).toMatchObject({ planId: 2, interval: 'annual', intervalCount: 12 });
    expect(paid().amount).toBe(Math.round(PRO_ANNUAL));
    expect(result.planChange).toMatchObject({ remainingDays: 2, remainingCreditValue: 0, amountDueRounded: Math.round(PRO_ANNUAL) });
  });

  it('a trial still running → Basic: from the trial end, ACTIVE now', async () => {
    given(subscriptionRow({ status: 'TRIAL', planId: 9, plan: TRIAL, amount: 0, currentPeriodStart: new Date('2026-10-22T03:00:00Z') }), BASIC);
    await changePlan(70, 1, 'annual', { actorRole: 'ADMIN', payment: pay });
    const data = written();
    expect(data.currentPeriodEnd.toISOString()).toBe(NEW_END);
    expect(data.status).toBe('ACTIVE');
    expect(paid().amount).toBe(Math.round(BASIC_ANNUAL));
  });

  it('expired: from now (03/11/2027)', async () => {
    given(subscriptionRow({ currentPeriodEnd: new Date('2026-11-01T16:59:59.999Z') }), PRO);
    await changePlan(70, 2, 'annual', { actorRole: 'ADMIN', payment: pay });
    const data = written();
    expect(data.currentPeriodStart.toISOString()).toBe(NOW.toISOString());
    expect(data.currentPeriodEnd.toISOString()).toBe(addMonthsInTimeZone(NOW, 12).toISOString());
  });
});

// ─── Every admin path that calls changePlan() ──────────────────────────────────────────────────────────────────────

describe('admin paths that change the plan count from the current end', () => {
  beforeEach(() => given(subscriptionRow(), PRO));

  it('subscriptions list → Change plan (POST /api/subscriptions/[id]/change-plan)', async () => {
    const res: any = await changePlanRoute(req({ planId: 2, billingInterval: 'annual', ...pay }), { params: { id: '70' } });
    expect(res.status).toBe(200);
    expect(written().currentPeriodEnd.toISOString()).toBe(NEW_END);
  });

  it('subscription edit form with a new plan (PUT /api/subscriptions/[id])', async () => {
    const res: any = await updateSubscriptionRoute(req({ planId: 2, billingInterval: 'annual', ...pay }), { params: { id: '70' } });
    expect(res.status).toBe(200);
    expect(written().currentPeriodEnd.toISOString()).toBe(NEW_END);
  });

  it('merchant page → Change plan (PUT /api/merchants/[id]/plan)', async () => {
    mockValidateMerchantAccess.mockResolvedValue({ valid: true, merchant: { id: 5, subscription: { id: 70, planId: 1, amount: BASIC_ANNUAL } } });
    mockDb.merchants.findById.mockResolvedValue({ id: 5, name: 'Tiệm Áo Dài' });
    const res: any = await merchantPlanRoute(req({ planId: 2, billingInterval: 'annual', ...pay }), { params: { id: '5' } });
    expect(res.status).toBe(200);
    expect(written().currentPeriodEnd.toISOString()).toBe(NEW_END);
  });
});

// ─── POST /api/payments/manual (extendSubscription) ───────────────────────────────────────────────────────────────

describe('POST /api/payments/manual with extendSubscription', () => {
  const body = { merchantId: 5, planId: 1, amount: 199000, currency: 'VND', method: 'BANK_TRANSFER', extendSubscription: true, monthsToExtend: 12 };
  const merchantWith = (subscription: Record<string, unknown>) =>
    mockDb.merchants.findById.mockResolvedValue({ id: 5, name: 'Tiệm Áo Dài', subscription: { id: 70, status: 'ACTIVE', ...subscription } });
  const updated = () => mockDb.subscriptions.update.mock.calls[0][1];

  beforeEach(() => mockDb.plans.findById.mockResolvedValue(BASIC));

  it('expired (ended 01/11): from now, 03/11/2026 → 03/11/2027 (was 01/11/2027)', async () => {
    merchantWith({ currentPeriodEnd: new Date('2026-11-01T16:59:59.999Z') });
    const res: any = await manualPaymentRoute(req(body));
    expect(res.status).toBe(200);
    expect(updated().currentPeriodEnd.toISOString()).toBe(addMonthsInTimeZone(NOW, 12).toISOString());
  });

  it('still running (ends 05/11): from the end, 05/11/2027', async () => {
    merchantWith({ currentPeriodEnd: END });
    await manualPaymentRoute(req(body));
    expect(updated().currentPeriodEnd.toISOString()).toBe(NEW_END);
  });
});

// ─── Paths that already follow the rule (guards with the owner's example) ──────────────────────────────────────────

describe('already from the current end (guards)', () => {
  it('Renew (POST /renew, ManualRenewalModal): 12 months on 03/11 of a plan ending 05/11 → 05/11/2027', () => {
    const r = calculateRenewalTotal({ basePrice: 199000, interval: 'annual', currentPeriodEnd: END, now: NOW });
    expect(r.periodStart.toISOString()).toBe(END.toISOString());
    expect(r.periodEnd.toISOString()).toBe(NEW_END);
  });

  it('Extend dialog default end day (POST /extend newEndDate): 2027-11-05; expired → today + 12 months', () => {
    expect(extensionEndKeyForMonths(END, 12, NOW)).toBe('2027-11-05');
    expect(extensionEndKeyForMonths(new Date('2026-11-01T16:59:59.999Z'), 12, NOW)).toBe('2027-11-03');
  });
});
