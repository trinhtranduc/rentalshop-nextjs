/**
 * #782 through the routes: a typed amount on a packSize = 1 row, the 100,000 maximum, a total too large for the Int
 * column, and "loyalty is not sold to Basic" (owner decision 2026-10-31) on quote and purchase alike.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));
jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: () => (handler: any) => (request: any) => handler(request, { user: { id: 1, role: 'ADMIN', email: 'admin@x' }, userScope: {} }),
}));

const mockAddonPrices = { findById: jest.fn(), findManyByIds: jest.fn() };
const mockMerchantAddons = { listForMerchant: jest.fn(), findById: jest.fn(), add: jest.fn(), addPacks: jest.fn(), setNextPacks: jest.fn(), setRemoveAtPeriodEnd: jest.fn(), findActiveFeature: jest.fn() };
const mockMerchants = { findById: jest.fn() };
jest.mock('@rentalshop/database', () => ({
  db: { addonPrices: mockAddonPrices, merchantAddons: mockMerchantAddons, merchants: mockMerchants, merchantModules: { listForMerchant: jest.fn(async () => []), sources: jest.fn(async () => []) } },
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

import { POST as addShopAddon } from '../../apps/api/app/api/merchants/[id]/addons/route';
import { GET as quoteRoute } from '../../apps/api/app/api/merchants/[id]/addons/quote/route';
import { PATCH as patchAddon } from '../../apps/api/app/api/merchants/[id]/addons/[addonId]/route';

const DAY = 86400000;
const shop = (planName: string, status = 'ACTIVE') => ({
  id: 7,
  name: 'Shop',
  subscription: {
    id: 70, status, currentPeriodStart: new Date(Date.now() - 10 * DAY), currentPeriodEnd: new Date(Date.now() + 20 * DAY), interval: 'month', intervalCount: 1,
    plan: { id: 1, name: planName, basePrice: 79000, limits: JSON.stringify({ outlets: 1, users: 2, products: 3000, customers: 3000, orders: 3000 }), features: JSON.stringify(['Quản lý đơn']) },
  },
});
const unitRow = { id: 3, name: 'Thêm sản phẩm', limitKind: 'products', packSize: 1, monthlyPrice: 500, isActive: true };
const loyaltyRow = { id: 6, name: 'Khách thân thiết', limitKind: 'feature', featureKey: 'loyalty', packSize: 1, monthlyPrice: 49000, isActive: true };
const attendanceRow = { ...loyaltyRow, id: 5, name: 'Chấm công', featureKey: 'attendance' };

const req = (body: any = {}, url = 'http://x/api') => ({ json: async () => body, url } as any);
const add = (body: any) => addShopAddon(req(body), { params: { id: '7' } }) as any;
const quote = (addonPriceId: number, packs: number) =>
  quoteRoute(req({}, `http://x/api/merchants/7/addons/quote?addonPriceId=${addonPriceId}&packs=${packs}`), { params: { id: '7' } }) as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockMerchants.findById.mockResolvedValue(shop('Trial'));
  mockAddonPrices.findById.mockResolvedValue(unitRow);
  mockMerchantAddons.findActiveFeature.mockResolvedValue(null);
  mockMerchantAddons.add.mockImplementation(async (input: any) => ({ addon: { id: 60, ...input }, payment: null }));
  mockMerchantAddons.addPacks.mockImplementation(async (input: any) => ({ addon: { id: input.itemId, packs: input.packs }, payment: null }));
});

describe('typed amount (#782)', () => {
  it('POST packs 100 on a unit row: price from the list × 100, the body cannot set money', async () => {
    const res = await add({ addonPriceId: 3, packs: 100, method: 'TRANSFER', unitPrice: 1, monthlyPrice: 1, amountDue: 1 });
    expect(res.status).toBe(201);
    const input = mockMerchantAddons.add.mock.calls[0][0];
    expect(input.packs).toBe(100);
    expect(input.addonPrice.monthlyPrice).toBe(500);
    expect(input.quote.monthlyAmount).toBe(50000);
  });

  it('POST packs 100,000 is accepted; 100,001 → 400', async () => {
    expect((await add({ addonPriceId: 3, packs: 100000 })).status).toBe(201);
    const over = await add({ addonPriceId: 3, packs: 100001 });
    expect(over.status).toBe(400);
    expect(mockMerchantAddons.add).toHaveBeenCalledTimes(1);
  });

  it('quote at 100,000 answers; 100,001 → 400', async () => {
    expect((await quote(3, 100000)).status).toBe(200);
    expect((await quote(3, 100001)).status).toBe(400);
  });

  it('a total too large for the Int column → 422 ADDON_AMOUNT_TOO_LARGE on quote and purchase, nothing written', async () => {
    mockAddonPrices.findById.mockResolvedValue({ ...unitRow, packSize: 1000000 });
    const res = await add({ addonPriceId: 3, packs: 100000 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ADDON_AMOUNT_TOO_LARGE');
    expect((await quote(3, 100000)).body.code).toBe('ADDON_AMOUNT_TOO_LARGE');
    expect(mockMerchantAddons.add).not.toHaveBeenCalled();
  });

  it('PATCH more packs up to a total too large for the column → 422, nothing written', async () => {
    mockAddonPrices.findById.mockResolvedValue({ ...unitRow, packSize: 1000000 });
    mockMerchantAddons.findById.mockResolvedValue({ id: 30, merchantId: 7, addonPriceId: 3, limitKind: 'products', packSize: 1000000, packs: 2000, isActive: true, removeAtPeriodEnd: false, endsAt: null, outlets: 0, users: 0, products: 2000000000, customers: 0, orders: 0 });
    const res = (await patchAddon(req({ packs: 3000 }), { params: { id: '7', addonId: '30' } })) as any;
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ADDON_AMOUNT_TOO_LARGE');
    expect(mockMerchantAddons.addPacks).not.toHaveBeenCalled();
  });

  it('PATCH to 100,000 on a unit row works', async () => {
    mockMerchantAddons.findById.mockResolvedValue({ id: 30, merchantId: 7, addonPriceId: 3, limitKind: 'products', packSize: 1, packs: 100, isActive: true, removeAtPeriodEnd: false, endsAt: null, outlets: 0, users: 0, products: 100, customers: 0, orders: 0 });
    const res = (await patchAddon(req({ packs: 100000 }), { params: { id: '7', addonId: '30' } })) as any;
    expect(res.status).toBe(200);
    expect(mockMerchantAddons.addPacks.mock.calls[0][0].columns.products).toBe(100000);
  });
});

describe('loyalty is not sold to Basic (#782, owner decision)', () => {
  beforeEach(() => mockAddonPrices.findById.mockResolvedValue(loyaltyRow));

  it.each(['Basic', 'basic', 'Gói BASIC'])('%s: purchase → 422 ADDON_LOYALTY_NOT_FOR_BASIC, nothing written', async (name) => {
    mockMerchants.findById.mockResolvedValue(shop(name));
    const res = await add({ addonPriceId: 6, packs: 1, method: 'TRANSFER' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ADDON_LOYALTY_NOT_FOR_BASIC');
    expect(mockMerchantAddons.add).not.toHaveBeenCalled();
  });

  it('Basic: quote refused the same way', async () => {
    mockMerchants.findById.mockResolvedValue(shop('Basic'));
    const res = await quote(6, 1);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ADDON_LOYALTY_NOT_FOR_BASIC');
  });

  it('Basic with a trial status is still Basic', async () => {
    mockMerchants.findById.mockResolvedValue(shop('Basic', 'TRIAL'));
    expect((await add({ addonPriceId: 6, packs: 1 })).body.code).toBe('ADDON_LOYALTY_NOT_FOR_BASIC');
  });

  it('Trial: sold, 0 now', async () => {
    mockMerchants.findById.mockResolvedValue(shop('Trial', 'TRIAL'));
    const res = await add({ addonPriceId: 6, packs: 1 });
    expect(res.status).toBe(201);
    expect(mockMerchantAddons.add.mock.calls[0][0].quote).toMatchObject({ amountDue: 0, reason: 'trial' });
  });

  it('Basic can still buy a limit block and attendance: only loyalty is held back', async () => {
    mockMerchants.findById.mockResolvedValue(shop('Basic'));
    mockAddonPrices.findById.mockResolvedValue(unitRow);
    expect((await add({ addonPriceId: 3, packs: 100 })).status).toBe(201);
    mockAddonPrices.findById.mockResolvedValue(attendanceRow);
    expect((await add({ addonPriceId: 5, packs: 1 })).status).toBe(201);
  });
});
