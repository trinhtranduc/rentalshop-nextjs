/**
 * #1145 — only the shop owner (MERCHANT) changes the shop currency with PUT /api/settings/currency.
 * Other roles get 403 INSUFFICIENT_PERMISSIONS and nothing is written, even with a custom `merchant.manage`.
 * GET stays readable by every signed-in role. Amounts are never converted (the route writes only `currency`).
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
const mockPermissionWrapper = jest.fn();
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: (perms: string[]) => {
    mockPermissionWrapper(perms);
    return (handler: any) => (request: any) => handler(request, ctx);
  },
  withAnyAuth: (handler: any) => (request: any) => handler(request, ctx),
}));

const mockDb: any = {
  users: { findById: jest.fn() },
  merchants: { findById: jest.fn(), update: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb }));
jest.mock('@rentalshop/utils', () => ({
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
  },
}));

import { GET, PUT } from '../../apps/api/app/api/settings/currency/route';

const as = (role: string, extra: any = {}) => ({
  user: { id: 10, role, email: 'u@x', merchantId: 2, ...extra },
  userScope: { merchantId: 2, ...(extra.outletId ? { outletId: extra.outletId } : {}) },
});
const req = (body?: any): any => ({ url: 'http://localhost/api/settings/currency', json: async () => body });

describe('PUT /api/settings/currency (#1145)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.users.findById.mockResolvedValue({ id: 10, merchant: { id: 2, name: 'Shop' } });
    mockDb.merchants.update.mockImplementation(async (id: number, data: any) => ({ id, name: 'Shop', ...data }));
  });

  it('asks for merchant.manage, not merchant.view', () => {
    jest.isolateModules(() => {
      require('../../apps/api/app/api/settings/currency/route');
    });
    expect(mockPermissionWrapper).toHaveBeenCalledWith(['merchant.manage']);
    expect(mockPermissionWrapper).not.toHaveBeenCalledWith(['merchant.view']);
  });

  it.each(['USD', 'VND'])('MERCHANT sets %s; only the currency is written', async (currency) => {
    ctx = as('MERCHANT');
    const res: any = await PUT(req({ currency }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, code: 'CURRENCY_UPDATED_SUCCESS', data: { id: 2, currency, name: 'Shop' } });
    expect(mockDb.merchants.update).toHaveBeenCalledWith(2, { currency });
  });

  it.each([
    ['OUTLET_ADMIN', { outletId: 1 }],
    ['OUTLET_STAFF', { outletId: 1 }],
    ['OUTLET_INVENTORY', { outletId: 1 }],
    ['ADMIN', {}],
    ['OPS', {}],
  ])('%s gets 403 even when its role was granted merchant.manage', async (role, extra) => {
    ctx = as(role, extra);
    const res: any = await PUT(req({ currency: 'USD' }));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    expect(mockDb.merchants.update).not.toHaveBeenCalled();
  });

  it('MERCHANT: missing or unknown currency → 400 as before', async () => {
    ctx = as('MERCHANT');
    expect(((await PUT(req({}))) as any).body.code).toBe('CURRENCY_REQUIRED');
    const bad: any = await PUT(req({ currency: 'EUR' }));
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('INVALID_CURRENCY');
    expect(mockDb.merchants.update).not.toHaveBeenCalled();
  });
});

describe('GET /api/settings/currency stays readable (#1145)', () => {
  it.each(['MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])('%s reads the shop currency', async (role) => {
    ctx = as(role, role === 'MERCHANT' ? {} : { outletId: 1 });
    mockDb.users.findById.mockResolvedValue({ id: 10, merchant: { id: 2, name: 'Shop' } });
    mockDb.merchants.findById.mockResolvedValue({ id: 2, currency: 'VND' });
    const res: any = await GET(req());
    expect(res.status).toBe(200);
    expect(res.body.data.currency).toBe('VND');
  });
});
