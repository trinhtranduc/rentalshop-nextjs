/**
 * #518 — the "Cho tạo đơn khi trùng lịch" setting (Merchant.allowOverlappingOrders) on the routes that
 * write and read it:
 * - PUT /api/settings/merchant: owner (MERCHANT) or ADMIN only, boolean only; a body with just the
 *   setting updates just that field; the business-info form old clients send is unchanged.
 * - GET /api/users/profile and the login payload: `merchant.allowOverlappingOrders` added, other keys unchanged.
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
import { buildAuthLoginSuccessResponse } from '../../apps/api/lib/build-auth-login-response';

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

describe('PUT /api/settings/merchant allowOverlappingOrders (#518)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.users.findById.mockResolvedValue({ id: 10, merchant: { id: 2 } });
    mockDb.merchants.update.mockImplementation(async (id: number, data: any) => ({
      ...MERCHANT_ROW,
      allowOverlappingOrders: true,
      ...data,
      id,
    }));
  });

  it.each(['MERCHANT', 'ADMIN'])('%s can turn it off with a body carrying only the setting', async (role) => {
    ctx = as(role);
    const res: any = await putMerchantSettings(req({ allowOverlappingOrders: false }));
    expect(res.status).toBe(200);
    expect(mockDb.merchants.update).toHaveBeenCalledWith(2, { allowOverlappingOrders: false });
    expect(res.body.data.allowOverlappingOrders).toBe(false);
    expect(res.body.data.name).toBe('Shop');
  });

  it('the owner can send it with the business-info form too', async () => {
    ctx = as('MERCHANT');
    const res: any = await putMerchantSettings(req({ name: 'Shop 2', phone: '091', allowOverlappingOrders: true }));
    expect(res.status).toBe(200);
    expect(mockDb.merchants.update).toHaveBeenCalledWith(2, expect.objectContaining({ name: 'Shop 2', phone: '091', allowOverlappingOrders: true }));
  });

  it.each([
    ['OUTLET_ADMIN', { outletId: 1 }],
    ['OUTLET_STAFF', { outletId: 1 }],
    ['OPS', {}],
  ])('%s gets 403 for the setting even when its role was granted merchant.manage', async (role, extra) => {
    ctx = as(role, extra);
    const res: any = await putMerchantSettings(req({ allowOverlappingOrders: false }));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    expect(mockDb.merchants.update).not.toHaveBeenCalled();
  });

  it('rejects a non-boolean value with 400', async () => {
    ctx = as('MERCHANT');
    for (const value of ['false', 0, null]) {
      const res: any = await putMerchantSettings(req({ allowOverlappingOrders: value }));
      expect(res.status).toBe(400);
    }
    expect(mockDb.merchants.update).not.toHaveBeenCalled();
  });

  it('old clients: the business-info body is saved exactly as before (setting untouched)', async () => {
    ctx = as('MERCHANT');
    const res: any = await putMerchantSettings(req({ name: 'Shop', phone: '090', city: 'HCM' }));
    expect(res.status).toBe(200);
    const data = mockDb.merchants.update.mock.calls[0][1];
    expect(Object.keys(data).sort()).toEqual(
      ['address', 'businessType', 'city', 'country', 'description', 'name', 'phone', 'state', 'taxId', 'website', 'zipCode'].sort()
    );
    expect('allowOverlappingOrders' in data).toBe(false);
  });

  it('a body without name and without the setting is still BUSINESS_NAME_REQUIRED', async () => {
    ctx = as('MERCHANT');
    const res: any = await putMerchantSettings(req({ phone: '090' }));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BUSINESS_NAME_REQUIRED');
  });
});

describe('reads: profile and login payload carry merchant.allowOverlappingOrders (#518)', () => {
  const OLD_PROFILE_MERCHANT_KEYS = [
    'id', 'name', 'email', 'phone', 'address', 'city', 'state', 'zipCode', 'country', 'businessType',
    'pricingType', 'taxId', 'website', 'description', 'tenantKey', 'isActive', 'planId', 'totalRevenue',
    'createdAt', 'lastActiveAt',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = as('OUTLET_STAFF', { outletId: 1 });
  });

  it.each([
    [false, false],
    [true, true],
    [undefined, true], // not selected / not migrated → today's behaviour
  ])('GET /api/users/profile: stored %s → %s, old keys unchanged', async (stored, expected) => {
    mockDb.users.findById.mockResolvedValue({
      id: 10,
      role: 'OUTLET_STAFF',
      email: 'u@x',
      merchant: { ...MERCHANT_ROW, ...(stored === undefined ? {} : { allowOverlappingOrders: stored }) },
      outlet: null,
    });
    const res: any = await getProfile(req());
    expect(res.status).toBe(200);
    expect(res.body.data.merchant.allowOverlappingOrders).toBe(expected);
    expect(Object.keys(res.body.data.merchant).sort()).toEqual([...OLD_PROFILE_MERCHANT_KEYS, 'allowOverlappingOrders'].sort());
  });

  it('login payload: merchant.allowOverlappingOrders added next to the existing keys', async () => {
    mockDb.merchants.findById.mockResolvedValue({ ...MERCHANT_ROW, allowOverlappingOrders: false, currency: 'VND', subscription: null });
    const user: any = { id: 10, email: 'u@x', firstName: 'A', lastName: 'B', role: 'MERCHANT', merchantId: 2, outletId: null, emailVerified: true };
    const res: any = await buildAuthLoginSuccessResponse(req(), user, {});
    const merchant = res.body.data.user.merchant;
    expect(merchant.allowOverlappingOrders).toBe(false);
    expect(merchant).toEqual(expect.objectContaining({ id: 2, name: 'Shop', tenantKey: 'shop', currency: 'VND' }));

    mockDb.merchants.findById.mockResolvedValue({ ...MERCHANT_ROW, currency: 'VND', subscription: null });
    const defaulted: any = await buildAuthLoginSuccessResponse(req(), user, {});
    expect(defaulted.body.data.user.merchant.allowOverlappingOrders).toBe(true);
  });
});
