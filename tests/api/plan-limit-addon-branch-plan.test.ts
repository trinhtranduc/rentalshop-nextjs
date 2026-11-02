/**
 * #826 / #1187: extra outlets are a paid add-on on any plan (same as extra users).
 * `isMultiBranchPlan` is still the display helper (`limits.outlets` > 1 or -1).
 */
import * as fs from 'fs';
import * as path from 'path';

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));
jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: () => (handler: any) => (request: any) => handler(request, {}),
  validateMerchantAccess: jest.fn(),
}));

const mockAddons = { findById: jest.fn(), update: jest.fn(), create: jest.fn() };
const mockMerchants = { findById: jest.fn() };
jest.mock('@rentalshop/database', () => ({ db: { planLimitAddons: mockAddons, merchants: mockMerchants } }));
jest.mock('@rentalshop/utils/server', () => ({ validateAddonDeletion: jest.fn() }));
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/validation-schemas'),
  ...jest.requireActual('../../packages/utils/src/core/plan-addon-rules'),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  sendPlanLimitAddonChangeEmail: jest.fn(),
}));

import { POST as createAddon } from '../../apps/api/app/api/plan-limit-addons/route';
import { POST as createMerchantAddon } from '../../apps/api/app/api/merchants/[id]/plan-limit-addons/route';
import { PUT as updateAddon } from '../../apps/api/app/api/plan-limit-addons/[id]/route';
import { isMultiBranchPlan } from '../../packages/utils/src/core/plan-addon-rules';

const merchantOnPlan = (limits: any) => ({ id: 7, name: 'Shop', subscription: { plan: { id: 1, limits } } });
const SINGLE = { outlets: 1, users: 3, products: 500, customers: -1, orders: -1 };
const MULTI = { outlets: 3, users: 10, products: -1, customers: -1, orders: -1 };
const UNLIMITED = { outlets: -1, users: -1, products: -1, customers: -1, orders: -1 };

const post = (body: any) => createAddon({ json: async () => body } as any) as any;
const postForMerchant = (body: any) => createMerchantAddon({ json: async () => body } as any, { params: { id: '7' } }) as any;
const put = (id: string, body: any) => updateAddon({ json: async () => body } as any, { params: { id } }) as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockAddons.create.mockImplementation(async (data: any) => ({ id: 11, ...data }));
  mockAddons.update.mockImplementation(async (id: number, data: any) => ({ id, merchantId: 7, ...data }));
});

describe('isMultiBranchPlan (#826)', () => {
  it.each([
    [{ outlets: 3 }, true],
    [{ outlets: 2 }, true],
    [{ outlets: -1 }, true],
    [JSON.stringify({ outlets: 5 }), true],
    [{ outlets: 1 }, false],
    [JSON.stringify({ outlets: 1 }), false],
    [{ outlets: 0 }, false],
    [null, false],
    ['not json', false],
  ])('%p -> %p', (limits, expected) => {
    expect(isMultiBranchPlan(limits)).toBe(expected);
  });
});

describe.each([
  ['POST /api/plan-limit-addons', (body: any) => post({ merchantId: 7, ...body })],
  ['POST /api/merchants/[id]/plan-limit-addons', (body: any) => postForMerchant(body)],
])('%s (#826)', (_name, create) => {
  it('creates a branch add-on on a 1-outlet plan (#1187)', async () => {
    mockMerchants.findById.mockResolvedValue(merchantOnPlan(SINGLE));
    const res = await create({ outlets: 1 });
    expect(res.status).toBe(201);
    expect(mockAddons.create).toHaveBeenCalledWith(expect.objectContaining({ merchantId: 7, outlets: 1 }));
  });

  it('creates it when the limits are a JSON string of a 1-outlet plan', async () => {
    mockMerchants.findById.mockResolvedValue(merchantOnPlan(JSON.stringify(SINGLE)));
    const res = await create({ outlets: 2 });
    expect(res.status).toBe(201);
    expect(mockAddons.create).toHaveBeenCalledWith(expect.objectContaining({ merchantId: 7, outlets: 2 }));
  });

  it('creates it when the merchant has no subscription (legacy route)', async () => {
    mockMerchants.findById.mockResolvedValue({ id: 7, name: 'Shop', subscription: null });
    const res = await create({ outlets: 1 });
    expect(res.status).toBe(201);
    expect(mockAddons.create).toHaveBeenCalled();
  });

  it('creates a branch add-on on a multi-branch plan (outlets 3)', async () => {
    mockMerchants.findById.mockResolvedValue(merchantOnPlan(MULTI));
    const res = await create({ outlets: 2 });
    expect(res.status).toBe(201);
    expect(mockAddons.create).toHaveBeenCalledWith(expect.objectContaining({ merchantId: 7, outlets: 2 }));
  });

  it('creates a branch add-on on an unlimited plan (outlets -1)', async () => {
    mockMerchants.findById.mockResolvedValue(merchantOnPlan(JSON.stringify(UNLIMITED)));
    const res = await create({ outlets: 1 });
    expect(res.status).toBe(201);
    expect(mockAddons.create).toHaveBeenCalled();
  });

  it('creates a users add-on on a single-branch plan', async () => {
    mockMerchants.findById.mockResolvedValue(merchantOnPlan(SINGLE));
    const res = await create({ users: 2 });
    expect(res.status).toBe(201);
    expect(mockAddons.create).toHaveBeenCalledWith(expect.objectContaining({ users: 2, outlets: 0 }));
  });
});

describe('PUT /api/plan-limit-addons/[id] (#826)', () => {
  const usersAddon = { id: 5, merchantId: 7, outlets: 0, users: 2, isActive: true };

  it('allows raising outlets from 0 on a 1-outlet plan (#1187)', async () => {
    mockAddons.findById.mockResolvedValue(usersAddon);
    mockMerchants.findById.mockResolvedValue(merchantOnPlan(SINGLE));
    const res = await put('5', { outlets: 1, users: 2 });
    expect(res.status).toBe(200);
    expect(mockAddons.update).toHaveBeenCalledWith(5, { outlets: 1, users: 2 });
  });

  it('allows raising outlets on a multi-branch plan', async () => {
    mockAddons.findById.mockResolvedValue(usersAddon);
    mockMerchants.findById.mockResolvedValue(merchantOnPlan(MULTI));
    const res = await put('5', { outlets: 1 });
    expect(res.status).toBe(200);
    expect(mockAddons.update).toHaveBeenCalledWith(5, { outlets: 1 });
  });

  it('allows turning an inactive branch add-on back on under a 1-outlet plan', async () => {
    mockAddons.findById.mockResolvedValue({ id: 6, merchantId: 7, outlets: 1, users: 0, isActive: false });
    mockMerchants.findById.mockResolvedValue(merchantOnPlan(SINGLE));
    const res = await put('6', { outlets: 1, isActive: true });
    expect(res.status).toBe(200);
    expect(mockAddons.update).toHaveBeenCalledWith(6, { outlets: 1, isActive: true });
  });

  it('an existing branch add-on stays editable (notes, lower outlets) on a single-branch plan', async () => {
    mockAddons.findById.mockResolvedValue({ id: 6, merchantId: 7, outlets: 2, users: 0, isActive: true });
    mockMerchants.findById.mockResolvedValue(merchantOnPlan(SINGLE));
    expect((await put('6', { outlets: 2, notes: 'renewed', isActive: true })).status).toBe(200);
    expect((await put('6', { outlets: 1 })).status).toBe(200);
    expect((await put('6', { isActive: false })).status).toBe(200);
  });

  it('a users-only change on a single-branch plan is unaffected', async () => {
    mockAddons.findById.mockResolvedValue(usersAddon);
    mockMerchants.findById.mockResolvedValue(merchantOnPlan(SINGLE));
    const res = await put('5', { users: 4, outlets: 0 });
    expect(res.status).toBe(200);
    expect(mockAddons.update).toHaveBeenCalledWith(5, { users: 4, outlets: 0 });
  });
});

describe('admin add-on dialog shows the translated refusal (#826)', () => {
  // #850: add-ons are bought on the shop's Add-on tab (the old free add-on page redirects there)
  const page = fs.readFileSync(
    path.resolve(__dirname, '../../apps/admin/app/merchants/[id]/addons/page.tsx'),
    'utf8'
  );

  it('translates the API error code on add and on remove (not the English API message)', () => {
    expect(page).toMatch(/useApiError\(\)/);
    expect(page).not.toMatch(/toastError\(res\.message/);
    expect((page.match(/toastError\(translateError\(res\)\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('the unused #826 code stays translated in the five locales', () => {
    for (const lang of ['en', 'vi', 'ja', 'ko', 'zh']) {
      const errors = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, `../../locales/${lang}/errors.json`), 'utf8')
      );
      expect(typeof errors.ADDON_OUTLETS_NEED_MULTI_BRANCH_PLAN).toBe('string');
      expect(errors.ADDON_OUTLETS_NEED_MULTI_BRANCH_PLAN.length).toBeGreaterThan(10);
    }
  });

  it('sells outlet add-ons on any plan; the free loyalty button is gone, "Tắt" stays (#1187, #782)', () => {
    expect(page).not.toContain("p.limitKind !== 'outlets' || data?.multiBranchPlan");
    expect(page).toContain('merchantModulesApi');
    expect(page).not.toContain('enable-loyalty');
    expect(page).toContain('disable-loyalty');
    const pricesPage = fs.readFileSync(
      path.resolve(__dirname, '../../apps/admin/app/plans/addon-prices/page.tsx'),
      'utf8'
    );
    expect(pricesPage).not.toContain('Chỉ bán cho gói nhiều chi nhánh');
  });
});
