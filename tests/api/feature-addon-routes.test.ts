/**
 * #943: routes of the "feature" add-on (attendance sold as an add-on, owner 2026-10-13).
 * - Price list: `limitKind: 'feature'` + `featureKey`; pack size 1; a feature row's pack size never changes.
 * - Buy: packs forced to 1, charge = the #870 quote; a shop that already has the feature → 422 ADDON_FEATURE_ALREADY_ON.
 * - Turn off = removeAtPeriodEnd (ends at the period end); packs cannot change on a feature item.
 * - GET shows a legacy module switch that is still on.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));
jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: () => (handler: any) => (request: any) => handler(request, { user: { id: 1, role: 'ADMIN', email: 'admin@x' }, userScope: {} }),
}));

const mockAddonPrices = { list: jest.fn(), findById: jest.fn(), findManyByIds: jest.fn(), create: jest.fn(), update: jest.fn() };
const mockMerchantAddons = {
  listForMerchant: jest.fn(),
  findById: jest.fn(),
  add: jest.fn(),
  addPacks: jest.fn(),
  setNextPacks: jest.fn(),
  setRemoveAtPeriodEnd: jest.fn(),
  findActiveFeature: jest.fn(),
};
const mockMerchants = { findById: jest.fn() };
const mockMerchantModules = { listForMerchant: jest.fn() };
jest.mock('@rentalshop/database', () => ({
  db: { addonPrices: mockAddonPrices, merchantAddons: mockMerchantAddons, merchants: mockMerchants, merchantModules: mockMerchantModules },
  prisma: {},
}));
jest.mock('@rentalshop/utils/server', () => ({
  validateAddonDeletion: jest.fn(async () => ({ isValid: true })),
  getPlanLimitsInfo: jest.fn(async () => ({ basePlanLimits: {}, addonLimits: {}, planLimits: {}, currentCounts: {} })),
}));
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/plan-addon-rules'),
  ...jest.requireActual('../../packages/utils/src/core/addon-pricing'),
  ...jest.requireActual('../../packages/utils/src/core/subscription-billing-calculations'),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
}));

import { POST as createPrice } from '../../apps/api/app/api/addon-prices/route';
import { PUT as updatePrice } from '../../apps/api/app/api/addon-prices/[id]/route';
import { GET as listShopAddons, POST as addShopAddon } from '../../apps/api/app/api/merchants/[id]/addons/route';
import { GET as quoteRoute } from '../../apps/api/app/api/merchants/[id]/addons/quote/route';
import { PATCH as patchShopAddon } from '../../apps/api/app/api/merchants/[id]/addons/[addonId]/route';

const req = (body: any = {}, url = 'http://x/api') => ({ json: async () => body, url } as any);
const DAY = 86400000;
const periodStart = new Date(Date.now() - 10 * DAY);
const periodEnd = new Date(Date.now() + 20 * DAY);
const SINGLE = { outlets: 1, users: 3, products: -1, customers: -1, orders: -1 };
const merchantOn = (status = 'ACTIVE') => ({
  id: 7,
  name: 'Shop',
  subscription: { id: 70, status, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, interval: 'month', intervalCount: 1, plan: { id: 1, name: 'Pro', basePrice: 399000, limits: JSON.stringify(SINGLE) } },
});
const attendanceRow = { id: 5, name: 'Chấm công', limitKind: 'feature', featureKey: 'attendance', packSize: 1, monthlyPrice: 99000, isActive: true };
const featureItem = {
  id: 50, merchantId: 7, addonPriceId: 5, featureKey: 'attendance', name: 'Chấm công', limitKind: 'feature', packSize: 1, packs: 1,
  nextPacks: null, unitPrice: 99000, isActive: true, removeAtPeriodEnd: false, endsAt: null, outlets: 0, users: 0, products: 0, customers: 0, orders: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMerchants.findById.mockResolvedValue(merchantOn());
  mockAddonPrices.findById.mockResolvedValue(attendanceRow);
  mockMerchantAddons.findActiveFeature.mockResolvedValue(null);
  mockMerchantAddons.add.mockImplementation(async (input: any) => ({ addon: { id: 50, ...input }, payment: { id: 1 } }));
  mockMerchantModules.listForMerchant.mockResolvedValue([]);
});

describe('price list: feature rows (#943)', () => {
  it('POST creates a feature row with featureKey and pack size 1', async () => {
    mockAddonPrices.create.mockImplementation(async (d: any) => ({ id: 5, ...d }));
    const res: any = await createPrice(req({ name: 'Chấm công', limitKind: 'feature', featureKey: 'attendance', packSize: 9, monthlyPrice: 99000 }));
    expect(res.status).toBe(201);
    expect(mockAddonPrices.create).toHaveBeenCalledWith(expect.objectContaining({ limitKind: 'feature', featureKey: 'attendance', packSize: 1, monthlyPrice: 99000 }));
  });

  it('POST refuses a feature row without a known featureKey (400)', async () => {
    expect(((await createPrice(req({ name: 'x', limitKind: 'feature', monthlyPrice: 1 }))) as any).status).toBe(400);
    expect(((await createPrice(req({ name: 'x', limitKind: 'feature', featureKey: 'nope', monthlyPrice: 1 }))) as any).status).toBe(400);
  });

  it('PUT changes a feature row price but never its pack size', async () => {
    mockAddonPrices.update.mockImplementation(async (id: number, d: any) => ({ id, ...attendanceRow, ...d }));
    const res: any = await updatePrice(req({ monthlyPrice: 120000, packSize: 3 }), { params: { id: '5' } });
    expect(res.status).toBe(200);
    expect(mockAddonPrices.update).toHaveBeenCalledWith(5, { monthlyPrice: 120000 });
  });
});

describe('buy a feature add-on (#943)', () => {
  const add = (body: any) => addShopAddon(req(body), { params: { id: '7' } }) as any;

  it('packs are 1 whatever the body says; the charge is the #870 quote (99.000 ÷ 30 × days left)', async () => {
    const res = await add({ addonPriceId: 5, packs: 4, method: 'CASH', transactionId: 'T1' });
    expect(res.status).toBe(201);
    const input = mockMerchantAddons.add.mock.calls[0][0];
    expect(input.packs).toBe(1);
    expect(input.method).toBe('CASH');
    expect(input.addonPrice).toMatchObject({ id: 5, featureKey: 'attendance', monthlyPrice: 99000 });
    expect(input.quote.amountDue).toBe(Math.round((99000 / 30) * input.quote.remainingDays));
    expect(input.quote.remainingDays).toBeGreaterThanOrEqual(19);
  });

  it('a trial shop pays 0 now', async () => {
    mockMerchants.findById.mockResolvedValue(merchantOn('TRIAL'));
    const res = await add({ addonPriceId: 5, packs: 1 });
    expect(res.status).toBe(201);
    expect(mockMerchantAddons.add.mock.calls[0][0].quote).toMatchObject({ amountDue: 0, reason: 'trial' });
  });

  it('a shop that already has the feature (un-ended) gets 422 ADDON_FEATURE_ALREADY_ON; nothing written', async () => {
    mockMerchantAddons.findActiveFeature.mockResolvedValue(featureItem);
    const res = await add({ addonPriceId: 5, packs: 1 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ADDON_FEATURE_ALREADY_ON');
    expect(mockMerchantAddons.findActiveFeature).toHaveBeenCalledWith(7, 'attendance');
    expect(mockMerchantAddons.add).not.toHaveBeenCalled();
  });

  it('the quote route answers the same 422 and quotes packs = 1', async () => {
    const ok: any = await quoteRoute(req({}, 'http://x/api/merchants/7/addons/quote?addonPriceId=5&packs=3'), { params: { id: '7' } });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ packs: 1, monthlyAmount: 99000 });
    expect(ok.body.data.addonPrice).toMatchObject({ featureKey: 'attendance' });
    mockMerchantAddons.findActiveFeature.mockResolvedValue(featureItem);
    const dup: any = await quoteRoute(req({}, 'http://x/api/merchants/7/addons/quote?addonPriceId=5&packs=1'), { params: { id: '7' } });
    expect(dup.status).toBe(422);
    expect(dup.body.code).toBe('ADDON_FEATURE_ALREADY_ON');
  });
});

describe('turn a feature add-on off / packs (#943)', () => {
  const patch = (body: any) => patchShopAddon(req(body), { params: { id: '7', addonId: '50' } }) as any;

  beforeEach(() => {
    mockMerchantAddons.findById.mockResolvedValue(featureItem);
    mockMerchantAddons.setRemoveAtPeriodEnd.mockImplementation(async (id: number, flag: boolean, endsAt: any) => ({ ...featureItem, removeAtPeriodEnd: flag, endsAt }));
  });

  it('"Tắt từ kỳ sau" ends it at the current period end (no refund, nothing charged)', async () => {
    const res = await patch({ removeAtPeriodEnd: true });
    expect(res.status).toBe(200);
    expect(mockMerchantAddons.setRemoveAtPeriodEnd).toHaveBeenCalledWith(50, true, periodEnd);
    expect(mockMerchantAddons.addPacks).not.toHaveBeenCalled();
  });

  it('packs of a feature item cannot change (400 INVALID_INPUT)', async () => {
    const res = await patch({ packs: 2 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
    expect(mockMerchantAddons.addPacks).not.toHaveBeenCalled();
    expect(mockMerchantAddons.setNextPacks).not.toHaveBeenCalled();
  });
});

describe('GET shop add-ons (#943)', () => {
  it('a feature item renews at the list price; a legacy module switch still on is listed', async () => {
    mockMerchantAddons.listForMerchant.mockResolvedValue([featureItem]);
    mockAddonPrices.findManyByIds.mockResolvedValue([attendanceRow]);
    mockMerchantModules.listForMerchant.mockResolvedValue([{ key: 'attendance', enabled: true, endsAt: null }]);
    const res: any = await listShopAddons(req(), { params: { id: '7' } });
    expect(res.status).toBe(200);
    expect(res.body.data.addons[0]).toMatchObject({ featureKey: 'attendance', renews: true, renewMonthlyAmount: 99000, monthlyAmount: 99000 });
    expect(res.body.data.renewal.addonMonthlyTotal).toBe(99000);
    expect(res.body.data.renewal.monthly.totalDue).toBe(399000 + 99000);
    expect(res.body.data.legacyModules).toEqual([{ key: 'attendance', enabled: true, endDate: null, active: true }]);
  });
});
