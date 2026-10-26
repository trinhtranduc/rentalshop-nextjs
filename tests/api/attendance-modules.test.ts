/**
 * #907 per-shop module switch: admin routes (rule 4) and `merchant.modules` on login / profile (rule 5).
 */
jest.mock('next/server', () => require('../helpers/attendance-route-mocks').nextServerModule);
jest.mock('@rentalshop/auth/server', () => require('../helpers/attendance-route-mocks').authServerModule);
jest.mock('@rentalshop/auth', () => ({ ROLE_PERMISSIONS: {} }));
jest.mock('@rentalshop/database', () => require('../helpers/attendance-route-mocks').databaseModule);
jest.mock('@rentalshop/utils', () => require('../helpers/attendance-route-mocks').utilsModule());

import { mockDb, params, req, resetAttendanceMocks, setCaller } from '../helpers/attendance-route-mocks';
import { GET as listModules } from '../../apps/api/app/api/merchants/[id]/modules/route';
import { PUT as putModule } from '../../apps/api/app/api/merchants/[id]/modules/[key]/route';
import { GET as getProfile } from '../../apps/api/app/api/users/profile/route';
import { buildAuthLoginSuccessResponse } from '../../apps/api/lib/build-auth-login-response';

describe('admin module routes (#907 rule 4)', () => {
  beforeEach(() => {
    resetAttendanceMocks();
    mockDb.merchants.findById.mockImplementation(async (id: number) => (id === 2 ? { id: 2, name: 'Shop' } : null));
    mockDb.merchantModules.listForMerchant.mockResolvedValue([
      { key: 'attendance', enabled: true, endsAt: new Date('2026-11-11T16:59:59.999Z') },
    ]);
    mockDb.merchantModules.upsert.mockImplementation(async (merchantId: number, key: string, d: any) => ({ merchantId, key, ...d }));
  });

  it.each(['ADMIN', 'OPS'])('%s lists the catalog with enabled, endDate (VN day) and active', async (role) => {
    setCaller(role, { merchantId: null });
    const res: any = await listModules(req('/api/merchants/2/modules'), params({ id: '2' }));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { key: 'attendance', enabled: true, endDate: '2026-11-11', active: expect.any(Boolean) },
      { key: 'loyalty', enabled: false, endDate: null, active: false },
    ]);
  });

  it('a module without a row is listed as off', async () => {
    setCaller('ADMIN', { merchantId: null });
    mockDb.merchantModules.listForMerchant.mockResolvedValue([]);
    const res: any = await listModules(req('/api/merchants/2/modules'), params({ id: '2' }));
    expect(res.body.data).toEqual([
      { key: 'attendance', enabled: false, endDate: null, active: false },
      { key: 'loyalty', enabled: false, endDate: null, active: false },
    ]);
  });

  it.each(['MERCHANT', 'OUTLET_ADMIN'])('%s cannot read the module routes', async (role) => {
    setCaller(role);
    expect((await listModules(req('/api/merchants/2/modules'), params({ id: '2' }))).status).toBe(403);
  });

  it('PUT is ADMIN only; OPS gets 403', async () => {
    setCaller('OPS', { merchantId: null });
    const res: any = await putModule(req('/api/merchants/2/modules/attendance', { enabled: true }), params({ id: '2', key: 'attendance' }));
    expect(res.status).toBe(403);
    expect(mockDb.merchantModules.upsert).not.toHaveBeenCalled();
  });

  it('PUT stores endDate as the end of that VN day and writes an AuditLog', async () => {
    setCaller('ADMIN', { id: 1, merchantId: null });
    const res: any = await putModule(
      req('/api/merchants/2/modules/attendance', { enabled: true, endDate: '2026-11-11' }),
      params({ id: '2', key: 'attendance' })
    );
    expect(res.status).toBe(200);
    expect(mockDb.merchantModules.upsert).toHaveBeenCalledWith(2, 'attendance', {
      enabled: true,
      endsAt: new Date('2026-11-11T16:59:59.999Z'),
      updatedById: 1,
    });
    expect(mockDb.auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'MERCHANT_MODULE', action: 'MERCHANT_MODULE_UPDATED', merchantId: 2, userId: 1 })
    );
    expect(res.body.data).toEqual(expect.objectContaining({ key: 'attendance', enabled: true, endDate: '2026-11-11' }));
  });

  it('PUT validates: boolean enabled, YYYY-MM-DD endDate, known key, existing merchant', async () => {
    setCaller('ADMIN', { merchantId: null });
    expect((await putModule(req('/x', { enabled: 'yes' }), params({ id: '2', key: 'attendance' }))).status).toBe(400);
    expect((await putModule(req('/x', { enabled: true, endDate: '11/11/2026' }), params({ id: '2', key: 'attendance' }))).status).toBe(400);
    expect((await putModule(req('/x', { enabled: true }), params({ id: '2', key: 'payroll' }))).status).toBe(404);
    expect((await putModule(req('/x', { enabled: true }), params({ id: '9', key: 'attendance' }))).status).toBe(404);
    const off: any = await putModule(req('/x', { enabled: false, endDate: null }), params({ id: '2', key: 'attendance' }));
    expect(off.status).toBe(200);
    expect(mockDb.merchantModules.upsert).toHaveBeenLastCalledWith(2, 'attendance', { enabled: false, endsAt: null, updatedById: 10 });
  });
});

describe('merchant.modules on login and profile (#907 rule 5)', () => {
  const MERCHANT_ROW = {
    id: 2, name: 'Shop', email: 'shop@x', phone: '090', tenantKey: 'shop', isActive: true, planId: 1, totalRevenue: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'), lastActiveAt: null, currency: 'VND', subscription: null,
  };

  beforeEach(() => {
    resetAttendanceMocks();
    setCaller('OUTLET_STAFF', { id: 7 });
  });

  it('profile: merchant.modules lists the active keys', async () => {
    mockDb.users.findById.mockResolvedValue({ id: 7, role: 'OUTLET_STAFF', email: 'u@x', merchant: MERCHANT_ROW, outlet: null });
    const res: any = await getProfile(req('/api/users/profile'));
    expect(res.status).toBe(200);
    expect(res.body.data.merchant.modules).toEqual(['attendance']);
    expect(mockDb.merchantModules.getActiveKeys).toHaveBeenCalledWith(2);
  });

  it('login: merchant.modules next to the existing keys; a failing lookup gives []', async () => {
    mockDb.merchants.findById.mockResolvedValue(MERCHANT_ROW);
    const user: any = { id: 10, email: 'u@x', firstName: 'A', lastName: 'B', role: 'MERCHANT', merchantId: 2, outletId: null, emailVerified: true };
    const res: any = await buildAuthLoginSuccessResponse(req('/api/auth/login'), user, {});
    expect(res.body.data.user.merchant.modules).toEqual(['attendance']);
    expect(res.body.data.user.merchant).toEqual(expect.objectContaining({ id: 2, name: 'Shop', tenantKey: 'shop' }));

    mockDb.merchantModules.getActiveKeys.mockRejectedValue(new Error('relation does not exist'));
    const failed: any = await buildAuthLoginSuccessResponse(req('/api/auth/login'), user, {});
    expect(failed.body.data.user.merchant.modules).toEqual([]);
  });
});
