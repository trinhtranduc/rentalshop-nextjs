/**
 * #824 (part of #823): who may create, disable, re-enable or delete an outlet.
 * - Only MERCHANT (and platform ADMIN) create, disable or delete. OUTLET_ADMIN edits the info of its own outlet only.
 * - Disable / delete is refused (409 OUTLET_HAS_OPEN_ORDERS, data.openOrders) while RESERVED / PICKUPED orders exist.
 * - Every create (both routes) and every re-enable checks the outlets plan limit.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
const mockValidateMerchantAccess = jest.fn();
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  validateMerchantAccess: (...args: any[]) => mockValidateMerchantAccess(...args),
}));

const mockDb: any = {
  outlets: { findFirst: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), search: jest.fn() },
};
const mockPrisma: any = { order: { count: jest.fn() } };
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: mockPrisma }));

jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/validation-schemas'),
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
}));

const mockCheckPlanLimit = jest.fn();
jest.mock('@rentalshop/utils/server', () => ({
  checkPlanLimitIfNeeded: (...args: any[]) => mockCheckPlanLimit(...args),
}));

import { POST, PUT, DELETE } from '../../apps/api/app/api/outlets/route';
import { POST as merchantPost } from '../../apps/api/app/api/merchants/[id]/outlets/route';
import { PUT as merchantPut } from '../../apps/api/app/api/merchants/[id]/outlets/[outletId]/route';

const admin = { user: { id: 1, role: 'ADMIN', email: 'ad@x' }, userScope: { canAccessSystem: true } };
const merchant = { user: { id: 3, role: 'MERCHANT', email: 'm@x' }, userScope: { merchantId: 2 } };
const outletAdmin = { user: { id: 8, role: 'OUTLET_ADMIN', email: 'a@x' }, userScope: { merchantId: 2, outletId: 5 } };

const LIMIT_RESPONSE = { body: { success: false, code: 'PLAN_LIMIT_EXCEEDED' }, status: 422 };

const outlet = (over: any = {}) => ({
  id: 5,
  name: 'Chi nhánh 2',
  merchantId: 2,
  merchant: { id: 2, name: 'Shop' },
  isActive: true,
  isDefault: false,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  updatedAt: new Date('2026-10-01T00:00:00Z'),
  ...over,
});

const req = (url: string, body?: any): any => ({
  url,
  headers: { get: () => null },
  json: async () => body,
});
const putOutlet = (id: number, body: any) => PUT(req(`http://localhost/api/outlets?id=${id}`, body));
const delOutlet = (id: number) => DELETE(req(`http://localhost/api/outlets?id=${id}`));
const createOutlet = (body: any) => POST(req('http://localhost/api/outlets', body));
const merchantCreate = (body: any) => merchantPost(req('http://localhost/api/merchants/2/outlets', body), { params: { id: '2' } });
const merchantUpdate = (outletId: number, body: any) =>
  merchantPut(req(`http://localhost/api/merchants/2/outlets/${outletId}`, body), { params: { id: '2', outletId: String(outletId) } });

beforeEach(() => {
  jest.clearAllMocks();
  ctx = merchant;
  mockDb.outlets.findFirst.mockResolvedValue(null);
  mockDb.outlets.findById.mockImplementation(async (id: number) => outlet({ id }));
  mockDb.outlets.create.mockImplementation(async (data: any) => outlet({ id: 9, name: data.name }));
  mockDb.outlets.update.mockImplementation(async (id: number, data: any) => outlet({ id, ...data }));
  mockPrisma.order.count.mockResolvedValue(0);
  mockCheckPlanLimit.mockResolvedValue(null);
  mockValidateMerchantAccess.mockImplementation(async (_m: number, _u: any, _s: any, outletId?: number) => ({
    valid: true,
    merchant: { id: 2, name: 'Shop' },
    outlet: outletId ? outlet({ id: outletId }) : undefined,
  }));
});

describe('POST /api/outlets', () => {
  it('OUTLET_ADMIN cannot create an outlet (403 FORBIDDEN, nothing created)', async () => {
    ctx = outletAdmin;
    const res: any = await createOutlet({ name: 'Chi nhánh mới', address: 'Q1' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(mockDb.outlets.create).not.toHaveBeenCalled();
  });

  it('MERCHANT creates an outlet after the outlets plan limit check', async () => {
    const res: any = await createOutlet({ name: 'Chi nhánh mới', address: 'Q1' });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('OUTLET_CREATED_SUCCESS');
    expect(mockCheckPlanLimit).toHaveBeenCalledWith(merchant.user, 2, 'outlets');
  });
});

describe('POST /api/merchants/[id]/outlets', () => {
  it('OUTLET_ADMIN cannot create an outlet (403 FORBIDDEN)', async () => {
    ctx = outletAdmin;
    const res: any = await merchantCreate({ name: 'Chi nhánh mới', address: 'Q1' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(mockDb.outlets.create).not.toHaveBeenCalled();
  });

  it('at the plan limit: PLAN_LIMIT_EXCEEDED, nothing created', async () => {
    mockCheckPlanLimit.mockResolvedValue(LIMIT_RESPONSE);
    const res: any = await merchantCreate({ name: 'Chi nhánh mới', address: 'Q1' });
    expect(res.body.code).toBe('PLAN_LIMIT_EXCEEDED');
    expect(mockCheckPlanLimit).toHaveBeenCalledWith(merchant.user, 2, 'outlets');
    expect(mockDb.outlets.create).not.toHaveBeenCalled();
  });

  it('below the limit: MERCHANT creates the outlet', async () => {
    const res: any = await merchantCreate({ name: 'Chi nhánh mới', address: 'Q1' });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('OUTLET_CREATED_SUCCESS');
    expect(mockDb.outlets.create).toHaveBeenCalledTimes(1);
  });
});

describe('PUT /api/outlets?id=', () => {
  it('OUTLET_ADMIN edits the info of its own outlet', async () => {
    ctx = outletAdmin;
    const res: any = await putOutlet(5, { name: 'Tên mới', phone: '0901', printNote: 'Cảm ơn' });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('OUTLET_UPDATED_SUCCESS');
    expect(mockDb.outlets.update).toHaveBeenCalledWith(5, expect.objectContaining({ name: 'Tên mới', phone: '0901' }));
  });

  it('OUTLET_ADMIN sending the current isActive is not a status change', async () => {
    ctx = outletAdmin;
    const res: any = await putOutlet(5, { name: 'Tên mới', isActive: true });
    expect(res.status).toBe(200);
  });

  it('OUTLET_ADMIN cannot edit another outlet (403)', async () => {
    ctx = outletAdmin;
    const res: any = await putOutlet(6, { name: 'Tên mới' });
    expect(res.status).toBe(403);
    expect(mockDb.outlets.update).not.toHaveBeenCalled();
  });

  it('OUTLET_ADMIN cannot disable its own outlet (403 FORBIDDEN)', async () => {
    ctx = outletAdmin;
    const res: any = await putOutlet(5, { isActive: false });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(mockDb.outlets.update).not.toHaveBeenCalled();
  });

  it('OUTLET_ADMIN cannot re-enable its own outlet (403 FORBIDDEN)', async () => {
    ctx = outletAdmin;
    mockDb.outlets.findById.mockResolvedValue(outlet({ isActive: false }));
    const res: any = await putOutlet(5, { isActive: true });
    expect(res.status).toBe(403);
    expect(mockDb.outlets.update).not.toHaveBeenCalled();
  });

  it('MERCHANT disables an outlet without open orders', async () => {
    const res: any = await putOutlet(5, { isActive: false });
    expect(res.status).toBe(200);
    expect(mockDb.outlets.update).toHaveBeenCalledWith(5, expect.objectContaining({ isActive: false }));
  });

  it('MERCHANT disabling an outlet with RESERVED / PICKUPED orders: 409 OUTLET_HAS_OPEN_ORDERS with the count', async () => {
    mockPrisma.order.count.mockResolvedValue(3);
    const res: any = await putOutlet(5, { isActive: false });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('OUTLET_HAS_OPEN_ORDERS');
    expect(res.body.data).toEqual({ openOrders: 3 });
    expect(mockPrisma.order.count).toHaveBeenCalledWith({
      where: { outletId: 5, status: { in: ['RESERVED', 'PICKUPED'] }, deletedAt: null },
    });
    expect(mockDb.outlets.update).not.toHaveBeenCalled();
  });

  it('re-enabling at the plan limit is refused', async () => {
    mockDb.outlets.findById.mockResolvedValue(outlet({ isActive: false }));
    mockCheckPlanLimit.mockResolvedValue(LIMIT_RESPONSE);
    const res: any = await putOutlet(5, { isActive: true });
    expect(res.body.code).toBe('PLAN_LIMIT_EXCEEDED');
    expect(mockCheckPlanLimit).toHaveBeenCalledWith(merchant.user, 2, 'outlets');
    expect(mockDb.outlets.update).not.toHaveBeenCalled();
  });

  it('re-enabling below the limit works', async () => {
    mockDb.outlets.findById.mockResolvedValue(outlet({ isActive: false }));
    const res: any = await putOutlet(5, { isActive: true });
    expect(res.status).toBe(200);
    expect(mockDb.outlets.update).toHaveBeenCalledWith(5, expect.objectContaining({ isActive: true }));
  });

  it('an info edit of an active outlet does not ask the plan limit (outlets above the limit stay)', async () => {
    await putOutlet(5, { name: 'Tên mới' });
    expect(mockCheckPlanLimit).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/outlets?id=', () => {
  it('OUTLET_ADMIN cannot delete an outlet, even its own (403 FORBIDDEN)', async () => {
    ctx = outletAdmin;
    const res: any = await delOutlet(5);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(mockDb.outlets.update).not.toHaveBeenCalled();
  });

  it('MERCHANT deletes (soft) an outlet without open orders', async () => {
    const res: any = await delOutlet(5);
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('OUTLET_DELETED_SUCCESS');
    expect(mockDb.outlets.update).toHaveBeenCalledWith(5, { isActive: false });
  });

  it('MERCHANT deleting an outlet with open orders: 409 OUTLET_HAS_OPEN_ORDERS', async () => {
    mockPrisma.order.count.mockResolvedValue(2);
    const res: any = await delOutlet(5);
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'OUTLET_HAS_OPEN_ORDERS', data: { openOrders: 2 } });
    expect(mockDb.outlets.update).not.toHaveBeenCalled();
  });

  it('ADMIN may delete an outlet of any merchant', async () => {
    ctx = admin;
    const res: any = await delOutlet(5);
    expect(res.status).toBe(200);
  });
});

describe('PUT /api/merchants/[id]/outlets/[outletId]', () => {
  it('OUTLET_ADMIN edits the info of its own outlet', async () => {
    ctx = outletAdmin;
    const res: any = await merchantUpdate(5, { name: 'Tên mới' });
    expect(res.status).toBe(200);
    expect(mockDb.outlets.update).toHaveBeenCalledWith(5, expect.objectContaining({ name: 'Tên mới' }));
  });

  it('OUTLET_ADMIN cannot disable (403 FORBIDDEN)', async () => {
    ctx = outletAdmin;
    const res: any = await merchantUpdate(5, { isActive: false });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(mockDb.outlets.update).not.toHaveBeenCalled();
  });

  it('MERCHANT disabling with open orders: 409 OUTLET_HAS_OPEN_ORDERS', async () => {
    mockPrisma.order.count.mockResolvedValue(1);
    const res: any = await merchantUpdate(5, { isActive: false });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'OUTLET_HAS_OPEN_ORDERS', data: { openOrders: 1 } });
    expect(mockDb.outlets.update).not.toHaveBeenCalled();
  });

  it('re-enabling at the plan limit is refused', async () => {
    mockValidateMerchantAccess.mockResolvedValue({ valid: true, merchant: { id: 2 }, outlet: outlet({ isActive: false }) });
    mockCheckPlanLimit.mockResolvedValue(LIMIT_RESPONSE);
    const res: any = await merchantUpdate(5, { isActive: true });
    expect(res.body.code).toBe('PLAN_LIMIT_EXCEEDED');
    expect(mockCheckPlanLimit).toHaveBeenCalledWith(merchant.user, 2, 'outlets');
    expect(mockDb.outlets.update).not.toHaveBeenCalled();
  });
});
