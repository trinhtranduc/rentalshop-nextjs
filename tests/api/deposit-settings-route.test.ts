/**
 * #1199 "Cách thu cọc": GET /api/settings/deposit (every signed-in role) and PUT (shop owner only), default ONE_TIME for
 * everyone, `depositMode` in the login / profile merchant payload (lesson #1138), other settings keys kept.
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

let settingsColumn: any = null;
const mockDb: any = {
  users: { findById: jest.fn(async () => ({ id: 10, merchant: { id: 2 } })) },
  prisma: {
    merchant: {
      findUnique: jest.fn(async () => ({ settings: settingsColumn })),
      update: jest.fn(async ({ data }: any) => {
        settingsColumn = data.settings;
        return { settings: settingsColumn };
      }),
    },
  },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb }));
jest.mock('@rentalshop/utils', () => ({
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
  },
}));

import { GET, PUT } from '../../apps/api/app/api/settings/deposit/route';
import { merchantDepositField } from '../../apps/api/lib/installments';

const as = (role: string) => ({ user: { id: 10, role, email: 'u@x', merchantId: 2 }, userScope: { merchantId: 2 } });
const req = (body?: any): any => ({ url: 'http://localhost/api/settings/deposit', json: async () => body });
const template = (extra: any = {}) => ({
  id: 't1', name: '30 / 40 / còn lại', isDefault: true,
  items: [
    { label: 'Cọc giữ chỗ', type: 'PERCENT', value: 30, dueRule: { kind: 'ON_CREATE' } },
    { label: 'Cọc lần 2', type: 'PERCENT', value: 40, dueRule: { kind: 'BEFORE_PICKUP', days: 1 } },
  ],
  ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  settingsColumn = null;
  ctx = as('MERCHANT');
});

describe('GET /api/settings/deposit', () => {
  it('a shop that never set it is ONE_TIME with the built-in template offered', async () => {
    const res: any = await GET(req());
    expect(res.body.data).toMatchObject({ depositMode: 'ONE_TIME', cancellationPolicy: '', templates: [] });
    expect(res.body.data.defaultTemplate.items[0]).toMatchObject({ value: 30, dueRule: { kind: 'ON_CREATE' } });
  });

  it.each(['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'])('%s can read it', async (role) => {
    ctx = as(role);
    settingsColumn = { payment: { v: 1, depositMode: 'STAGED', cancellationPolicy: 'x', templates: [] } };
    expect(((await GET(req())) as any).body.data.depositMode).toBe('STAGED');
  });
});

describe('PUT /api/settings/deposit', () => {
  it('asks for merchant.manage', () => {
    jest.isolateModules(() => {
      require('../../apps/api/app/api/settings/deposit/route');
    });
    expect(mockPermissionWrapper).toHaveBeenCalledWith(['merchant.manage']);
  });

  it('MERCHANT switches to STAGED with a template and a policy; other settings keys are kept', async () => {
    settingsColumn = { blockPricing: { oldApps: 'block' } };
    const res: any = await PUT(req({ depositMode: 'STAGED', cancellationPolicy: 'Huỷ mất cọc giữ chỗ', templates: [template()] }));
    expect(res.status).toBe(200);
    expect(settingsColumn.blockPricing).toEqual({ oldApps: 'block' });
    expect(settingsColumn.payment).toMatchObject({ v: 1, depositMode: 'STAGED', cancellationPolicy: 'Huỷ mất cọc giữ chỗ' });
    expect(res.body.data.templates).toHaveLength(1);
  });

  it('a partial body changes only what it carries', async () => {
    settingsColumn = { payment: { v: 1, depositMode: 'STAGED', cancellationPolicy: 'giữ', templates: [template()] } };
    await PUT(req({ depositMode: 'ONE_TIME' }));
    expect(settingsColumn.payment).toMatchObject({ depositMode: 'ONE_TIME', cancellationPolicy: 'giữ' });
    expect(settingsColumn.payment.templates).toHaveLength(1); // going back to ONE_TIME does not delete the templates
  });

  it.each(['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY', 'ADMIN'])('%s gets 403 and nothing is written', async (role) => {
    ctx = as(role);
    const res: any = await PUT(req({ depositMode: 'STAGED' }));
    expect(res.status).toBe(403);
    expect(mockDb.prisma.merchant.update).not.toHaveBeenCalled();
  });

  it.each([
    ['unknown mode', { depositMode: 'MONTHLY' }],
    ['over 100%', { templates: [template({ items: [{ label: 'a', type: 'PERCENT', value: 70, dueRule: { kind: 'ON_CREATE' } }, { label: 'b', type: 'PERCENT', value: 40, dueRule: { kind: 'ON_CREATE' } }] })] }],
    ['4 stages', { templates: [template({ items: Array.from({ length: 4 }, (_, i) => ({ label: `s${i}`, type: 'PERCENT', value: 10, dueRule: { kind: 'ON_CREATE' } })) })] }],
    ['11 templates', { templates: Array.from({ length: 11 }, (_, i) => template({ id: `t${i}`, isDefault: false })) }],
    ['two defaults', { templates: [template(), template({ id: 't2' })] }],
    ['duplicate ids', { templates: [template({ isDefault: false }), template({ isDefault: false })] }],
    ['policy over 1000 chars', { cancellationPolicy: 'x'.repeat(1001) }],
    ['FIXED type (not in the MVP)', { templates: [template({ items: [{ label: 'a', type: 'FIXED', value: 5, dueRule: { kind: 'ON_CREATE' } }] })] }],
  ])('%s is 400 DEPOSIT_SETTINGS_INVALID', async (_name, body) => {
    const res: any = await PUT(req(body));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('DEPOSIT_SETTINGS_INVALID');
    expect(mockDb.prisma.merchant.update).not.toHaveBeenCalled();
  });
});

describe('depositMode in the merchant payload (login / profile)', () => {
  it('shows ONE_TIME for a row read with settings but never set, STAGED when set', () => {
    expect(merchantDepositField({ id: 2, settings: null })).toEqual({ depositMode: 'ONE_TIME' });
    expect(merchantDepositField({ id: 2, settings: { payment: { depositMode: 'STAGED' } } })).toEqual({ depositMode: 'STAGED' });
  });
  it('says nothing when the row never loaded settings (it must not claim ONE_TIME for a STAGED shop)', () => {
    expect(merchantDepositField({ id: 2 })).toEqual({});
    expect(merchantDepositField(null)).toEqual({});
  });
});
