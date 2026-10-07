/**
 * #567 phase 1 — the shop time zone on the routes that write and read it:
 * - PUT /api/settings/merchant `timezone`: MERCHANT only (403 otherwise), unknown zone → 400 INVALID_TIMEZONE,
 *   a body with only the setting updates just that field, a change is written to the audit log.
 * - PUT /api/merchants/[id] (ADMIN path): unknown zone → 400 INVALID_TIMEZONE, a change is audited.
 * - Reads: GET /api/users/profile, the login payload and GET /api/merchants/[id] carry `merchant.timezone`
 *   (additive; other keys unchanged).
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
const mockValidateMerchantAccess = jest.fn();
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  withAnyAuth: (handler: any) => (request: any) => handler(request, ctx),
  withAuthRoles: () => (handler: any) => (request: any) => handler(request, ctx),
  validateMerchantAccess: (...args: any[]) => mockValidateMerchantAccess(...args),
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
    checkDuplicate: jest.fn(async () => null),
    ensureTenantKey: jest.fn(async () => 'shop'),
  },
  outlets: { findById: jest.fn() },
  sessions: { createUserSession: jest.fn(async () => ({ sessionId: 's1' })) },
  refreshTokens: { create: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: { tag: 'prisma' }, getDefaultBankAccount: async () => null }));
jest.mock('@rentalshop/utils', () => ({
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
  },
}));
const mockLogUpdate = jest.fn(async () => undefined);
jest.mock('@rentalshop/utils/server', () => ({ createAuditHelper: jest.fn(() => ({ logUpdate: mockLogUpdate })) }));

import { PUT as putMerchantSettings } from '../../apps/api/app/api/settings/merchant/route';
import { GET as getProfile } from '../../apps/api/app/api/users/profile/route';
import { GET as getMerchant, PUT as putMerchant } from '../../apps/api/app/api/merchants/[id]/route';
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

describe('PUT /api/settings/merchant timezone (#567)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.users.findById.mockResolvedValue({ id: 10, merchant: { id: 2, timezone: 'Asia/Ho_Chi_Minh' } });
    mockDb.merchants.update.mockImplementation(async (id: number, data: any) => ({
      ...MERCHANT_ROW,
      allowOverlappingOrders: true,
      timezone: 'Asia/Ho_Chi_Minh',
      ...data,
      id,
    }));
  });

  it.each(['Asia/Tokyo', 'America/New_York', 'Australia/Sydney', 'UTC'])('the owner sets %s with a body carrying only the zone', async (zone) => {
    ctx = as('MERCHANT');
    const res: any = await putMerchantSettings(req({ timezone: zone }));
    expect(res.status).toBe(200);
    expect(mockDb.merchants.update).toHaveBeenCalledWith(2, { timezone: zone });
    expect(res.body.data.timezone).toBe(zone);
    expect(res.body.data.name).toBe('Shop');
  });

  it('a change is written to the audit log (entity Merchant, old and new zone)', async () => {
    ctx = as('MERCHANT');
    await putMerchantSettings(req({ timezone: 'Asia/Tokyo' }));
    expect(mockLogUpdate).toHaveBeenCalledTimes(1);
    expect(mockLogUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Merchant',
        entityId: '2',
        oldValues: { timezone: 'Asia/Ho_Chi_Minh' },
        newValues: { timezone: 'Asia/Tokyo' },
        context: expect.objectContaining({ userId: '10', userRole: 'MERCHANT', merchantId: '2' }),
      })
    );
  });

  it('saving the same zone writes no audit row', async () => {
    ctx = as('MERCHANT');
    const res: any = await putMerchantSettings(req({ timezone: 'Asia/Ho_Chi_Minh' }));
    expect(res.status).toBe(200);
    expect(mockLogUpdate).not.toHaveBeenCalled();
  });

  it('an audit failure does not fail the save', async () => {
    ctx = as('MERCHANT');
    mockLogUpdate.mockRejectedValueOnce(new Error('audit down'));
    const res: any = await putMerchantSettings(req({ timezone: 'Asia/Tokyo' }));
    expect(res.status).toBe(200);
  });

  it('the owner can send it with the business-info form and the overlap switch', async () => {
    ctx = as('MERCHANT');
    const res: any = await putMerchantSettings(req({ name: 'Shop 2', phone: '091', allowOverlappingOrders: false, timezone: 'Asia/Tokyo' }));
    expect(res.status).toBe(200);
    expect(mockDb.merchants.update).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ name: 'Shop 2', phone: '091', allowOverlappingOrders: false, timezone: 'Asia/Tokyo' })
    );
  });

  it.each([['Mars/Base'], [''], ['Asia/Tokyo '], [7], [null], [true], [{}], ['x'.repeat(65)]])(
    'rejects %p with 400 INVALID_TIMEZONE',
    async (value) => {
      ctx = as('MERCHANT');
      const res: any = await putMerchantSettings(req({ timezone: value }));
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_TIMEZONE');
      expect(mockDb.merchants.update).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['ADMIN', {}],
    ['OPS', {}],
    ['OUTLET_ADMIN', { outletId: 1 }],
    ['OUTLET_STAFF', { outletId: 1 }],
  ])('%s gets 403 for the zone even when its role was granted merchant.manage', async (role, extra) => {
    ctx = as(role, extra);
    const res: any = await putMerchantSettings(req({ timezone: 'Asia/Tokyo' }));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    expect(mockDb.merchants.update).not.toHaveBeenCalled();
  });

  it('old clients: a business-info body never touches the zone', async () => {
    ctx = as('MERCHANT');
    const res: any = await putMerchantSettings(req({ name: 'Shop', phone: '090', city: 'HCM' }));
    expect(res.status).toBe(200);
    expect('timezone' in mockDb.merchants.update.mock.calls[0][1]).toBe(false);
    expect(mockLogUpdate).not.toHaveBeenCalled();
  });
});

describe('PUT /api/merchants/[id] timezone (#567, ADMIN path)', () => {
  const params = { id: '2' };
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateMerchantAccess.mockResolvedValue({ valid: true, merchant: { ...MERCHANT_ROW, timezone: 'Asia/Ho_Chi_Minh' } });
    mockDb.merchants.update.mockImplementation(async (id: number, data: any) => ({ ...MERCHANT_ROW, timezone: 'Asia/Ho_Chi_Minh', ...data, id }));
  });

  it('ADMIN sets a valid zone; the change is audited', async () => {
    ctx = as('ADMIN');
    const res: any = await putMerchant(req({ timezone: 'America/New_York' }), { params });
    expect(res.status).toBe(200);
    expect(mockDb.merchants.update).toHaveBeenCalledWith(2, { timezone: 'America/New_York' });
    expect(res.body.data.timezone).toBe('America/New_York');
    expect(mockLogUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Merchant', oldValues: { timezone: 'Asia/Ho_Chi_Minh' }, newValues: { timezone: 'America/New_York' } })
    );
  });

  it.each([['Mars/Base'], [''], [7]])('rejects %p with 400 INVALID_TIMEZONE', async (value) => {
    ctx = as('ADMIN');
    const res: any = await putMerchant(req({ timezone: value }), { params });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_TIMEZONE');
    expect(mockDb.merchants.update).not.toHaveBeenCalled();
  });

  it('a body without timezone is passed through as before (no audit)', async () => {
    ctx = as('ADMIN');
    const res: any = await putMerchant(req({ name: 'Shop X' }), { params });
    expect(res.status).toBe(200);
    expect(mockDb.merchants.update).toHaveBeenCalledWith(2, { name: 'Shop X' });
    expect(mockLogUpdate).not.toHaveBeenCalled();
  });
});

describe('reads carry merchant.timezone (#567, additive)', () => {
  const OLD_PROFILE_MERCHANT_KEYS = [
    'id', 'name', 'email', 'phone', 'address', 'city', 'state', 'zipCode', 'country', 'businessType',
    'pricingType', 'taxId', 'website', 'description', 'tenantKey', 'isActive', 'planId', 'totalRevenue',
    'createdAt', 'lastActiveAt', 'allowOverlappingOrders',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = as('OUTLET_STAFF', { outletId: 1 });
  });

  it.each([
    ['Asia/Tokyo', 'Asia/Tokyo'],
    ['Asia/Ho_Chi_Minh', 'Asia/Ho_Chi_Minh'],
    ['Mars/Base', 'Asia/Ho_Chi_Minh'],
  ])('GET /api/users/profile: stored %s → %s, old keys unchanged', async (stored, expected) => {
    mockDb.users.findById.mockResolvedValue({
      id: 10,
      role: 'OUTLET_STAFF',
      email: 'u@x',
      merchant: { ...MERCHANT_ROW, allowOverlappingOrders: true, timezone: stored },
      outlet: null,
    });
    const res: any = await getProfile(req());
    expect(res.status).toBe(200);
    expect(res.body.data.merchant.timezone).toBe(expected);
    expect(Object.keys(res.body.data.merchant).sort()).toEqual([...OLD_PROFILE_MERCHANT_KEYS, 'timezone'].sort());
  });

  it('login payload: merchant.timezone next to the existing keys', async () => {
    mockDb.merchants.findById.mockResolvedValue({ ...MERCHANT_ROW, timezone: 'Australia/Sydney', currency: 'VND', subscription: null });
    const user: any = { id: 10, email: 'u@x', firstName: 'A', lastName: 'B', role: 'MERCHANT', merchantId: 2, outletId: null, emailVerified: true };
    const res: any = await buildAuthLoginSuccessResponse(req(), user, {});
    const merchant = res.body.data.user.merchant;
    expect(merchant.timezone).toBe('Australia/Sydney');
    expect(merchant).toEqual(expect.objectContaining({ id: 2, name: 'Shop', tenantKey: 'shop', currency: 'VND', allowOverlappingOrders: true }));
  });

  it('GET /api/merchants/[id] returns the stored zone', async () => {
    ctx = as('MERCHANT');
    mockValidateMerchantAccess.mockResolvedValue({ valid: true, merchant: { ...MERCHANT_ROW, timezone: 'Asia/Tokyo' } });
    const res: any = await getMerchant(req(), { params: { id: '2' } });
    expect(res.status).toBe(200);
    expect(res.body.data.timezone).toBe('Asia/Tokyo');
  });
});
