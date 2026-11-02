/**
 * #1319 — bank accounts: the shop owner (and the platform admin) writes; the outlet manager and staff only read.
 * OUTLET_ADMIN gets 403 INSUFFICIENT_PERMISSIONS on every write and nothing is stored; GET stays open (staff print the QR).
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  validateMerchantAccess: jest.fn(async () => ({ valid: true, merchant: { id: 'm1' }, outlet: { id: 'o1' } })),
}));

const mockPrisma = {
  bankAccount: {
    findMany: jest.fn(async () => [{ id: 7, isDefault: true }]),
    findFirst: jest.fn(async () => ({ id: 7, accountNumber: '0123456789', accountHolderName: 'A', bankName: 'VCB', bankCode: 'VCB' })),
    create: jest.fn(async ({ data }: any) => ({ id: 8, ...data })),
    update: jest.fn(async ({ data }: any) => ({ id: 7, ...data })),
    updateMany: jest.fn(async () => ({ count: 0 })),
  },
};
jest.mock('@rentalshop/database', () => ({ prisma: mockPrisma }));
jest.mock('@rentalshop/utils', () => ({
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
  generateBankQRCodeData: () => 'qr',
  validateBankAccountInfo: () => ({ valid: true, errors: [] }),
  getBankCode: () => 'VCB',
}));

import { GET as list, POST as create } from '../../apps/api/app/api/merchants/[id]/outlets/[outletId]/bank-accounts/route';
import { PUT as update, DELETE as remove } from '../../apps/api/app/api/merchants/[id]/outlets/[outletId]/bank-accounts/[accountId]/route';

const outletParams = { params: { id: '1', outletId: '2' } };
const accountParams = { params: { id: '1', outletId: '2', accountId: '7' } };
const body = { accountHolderName: 'NGUYEN VAN A', accountNumber: '0123456789', bankName: 'Vietcombank', isDefault: true };
const req = (json: any = body) => ({ json: async () => json }) as any;
const as = (role: string) => {
  ctx = { user: { id: 'u1', role }, userScope: {} };
};
const writes = () => [
  ['POST', () => create(req(), outletParams)],
  ['PUT', () => update(req({ accountHolderName: 'HACK' }), accountParams)],
  ['PUT default', () => update(req({ isDefault: true }), accountParams)],
  ['DELETE', () => remove(req(), accountParams)],
] as const;

beforeEach(() => jest.clearAllMocks());

const nothingStored = () => {
  expect(mockPrisma.bankAccount.create).not.toHaveBeenCalled();
  expect(mockPrisma.bankAccount.update).not.toHaveBeenCalled();
  expect(mockPrisma.bankAccount.updateMany).not.toHaveBeenCalled();
};

describe('#1319 bank account writes', () => {
  it.each(writes().map(([name]) => name))('OUTLET_ADMIN %s: 403 INSUFFICIENT_PERMISSIONS, nothing stored', async (name) => {
    as('OUTLET_ADMIN');
    const res: any = await writes().find(([n]) => n === name)![1]();
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, code: 'INSUFFICIENT_PERMISSIONS' });
    nothingStored();
  });

  it.each(['OUTLET_STAFF', 'OUTLET_INVENTORY'])('%s keeps 403 FORBIDDEN on every write', async (role) => {
    as(role);
    for (const [, call] of writes()) {
      const res: any = await call();
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    }
    nothingStored();
  });

  it.each(['MERCHANT', 'ADMIN', 'OPS'])('%s keeps every write', async (role) => {
    as(role);
    const statuses: number[] = [];
    for (const [, call] of writes()) statuses.push(((await call()) as any).status);
    expect(statuses).toEqual([201, 200, 200, 200]);
  });

  it.each(['MERCHANT', 'ADMIN', 'OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'])('%s still reads the list (staff print the QR)', async (role) => {
    as(role);
    const res: any = await list(req(), outletParams);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 7, isDefault: true }]);
  });
});
