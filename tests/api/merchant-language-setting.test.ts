/**
 * #1539 "Ngôn ngữ email": PUT /api/settings/merchant { language } (MERCHANT only, column Merchant.language) and
 * GET /api/users/profile merchant.language ('vi' | 'en'; empty = 'vi', the language of every email before #1539).
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  withAnyAuth: (handler: any) => (request: any) => handler(request, ctx),
}));

const mockDb: any = {
  users: { findById: jest.fn() },
  merchants: {
    findById: jest.fn(),
    findByTenantKey: jest.fn(async () => null),
    update: jest.fn(),
  },
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

describe('PUT /api/settings/merchant language (#1539)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.users.findById.mockResolvedValue({ id: 10, merchant: { id: 2, settings: null } });
    mockDb.merchants.update.mockImplementation(async (_id: number, data: any) => ({ ...MERCHANT_ROW, ...data }));
  });

  it.each(['vi', 'en'])('the owner sets %s; a body with only it writes only it', async (value) => {
    ctx = as('MERCHANT');
    const res: any = await putMerchantSettings(req({ language: value }));
    expect(res.status).toBe(200);
    expect(mockDb.merchants.update).toHaveBeenCalledWith(2, { language: value });
    expect(res.body.data.language).toBe(value);
  });

  it('saved together with the shop info form', async () => {
    ctx = as('MERCHANT');
    const res: any = await putMerchantSettings(req({ name: 'Shop 2', phone: '091', language: 'en' }));
    expect(res.status).toBe(200);
    expect(mockDb.merchants.update.mock.calls[0][1]).toMatchObject({ name: 'Shop 2', phone: '091', language: 'en' });
  });

  it('only MERCHANT: 403 for ADMIN, OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY, nothing written', async () => {
    for (const role of ['ADMIN', 'OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY']) {
      ctx = as(role, { outletId: 3 });
      const res: any = await putMerchantSettings(req({ language: 'en' }));
      expect({ role, status: res.status, code: res.body.code }).toEqual({ role, status: 403, code: 'INSUFFICIENT_PERMISSIONS' });
    }
    expect(mockDb.merchants.update).not.toHaveBeenCalled();
  });

  it('400 INVALID_INPUT for anything but vi / en, nothing written', async () => {
    ctx = as('MERCHANT');
    for (const bad of ['fr', 'EN', 'vi-VN', '', null, 1, {}, []]) {
      const res: any = await putMerchantSettings(req({ language: bad }));
      expect({ bad, status: res.status, code: res.body.code }).toEqual({ bad, status: 400, code: 'INVALID_INPUT' });
    }
    expect(mockDb.merchants.update).not.toHaveBeenCalled();
  });

  it('a body without it leaves the language alone', async () => {
    ctx = as('MERCHANT');
    await putMerchantSettings(req({ showPublicPrice: false }));
    expect(mockDb.merchants.update.mock.calls[0][1]).not.toHaveProperty('language');
  });

  it('the answer reads an empty stored language as vi', async () => {
    ctx = as('MERCHANT');
    mockDb.merchants.update.mockImplementation(async () => ({ ...MERCHANT_ROW, language: null }));
    const res: any = await putMerchantSettings(req({ showPublicPrice: true }));
    expect(res.body.data.language).toBe('vi');
  });
});

describe('profile carries merchant.language (#1539)', () => {
  const profileFor = async (role: string, merchantExtra: any) => {
    ctx = as(role);
    mockDb.users.findById.mockResolvedValue({
      id: 10, email: 'u@x', role, merchantId: 2,
      merchant: { ...MERCHANT_ROW, ...merchantExtra },
    });
    const res: any = await getProfile(req());
    return res.body.data.merchant;
  };

  it('en when stored; vi when empty, missing or unknown; for every role', async () => {
    for (const role of ['MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY']) {
      expect((await profileFor(role, { language: 'en' })).language).toBe('en');
      expect((await profileFor(role, { language: 'vi' })).language).toBe('vi');
      expect((await profileFor(role, { language: null })).language).toBe('vi');
      expect((await profileFor(role, {})).language).toBe('vi');
      expect((await profileFor(role, { language: 'fr' })).language).toBe('vi');
    }
  });

  it('only adds a field: the keys old apps read keep their name and value', async () => {
    const m = await profileFor('MERCHANT', { language: 'en' });
    expect(m.name).toBe('Shop');
    expect(m.tenantKey).toBe('shop');
    expect(m.email).toBe('shop@x');
  });
});
