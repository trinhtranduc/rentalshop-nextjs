/**
 * #1128 — POST /api/public/{tenantKey}/search-by-image: a customer (no login) searches one shop's products by a photo.
 * Only that shop's active products, public fields (no cost price), at most 10, rate limited per IP and per shop,
 * friendly errors when the AI service is slow or down. Embedding, vector store and db are mocked.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: Object.assign(
    function NextResponse(this: any, body: any, init?: any) {
      return { body, status: init?.status || 200 };
    },
    { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) }
  ),
}));

const productTable = new Map<number, any>();
const mockDb: any = {
  merchants: {
    findByTenantKey: jest.fn(async (key: string) =>
      key === 'shop' ? { id: 2, name: 'Shop', isActive: true } : key === 'closed' ? { id: 3, name: 'Closed', isActive: false } : null
    ),
  },
  products: {
    findByIds: jest.fn(async (ids: number[]) => ids.map((id) => productTable.get(id)).filter((p) => p && !p.deletedAt)),
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
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
  },
  parseProductImages: (images: any) => (Array.isArray(images) ? images : []),
}));
jest.mock('@rentalshop/utils/server', () => ({ buildCorsHeaders: () => ({}) }));
jest.mock('../../apps/api/lib/image-compression', () => ({ compressImageForEmbedding: jest.fn(async (b: Buffer) => b) }));
jest.mock('sharp', () => () => {
  throw new Error('sharp disabled in tests');
});

import { POST } from '../../apps/api/app/api/public/[tenantKey]/search-by-image/route';
import { imageSearchCache } from '../../apps/api/lib/image-search-cache';
import { resetRateSlots } from '../../apps/api/lib/booking-requests';
import { PUBLIC_IMAGE_SEARCH_LIMIT, PUBLIC_IMAGE_SEARCH_RATE } from '../../apps/api/lib/public-image-search';

let seq = 0;
function image(opts: { type?: string; size?: number; name?: string } = {}) {
  seq += 1;
  const size = opts.size ?? 2000;
  const bytes = Buffer.alloc(size, seq % 250);
  return {
    name: opts.name ?? 'photo.jpg',
    type: opts.type ?? 'image/jpeg',
    size,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

function req(file: any, ip = '1.1.1.1') {
  return {
    url: 'https://api.anyrent.shop/api/public/shop/search-by-image',
    headers: { get: (name: string) => (name.toLowerCase() === 'x-forwarded-for' ? ip : null) },
    formData: async () => ({ get: (k: string) => (k === 'image' ? file : null) }),
  } as any;
}
const call = (file: any, tenantKey = 'shop', ip?: string) => POST(req(file, ip), { params: { tenantKey } } as any) as any;

function product(id: number, merchantId = 2, extra: any = {}) {
  return {
    id,
    name: `Áo dài ${id}`,
    description: null,
    rentPrice: 250000,
    salePrice: null,
    costPrice: 99000,
    deposit: 0,
    images: [`https://img/${id}.jpg`],
    isActive: true,
    deletedAt: null,
    pricingType: null,
    pricingOptions: [],
    categoryId: 9,
    category: { id: 9, name: 'Áo dài' },
    merchant: { id: merchantId, name: 'Shop' },
    totalStock: 3,
    outletStock: [{ id: 1, stock: 3, renting: 1, outlet: { id: 11, name: 'Thủ Đức', address: null } }],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...extra,
  };
}

beforeEach(() => {
  productTable.clear();
  imageSearchCache.clear();
  resetRateSlots();
  mockEmbed.mockReset().mockResolvedValue([0.1, 0.2]);
  mockVectorSearch.mockReset().mockResolvedValue([]);
  jest.clearAllMocks();
});

describe('validation and shop', () => {
  it('no image → 400 NO_IMAGE_FILE', async () => {
    const res = await call(null);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_IMAGE_FILE');
  });

  it('not an image or over 5 MB → 400 IMAGE_VALIDATION_FAILED, nothing embedded', async () => {
    expect((await call(image({ type: 'application/pdf', name: 'a.pdf' }))).body.code).toBe('IMAGE_VALIDATION_FAILED');
    expect((await call(image({ size: 5 * 1024 * 1024 + 1 }))).body.code).toBe('IMAGE_VALIDATION_FAILED');
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it('bad / unknown / inactive shop', async () => {
    expect((await call(image(), 'bad key!')).status).toBe(400);
    expect((await call(image(), 'nobody')).status).toBe(404);
    const closed = await call(image(), 'closed');
    expect(closed.status).toBe(403);
    expect(closed.body.code).toBe('MERCHANT_INACTIVE');
  });
});

describe('results', () => {
  it('searches only the shop by merchantId and returns its active products, best first, public fields only', async () => {
    productTable.set(5, product(5));
    productTable.set(6, product(6));
    productTable.set(7, product(7, 99)); // another shop (must never leak even if the vector store returned it)
    productTable.set(8, product(8, 2, { isActive: false }));
    mockVectorSearch.mockResolvedValue([
      { productId: '6', similarity: 0.96 },
      { productId: '7', similarity: 0.95 },
      { productId: '5', similarity: 0.9 },
      { productId: '8', similarity: 0.85 },
    ]);
    const res = await call(image());
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('PRODUCTS_FOUND');
    expect(mockVectorSearch.mock.calls[0][1]).toMatchObject({ merchantId: 2 });
    const list = res.body.data.products;
    expect(list.map((p: any) => p.id)).toEqual([6, 5]);
    expect(list[0].similarity).toBe(0.96);
    expect(list[0]).not.toHaveProperty('costPrice');
    expect(list[0]).not.toHaveProperty('merchant');
    expect(list[0].available).toBe(2);
    expect(list[0].outletStock[0]).toMatchObject({ stock: 3, available: 2, renting: 1, outlet: { id: 11 } });
  });

  it('at most 10 products', async () => {
    const hits = [];
    for (let id = 1; id <= 14; id += 1) {
      productTable.set(id, product(id));
      hits.push({ productId: String(id), similarity: 1 - id / 100 });
    }
    mockVectorSearch.mockResolvedValue(hits);
    const res = await call(image());
    expect(res.body.data.products).toHaveLength(PUBLIC_IMAGE_SEARCH_LIMIT);
    expect(PUBLIC_IMAGE_SEARCH_LIMIT).toBe(10);
  });

  it('nothing similar → 200 NO_PRODUCTS_FOUND with an empty list', async () => {
    const res = await call(image());
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('NO_PRODUCTS_FOUND');
    expect(res.body.data.products).toEqual([]);
  });
});

describe('AI service errors', () => {
  it('a slow embedding service → 503 SEARCH_TIMEOUT', async () => {
    mockEmbed.mockRejectedValue(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
    const res = await call(image());
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('SEARCH_TIMEOUT');
  });

  it('another failure → 503 SEARCH_FAILED', async () => {
    mockEmbed.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const res = await call(image());
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('SEARCH_FAILED');
  });
});

describe('rate limits', () => {
  it(`${PUBLIC_IMAGE_SEARCH_RATE.perIp.limit} searches per IP per window, then 429 IMAGE_SEARCH_RATE_LIMITED`, async () => {
    for (let i = 0; i < PUBLIC_IMAGE_SEARCH_RATE.perIp.limit; i += 1) {
      expect((await call(image(), 'shop', '9.9.9.9')).status).toBe(200);
    }
    const blocked = await call(image(), 'shop', '9.9.9.9');
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('IMAGE_SEARCH_RATE_LIMITED');
    expect((await call(image(), 'shop', '8.8.8.8')).status).toBe(200); // another IP is fine
  });

  it('a per-shop cap across IPs', async () => {
    const cap = PUBLIC_IMAGE_SEARCH_RATE.perShop.limit;
    for (let i = 0; i < cap; i += 1) {
      expect((await call(image(), 'shop', `10.0.${Math.floor(i / 250)}.${i % 250}`)).status).toBe(200);
    }
    expect((await call(image(), 'shop', '10.9.9.9')).body.code).toBe('IMAGE_SEARCH_RATE_LIMITED');
  });

  it('a rejected file does not use a slot', async () => {
    for (let i = 0; i < 20; i += 1) await call(image({ type: 'text/plain', name: 'a.txt' }), 'shop', '7.7.7.7');
    expect((await call(image(), 'shop', '7.7.7.7')).status).toBe(200);
  });
});
