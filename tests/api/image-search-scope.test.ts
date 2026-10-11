/**
 * #653 — POST /api/products/searchByImage
 * (a) costPrice only for users with products.manage (same rule as GET /api/products).
 * (b) the cache must not carry one outlet's filtered list to another outlet's staff.
 * (c) a product deleted / deactivated after a cached search is not returned on the next call.
 * (d) a cache hit honours the request's `limit`; a different `minSimilarity` is a different entry.
 *
 * Embedding service, vector store and db are mocked; the cache module is the real one.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  // Default role permissions: OUTLET_STAFF has products.view but not products.manage.
  hasPermission: jest.fn(async (user: any, permission: string) =>
    permission === 'products.manage' ? user.role !== 'OUTLET_STAFF' : true
  ),
}));

const productTable = new Map<number, any>();
const mockDb: any = {
  products: {
    // Mirrors packages/database/src/product.ts findByIds: deleted rows are not returned.
    findByIds: jest.fn(async (ids: number[]) =>
      ids.map((id) => productTable.get(id)).filter((p) => p && !p.deletedAt)
    ),
  },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb }));

const mockEmbed = jest.fn();
const mockVectorSearch = jest.fn();
jest.mock('@rentalshop/database/server', () => ({
  getEmbeddingService: () => ({ generateEmbeddingFromBuffer: mockEmbed }),
  getVectorStore: () => ({ search: mockVectorSearch }),
}));

jest.mock('@rentalshop/utils', () => ({
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
  },
  parseProductImages: (images: any) => (Array.isArray(images) ? images : []),
}));

jest.mock('../../apps/api/lib/image-compression', () => ({
  compressImageForEmbedding: jest.fn(async (buf: Buffer) => buf),
}));
// Hash the raw bytes (generateImageHash falls back to md5 of the buffer when sharp fails).
jest.mock('sharp', () => () => {
  throw new Error('sharp disabled in tests');
});

import { POST } from '../../apps/api/app/api/products/searchByImage/route';
import { imageSearchCache } from '../../apps/api/lib/image-search-cache';

const OUTLET_A = 11;
const OUTLET_B = 12;

const merchant = { user: { id: 1, role: 'MERCHANT' }, userScope: { merchantId: 2 } };
const outletAdminA = { user: { id: 2, role: 'OUTLET_ADMIN' }, userScope: { merchantId: 2, outletId: OUTLET_A } };
const staffA = { user: { id: 3, role: 'OUTLET_STAFF' }, userScope: { merchantId: 2, outletId: OUTLET_A } };
const staffB = { user: { id: 4, role: 'OUTLET_STAFF' }, userScope: { merchantId: 2, outletId: OUTLET_B } };

function makeProduct(id: number, outletIds: number[], extra: any = {}) {
  return {
    id,
    name: `P${id}`,
    description: null,
    barcode: null,
    totalStock: 5,
    rentPrice: 100,
    salePrice: 200,
    costPrice: 50,
    deposit: 0,
    images: [],
    isActive: true,
    deletedAt: null,
    pricingType: null,
    durationConfig: null,
    pricingOptions: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    category: { id: 9, name: 'Cat' },
    merchant: { id: 2, name: 'Shop' },
    outletStock: outletIds.map((outletId) => ({
      id: id * 100 + outletId,
      stock: 5,
      renting: 0,
      outlet: { id: outletId, name: `O${outletId}`, address: '' },
    })),
    ...extra,
  };
}

function req(fields: Record<string, string> = {}, bytes = 'same-image-bytes-'.repeat(20)): any {
  const buf = Buffer.from(bytes);
  const file = {
    type: 'image/jpeg',
    name: 'photo.jpg',
    size: buf.length,
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length),
  };
  const all: Record<string, any> = { image: file, ...fields };
  return { formData: async () => ({ get: (k: string) => (k in all ? all[k] : null) }) };
}

async function search(as: any, fields: Record<string, string> = {}) {
  ctx = as;
  const res: any = await POST(req(fields), {} as any);
  expect(res.status).toBe(200);
  return res.body.data as { products: any[]; total: number; debug: { cacheHit: boolean } };
}

describe('image search scope (#653)', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    imageSearchCache.clear();
    productTable.clear();
    // 1,3,5 at outlet A; 2,4 at outlet B. Scores descend with id.
    [
      makeProduct(1, [OUTLET_A]),
      makeProduct(2, [OUTLET_B]),
      makeProduct(3, [OUTLET_A]),
      makeProduct(4, [OUTLET_B]),
      makeProduct(5, [OUTLET_A]),
    ].forEach((p) => productTable.set(p.id, p));
    mockEmbed.mockResolvedValue([0.1, 0.2, 0.3]);
    mockVectorSearch.mockImplementation(async () =>
      [1, 2, 3, 4, 5].map((id) => ({ productId: String(id), similarity: 1 - id / 10 }))
    );
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => warn.mockRestore());
  afterAll(() => imageSearchCache.destroy());

  describe('(a) costPrice follows products.manage', () => {
    it('OUTLET_STAFF gets no costPrice', async () => {
      const data = await search(staffA);
      expect(data.products.length).toBeGreaterThan(0);
      for (const p of data.products) {
        expect(p).not.toHaveProperty('costPrice');
      }
    });

    it('OUTLET_STAFF gets no costPrice on a cache hit either', async () => {
      await search(merchant);
      const data = await search(staffA);
      expect(data.debug.cacheHit).toBe(true);
      expect(data.products.length).toBeGreaterThan(0);
      for (const p of data.products) {
        expect(p).not.toHaveProperty('costPrice');
      }
    });

    it('MERCHANT gets costPrice', async () => {
      const data = await search(merchant);
      expect(data.products.map((p) => p.costPrice)).toEqual([50, 50, 50, 50, 50]);
    });

    it('OUTLET_ADMIN (has products.manage) gets costPrice', async () => {
      const data = await search(outletAdminA);
      expect(data.products.map((p) => p.id)).toEqual([1, 3, 5]);
      expect(data.products.every((p) => p.costPrice === 50)).toBe(true);
    });
  });

  describe('(b) outlet filter is applied after the cache', () => {
    it('staff of outlet A then outlet B each see only their own outlet', async () => {
      const a = await search(staffA);
      expect(a.debug.cacheHit).toBe(false);
      expect(a.products.map((p) => p.id)).toEqual([1, 3, 5]);

      const b = await search(staffB);
      expect(b.debug.cacheHit).toBe(true);
      expect(b.products.map((p) => p.id)).toEqual([2, 4]);
      expect(mockVectorSearch).toHaveBeenCalledTimes(1);
    });

    it('owner after outlet staff sees every outlet', async () => {
      await search(staffA);
      const owner = await search(merchant);
      expect(owner.debug.cacheHit).toBe(true);
      expect(owner.products.map((p) => p.id)).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('(c) products are re-read on every request', () => {
    it('a product soft-deleted after a cached search is not returned', async () => {
      await search(merchant);
      productTable.get(3).deletedAt = new Date();
      const data = await search(merchant);
      expect(data.debug.cacheHit).toBe(true);
      expect(data.products.map((p) => p.id)).toEqual([1, 2, 4, 5]);
      expect(data.total).toBe(4);
    });

    it('a product deactivated after a cached search is not returned', async () => {
      await search(merchant);
      productTable.get(1).isActive = false;
      const data = await search(merchant);
      expect(data.debug.cacheHit).toBe(true);
      expect(data.products.map((p) => p.id)).toEqual([2, 3, 4, 5]);
    });

    it('a price change after a cached search is visible', async () => {
      await search(merchant);
      productTable.get(2).rentPrice = 999;
      const data = await search(merchant);
      expect(data.products.find((p) => p.id === 2).rentPrice).toBe(999);
    });
  });

  describe('(d) limit and minSimilarity', () => {
    it('a cache hit with a larger limit returns that many products', async () => {
      const first = await search(merchant, { limit: '1' });
      expect(first.products.map((p) => p.id)).toEqual([1]);

      const second = await search(merchant, { limit: '3' });
      expect(second.debug.cacheHit).toBe(true);
      expect(second.products.map((p) => p.id)).toEqual([1, 2, 3]);
      expect(second.total).toBe(3);
    });

    it('a cache hit with a smaller limit returns that many products', async () => {
      await search(merchant, { limit: '5' });
      const second = await search(merchant, { limit: '2' });
      expect(second.debug.cacheHit).toBe(true);
      expect(second.products.map((p) => p.id)).toEqual([1, 2]);
    });

    it('a different minSimilarity is not served from the other entry', async () => {
      await search(merchant, { minSimilarity: '0.5' });
      const second = await search(merchant, { minSimilarity: '0.8' });
      expect(second.debug.cacheHit).toBe(false);
      expect(mockVectorSearch).toHaveBeenCalledTimes(2);
      expect(mockVectorSearch.mock.calls[1][1]).toMatchObject({ merchantId: 2, minSimilarity: 0.8 });
    });
  });
});
