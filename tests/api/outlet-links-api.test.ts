/**
 * #1643: links of a branch through the API.
 * - PUT / POST /api/outlets take `links` (checked and normalised); GET / PUT / POST answer with `links` as an array.
 * - Installed apps do not send `links` when they edit a branch: the stored links must survive that (read, then save).
 * - GET /api/public/<tenantKey>/products serves each outlet's `links` (re-checked) and `isDefault`.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

// One in-memory outlet row the mocked db reads and writes, like Prisma would.
const row: any = { id: 5, name: 'Chi nhánh 2', merchantId: 2, merchant: { id: 2, name: 'Shop' }, isActive: true, isDefault: false, links: null, createdAt: new Date('2026-10-01T00:00:00Z'), updatedAt: new Date('2026-10-01T00:00:00Z') };
const mockDb: any = {
  outlets: {
    findFirst: jest.fn(async () => null),
    findById: jest.fn(async () => ({ ...row })),
    create: jest.fn(async (data: any) => ({ ...row, id: 9, ...data })),
    update: jest.fn(async (_id: number, data: any) => Object.assign(row, data)),
    search: jest.fn(async () => ({ data: [{ ...row }], total: 1, page: 1, limit: 50, hasMore: false })),
  },
  merchants: { findByTenantKey: jest.fn(async () => ({ id: 2, name: 'Shop', isActive: true })) },
  products: { search: jest.fn(async () => ({ data: [], total: 0, page: 1, limit: 50, hasMore: false })) },
  categories: { search: jest.fn(async () => ({ data: [] })) },
  prisma: { merchant: { findUnique: jest.fn(async () => ({ onlineBookingEnabled: false, showPublicPrice: true })) }, outlet: { findMany: jest.fn(async () => []) }, product: { findFirst: jest.fn(async () => null) } },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: {} }));

jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/validation-schemas'),
  ...jest.requireActual('../../packages/utils/src/core/outlet-links'),
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  parseProductImages: (images: any) => images,
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
}));
jest.mock('@rentalshop/utils/server', () => ({ checkPlanLimitIfNeeded: jest.fn(async () => null), buildCorsHeaders: () => ({}) }));

import { GET, POST, PUT } from '../../apps/api/app/api/outlets/route';
import { GET as publicGet } from '../../apps/api/app/api/public/[tenantKey]/products/route';

const merchant = { user: { id: 3, role: 'MERCHANT', email: 'm@x' }, userScope: { merchantId: 2 } };
const req = (url: string, body?: any): any => ({ url, headers: { get: () => null }, json: async () => body });
const put = (body: any) => PUT(req('http://localhost/api/outlets?id=5', body)) as Promise<any>;
const post = (body: any) => POST(req('http://localhost/api/outlets', body)) as Promise<any>;
const updateData = () => mockDb.outlets.update.mock.calls[0][1];

const INSTA = { type: 'instagram', url: 'https://instagram.com/shop' };

beforeEach(() => {
  jest.clearAllMocks();
  ctx = merchant;
  row.links = null;
  row.name = 'Chi nhánh 2';
});

describe('PUT /api/outlets (#1643)', () => {
  it('stores the links, normalised (https added, host lower-cased, repeats dropped)', async () => {
    const res = await put({ links: [{ type: 'website', url: 'Shop.VN' }, { type: 'website', url: 'https://shop.vn/' }, INSTA] });
    expect(res.status).toBe(200);
    expect(updateData().links).toEqual([{ type: 'website', url: 'https://shop.vn' }, INSTA]);
    expect(res.body.data.links).toEqual([{ type: 'website', url: 'https://shop.vn' }, INSTA]);
  });

  it('an empty list clears them', async () => {
    row.links = [INSTA];
    const res = await put({ links: [] });
    expect(updateData().links).toEqual([]);
    expect(res.body.data.links).toEqual([]);
  });

  it('an app that does not know `links` (name, phone, address only): the update has no `links` key, so they stay', async () => {
    row.links = [INSTA];
    const res = await put({ name: 'Tên mới', phone: '0901', address: '12 Lê Lợi' });
    expect(res.status).toBe(200);
    expect('links' in updateData()).toBe(false);
    expect(row.links).toEqual([INSTA]); // the stored column is untouched
    expect(res.body.data.links).toEqual([INSTA]); // and still served
  });

  it('read, then save with the old payload: a second save still keeps them (nothing is duplicated or lost)', async () => {
    row.links = [INSTA, { type: 'zalo', url: 'https://zalo.me/0901234567' }];
    const list: any = await GET(req('http://localhost/api/outlets?page=1&limit=50'));
    const read = list.body.data.outlets[0];
    expect(read.links).toEqual([INSTA, { type: 'zalo', url: 'https://zalo.me/0901234567' }]);
    await put({ name: read.name, phone: '0902', address: 'x' });
    await put({ name: read.name, phone: '0903', address: 'y' });
    expect(row.links).toEqual([INSTA, { type: 'zalo', url: 'https://zalo.me/0901234567' }]);
  });

  it.each([
    ['7 links', Array.from({ length: 7 }, (_, i) => ({ type: 'website', url: `https://s${i}.vn` }))],
    ['a bad address', [{ type: 'facebook', url: 'facebook' }]],
    ['a wrong network', [{ type: 'instagram', url: 'https://tiktok.com/@a' }]],
    ['javascript:', [{ type: 'website', url: 'javascript:alert(1)' }]],
    ['an unknown type', [{ type: 'mastodon', url: 'https://a.vn' }]],
    ['other with no name', [{ type: 'other', url: 'https://a.vn' }]],
  ])('%s → 400 VALIDATION_ERROR on links, nothing saved', async (_name, links) => {
    const res = await put({ links });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fieldErrors.links).toBeDefined();
    expect(mockDb.outlets.update).not.toHaveBeenCalled();
  });

  it('answers `links` as an array even when the column is null', async () => {
    const res = await put({ name: 'Tên mới' });
    expect(res.body.data.links).toEqual([]);
  });
});

describe('POST /api/outlets (#1643)', () => {
  it('creates with links', async () => {
    const res = await post({ name: 'Chi nhánh mới', links: [{ type: 'tiktok', url: 'tiktok.com/@shop' }] });
    expect(res.status).toBe(200);
    expect(mockDb.outlets.create.mock.calls[0][0].links).toEqual([{ type: 'tiktok', url: 'https://tiktok.com/@shop' }]);
    expect(res.body.data.links).toEqual([{ type: 'tiktok', url: 'https://tiktok.com/@shop' }]);
  });

  it('creates without links as before (none stored, answered as [])', async () => {
    const res = await post({ name: 'Chi nhánh mới', address: 'Q1' });
    expect(res.status).toBe(200);
    expect(mockDb.outlets.create.mock.calls[0][0].links).toBeUndefined();
    expect(res.body.data.links).toEqual([]);
  });

  it('a bad link refuses the whole create', async () => {
    const res = await post({ name: 'Chi nhánh mới', links: [{ type: 'website', url: '' }] });
    expect(res.status).toBe(400);
    expect(mockDb.outlets.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/public/<tenantKey>/products (#1643)', () => {
  const shop = async () => {
    const res: any = await publicGet({ url: 'https://api.anyrent.shop/api/public/shop/products' } as any, { params: { tenantKey: 'shop' } });
    expect(res.status).toBe(200);
    return res.body.data.outlets;
  };

  it('each outlet carries its links and whether it is the main branch', async () => {
    mockDb.outlets.search.mockResolvedValueOnce({
      data: [
        { id: 3, name: 'Thủ Đức', isDefault: false, links: [INSTA] },
        { id: 4, name: 'Quận 1', isDefault: true, links: null },
      ],
    });
    const outlets = await shop();
    expect(outlets.map((o: any) => [o.id, o.isDefault, o.links])).toEqual([[3, false, [INSTA]], [4, true, []]]);
  });

  it('serves only links that still pass the rules (junk in the column never reaches the page)', async () => {
    mockDb.outlets.search.mockResolvedValueOnce({
      data: [{ id: 3, name: 'A', links: [INSTA, { type: 'website', url: 'javascript:alert(1)' }, { type: 'website', url: '<script>' }, 'x', null] }],
    });
    expect((await shop())[0].links).toEqual([INSTA]);
  });

  it('keeps every field the page already read, adds only links and isDefault', async () => {
    mockDb.outlets.search.mockResolvedValueOnce({ data: [{ id: 3, name: 'A', address: 'x', phone: '1', city: 'c', state: 's', zipCode: 'z', country: 'vn' }] });
    const [o] = await shop();
    expect(Object.keys(o).sort()).toEqual(['acceptsOnlineBooking', 'address', 'city', 'country', 'id', 'isDefault', 'links', 'name', 'phone', 'state', 'zipCode']);
  });
});
