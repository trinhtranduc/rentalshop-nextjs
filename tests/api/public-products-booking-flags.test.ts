/**
 * #1124 — GET /api/public/{tenantKey}/products tells the shop page whether to show "Đặt thuê": additive
 * `merchant.onlineBooking` and `outlets[].acceptsOnlineBooking`. Off (or unreadable) → false, page as today.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

const mockState = { enabled: true, accepting: [3] as number[], prismaThrows: false };
const mockDb: any = {
  merchants: { findByTenantKey: jest.fn(async () => ({ id: 2, name: 'Shop', isActive: true })) },
  products: { search: jest.fn(async () => ({ data: [], total: 0, page: 1, limit: 50, hasMore: false })) },
  categories: { search: jest.fn(async () => ({ data: [] })) },
  outlets: { search: jest.fn(async () => ({ data: [{ id: 3, name: 'Thủ Đức' }, { id: 4, name: 'Quận 1' }] })) },
  prisma: {
    merchant: {
      findUnique: jest.fn(async () => {
        if (mockState.prismaThrows) throw new Error('column "onlineBookingEnabled" does not exist');
        return { onlineBookingEnabled: mockState.enabled };
      }),
    },
    outlet: { findMany: jest.fn(async () => mockState.accepting.map((id) => ({ id }))) },
  },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb }));
jest.mock('@rentalshop/utils', () => ({
  ResponseBuilder: { success: (code: string, data: any) => ({ success: true, code, data }), error: (code: string) => ({ success: false, code }) },
  handleApiError: (error: any) => ({ response: { success: false, message: String(error) }, statusCode: 500 }),
  parseProductImages: (images: any) => images,
}));
jest.mock('@rentalshop/utils/server', () => ({ buildCorsHeaders: () => ({}) }));

import { GET } from '../../apps/api/app/api/public/[tenantKey]/products/route';

async function shop() {
  const res: any = await GET({ url: 'https://api.anyrent.shop/api/public/shop/products' } as any, { params: { tenantKey: 'shop' } });
  expect(res.status).toBe(200);
  return res.body.data;
}

describe('public products: online booking flags (#1124)', () => {
  beforeEach(() => Object.assign(mockState, { enabled: true, accepting: [3], prismaThrows: false }));

  it('booking on: merchant.onlineBooking true, outlets flagged one by one', async () => {
    const data = await shop();
    expect(data.merchant.onlineBooking).toBe(true);
    expect(data.outlets.map((o: any) => [o.id, o.acceptsOnlineBooking])).toEqual([[3, true], [4, false]]);
  });

  it('booking off or unreadable: everything false (the page shows Gọi / Zalo as today)', async () => {
    mockState.enabled = false;
    let data = await shop();
    expect(data.merchant.onlineBooking).toBe(false);
    expect(data.outlets.every((o: any) => o.acceptsOnlineBooking === false)).toBe(true);
    mockState.prismaThrows = true;
    data = await shop();
    expect(data.merchant.onlineBooking).toBe(false);
  });
});
