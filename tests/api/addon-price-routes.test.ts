/**
 * #850: routes of the add-on price list and of a shop's add-ons (owner decisions 2026-10-11).
 * - ADMIN edits the price list; OPS reads it. Only ADMIN adds or removes a shop's add-on.
 * - The price of a shop's add-on comes from the price list, never from the request.
 * - A paused row is not sold; an outlets row is sold on any plan (#1187).
 * - Old `plan-limit-addons` PUT / DELETE refuse a priced item (its columns are packs × pack size).
 */
import * as fs from 'fs';
import * as path from 'path';

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

const rolesSeen: string[][] = [];
jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: (roles: string[]) => {
    rolesSeen.push(roles);
    return (handler: any) => (request: any) => handler(request, { user: { id: 1, role: 'ADMIN' }, userScope: {} });
  },
  validateMerchantAccess: jest.fn(async () => ({ valid: true })),
}));

const mockAddonPrices = { list: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), countShopsUsing: jest.fn() };
const mockMerchantAddons = { listForMerchant: jest.fn(), findById: jest.fn(), add: jest.fn(), setRemoveAtPeriodEnd: jest.fn() };
const mockPlanLimitAddons = { findById: jest.fn(), update: jest.fn(), delete: jest.fn(), calculateTotal: jest.fn() };
const mockMerchants = { findById: jest.fn() };
jest.mock('@rentalshop/database', () => ({
  db: { addonPrices: mockAddonPrices, merchantAddons: mockMerchantAddons, planLimitAddons: mockPlanLimitAddons, merchants: mockMerchants },
  prisma: {},
}));
jest.mock('@rentalshop/utils/server', () => ({
  validateAddonDeletion: jest.fn(async () => ({ isValid: true })),
  getPlanLimitsInfo: jest.fn(),
}));
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/validation-schemas'),
  ...jest.requireActual('../../packages/utils/src/core/plan-addon-rules'),
  ...jest.requireActual('../../packages/utils/src/core/addon-pricing'),
  ...jest.requireActual('../../packages/utils/src/core/subscription-billing-calculations'),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  sendPlanLimitAddonChangeEmail: jest.fn(),
}));

import { GET as listPrices, POST as createPrice } from '../../apps/api/app/api/addon-prices/route';
import { PUT as updatePrice } from '../../apps/api/app/api/addon-prices/[id]/route';
import { GET as listShopAddons, POST as addShopAddon } from '../../apps/api/app/api/merchants/[id]/addons/route';
import { PATCH as patchShopAddon } from '../../apps/api/app/api/merchants/[id]/addons/[addonId]/route';
import { PUT as oldUpdate, DELETE as oldDelete } from '../../apps/api/app/api/plan-limit-addons/[id]/route';

const ROOT = path.join(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const req = (body: any = {}, url = 'http://x/api') => ({ json: async () => body, url } as any);

const MULTI = { outlets: 3, users: 10, products: -1, customers: -1, orders: -1 };
const SINGLE = { outlets: 1, users: 3, products: -1, customers: -1, orders: -1 };
const periodStart = new Date(Date.now() - 10 * 86400000);
const periodEnd = new Date(Date.now() + 20 * 86400000);
const merchantOn = (limits: any, status = 'ACTIVE') => ({
  id: 7,
  name: 'Shop',
  subscription: { id: 70, status, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, interval: 'month', intervalCount: 1, plan: { id: 1, limits: JSON.stringify(limits) } },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockMerchantAddons.add.mockImplementation(async (input: any) => ({ addon: { id: 99, ...input }, payment: null }));
});

describe('roles (#850)', () => {
  it('price list: GET for ADMIN and OPS, writes for ADMIN only; shop add-ons: writes for ADMIN only', () => {
    // withAuthRoles is called once per handler at import or request time; check the source to be exact
    const prices = read('apps/api/app/api/addon-prices/route.ts');
    expect(prices).toMatch(/GET[\s\S]*withAuthRoles\(\[USER_ROLE\.ADMIN, USER_ROLE\.OPS\]\)/);
    expect(prices).toMatch(/POST[\s\S]*withAuthRoles\(\[USER_ROLE\.ADMIN\]\)/);
    expect(read('apps/api/app/api/addon-prices/[id]/route.ts')).toMatch(/withAuthRoles\(\[USER_ROLE\.ADMIN\]\)/);
    const shop = read('apps/api/app/api/merchants/[id]/addons/route.ts');
    expect(shop).toMatch(/GET[\s\S]*withAuthRoles\(\[USER_ROLE\.ADMIN, USER_ROLE\.OPS\]\)/);
    expect(shop).toMatch(/POST[\s\S]*withAuthRoles\(\[USER_ROLE\.ADMIN\]\)/);
    expect(read('apps/api/app/api/merchants/[id]/addons/[addonId]/route.ts')).toMatch(/withAuthRoles\(\[USER_ROLE\.ADMIN\]\)/);
  });
});

describe('price list routes (#850)', () => {
  it('GET lists the rows with how many shops use each', async () => {
    mockAddonPrices.list.mockResolvedValue([{ id: 1, name: 'Thêm nhân viên', limitKind: 'users', packSize: 1, monthlyPrice: 30000, isActive: true, shopsUsing: 2 }]);
    const res: any = await listPrices(req());
    expect(res.status).toBe(200);
    expect(res.body.data.addonPrices[0]).toMatchObject({ id: 1, shopsUsing: 2 });
  });

  it('POST creates a row; a bad body is 400', async () => {
    mockAddonPrices.create.mockImplementation(async (d: any) => ({ id: 5, ...d }));
    const ok: any = await createPrice(req({ name: 'Gói 2 nhân viên', limitKind: 'users', packSize: 2, monthlyPrice: 40000 }));
    expect(ok.status).toBe(201);
    expect(mockAddonPrices.create).toHaveBeenCalledWith(expect.objectContaining({ limitKind: 'users', packSize: 2, monthlyPrice: 40000 }));
    const bad: any = await createPrice(req({ name: 'x', limitKind: 'users', packSize: 0, monthlyPrice: 1 }));
    expect(bad.status).toBe(400);
  });

  it('PUT changes the price; the pack size of a row in use changes too (#870: applies from the next renewal)', async () => {
    mockAddonPrices.findById.mockResolvedValue({ id: 1, limitKind: 'users', packSize: 1, monthlyPrice: 30000, isActive: true });
    mockAddonPrices.update.mockImplementation(async (id: number, d: any) => ({ id, ...d }));
    const ok: any = await updatePrice(req({ monthlyPrice: 35000 }), { params: { id: '1' } });
    expect(ok.status).toBe(200);
    expect(mockAddonPrices.update).toHaveBeenCalledWith(1, { monthlyPrice: 35000 });

    mockAddonPrices.countShopsUsing.mockResolvedValue(3);
    const busy: any = await updatePrice(req({ packSize: 2 }), { params: { id: '1' } });
    expect(busy.status).toBe(200);
    expect(mockAddonPrices.update).toHaveBeenLastCalledWith(1, { packSize: 2 });

    mockAddonPrices.findById.mockResolvedValue(null);
    const missing: any = await updatePrice(req({ monthlyPrice: 1 }), { params: { id: '404' } });
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe('ADDON_PRICE_NOT_FOUND');
  });
});

describe('POST /api/merchants/[id]/addons (#850)', () => {
  const usersPack = { id: 2, name: 'Gói 2 nhân viên', limitKind: 'users', packSize: 2, monthlyPrice: 40000, isActive: true };
  const branch = { id: 3, name: 'Thêm chi nhánh', limitKind: 'outlets', packSize: 1, monthlyPrice: 150000, isActive: true };
  const add = (body: any) => addShopAddon(req(body), { params: { id: '7' } }) as any;

  it('takes the price from the list, not from the body', async () => {
    mockMerchants.findById.mockResolvedValue(merchantOn(SINGLE));
    mockAddonPrices.findById.mockResolvedValue(usersPack);
    const res = await add({ addonPriceId: 2, packs: 1, unitPrice: 1 });
    expect(res.status).toBe(201);
    const input = mockMerchantAddons.add.mock.calls[0][0];
    expect(input).toMatchObject({ merchantId: 7, packs: 1 });
    expect(input.addonPrice).toMatchObject({ id: 2, monthlyPrice: 40000, packSize: 2 });
    expect(input.quote.monthlyAmount).toBe(40000);
    expect(input.quote.amountDue).toBe(Math.round((40000 / 30) * input.quote.remainingDays));
  });

  it('a paused row is not sold (422 ADDON_PRICE_NOT_ON_SALE)', async () => {
    mockMerchants.findById.mockResolvedValue(merchantOn(SINGLE));
    mockAddonPrices.findById.mockResolvedValue({ ...usersPack, isActive: false });
    const res = await add({ addonPriceId: 2, packs: 1 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ADDON_PRICE_NOT_ON_SALE');
    expect(mockMerchantAddons.add).not.toHaveBeenCalled();
  });

  it('an outlets row is sold on a 1-outlet plan (#1187)', async () => {
    mockAddonPrices.findById.mockResolvedValue(branch);
    mockMerchants.findById.mockResolvedValue(merchantOn(SINGLE));
    expect((await add({ addonPriceId: 3, packs: 1 })).status).toBe(201);
    mockMerchants.findById.mockResolvedValue(merchantOn(MULTI));
    expect((await add({ addonPriceId: 3, packs: 1 })).status).toBe(201);
  });

  it('unknown row is 404, no subscription is 404 SUBSCRIPTION_NOT_FOUND, bad packs is 400', async () => {
    mockMerchants.findById.mockResolvedValue(merchantOn(SINGLE));
    mockAddonPrices.findById.mockResolvedValue(null);
    expect((await add({ addonPriceId: 9, packs: 1 })).body.code).toBe('ADDON_PRICE_NOT_FOUND');
    mockAddonPrices.findById.mockResolvedValue(usersPack);
    mockMerchants.findById.mockResolvedValue({ id: 7, name: 'Shop', subscription: null });
    const noSub = await add({ addonPriceId: 2, packs: 1 });
    expect(noSub.status).toBe(404);
    expect(noSub.body.code).toBe('SUBSCRIPTION_NOT_FOUND');
    expect((await add({ addonPriceId: 2, packs: 0 })).status).toBe(400);
  });

  it('a trial shop pays 0 now', async () => {
    mockMerchants.findById.mockResolvedValue(merchantOn(SINGLE, 'TRIAL'));
    mockAddonPrices.findById.mockResolvedValue(usersPack);
    await add({ addonPriceId: 2, packs: 1 });
    expect(mockMerchantAddons.add.mock.calls[0][0].quote).toMatchObject({ amountDue: 0, reason: 'trial' });
  });
});

describe('PATCH /api/merchants/[id]/addons/[addonId] (#850)', () => {
  const patch = (body: any, addonId = '99') => patchShopAddon(req(body), { params: { id: '7', addonId } }) as any;
  const item = { id: 99, merchantId: 7, isActive: true, users: 2, outlets: 0, products: 0, customers: 0, orders: 0, removeAtPeriodEnd: false, endsAt: null };

  it('marks for removal at the end of the current period', async () => {
    mockMerchants.findById.mockResolvedValue(merchantOn(SINGLE));
    mockMerchantAddons.findById.mockResolvedValue(item);
    mockMerchantAddons.setRemoveAtPeriodEnd.mockImplementation(async (id: number, flag: boolean, endsAt: any) => ({ ...item, removeAtPeriodEnd: flag, endsAt }));
    const res = await patch({ removeAtPeriodEnd: true });
    expect(res.status).toBe(200);
    expect(mockMerchantAddons.setRemoveAtPeriodEnd).toHaveBeenCalledWith(99, true, periodEnd);
  });

  it('refuses removal when usage would exceed the limit (422 CANNOT_DELETE_ADDON_LIMIT_EXCEEDED)', async () => {
    const { validateAddonDeletion } = jest.requireMock('@rentalshop/utils/server');
    validateAddonDeletion.mockResolvedValueOnce({ isValid: false, exceededLimits: [{ entityType: 'users', current: 5, futureLimit: 3 }] });
    mockMerchants.findById.mockResolvedValue(merchantOn(SINGLE));
    mockMerchantAddons.findById.mockResolvedValue(item);
    const res = await patch({ removeAtPeriodEnd: true });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('CANNOT_DELETE_ADDON_LIMIT_EXCEEDED');
    expect(mockMerchantAddons.setRemoveAtPeriodEnd).not.toHaveBeenCalled();
  });

  it('undo only in the same period; after the period moved on it is 422 ADDON_ALREADY_ENDED', async () => {
    mockMerchants.findById.mockResolvedValue(merchantOn(SINGLE));
    mockMerchantAddons.findById.mockResolvedValue({ ...item, removeAtPeriodEnd: true, endsAt: periodEnd });
    mockMerchantAddons.setRemoveAtPeriodEnd.mockImplementation(async (id: number, flag: boolean) => ({ ...item, removeAtPeriodEnd: flag }));
    expect((await patch({ removeAtPeriodEnd: false })).status).toBe(200);
    expect(mockMerchantAddons.setRemoveAtPeriodEnd).toHaveBeenLastCalledWith(99, false, null);

    mockMerchantAddons.findById.mockResolvedValue({ ...item, removeAtPeriodEnd: true, endsAt: periodStart });
    const late = await patch({ removeAtPeriodEnd: false });
    expect(late.status).toBe(422);
    expect(late.body.code).toBe('ADDON_ALREADY_ENDED');
  });

  it('another shop\'s item is 404', async () => {
    mockMerchants.findById.mockResolvedValue(merchantOn(SINGLE));
    mockMerchantAddons.findById.mockResolvedValue({ ...item, merchantId: 8 });
    expect((await patch({ removeAtPeriodEnd: true })).status).toBe(404);
  });
});

describe('GET /api/merchants/[id]/addons (#850)', () => {
  it('answers 200 with the items', async () => {
    mockMerchants.findById.mockResolvedValue(merchantOn(SINGLE));
    mockMerchantAddons.listForMerchant.mockResolvedValue([]);
    mockAddonPrices.list.mockResolvedValue([]);
    const { getPlanLimitsInfo } = jest.requireMock('@rentalshop/utils/server');
    getPlanLimitsInfo.mockResolvedValue({ planLimits: SINGLE, basePlanLimits: SINGLE, addonLimits: { outlets: 0, users: 0, products: 0, customers: 0, orders: 0 }, currentCounts: {} });
    const res: any = await listShopAddons(req(), { params: { id: '7' } });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('addons');
    expect(res.body.data).toHaveProperty('renewal');
  });
});

describe('old plan-limit-addons routes refuse a priced item (#850)', () => {
  const priced = { id: 50, merchantId: 7, addonPriceId: 2, users: 2, outlets: 0, isActive: true };
  it('PUT → 422 PRICED_ADDON_READ_ONLY', async () => {
    mockPlanLimitAddons.findById.mockResolvedValue(priced);
    const res: any = await oldUpdate(req({ users: 5 }), { params: { id: '50' } });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('PRICED_ADDON_READ_ONLY');
    expect(mockPlanLimitAddons.update).not.toHaveBeenCalled();
  });
  it('DELETE → 422 PRICED_ADDON_READ_ONLY', async () => {
    mockPlanLimitAddons.findById.mockResolvedValue(priced);
    const res: any = await oldDelete(req(), { params: { id: '50' } });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('PRICED_ADDON_READ_ONLY');
    expect(mockPlanLimitAddons.delete).not.toHaveBeenCalled();
  });
  it('an old free item still updates', async () => {
    mockPlanLimitAddons.findById.mockResolvedValue({ ...priced, addonPriceId: null });
    mockMerchants.findById.mockResolvedValue(merchantOn(MULTI));
    mockPlanLimitAddons.update.mockImplementation(async (id: number, d: any) => ({ id, ...d }));
    const res: any = await oldUpdate(req({ notes: 'x' }), { params: { id: '50' } });
    expect(res.status).toBe(200);
  });
});

describe('wiring (#850)', () => {
  const CODES = ['ADDON_PRICE_NOT_FOUND', 'ADDON_PRICE_NOT_ON_SALE', 'ADDON_PRICE_IN_USE', 'ADDON_ALREADY_ENDED', 'PRICED_ADDON_READ_ONLY'];
  it.each(['en', 'vi', 'ja', 'ko', 'zh'])('locales/%s/errors.json has the new codes', (lang) => {
    const json = JSON.parse(read(`locales/${lang}/errors.json`));
    const flat = JSON.stringify(json);
    for (const c of CODES) expect(flat).toContain(`"${c}"`);
  });

  it('ErrorCode has the new codes (admin-only routes: the POS apps never receive them)', () => {
    const errors = read('packages/utils/src/core/errors.ts');
    for (const c of CODES) expect(errors).toContain(`${c} = '${c}'`);
  });

  it('admin menu: Plans → Add-on prices', () => {
    const nav = read('apps/admin/app/components/shell/nav.ts');
    expect(nav).toMatch(/label: 'Add-on prices', href: '\/plans\/addon-prices'/);
  });

  it('OPS sees Plans → Add-on prices only (read), ADMIN sees every Plans item', () => {
    const { filterAdminMenuByRole } = jest.requireActual('../../packages/ui/src/utils/admin-menu-filter');
    const items = [
      { label: 'Plans', href: '/plans', subItems: [
        { label: 'Plans', href: '/plans' },
        { label: 'Add-on prices', href: '/plans/addon-prices' },
        { label: 'Stripe Billing', href: '/plans/billing' },
      ] },
      { label: 'Merchants', href: '/merchants' },
    ];
    const ops = filterAdminMenuByRole(items, 'OPS');
    const plans = ops.find((i: any) => i.label === 'Plans');
    expect(plans.subItems.map((s: any) => s.href)).toEqual(['/plans/addon-prices']);
    const admin = filterAdminMenuByRole(items, 'ADMIN');
    expect(admin.find((i: any) => i.label === 'Plans').subItems).toHaveLength(3);
  });

  it('the migration is additive: no DROP, no RENAME, no column type change', () => {
    const dir = path.join(ROOT, 'prisma/migrations');
    const name = fs.readdirSync(dir).find((d) => d.endsWith('_addon_prices'));
    expect(name).toBeTruthy();
    const sql = fs.readFileSync(path.join(dir, name as string, 'migration.sql'), 'utf8');
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bRENAME\b/i);
    expect(sql).not.toMatch(/ALTER COLUMN[^;]*TYPE/i);
    expect(sql).toMatch(/CREATE TABLE "public"\."AddonPrice"/);
  });

  it('the admin talks to the API through addonPricesApi only', () => {
    const pages = ['apps/admin/app/plans/addon-prices/page.tsx', 'apps/admin/app/merchants/[id]/addons/page.tsx'];
    for (const p of pages) {
      const src = read(p);
      expect(src).toContain('addonPricesApi');
      expect(src).not.toMatch(/\bfetch\(/);
    }
  });
});
