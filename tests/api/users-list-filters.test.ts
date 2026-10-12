/**
 * #884: GET /api/users already filters by merchant and outlet for platform staff (admin Users page).
 * MERCHANT and outlet callers keep their own scope whatever they send, so installed apps are unchanged.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  hashPassword: async (plain: string) => `hashed:${plain}`,
}));

const mockDb = {
  users: {
    search: jest.fn(),
  },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: {} }));

const coerce = { safeParse: (data: any) => ({
  success: true,
  data: {
    ...data,
    merchantId: data.merchantId ? Number(data.merchantId) : undefined,
    outletId: data.outletId ? Number(data.outletId) : undefined,
  },
}) };
jest.mock('@rentalshop/utils', () => ({
  userUpdateSchema: coerce,
  userCreateSchema: coerce,
  usersQuerySchema: coerce,
  resolveUsersIsActiveFilter: () => undefined,
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
}));
jest.mock('@rentalshop/utils/server', () => ({
  checkPlanLimitIfNeeded: async () => null,
  createAuditHelper: () => ({}),
}));

import { GET } from '../../apps/api/app/api/users/route';

const admin = { user: { id: 1, role: 'ADMIN', email: 'admin@x' }, userScope: {} };
const ops = { user: { id: 2, role: 'OPS', email: 'ops@x' }, userScope: {} };
const merchant = { user: { id: 10, role: 'MERCHANT', email: 'owner@m2' }, userScope: { merchantId: 2 } };
const outletAdmin = { user: { id: 13, role: 'OUTLET_ADMIN', email: 'a@o1' }, userScope: { merchantId: 2, outletId: 1 } };

const req = (query: string): any => ({ url: `http://localhost/api/users${query}`, headers: { get: () => null } });
const lastFilters = () => mockDb.users.search.mock.calls[mockDb.users.search.mock.calls.length - 1][0];

describe('GET /api/users merchant / outlet filters (#884)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.users.search.mockResolvedValue({ data: [], total: 0, page: 1, limit: 25, hasMore: false, totalPages: 0 });
  });

  it('admin without filters lists every merchant and outlet', async () => {
    ctx = admin;
    const res: any = await GET(req('?page=1&limit=25'));
    expect(res.status).toBe(200);
    expect(lastFilters().merchantId).toBeUndefined();
    expect(lastFilters().outletId).toBeUndefined();
  });

  it('admin picks a merchant: only that merchant', async () => {
    ctx = admin;
    await GET(req('?merchantId=2'));
    expect(lastFilters().merchantId).toBe(2);
    expect(lastFilters().outletId).toBeUndefined();
  });

  it('admin picks a merchant and an outlet: only that outlet', async () => {
    ctx = admin;
    await GET(req('?merchantId=2&outletId=3'));
    expect(lastFilters()).toMatchObject({ merchantId: 2, outletId: 3 });
  });

  it('OPS can filter the same way', async () => {
    ctx = ops;
    await GET(req('?merchantId=5&outletId=7'));
    expect(lastFilters()).toMatchObject({ merchantId: 5, outletId: 7 });
  });

  it('a merchant cannot widen its scope with merchantId', async () => {
    ctx = merchant;
    await GET(req('?merchantId=99'));
    expect(lastFilters().merchantId).toBe(2);
  });

  it('an outlet admin stays on its outlet whatever it sends', async () => {
    ctx = outletAdmin;
    await GET(req('?merchantId=99&outletId=7'));
    expect(lastFilters()).toMatchObject({ merchantId: 2, outletId: 1 });
  });
});
