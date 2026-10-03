/**
 * User list, profile and the merchant-scoped user route never return password hashes, and
 * /api/merchants/:id/users/:userId only touches users of that merchant with the same role and password rules.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  withAnyAuth: (handler: any) => (request: any) => handler(request, ctx),
  hashPassword: async (plain: string) => `hashed:${plain}`,
  validateMerchantAccess: async (merchantId: number, _user: any, scope: any) =>
    merchantId === scope.merchantId
      ? { valid: true, merchant: { id: merchantId } }
      : { valid: false, error: { body: { success: false, code: 'FORBIDDEN' }, status: 403 } },
}));

const mockDb = {
  users: {
    findById: jest.fn(),
    update: jest.fn(),
    search: jest.fn(),
    softDelete: jest.fn(),
  },
  sessions: { invalidateAllUserSessions: jest.fn() },
  outlets: { findById: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: {}, getDefaultBankAccount: async () => null }));

const passthrough = { safeParse: (data: any) => ({ success: true, data }) };
jest.mock('@rentalshop/utils', () => ({
  userUpdateSchema: passthrough,
  userCreateSchema: passthrough,
  usersQuerySchema: passthrough,
  resolveUsersIsActiveFilter: () => undefined,
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
}));
jest.mock('@rentalshop/utils/server', () => ({
  checkPlanLimitIfNeeded: async () => null,
  createAuditHelper: () => ({ logCreate: () => Promise.resolve(), logUpdate: () => Promise.resolve() }),
}));

import { GET as listUsers } from '../../apps/api/app/api/users/route';
import { GET as getProfile } from '../../apps/api/app/api/users/profile/route';
import {
  GET as getMerchantUser,
  PUT as putMerchantUser,
  DELETE as deleteMerchantUser,
} from '../../apps/api/app/api/merchants/[id]/users/[userId]/route';

const USERS: Record<number, any> = {
  10: { id: 10, email: 'owner@m2', role: 'MERCHANT', merchantId: 2, outletId: null, merchant: { id: 2 }, password: '$2b$owner' },
  11: { id: 11, email: 'staff@o1', role: 'OUTLET_STAFF', merchantId: 2, outletId: 1, merchant: { id: 2 }, outlet: { id: 1 }, password: '$2b$staff' },
  20: { id: 20, email: 'owner@m99', role: 'MERCHANT', merchantId: 99, outletId: null, merchant: { id: 99 }, password: '$2b$other' },
};
const merchant = { user: { id: 10, role: 'MERCHANT', email: 'owner@m2' }, userScope: { merchantId: 2 } };

const req = (body?: any, url = 'http://localhost/api/users'): any => ({ url, headers: { get: () => null }, json: async () => body });
const merchantUser = (userId: number) => ({ params: { id: '2', userId: String(userId) } });

describe('user responses and the merchant-scoped user route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = merchant;
    mockDb.users.findById.mockImplementation(async (id: number) => (USERS[id] ? { ...USERS[id] } : null));
    mockDb.users.update.mockImplementation(async (id: number, data: any) => ({ ...USERS[id], ...data }));
    mockDb.users.softDelete.mockImplementation(async (id: number) => ({ ...USERS[id], deletedAt: new Date() }));
    mockDb.users.search.mockResolvedValue({ data: [USERS[11]], total: 1, page: 1, limit: 50, hasMore: false, totalPages: 1 });
    mockDb.outlets.findById.mockImplementation(async (id: number) => ({ id, merchantId: id === 7 ? 99 : 2 }));
  });

  it('GET /api/users does not return password hashes', async () => {
    const res: any = await listUsers(req());
    expect(res.status).toBe(200);
    expect(res.body.data[0].email).toBe('staff@o1');
    expect(res.body.data[0].password).toBeUndefined();
  });

  it('GET /api/users/profile does not return the password hash', async () => {
    const res: any = await getProfile(req());
    expect(res.status).toBe(200);
    expect(res.body.data.password).toBeUndefined();
  });

  it('GET /api/merchants/:id/users/:userId hides a user of another merchant and the hash', async () => {
    expect(((await getMerchantUser(req(), merchantUser(20))) as any).status).toBe(404);
    const own: any = await getMerchantUser(req(), merchantUser(11));
    expect(own.status).toBe(200);
    expect(own.body.data.password).toBeUndefined();
  });

  it('PUT /api/merchants/:id/users/:userId applies the role and password rules', async () => {
    const escalate: any = await putMerchantUser(req({ role: 'ADMIN' }), merchantUser(10));
    expect(escalate.status).toBe(403);
    const foreign: any = await putMerchantUser(req({ isActive: false }), merchantUser(20));
    expect(foreign.status).toBe(404);
    expect(mockDb.users.update).not.toHaveBeenCalled();

    const ok: any = await putMerchantUser(req({ password: 'secret123' }), merchantUser(11));
    expect(ok.status).toBe(200);
    expect(mockDb.users.update.mock.calls[0][1].password).toBe('hashed:secret123');
    expect(ok.body.data.password).toBeUndefined();
  });

  it('DELETE /api/merchants/:id/users/:userId does not delete a user of another merchant', async () => {
    const res: any = await deleteMerchantUser(req(), merchantUser(20));
    expect(res.status).toBe(404);
    expect(mockDb.users.softDelete).not.toHaveBeenCalled();
  });
});
