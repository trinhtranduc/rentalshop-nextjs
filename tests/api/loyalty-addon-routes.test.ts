/**
 * #967: Khách thân thiết sold as a feature add-on through the #943 routes.
 * - Price list accepts `featureKey: 'loyalty'`.
 * - Buy: same quote (79.000 ÷ 30 × days left); a shop whose plan already includes loyalty → 422 ADDON_FEATURE_IN_PLAN
 *   (no double charge), quote and purchase alike.
 * - GET adds `featureSources` (plan / add-on per module) for the admin label.
 * - Admin can also enable loyalty via PUT /modules/loyalty (#1187, route kept; #782 removed the free button).
 * - #782: not sold to Basic, see addon-typed-amount-routes.test.ts; the shop here is on another plan without loyalty.
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
const mockMerchantModules = { listForMerchant: jest.fn(), sources: jest.fn(), upsert: jest.fn() };
const mockAuditLogs = { create: jest.fn() };
jest.mock('@rentalshop/database', () => ({
  db: {
    addonPrices: mockAddonPrices,
    merchantAddons: mockMerchantAddons,
    merchants: mockMerchants,
    merchantModules: mockMerchantModules,
    auditLogs: mockAuditLogs,
  },
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
import { GET as listShopAddons, POST as addShopAddon } from '../../apps/api/app/api/merchants/[id]/addons/route';
import { GET as quoteRoute } from '../../apps/api/app/api/merchants/[id]/addons/quote/route';
import { PUT as putLegacyModule } from '../../apps/api/app/api/merchants/[id]/modules/[key]/route';

const req = (body: any = {}, url = 'http://x/api') => ({ json: async () => body, url } as any);
const DAY = 86400000;
const periodStart = new Date(Date.now() - 10 * DAY);
const periodEnd = new Date(Date.now() + 20 * DAY);
const SINGLE = { outlets: 1, users: 3, products: -1, customers: -1, orders: -1 };
const shop = (features: string, status = 'ACTIVE') => ({
  id: 7,
  name: 'Shop',
  subscription: {
    id: 70, status, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, interval: 'month', intervalCount: 1,
    plan: { id: 1, name: 'Trial', basePrice: 199000, limits: JSON.stringify(SINGLE), features },
  },
});
const loyaltyRow = { id: 6, name: 'Khách thân thiết', limitKind: 'feature', featureKey: 'loyalty', packSize: 1, monthlyPrice: 79000, isActive: true };
const loyaltyItem = {
  id: 60, merchantId: 7, addonPriceId: 6, featureKey: 'loyalty', name: 'Khách thân thiết', limitKind: 'feature', packSize: 1, packs: 1,
  nextPacks: null, unitPrice: 79000, isActive: true, removeAtPeriodEnd: false, endsAt: null, outlets: 0, users: 0, products: 0, customers: 0, orders: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMerchants.findById.mockResolvedValue(shop(JSON.stringify(['Quản lý đơn'])));
  mockAddonPrices.findById.mockResolvedValue(loyaltyRow);
  mockMerchantAddons.findActiveFeature.mockResolvedValue(null);
  mockMerchantAddons.add.mockImplementation(async (input: any) => ({ addon: { id: 60, ...input }, payment: { id: 1 } }));
  mockMerchantModules.listForMerchant.mockResolvedValue([]);
  mockMerchantModules.sources.mockResolvedValue([]);
  mockMerchantModules.upsert.mockImplementation(async (_merchantId: number, key: string, d: any) => ({
    key,
    enabled: d.enabled,
    endsAt: d.endsAt ?? null,
  }));
  mockAuditLogs.create.mockResolvedValue({});
});

describe('price list: loyalty row (#967)', () => {
  it('POST creates "Khách thân thiết · Tính năng" (featureKey loyalty, pack size 1)', async () => {
    mockAddonPrices.create.mockImplementation(async (d: any) => ({ id: 6, ...d }));
    const res: any = await createPrice(req({ name: 'Khách thân thiết', limitKind: 'feature', featureKey: 'loyalty', monthlyPrice: 79000 }));
    expect(res.status).toBe(201);
    expect(mockAddonPrices.create).toHaveBeenCalledWith(expect.objectContaining({ limitKind: 'feature', featureKey: 'loyalty', packSize: 1, monthlyPrice: 79000 }));
  });
});

describe('buy the loyalty add-on (#967)', () => {
  const add = (body: any) => addShopAddon(req(body), { params: { id: '7' } }) as any;

  it('plan without loyalty: bought with the #943 charge (79.000 ÷ 30 × days left), packs 1', async () => {
    const res = await add({ addonPriceId: 6, packs: 3, method: 'TRANSFER' });
    expect(res.status).toBe(201);
    const input = mockMerchantAddons.add.mock.calls[0][0];
    expect(input.packs).toBe(1);
    expect(input.addonPrice).toMatchObject({ featureKey: 'loyalty', monthlyPrice: 79000 });
    expect(input.quote.amountDue).toBe(Math.round((79000 / 30) * input.quote.remainingDays));
  });

  it('trial shop: 0 now', async () => {
    mockMerchants.findById.mockResolvedValue(shop('[]', 'TRIAL'));
    const res = await add({ addonPriceId: 6, packs: 1 });
    expect(res.status).toBe(201);
    expect(mockMerchantAddons.add.mock.calls[0][0].quote).toMatchObject({ amountDue: 0, reason: 'trial' });
  });

  it('plan already includes loyalty → 422 ADDON_FEATURE_IN_PLAN, nothing written (no double charge)', async () => {
    mockMerchants.findById.mockResolvedValue(shop(JSON.stringify(['loyalty'])));
    const res = await add({ addonPriceId: 6, packs: 1 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ADDON_FEATURE_IN_PLAN');
    expect(mockMerchantAddons.add).not.toHaveBeenCalled();
    const q: any = await quoteRoute(req({}, 'http://x/api/merchants/7/addons/quote?addonPriceId=6&packs=1'), { params: { id: '7' } });
    expect(q.status).toBe(422);
    expect(q.body.code).toBe('ADDON_FEATURE_IN_PLAN');
  });

  it('an attendance row is not blocked by a loyalty plan', async () => {
    mockMerchants.findById.mockResolvedValue(shop(JSON.stringify(['loyalty'])));
    mockAddonPrices.findById.mockResolvedValue({ ...loyaltyRow, id: 5, name: 'Chấm công', featureKey: 'attendance', monthlyPrice: 99000 });
    expect((await add({ addonPriceId: 5, packs: 1 })).status).toBe(201);
  });

  it('already has the loyalty add-on → 422 ADDON_FEATURE_ALREADY_ON (unchanged #943 rule)', async () => {
    mockMerchantAddons.findActiveFeature.mockResolvedValue(loyaltyItem);
    const res = await add({ addonPriceId: 6, packs: 1 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ADDON_FEATURE_ALREADY_ON');
  });
});

describe('GET shop add-ons: featureSources (#967)', () => {
  it('adds where each feature comes from; the rest of the answer is unchanged', async () => {
    mockMerchantAddons.listForMerchant.mockResolvedValue([loyaltyItem]);
    mockAddonPrices.findManyByIds.mockResolvedValue([loyaltyRow]);
    const sources = [
      { key: 'attendance', active: false, plan: false, addon: false, legacy: false },
      { key: 'loyalty', active: true, plan: false, addon: true, legacy: false },
    ];
    mockMerchantModules.sources.mockResolvedValue(sources);
    const res: any = await listShopAddons(req(), { params: { id: '7' } });
    expect(res.status).toBe(200);
    expect(res.body.data.featureSources).toEqual(sources);
    expect(res.body.data.renewal.monthly.totalDue).toBe(199000 + 79000);
    expect(res.body.data.legacyModules).toEqual([]);
  });

  it('a failing sources lookup still loads the page (featureSources [])', async () => {
    mockMerchantAddons.listForMerchant.mockResolvedValue([]);
    mockMerchantModules.sources.mockRejectedValue(new Error('db'));
    const res: any = await listShopAddons(req(), { params: { id: '7' } });
    expect(res.status).toBe(200);
    expect(res.body.data.featureSources).toEqual([]);
  });
});

describe('admin can enable loyalty (#1187)', () => {
  it('PUT /api/merchants/7/modules/loyalty stores the switch (same body as attendance)', async () => {
    const res: any = await putLegacyModule(req({ enabled: true }), { params: { id: '7', key: 'loyalty' } });
    expect(res.status).toBe(200);
    expect(mockMerchantModules.upsert).toHaveBeenCalledWith(7, 'loyalty', expect.objectContaining({ enabled: true, updatedById: 1 }));
    expect(res.body.data).toEqual(expect.objectContaining({ key: 'loyalty', enabled: true }));
  });
});
