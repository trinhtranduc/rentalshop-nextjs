/**
 * User routes: scope, role changes and password handling.
 * A caller only reads or changes users of its own merchant (outlet roles: own outlet), cannot raise a role
 * above what it may assign, never receives a password hash, and a new password is stored hashed.
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
    findById: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    softDelete: jest.fn(),
    delete: jest.fn(),
    getStats: jest.fn().mockResolvedValue(2),
  },
  sessions: { invalidateAllUserSessions: jest.fn() },
  outlets: { findById: jest.fn() },
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
jest.mock('@rentalshop/utils/server', () => ({
  checkPlanLimitIfNeeded: async () => null,
  createAuditHelper: () => ({ logCreate: () => Promise.resolve(), logUpdate: () => Promise.resolve() }),
}));

import { GET, PUT, DELETE } from '../../apps/api/app/api/users/[id]/route';
import { POST } from '../../apps/api/app/api/users/route';

// Merchant 2 owns outlets 1 and 3; merchant 99 owns outlet 7
const OUTLET_MERCHANT: Record<number, number> = { 1: 2, 3: 2, 7: 99 };
const USERS: Record<number, any> = {
  10: { id: 10, email: 'owner@m2', role: 'MERCHANT', merchantId: 2, outletId: null, isActive: true, password: '$2b$hash-owner' },
  11: { id: 11, email: 'staff@o1', role: 'OUTLET_STAFF', merchantId: 2, outletId: 1, isActive: true, password: '$2b$hash-staff' },
  12: { id: 12, email: 'staff@o3', role: 'OUTLET_STAFF', merchantId: 2, outletId: 3, isActive: true, password: '$2b$hash-o3' },
  20: { id: 20, email: 'owner@m99', role: 'MERCHANT', merchantId: 99, outletId: null, isActive: true, password: '$2b$hash-other' },
};

const merchant = { user: { id: 10, role: 'MERCHANT', email: 'owner@m2' }, userScope: { merchantId: 2 } };
const outletAdmin = { user: { id: 13, role: 'OUTLET_ADMIN', email: 'admin@o1' }, userScope: { merchantId: 2, outletId: 1 } };

const params = (id: number) => ({ params: { id: String(id) } });
const req = (body?: any): any => ({ url: 'http://localhost/api/users', headers: { get: () => null }, json: async () => body });

describe('user routes: scope, roles, passwords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = merchant;
    mockDb.users.findById.mockImplementation(async (id: number) => (USERS[id] ? { ...USERS[id] } : null));
    mockDb.users.update.mockImplementation(async (id: number, data: any) => ({ ...USERS[id], ...data }));
    mockDb.users.create.mockImplementation(async (data: any) => ({ id: 30, ...data }));
    mockDb.outlets.findById.mockImplementation(async (id: number) =>
      OUTLET_MERCHANT[id] ? { id, merchantId: OUTLET_MERCHANT[id] } : null
    );
  });

  describe('GET /api/users/:id', () => {
    it('returns a user of the own merchant without the password hash', async () => {
      const res: any = await GET(req(), params(11));
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('staff@o1');
      expect(res.body.data.password).toBeUndefined();
    });

    it("hides another merchant's user", async () => {
      const res: any = await GET(req(), params(20));
      expect(res.status).toBe(404);
    });

    it('hides a user of another outlet from an outlet admin', async () => {
      ctx = outletAdmin;
      const res: any = await GET(req(), params(12));
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('does not let a merchant make itself ADMIN', async () => {
      const res: any = await PUT(req({ role: 'ADMIN' }), params(10));
      expect(res.status).toBe(403);
      expect(mockDb.users.update).not.toHaveBeenCalled();
    });

    it("does not let a merchant edit another merchant's user", async () => {
      const res: any = await PUT(req({ isActive: false }), params(20));
      expect(res.status).toBe(404);
      expect(mockDb.users.update).not.toHaveBeenCalled();
    });

    it('does not let a merchant move a user to another merchant', async () => {
      const res: any = await PUT(req({ merchantId: 99 }), params(11));
      expect(res.status).toBe(403);
      expect(mockDb.users.update).not.toHaveBeenCalled();
    });

    it('does not let an outlet admin move a user to an outlet that is not its own', async () => {
      ctx = outletAdmin;
      const res: any = await PUT(req({ outletId: 3 }), params(11));
      expect(res.status).toBe(403);
      expect(mockDb.users.update).not.toHaveBeenCalled();
    });

    it('lets an outlet admin edit a staff member of its outlet (web edit dialog)', async () => {
      ctx = outletAdmin;
      const res: any = await PUT(req({ firstName: 'Lan', role: 'OUTLET_STAFF', outletId: 1 }), params(11));
      expect(res.status).toBe(200);
      expect(res.body.data.password).toBeUndefined();
    });

    it('stores a new password hashed', async () => {
      const res: any = await PUT(req({ password: 'secret123' }), params(11));
      expect(res.status).toBe(200);
      expect(mockDb.users.update.mock.calls[0][1].password).toBe('hashed:secret123');
      expect(res.body.data.password).toBeUndefined();
    });
  });

  describe('DELETE /api/users/:id', () => {
    it("does not let a merchant delete another merchant's user", async () => {
      const res: any = await DELETE(req(), params(20));
      expect(res.status).toBe(404);
      expect(mockDb.users.delete).not.toHaveBeenCalled();
      expect(mockDb.sessions.invalidateAllUserSessions).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/users', () => {
    it("creates the user in the caller's merchant even if the body names another one", async () => {
      const res: any = await POST(req({ email: 'new@x', firstName: 'A', role: 'OUTLET_STAFF', outletId: 1, merchantId: 99, password: 'secret123' }));
      expect(res.status).toBe(201);
      expect(mockDb.users.create.mock.calls[0][0].merchantId).toBe(2);
      expect(res.body.data.password).toBeUndefined();
    });

    it("rejects an outlet of another merchant", async () => {
      const res: any = await POST(req({ email: 'new@x', firstName: 'A', role: 'OUTLET_STAFF', outletId: 7, password: 'secret123' }));
      expect(res.status).toBe(403);
      expect(mockDb.users.create).not.toHaveBeenCalled();
    });

    it('does not let an outlet admin create a MERCHANT', async () => {
      ctx = outletAdmin;
      const res: any = await POST(req({ email: 'new@x', firstName: 'A', role: 'MERCHANT', password: 'secret123' }));
      expect(res.status).toBe(403);
      expect(mockDb.users.create).not.toHaveBeenCalled();
    });
  });
});
