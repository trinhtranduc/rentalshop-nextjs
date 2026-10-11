/**
 * #870 (owner 2026-10-11): add-ons on every manual paid-period path, catalog pack size from the next renewal,
 * more packs now (charged prorated) / fewer packs next period, and no single-branch plan with branch add-ons.
 */
import * as fs from 'fs';
import * as path from 'path';

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: () => (handler: any) => (request: any) =>
    handler(request, { user: { id: 1, role: 'ADMIN', email: 'a@x' }, userScope: {} }),
}));

const mockTx = { payment: { create: jest.fn() }, subscription: { update: jest.fn() } };
const mockDb: any = {
  addonPrices: { findById: jest.fn(), update: jest.fn(), countShopsUsing: jest.fn() },
  merchantAddons: {
    findById: jest.fn(),
    renewalItems: jest.fn(async () => ({ items: [], catalog: new Map() })),
    applyRenewal: jest.fn(),
    addPacks: jest.fn(),
    setNextPacks: jest.fn(),
  },
  merchants: { findById: jest.fn() },
  subscriptions: { findById: jest.fn(), update: jest.fn(async () => ({ id: 7 })) },
  planLimitAddons: { findActiveByMerchant: jest.fn(async () => []), calculateTotal: jest.fn(async () => ({})) },
  subscriptionActivities: { create: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: { $transaction: (fn: any) => fn(mockTx) } }));

const mockValidate = jest.fn(async () => ({ isValid: true }));
jest.mock('@rentalshop/utils/server', () => ({ validateAddonDeletion: (...a: any[]) => (mockValidate as any)(...a) }));
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/billing-dates'),
  ...jest.requireActual('../../packages/utils/src/core/billing-interval'),
  ...jest.requireActual('../../packages/utils/src/core/pricing-calculator'),
  ...jest.requireActual('../../packages/utils/src/core/subscription-billing-calculations'),
  ...jest.requireActual('../../packages/utils/src/core/addon-pricing'),
  ...jest.requireActual('../../packages/utils/src/core/plan-addon-rules'),
  formatDateKeyInTimeZone: (d: Date) => new Date(d).toISOString().slice(0, 10),
  SHOP_TIMEZONE: 'Asia/Ho_Chi_Minh',
  formatCurrency: (n: number) => String(n),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  sendSubscriptionExtensionEmail: jest.fn(() => Promise.resolve({ success: true })),
}));

import { PUT as updatePrice } from '../../apps/api/app/api/addon-prices/[id]/route';
import { PATCH as patchShopAddon } from '../../apps/api/app/api/merchants/[id]/addons/[addonId]/route';
import { POST as extend } from '../../apps/api/app/api/subscriptions/[id]/extend/route';
import { GET as extendCalc } from '../../apps/api/app/api/subscriptions/[id]/extend/calculate/route';

const ROOT = path.join(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const req = (body: any = {}, url = 'http://x/api') => ({ json: async () => body, url } as any);
const DAY = 86400000;

beforeEach(() => {
  jest.clearAllMocks();
  mockValidate.mockResolvedValue({ isValid: true });
});

describe('catalog pack size applies from the next renewal', () => {
  it('PUT changes the pack size while shops use the row (no ADDON_PRICE_IN_USE)', async () => {
    mockDb.addonPrices.findById.mockResolvedValue({ id: 1, limitKind: 'users', packSize: 2, monthlyPrice: 40000, isActive: true });
    mockDb.addonPrices.countShopsUsing.mockResolvedValue(3);
    mockDb.addonPrices.update.mockImplementation(async (id: number, d: any) => ({ id, ...d }));
    const res: any = await updatePrice(req({ packSize: 3 }), { params: { id: '1' } });
    expect(res.status).toBe(200);
    expect(mockDb.addonPrices.update).toHaveBeenCalledWith(1, { packSize: 3 });
  });
});

describe('packs of a shop item: more now (charged), fewer next period', () => {
  const periodStart = new Date(Date.now() - 9 * DAY);
  const periodEnd = new Date(Date.now() + 21 * DAY);
  const shop = { id: 5, name: 'S', subscription: { id: 7, status: 'ACTIVE', currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, interval: 'month', intervalCount: 1, plan: { id: 1, name: 'P', basePrice: 1, limits: { outlets: 3 } } } };
  const item = { id: 40, merchantId: 5, addonPriceId: 1, unitPrice: 40000, packs: 2, packSize: 2, limitKind: 'users', isActive: true, removeAtPeriodEnd: false, endsAt: null, nextPacks: null, outlets: 0, users: 4, products: 0, customers: 0, orders: 0 };
  const row = { id: 1, name: 'Gói 2 nhân viên', limitKind: 'users', packSize: 2, monthlyPrice: 40000, isActive: true };
  const patch = (body: any) => patchShopAddon(req(body), { params: { id: '5', addonId: '40' } }) as any;

  beforeEach(() => {
    mockDb.merchantAddons.findById.mockResolvedValue({ ...item });
    mockDb.merchants.findById.mockResolvedValue(shop);
    mockDb.addonPrices.findById.mockResolvedValue(row);
    mockDb.merchantAddons.addPacks.mockImplementation(async (i: any) => ({ addon: { ...item, packs: i.packs }, payment: null }));
    mockDb.merchantAddons.setNextPacks.mockImplementation(async (id: number, n: any) => ({ ...item, nextPacks: n }));
  });

  it('more packs: the limit grows now and the extra packs are charged by the #869 quote', async () => {
    const res = await patch({ packs: 3, method: 'TRANSFER', transactionId: 'T1' });
    expect(res.status).toBe(200);
    const input = mockDb.merchantAddons.addPacks.mock.calls[0][0];
    expect(input).toMatchObject({ itemId: 40, packs: 3, extraPacks: 1, method: 'TRANSFER', transactionId: 'T1' });
    expect(input.columns).toMatchObject({ users: 6 });
    expect(input.quote.monthlyAmount).toBe(40000);
    expect(input.quote.amountDue).toBe(Math.round((40000 * input.quote.remainingDays) / input.quote.periodDays));
    expect(res.body.data.quote.amountDue).toBe(input.quote.amountDue);
  });

  it('fewer packs: nothing changes now, nextPacks waits for the renewal, no payment', async () => {
    const res = await patch({ packs: 1 });
    expect(res.status).toBe(200);
    expect(mockDb.merchantAddons.setNextPacks).toHaveBeenCalledWith(40, 1);
    expect(mockDb.merchantAddons.addPacks).not.toHaveBeenCalled();
    expect(mockValidate).toHaveBeenCalledWith(5, expect.objectContaining({ users: 2 }));
  });

  it('fewer packs is refused when the usage would not fit (as a removal)', async () => {
    mockValidate.mockResolvedValue({ isValid: false, exceededLimits: ['users'] } as any);
    const res = await patch({ packs: 1 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('CANNOT_DELETE_ADDON_LIMIT_EXCEEDED');
  });

  it('the same number cancels a pending reduction', async () => {
    mockDb.merchantAddons.findById.mockResolvedValue({ ...item, nextPacks: 1 });
    const res = await patch({ packs: 2 });
    expect(res.status).toBe(200);
    expect(mockDb.merchantAddons.setNextPacks).toHaveBeenCalledWith(40, null);
  });

  it('more packs of a paused row: 422 ADDON_PRICE_NOT_ON_SALE; an old free item: 404 ADDON_PRICE_NOT_FOUND', async () => {
    mockDb.addonPrices.findById.mockResolvedValue({ ...row, isActive: false });
    expect((await patch({ packs: 3 })).body.code).toBe('ADDON_PRICE_NOT_ON_SALE');
    mockDb.merchantAddons.findById.mockResolvedValue({ ...item, addonPriceId: null });
    const legacy = await patch({ packs: 3 });
    expect(legacy.status).toBe(404);
    expect(legacy.body.code).toBe('ADDON_PRICE_NOT_FOUND');
  });
});

describe('extend counts the renewed add-ons', () => {
  const now = Date.now();
  const sub = { id: 7, merchantId: 5, planId: 1, currency: 'VND', interval: 'month', intervalCount: 1, currentPeriodStart: new Date(now - 10 * DAY), currentPeriodEnd: new Date(now + 20 * DAY), plan: { id: 1, name: 'P', basePrice: 300000, currency: 'VND' } };
  const addonItems = [{ id: 40, addonPriceId: 1, packs: 1, unitPrice: 40000, packSize: 2, limitKind: 'users', isActive: true }];
  const catalog = new Map([[1, { id: 1, monthlyPrice: 60000, isActive: true, packSize: 3 }]]);

  beforeEach(() => {
    mockDb.subscriptions.findById.mockResolvedValue(sub);
    mockDb.merchantAddons.renewalItems.mockResolvedValue({ items: addonItems, catalog });
  });

  it('calculate: totalPrice = plan part + add-on part; extensionPrice stays the plan part', async () => {
    const newEnd = new Date(sub.currentPeriodEnd.getTime() + 15 * DAY).toISOString();
    const res: any = await extendCalc(req({}, `http://x/api/subscriptions/7/extend/calculate?newEndDate=${newEnd}`), { params: { id: '7' } });
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.addonMonthlyTotal).toBe(60000);
    expect(d.addonPrice).toBeCloseTo((d.extensionDays / d.selectedPeriodDays) * 60000, 1);
    expect(d.totalPrice).toBeCloseTo(d.extensionPrice + d.addonPrice, 1);
  });

  it('extend without an amount charges plan + add-ons and renews the add-ons (price, pack size) in the transaction', async () => {
    const newEnd = new Date(sub.currentPeriodEnd.getTime() + 15 * DAY).toISOString();
    const res: any = await extend(req({ newEndDate: newEnd, method: 'PAYMENT_RECEIVED', sendEmail: false }, 'http://x/api/subscriptions/7/extend'), { params: { id: '7' } });
    expect(res.status).toBe(200);
    const details = res.body.data.extensionDetails;
    expect(details.addonPrice).toBeGreaterThan(0);
    expect(mockTx.payment.create.mock.calls[0][0].data.amount).toBeCloseTo(details.calculatedAmount, 2);
    const lines = mockDb.merchantAddons.applyRenewal.mock.calls[0][1];
    expect(lines).toEqual([expect.objectContaining({ id: 40, renew: true, unitPrice: 60000, packSize: 3 })]);
  });
});

describe('wiring (#870)', () => {
  it.each(['en', 'vi', 'ja', 'ko', 'zh'])('locales/%s/errors.json has PLAN_CHANGE_REMOVE_OUTLET_ADDONS', (lang) => {
    expect(JSON.stringify(JSON.parse(read(`locales/${lang}/errors.json`)))).toContain('"PLAN_CHANGE_REMOVE_OUTLET_ADDONS"');
  });

  it('ErrorCode has PLAN_CHANGE_REMOVE_OUTLET_ADDONS (422)', () => {
    const errors = read('packages/utils/src/core/errors.ts');
    expect(errors).toContain("PLAN_CHANGE_REMOVE_OUTLET_ADDONS = 'PLAN_CHANGE_REMOVE_OUTLET_ADDONS'");
    expect(errors).toMatch(/\[ErrorCode\.PLAN_CHANGE_REMOVE_OUTLET_ADDONS\]: 422/);
  });

  it('changePlan refuses a single-branch plan with branch add-ons and counts the add-ons', () => {
    const src = read('packages/database/src/subscription.ts');
    expect(src).toContain('outletAddonsBlockPlan');
    expect(src).toContain('PLAN_CHANGE_REMOVE_OUTLET_ADDONS');
    expect(src).toMatch(/applyRenewal/);
  });

  it('the nextPacks migration is additive', () => {
    const dir = path.join(ROOT, 'prisma/migrations');
    const name = fs.readdirSync(dir).find((d) => d.endsWith('_addon_next_packs'));
    expect(name).toBeTruthy();
    const sql = fs.readFileSync(path.join(dir, name as string, 'migration.sql'), 'utf8');
    expect(sql).toMatch(/ADD COLUMN\s+"nextPacks" INTEGER/);
    expect(sql).not.toMatch(/\bDROP\b|\bRENAME\b|ALTER COLUMN|NOT NULL/i);
  });

  it('the edit dialog says the pack size applies from the next renewal and no longer locks it', () => {
    const page = read('apps/admin/app/plans/addon-prices/page.tsx');
    expect(page).toContain('áp dụng từ kỳ gia hạn sau');
    expect(page).not.toMatch(/disabled=\{!!editing && editing\.shopsUsing > 0\}/);
  });
});
