/**
 * #1128 — GET /api/public/{tenantKey}/products tells the shop page whether to show "Tìm bằng ảnh":
 * additive `merchant.imageSearchAvailable` = the shop has at least one active product with an embedding.
 * No indexed product, or an error reading it → false (the page stays as today).
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

const mockState = { indexed: true as boolean, throws: false };
const mockDb: any = {
  merchants: { findByTenantKey: jest.fn(async () => ({ id: 2, name: 'Shop', isActive: true })) },
  products: { search: jest.fn(async () => ({ data: [], total: 0, page: 1, limit: 50, hasMore: false })) },
  categories: { search: jest.fn(async () => ({ data: [] })) },
  outlets: { search: jest.fn(async () => ({ data: [] })) },
  prisma: {
    merchant: { findUnique: jest.fn(async () => ({ onlineBookingEnabled: false })) },
    outlet: { findMany: jest.fn(async () => []) },
    product: {
      findFirst: jest.fn(async (args: any) => {
        if (mockState.throws) throw new Error('db down');
        expect(args.where).toMatchObject({ merchantId: 2, isActive: true, deletedAt: null, embeddingGeneratedAt: { not: null } });
        return mockState.indexed ? { id: 5 } : null;
      }),
    },
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

const shop = async () => {
  const res: any = await GET({ url: 'https://api.anyrent.shop/api/public/shop/products' } as any, { params: { tenantKey: 'shop' } });
  expect(res.status).toBe(200);
  return res.body.data.merchant;
};

it('true when the shop has an indexed product', async () => {
  Object.assign(mockState, { indexed: true, throws: false });
  expect((await shop()).imageSearchAvailable).toBe(true);
});

it('false with no indexed product, and false when it cannot be read', async () => {
  Object.assign(mockState, { indexed: false, throws: false });
  expect((await shop()).imageSearchAvailable).toBe(false);
  Object.assign(mockState, { indexed: true, throws: true });
  expect((await shop()).imageSearchAvailable).toBe(false);
});
