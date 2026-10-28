/**
 * #1189 "Với app cũ": PUT /api/settings/merchant { blockPricing: { oldApps } } (MERCHANT only, merged into
 * Merchant.settings) and GET /api/users/profile merchant.blockPricing (how the web reads it, #1138).
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  // merchant.manage is granted by the wrapper; custom roles can union-grant it, so the handler checks the role
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  withAnyAuth: (handler: any) => (request: any) => handler(request, ctx),
  generateToken: jest.fn(() => 'web-token'),
  generateMobileToken: jest.fn(() => 'mobile-token'),
  generateRefreshableToken: jest.fn(() => 'refreshable'),
  getUserPermissions: jest.fn(async () => []),
}));
jest.mock('@rentalshop/auth', () => ({ ROLE_PERMISSIONS: {} }));

const mockDb: any = {
  users: { findById: jest.fn() },
  merchants: {
    findById: jest.fn(),
    findByTenantKey: jest.fn(async () => null),
    update: jest.fn(),
    ensureTenantKey: jest.fn(async () => 'shop'),
  },
  outlets: { findById: jest.fn() },
  sessions: { createUserSession: jest.fn(async () => ({ sessionId: 's1' })) },
  refreshTokens: { create: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: {}, getDefaultBankAccount: async () => null }));
jest.mock('@rentalshop/utils', () => ({
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
  },
}));

import { PUT as putMerchantSettings } from '../../apps/api/app/api/settings/merchant/route';
import { GET as getProfile } from '../../apps/api/app/api/users/profile/route';

const as = (role: string, extra: any = {}) => ({
  user: { id: 10, role, email: 'u@x', merchantId: 2, ...extra },
  userScope: { merchantId: 2, ...(extra.outletId ? { outletId: extra.outletId } : {}) },
});
const req = (body?: any): any => ({
  url: 'http://localhost/api/settings/merchant',
  method: 'PUT',
  headers: { get: () => null, entries: () => [][Symbol.iterator]() },
  json: async () => body,
});

const MERCHANT_ROW = {
  id: 2,
  name: 'Shop',
  email: 'shop@x',
  phone: '090',
  tenantKey: 'shop',
  isActive: true,
  planId: 1,
  totalRevenue: 0,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  lastActiveAt: null,
};



describe('PUT /api/settings/merchant blockPricing (#1189 "Với app cũ")', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.users.findById.mockResolvedValue({ id: 10, merchant: { id: 2, settings: { installments: { on: true }, blockPricing: { other: 1 } } } });
    mockDb.merchants.update.mockImplementation(async (_id: number, data: any) => ({ ...MERCHANT_ROW, ...data }));
  });

  it('the owner sets block; the other keys of settings are kept', async () => {
    ctx = as('MERCHANT');
    const res: any = await putMerchantSettings(req({ blockPricing: { oldApps: 'block' } }));
    expect(res.status).toBe(200);
    expect(mockDb.merchants.update).toHaveBeenCalledWith(2, {
      settings: { installments: { on: true }, blockPricing: { other: 1, oldApps: 'block' } },
    });
    expect(res.body.data.blockPricing).toEqual({ oldApps: 'block' });
  });

  it('only MERCHANT: 403 for ADMIN, OUTLET_ADMIN and OUTLET_STAFF, nothing written', async () => {
    for (const role of ['ADMIN', 'OUTLET_ADMIN', 'OUTLET_STAFF']) {
      ctx = as(role, { outletId: 3 });
      expect(((await putMerchantSettings(req({ blockPricing: { oldApps: 'block' } }))) as any).status).toBe(403);
    }
    expect(mockDb.merchants.update).not.toHaveBeenCalled();
  });

  it('400 for an unknown value or shape', async () => {
    ctx = as('MERCHANT');
    for (const bad of [{ oldApps: 'reject' }, { oldApps: true }, {}, null, 'block']) {
      expect(((await putMerchantSettings(req({ blockPricing: bad }))) as any).status).toBe(400);
    }
    expect(mockDb.merchants.update).not.toHaveBeenCalled();
  });

  it('a body without it leaves settings alone', async () => {
    ctx = as('MERCHANT');
    await putMerchantSettings(req({ showPublicPrice: false }));
    expect(mockDb.merchants.update.mock.calls[0][1]).not.toHaveProperty('settings');
  });
});

describe('profile carries merchant.blockPricing (#1189)', () => {
  it("'recompute' when unset or unknown, 'block' when stored", async () => {
    for (const [settings, expected] of [[undefined, 'recompute'], [{ blockPricing: { oldApps: 'weird' } }, 'recompute'], [{ blockPricing: { oldApps: 'block' } }, 'block']] as const) {
      ctx = as('MERCHANT');
      mockDb.users.findById.mockResolvedValue({
        id: 10, email: 'u@x', role: 'MERCHANT', merchantId: 2,
        merchant: { ...MERCHANT_ROW, ...(settings ? { settings } : {}) },
      });
      const res: any = await getProfile(req());
      expect(res.body.data.merchant.blockPricing).toEqual({ oldApps: expected });
    }
  });
});
