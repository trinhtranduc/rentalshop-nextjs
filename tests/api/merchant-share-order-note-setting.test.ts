/**
 * #1344 "Hiện ghi chú đơn trên ảnh chia sẻ": PUT /api/settings/merchant { shareOrderNote } (MERCHANT only, merged into
 * Merchant.settings) and GET /api/users/profile merchant.shareOrderNote (how the web and the apps read it).
 * Additive only: installed apps ignore the key, and no other settings key is lost.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  // merchant.manage is granted by the wrapper; custom roles can union-grant it, so the handler checks the role
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
import { readShareOrderNote } from '../../apps/api/lib/share-order-note-settings';
import { mergePaymentSettings } from '../../apps/api/lib/installments';

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

const STORED = { payment: { depositMode: 'STAGED' }, blockPricing: { oldApps: 'block' } };

describe('PUT /api/settings/merchant shareOrderNote (#1344)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.users.findById.mockResolvedValue({ id: 10, merchant: { id: 2, settings: STORED } });
    mockDb.merchants.update.mockImplementation(async (_id: number, data: any) => ({ ...MERCHANT_ROW, ...data }));
  });

  it.each([true, false])('the owner sets %s; the other keys of settings are kept', async (value) => {
    ctx = as('MERCHANT');
    const res: any = await putMerchantSettings(req({ shareOrderNote: value }));
    expect(res.status).toBe(200);
    expect(mockDb.merchants.update).toHaveBeenCalledWith(2, { settings: { ...STORED, shareOrderNote: value } });
    expect(res.body.data.shareOrderNote).toBe(value);
  });

  it('a body with only this key needs no name and writes nothing but settings', async () => {
    ctx = as('MERCHANT');
    const res: any = await putMerchantSettings(req({ shareOrderNote: true }));
    expect(res.status).toBe(200);
    expect(Object.keys(mockDb.merchants.update.mock.calls[0][1])).toEqual(['settings']);
  });

  it('works when the shop has no settings yet', async () => {
    ctx = as('MERCHANT');
    mockDb.users.findById.mockResolvedValue({ id: 10, merchant: { id: 2, settings: null } });
    await putMerchantSettings(req({ shareOrderNote: true }));
    expect(mockDb.merchants.update).toHaveBeenCalledWith(2, { settings: { shareOrderNote: true } });
  });

  it('only MERCHANT: 403 INSUFFICIENT_PERMISSIONS for ADMIN, OUTLET_ADMIN, OUTLET_STAFF and OUTLET_INVENTORY, nothing written', async () => {
    for (const role of ['ADMIN', 'OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY']) {
      ctx = as(role, { outletId: 3 });
      const res: any = await putMerchantSettings(req({ shareOrderNote: true }));
      expect({ role, status: res.status, code: res.body.code }).toEqual({ role, status: 403, code: 'INSUFFICIENT_PERMISSIONS' });
    }
    expect(mockDb.merchants.update).not.toHaveBeenCalled();
  });

  it('400 INVALID_INPUT when it is not a boolean, nothing written', async () => {
    ctx = as('MERCHANT');
    for (const bad of ['true', 'false', 1, 0, null, {}, []]) {
      const res: any = await putMerchantSettings(req({ shareOrderNote: bad }));
      expect({ bad, status: res.status, code: res.body.code }).toEqual({ bad, status: 400, code: 'INVALID_INPUT' });
    }
    expect(mockDb.merchants.update).not.toHaveBeenCalled();
  });

  it('a body without it leaves settings alone', async () => {
    ctx = as('MERCHANT');
    await putMerchantSettings(req({ showPublicPrice: false }));
    expect(mockDb.merchants.update.mock.calls[0][1]).not.toHaveProperty('settings');
  });

  it('writing blockPricing afterwards keeps shareOrderNote', async () => {
    ctx = as('MERCHANT');
    mockDb.users.findById.mockResolvedValue({ id: 10, merchant: { id: 2, settings: { ...STORED, shareOrderNote: true } } });
    await putMerchantSettings(req({ blockPricing: { oldApps: 'recompute' } }));
    expect(mockDb.merchants.update.mock.calls[0][1].settings).toEqual({
      payment: { depositMode: 'STAGED' },
      blockPricing: { oldApps: 'recompute' },
      shareOrderNote: true,
    });
  });
});

describe('the deposit route keeps shareOrderNote (#1344)', () => {
  it('mergePaymentSettings replaces payment only', () => {
    const next = mergePaymentSettings({ ...STORED, shareOrderNote: true }, { depositMode: 'ONE_TIME' } as any);
    expect(next.shareOrderNote).toBe(true);
    expect(next.blockPricing).toEqual({ oldApps: 'block' });
    expect(next.payment).toEqual({ depositMode: 'ONE_TIME' });
  });
});

describe('readShareOrderNote (#1344)', () => {
  it('false unless the key is exactly true', () => {
    for (const settings of [undefined, null, {}, [], 'x', 5, { shareOrderNote: 'true' }, { shareOrderNote: 1 }, { shareOrderNote: null }, { shareOrderNote: false }]) {
      expect(readShareOrderNote(settings)).toBe(false);
    }
    expect(readShareOrderNote({ shareOrderNote: true })).toBe(true);
    expect(readShareOrderNote({ payment: {}, shareOrderNote: true })).toBe(true);
  });
});

describe('profile carries merchant.shareOrderNote (#1344)', () => {
  const profileFor = async (role: string, merchantExtra: any, extra: any = {}) => {
    ctx = as(role, extra);
    mockDb.users.findById.mockResolvedValue({
      id: 10, email: 'u@x', role, merchantId: 2,
      merchant: { ...MERCHANT_ROW, ...merchantExtra },
    });
    const res: any = await getProfile(req());
    return res.body.data.merchant;
  };

  it('false when settings is missing, null or has no key; true when stored; for every role', async () => {
    for (const role of ['MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY']) {
      // the mock row has no `settings` column at all, like a query that did not select it
      expect((await profileFor(role, {})).shareOrderNote).toBe(false);
      expect((await profileFor(role, { settings: null })).shareOrderNote).toBe(false);
      expect((await profileFor(role, { settings: { payment: {} } })).shareOrderNote).toBe(false);
      expect((await profileFor(role, { settings: { shareOrderNote: true } })).shareOrderNote).toBe(true);
      expect((await profileFor(role, { settings: { shareOrderNote: false } })).shareOrderNote).toBe(false);
    }
  });

  it('only adds a field: the keys old apps read keep their name, type and value', async () => {
    const m = await profileFor('MERCHANT', { allowOverlappingOrders: false, settings: { blockPricing: { oldApps: 'block' }, shareOrderNote: true } });
    expect(m.allowOverlappingOrders).toBe(false);
    expect(m.blockPricing).toEqual({ oldApps: 'block' });
    expect(m.name).toBe('Shop');
    expect(m.tenantKey).toBe('shop');
    expect(typeof m.shareOrderNote).toBe('boolean');
  });
});
