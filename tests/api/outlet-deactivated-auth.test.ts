/**
 * #824 (owner, #823): users of a disabled outlet cannot log in, and their open sessions stop on the next request.
 * Also: every outlet role (incl. OUTLET_INVENTORY) only reaches its own outlet in nested merchant outlet routes.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

const mockDb: any = {
  users: { findById: jest.fn() },
  merchants: { findById: jest.fn() },
  outlets: { findById: jest.fn() },
};
const mockPrisma: any = { user: { findUnique: jest.fn() } };
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: mockPrisma }));
jest.mock('../../packages/database/src/client', () => ({ prisma: mockPrisma }));
jest.mock('@rentalshop/utils', () => ({
  PlanLimitError: class PlanLimitError extends Error {},
  ResponseBuilder: { error: (code: string) => ({ success: false, code, message: code, error: code }) },
  removeVietnameseDiacritics: (s: string) => s,
}));

const mockVerifyTokenSimple = jest.fn();
jest.mock('../../packages/auth/src/jwt', () => ({
  verifyTokenSimple: (...args: any[]) => mockVerifyTokenSimple(...args),
  isTokenExpired: () => false,
}));
jest.mock('@rentalshop/auth', () => ({ ROLE_PERMISSIONS: {} }));
const mockGenerateToken = jest.fn();
jest.mock('@rentalshop/auth/server', () => ({
  generateToken: (...a: any[]) => mockGenerateToken(...a),
  generateMobileToken: (...a: any[]) => mockGenerateToken(...a),
  generateRefreshableToken: (...a: any[]) => mockGenerateToken(...a),
  getUserPermissions: jest.fn(async () => []),
}));

import { authenticateRequest, validateMerchantAccess } from '../../packages/auth/src/core';
import { buildAuthLoginSuccessResponse } from '../../apps/api/lib/build-auth-login-response';
import { simplifiedUsers } from '../../packages/database/src/user';

const request = (): any => ({ headers: { get: (h: string) => (h === 'authorization' ? 'Bearer t0k3n' : null) } });

const loginUser = (role: string, outletActive: boolean | null) => ({
  id: 8,
  email: 'a@x',
  role,
  isActive: true,
  emailVerified: true,
  merchantId: 2,
  outletId: outletActive === null ? null : 5,
  merchant: { id: 2, name: 'Shop' },
  outlet: outletActive === null ? null : { id: 5, name: 'Chi nhánh 2', isActive: outletActive },
});

describe('login refuses users of a disabled outlet', () => {
  beforeEach(() => jest.clearAllMocks());

  for (const role of ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY']) {
    it(`${role} of a disabled outlet: 403 OUTLET_DEACTIVATED, no token`, async () => {
      const res: any = await buildAuthLoginSuccessResponse(request(), loginUser(role, false) as any, {});
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('OUTLET_DEACTIVATED');
      expect(mockGenerateToken).not.toHaveBeenCalled();
    });
  }

  it('the login lookup reads outlet.isActive', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await simplifiedUsers.findByEmail('a@x');
    const args = mockPrisma.user.findUnique.mock.calls[0][0];
    expect(args.select.outlet.select.isActive).toBe(true);
  });
});

describe('open sessions of a disabled outlet stop on the next request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyTokenSimple.mockResolvedValue({ id: 8, role: 'OUTLET_STAFF', merchantId: 2, outletId: 5 });
  });

  it('OUTLET_STAFF whose outlet was disabled: 401 OUTLET_DEACTIVATED', async () => {
    mockDb.users.findById.mockResolvedValue({ ...loginUser('OUTLET_STAFF', false) });
    const result: any = await authenticateRequest(request());
    expect(result.success).toBe(false);
    expect(result.response.status).toBe(401);
    expect(result.response.body.code).toBe('OUTLET_DEACTIVATED');
  });

  it('a user of an active outlet is not refused for that reason', async () => {
    mockDb.users.findById.mockResolvedValue({ ...loginUser('OUTLET_STAFF', true) });
    const result: any = await authenticateRequest(request());
    expect(result.response?.body?.code).not.toBe('OUTLET_DEACTIVATED');
  });
});

describe('validateMerchantAccess: outlet roles stay on their own outlet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.merchants.findById.mockResolvedValue({ id: 2, name: 'Shop' });
    mockDb.outlets.findById.mockImplementation(async (id: number) => ({ id, merchant: { id: 2 } }));
  });

  for (const role of ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY']) {
    it(`${role} asking for another outlet of its merchant: 404 OUTLET_NOT_FOUND`, async () => {
      const result: any = await validateMerchantAccess(2, { id: 8, role } as any, { merchantId: 2, outletId: 5 } as any, 6);
      expect(result.valid).toBe(false);
      expect(result.error.status).toBe(404);
      expect(result.error.body.code).toBe('OUTLET_NOT_FOUND');
    });
  }

  it('OUTLET_INVENTORY on its own outlet is allowed', async () => {
    const result: any = await validateMerchantAccess(2, { id: 8, role: 'OUTLET_INVENTORY' } as any, { merchantId: 2, outletId: 5 } as any, 5);
    expect(result.valid).toBe(true);
  });
});
