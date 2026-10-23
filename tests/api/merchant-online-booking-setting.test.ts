/**
 * #1124 — the shop setting "Nhận đặt online" (Merchant.onlineBookingEnabled, default false) and the outlet flag
 * (Outlet.acceptsOnlineBooking, default true), and `bookingRequestId` on the order create schema only.
 * - PUT /api/settings/merchant: owner (MERCHANT) or ADMIN only, boolean only; a body with just the setting updates
 *   just that field.
 * - GET /api/users/profile: `merchant.onlineBookingEnabled` added (false when missing).
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


import { orderCreateSchema, orderUpdateSchema, outletUpdateSchema } from '../../packages/utils/src/core/validation-schemas';

describe('PUT /api/settings/merchant onlineBookingEnabled (#1124)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.users.findById.mockResolvedValue({ id: 10, merchant: { id: 2 } });
    mockDb.merchants.update.mockImplementation(async (_id: number, data: any) => ({ ...MERCHANT_ROW, ...data }));
  });

  it('the owner turns it on with a body carrying only the setting', async () => {
    ctx = as('MERCHANT');
    const res: any = await putMerchantSettings(req({ onlineBookingEnabled: true }));
    expect(res.status).toBe(200);
    expect(mockDb.merchants.update).toHaveBeenCalledWith(2, { onlineBookingEnabled: true });
    expect(res.body.data.onlineBookingEnabled).toBe(true);
  });

  it('403 for an outlet admin, 400 for a non-boolean', async () => {
    ctx = as('OUTLET_ADMIN', { outletId: 3 });
    expect(((await putMerchantSettings(req({ onlineBookingEnabled: true }))) as any).status).toBe(403);
    ctx = as('MERCHANT');
    expect(((await putMerchantSettings(req({ onlineBookingEnabled: 'yes' }))) as any).status).toBe(400);
    expect(mockDb.merchants.update).not.toHaveBeenCalled();
  });

  it('the business-info form old clients send leaves it unchanged', async () => {
    ctx = as('MERCHANT');
    await putMerchantSettings(req({ name: 'Shop', phone: '090' }));
    expect(mockDb.merchants.update.mock.calls[0][1]).not.toHaveProperty('onlineBookingEnabled');
  });
});

describe('PUT /api/settings/merchant showPublicPrice (#1174)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.users.findById.mockResolvedValue({ id: 10, merchant: { id: 2 } });
    mockDb.merchants.update.mockImplementation(async (_id: number, data: any) => ({ ...MERCHANT_ROW, showPublicPrice: true, ...data }));
  });

  it('the owner turns it off with a body carrying only the setting', async () => {
    ctx = as('MERCHANT');
    const res: any = await putMerchantSettings(req({ showPublicPrice: false }));
    expect(res.status).toBe(200);
    expect(mockDb.merchants.update).toHaveBeenCalledWith(2, { showPublicPrice: false });
    expect(res.body.data.showPublicPrice).toBe(false);
  });

  it('403 for an outlet admin, 400 for a non-boolean', async () => {
    ctx = as('OUTLET_ADMIN', { outletId: 3 });
    expect(((await putMerchantSettings(req({ showPublicPrice: false }))) as any).status).toBe(403);
    ctx = as('MERCHANT');
    expect(((await putMerchantSettings(req({ showPublicPrice: 'no' }))) as any).status).toBe(400);
    expect(mockDb.merchants.update).not.toHaveBeenCalled();
  });
});

describe('profile carries merchant.onlineBookingEnabled (#1124)', () => {
  it('false when the column is missing or false, true when on', async () => {
    for (const [value, expected] of [[undefined, false], [false, false], [true, true]] as const) {
      ctx = as('MERCHANT');
      mockDb.users.findById.mockResolvedValue({
        id: 10, email: 'u@x', role: 'MERCHANT', merchantId: 2,
        merchant: { ...MERCHANT_ROW, ...(value === undefined ? {} : { onlineBookingEnabled: value }) },
      });
      const res: any = await getProfile(req());
      expect(res.body.data.merchant.onlineBookingEnabled).toBe(expected);
    }
  });
});

describe('profile carries merchant.showPublicPrice (#1174)', () => {
  it('true when the column is missing or true, false when off', async () => {
    for (const [value, expected] of [[undefined, true], [true, true], [false, false]] as const) {
      ctx = as('MERCHANT');
      mockDb.users.findById.mockResolvedValue({
        id: 10, email: 'u@x', role: 'MERCHANT', merchantId: 2,
        merchant: { ...MERCHANT_ROW, ...(value === undefined ? {} : { showPublicPrice: value }) },
      });
      const res: any = await getProfile(req());
      expect(res.body.data.merchant.showPublicPrice).toBe(expected);
    }
  });
});

describe('schemas (#1124)', () => {
  const order = { orderType: 'RENT', outletId: 3, orderItems: [{ productId: 1, quantity: 1, unitPrice: 1, totalPrice: 1 }], totalAmount: 1 };
  it('the order create schema takes bookingRequestId; the update schema does not', () => {
    expect((orderCreateSchema.parse({ ...order, bookingRequestId: 300 }) as any).bookingRequestId).toBe(300);
    expect(orderUpdateSchema.parse({ bookingRequestId: 300 } as any)).not.toHaveProperty('bookingRequestId');
  });
  it('the outlet update schema takes acceptsOnlineBooking', () => {
    expect(outletUpdateSchema.parse({ acceptsOnlineBooking: false })).toEqual({ acceptsOnlineBooking: false });
  });
});
