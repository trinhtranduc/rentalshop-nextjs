/**
 * Moving a user account to another merchant (#443).
 * Only ADMIN changes a user's merchant. The destination merchant's plan user limit is checked, the old
 * outlet is never carried over, owners stay with their merchant, and any merchant/outlet/role change sets
 * permissionsChangedAt and ends the user's sessions. The change is audited without password hashes.
 * Scope checks from #366 (user-scope.ts) still run first.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  hashPassword: async (plain: string) => `hashed:${plain}`,
  validateMerchantAccess: async (merchantId: number, user: any, scope: any) =>
    user.role === 'ADMIN' || merchantId === scope.merchantId
      ? { valid: true, merchant: { id: merchantId } }
      : { valid: false, error: { body: { success: false, code: 'FORBIDDEN' }, status: 403 } },
}));

const mockDb = {
  users: {
    findById: jest.fn(),
    update: jest.fn(),
    getStats: jest.fn(),
  },
  sessions: { invalidateAllUserSessions: jest.fn() },
  outlets: { findById: jest.fn() },
  merchants: { findById: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: {} }));

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
const mockAssertPlanLimit = jest.fn();
const mockLogUpdate = jest.fn();
jest.mock('@rentalshop/utils/server', () => ({
  checkPlanLimitIfNeeded: async () => null,
  assertPlanLimit: (...args: any[]) => mockAssertPlanLimit(...args),
  createAuditHelper: () => ({
    logCreate: () => Promise.resolve(),
    logUpdate: (...args: any[]) => mockLogUpdate(...args),
    logDelete: () => Promise.resolve(),
  }),
}));

import { PUT as putUserById } from '../../apps/api/app/api/users/[id]/route';
import { PUT as putUserByBody } from '../../apps/api/app/api/users/route';
import { PUT as putMerchantUser } from '../../apps/api/app/api/merchants/[id]/users/[userId]/route';

// Merchant 2 owns outlets 1 and 3; merchant 99 owns outlet 7; merchant 50 is inactive
const MERCHANTS: Record<number, any> = { 2: { id: 2, isActive: true }, 99: { id: 99, isActive: true }, 50: { id: 50, isActive: false } };
const OUTLETS: Record<number, any> = {
  1: { id: 1, merchantId: 2, isActive: true },
  3: { id: 3, merchantId: 2, isActive: true },
  7: { id: 7, merchantId: 99, isActive: true },
};
const USERS: Record<number, any> = {
  10: { id: 10, email: 'owner@m2', role: 'MERCHANT', merchantId: 2, outletId: null, isActive: true, password: '$2b$owner' },
  11: { id: 11, email: 'staff@o1', role: 'OUTLET_STAFF', merchantId: 2, outletId: 1, isActive: true, password: '$2b$staff' },
  12: { id: 12, email: 'staff@o3', role: 'OUTLET_STAFF', merchantId: 2, outletId: 3, isActive: true, password: '$2b$o3' },
  20: { id: 20, email: 'owner@m99', role: 'MERCHANT', merchantId: 99, outletId: null, isActive: true, password: '$2b$other' },
};

const admin = { user: { id: 1, role: 'ADMIN', email: 'admin@anyrent' }, userScope: {} };
const ops = { user: { id: 2, role: 'OPS', email: 'ops@anyrent' }, userScope: {} };
const merchant = { user: { id: 10, role: 'MERCHANT', email: 'owner@m2' }, userScope: { merchantId: 2 } };
const outletAdmin = { user: { id: 13, role: 'OUTLET_ADMIN', email: 'admin@o1' }, userScope: { merchantId: 2, outletId: 1 } };

const params = (id: number) => ({ params: { id: String(id) } });
const req = (body?: any): any => ({ url: 'http://localhost/api/users', headers: { get: () => null }, json: async () => body });

const expectNothingWritten = () => {
  expect(mockDb.users.update).not.toHaveBeenCalled();
  expect(mockDb.sessions.invalidateAllUserSessions).not.toHaveBeenCalled();
};

describe('moving a user to another merchant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = admin;
    mockDb.users.findById.mockImplementation(async (id: number) => (USERS[id] ? { ...USERS[id] } : null));
    mockDb.users.update.mockImplementation(async (id: number, data: any) => ({ ...USERS[id], ...data }));
    mockDb.users.getStats.mockResolvedValue(2);
    mockDb.outlets.findById.mockImplementation(async (id: number) => (OUTLETS[id] ? { ...OUTLETS[id] } : null));
    mockDb.merchants.findById.mockImplementation(async (id: number) => (MERCHANTS[id] ? { ...MERCHANTS[id] } : null));
    mockAssertPlanLimit.mockResolvedValue(undefined);
    mockLogUpdate.mockResolvedValue(undefined);
  });

  describe('PUT /api/users/:id as ADMIN', () => {
    it('moves the user, sets permissionsChangedAt, ends its sessions and audits without passwords', async () => {
      const res: any = await putUserById(req({ merchantId: 99, outletId: 7 }), params(11));

      expect(res.status).toBe(200);
      const [id, data] = mockDb.users.update.mock.calls[0];
      expect(id).toBe(11);
      expect(data).toMatchObject({ merchantId: 99, outletId: 7 });
      expect(data.permissionsChangedAt).toBeInstanceOf(Date);
      expect(mockAssertPlanLimit).toHaveBeenCalledWith(99, 'users');
      expect(mockDb.sessions.invalidateAllUserSessions).toHaveBeenCalledWith(11);

      expect(mockLogUpdate).toHaveBeenCalledTimes(1);
      const audit = mockLogUpdate.mock.calls[0][0];
      expect(audit.entityType).toBe('User');
      expect(audit.entityId).toBe('11');
      expect(audit.oldValues.merchantId).toBe(2);
      expect(audit.newValues.merchantId).toBe(99);
      expect(JSON.stringify(audit)).not.toContain('$2b$');
      expect(res.body.data.password).toBeUndefined();
    });

    it('refuses the move when the destination merchant is at its plan user limit', async () => {
      mockAssertPlanLimit.mockRejectedValue(Object.assign(new Error('Plan limit exceeded'), { code: 'PLAN_LIMIT_EXCEEDED', statusCode: 403 }));
      const res: any = await putUserById(req({ merchantId: 99, outletId: 7 }), params(11));

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PLAN_LIMIT_EXCEEDED');
      expect(mockAssertPlanLimit).toHaveBeenCalledWith(99, 'users');
      expectNothingWritten();
    });

    it('requires an outlet of the destination merchant for an outlet role', async () => {
      const res: any = await putUserById(req({ merchantId: 99 }), params(11));
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('OUTLET_ASSIGNMENT_REQUIRED');
      expectNothingWritten();
    });

    it('rejects an outlet that belongs to another merchant', async () => {
      const res: any = await putUserById(req({ merchantId: 99, outletId: 1 }), params(11));
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('OUTLET_MERCHANT_MISMATCH');
      expectNothingWritten();
    });

    it('rejects an inactive destination merchant', async () => {
      const res: any = await putUserById(req({ merchantId: 50 }), params(11));
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('MERCHANT_NOT_FOUND');
      expectNothingWritten();
    });

    it('does not move a merchant owner', async () => {
      const res: any = await putUserById(req({ merchantId: 2 }), params(20));
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('MERCHANT_OWNER_TRANSFER_NOT_SUPPORTED');
      expectNothingWritten();
    });

    it('keeps sessions and permissionsChangedAt untouched when only the name changes', async () => {
      const res: any = await putUserById(req({ firstName: 'Lan', merchantId: 2, outletId: 1 }), params(11));
      expect(res.status).toBe(200);
      expect(mockDb.users.update.mock.calls[0][1].permissionsChangedAt).toBeUndefined();
      expect(mockDb.sessions.invalidateAllUserSessions).not.toHaveBeenCalled();
      expect(mockAssertPlanLimit).not.toHaveBeenCalled();
      expect(mockLogUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('PUT /api/users/:id as a non-admin', () => {
    it('does not let OPS move a user to another merchant', async () => {
      ctx = ops;
      const res: any = await putUserById(req({ merchantId: 99, outletId: 7 }), params(11));
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('MERCHANT_TRANSFER_ADMIN_ONLY');
      expectNothingWritten();
    });

    it('does not let a merchant move a user to another merchant', async () => {
      ctx = merchant;
      const res: any = await putUserById(req({ merchantId: 99, outletId: 7 }), params(11));
      expect(res.status).toBe(403);
      expectNothingWritten();
    });

    it('ends the sessions of a staff member moved to another outlet of the same merchant', async () => {
      ctx = merchant;
      const res: any = await putUserById(req({ outletId: 3 }), params(11));
      expect(res.status).toBe(200);
      expect(mockDb.users.update.mock.calls[0][1].permissionsChangedAt).toBeInstanceOf(Date);
      expect(mockDb.sessions.invalidateAllUserSessions).toHaveBeenCalledWith(11);
      expect(mockAssertPlanLimit).not.toHaveBeenCalled();
    });

    it('does not let the last owner demote itself', async () => {
      ctx = merchant;
      mockDb.users.getStats.mockResolvedValue(1);
      const res: any = await putUserById(req({ role: 'OUTLET_ADMIN', outletId: 1 }), params(10));
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CANNOT_TRANSFER_LAST_MERCHANT_OWNER');
      expectNothingWritten();
    });
  });

  describe('PUT /api/users (id in body)', () => {
    it("answers 403 UPDATE_USER_OUT_OF_SCOPE when a merchant edits another merchant's user", async () => {
      ctx = merchant;
      const res: any = await putUserByBody(req({ id: 20, firstName: 'X' }));
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('UPDATE_USER_OUT_OF_SCOPE');
      expectNothingWritten();
    });

    it('answers 403 UPDATE_USER_OUT_OF_SCOPE when an outlet admin edits a user of another outlet', async () => {
      ctx = outletAdmin;
      const res: any = await putUserByBody(req({ id: 12, firstName: 'X' }));
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('UPDATE_USER_OUT_OF_SCOPE');
      expectNothingWritten();
    });

    it('does not let a merchant move its user to another merchant', async () => {
      ctx = merchant;
      const res: any = await putUserByBody(req({ id: 11, merchantId: 99, outletId: 7 }));
      expect(res.status).toBe(403);
      expectNothingWritten();
    });

    it('lets ADMIN move a user and ends its sessions', async () => {
      const res: any = await putUserByBody(req({ id: 11, merchantId: 99, outletId: 7 }));
      expect(res.status).toBe(200);
      expect(mockDb.users.update.mock.calls[0][1].permissionsChangedAt).toBeInstanceOf(Date);
      expect(mockAssertPlanLimit).toHaveBeenCalledWith(99, 'users');
      expect(mockDb.sessions.invalidateAllUserSessions).toHaveBeenCalledWith(11);
    });
  });

  describe('PUT /api/merchants/:id/users/:userId', () => {
    const mparams = (merchantId: number, userId: number) => ({ params: { id: String(merchantId), userId: String(userId) } });

    it('applies the same rules when ADMIN moves the user from the merchant route', async () => {
      const res: any = await putMerchantUser(req({ merchantId: 99, outletId: 7 }), mparams(2, 11));
      expect(res.status).toBe(200);
      expect(mockDb.users.update.mock.calls[0][1].permissionsChangedAt).toBeInstanceOf(Date);
      expect(mockAssertPlanLimit).toHaveBeenCalledWith(99, 'users');
      expect(mockDb.sessions.invalidateAllUserSessions).toHaveBeenCalledWith(11);
      expect(JSON.stringify(mockLogUpdate.mock.calls[0][0])).not.toContain('$2b$');
    });

    it('refuses a move without an outlet from the merchant route', async () => {
      const res: any = await putMerchantUser(req({ merchantId: 99 }), mparams(2, 11));
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('OUTLET_ASSIGNMENT_REQUIRED');
      expectNothingWritten();
    });
  });
});
