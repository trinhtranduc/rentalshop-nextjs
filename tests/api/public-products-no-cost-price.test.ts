/**
 * #663 — GET /api/public/{tenantKey}/products needs no login. It spread the authenticated product rows,
 * so anyone could read every product's cost price (giá vốn) and internal fields (outlet-stock CUIDs,
 * embedding timestamps, barcode). The public response must carry only shop-facing fields.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

const productRow = () => ({
  id: 11,
  name: 'Áo dài cưới đỏ nhung',
  description: 'Nhung đỏ',
  barcode: 'AD-008',
  totalStock: 3,
  stock: 3,
  renting: 1,
  available: 2,
  rentPrice: 350000,
  salePrice: 1200000,
  costPrice: 90000,
  deposit: 200000,
  images: ['https://img/1.jpg'],
  isActive: true,
  embeddingGeneratedAt: new Date('2026-10-01T00:00:00Z'),
  pricingType: 'FIXED',
  durationConfig: null,
  pricingOptions: [
    { id: 5, type: 'FIXED', price: 350000, unit: null, blockSize: null, isDefault: true },
    { id: 6, type: 'DAILY', price: 120000, unit: null, blockSize: null, isDefault: false },
  ],
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-02T00:00:00Z'),
  category: { id: 4, name: 'Áo dài' },
  merchant: { id: 2, name: 'Lan Anh Bridal' },
  outletStock: [
    {
      id: 'cmabc123cuid',
      stock: 3,
      available: 2,
      renting: 1,
      outlet: { id: 1, name: 'Quận 3', address: '45 Võ Văn Tần' },
    },
  ],
});

const mockDb: any = {
  merchants: {
    findByTenantKey: jest.fn(async () => ({ id: 2, name: 'Lan Anh Bridal', isActive: true })),
  },
  products: {
    search: jest.fn(async () => ({ data: [productRow()], total: 1, page: 1, limit: 50, hasMore: false })),
  },
  categories: { search: jest.fn(async () => ({ data: [{ id: 4, name: 'Áo dài' }] })) },
  outlets: { search: jest.fn(async () => ({ data: [] })) },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb }));

jest.mock('@rentalshop/utils', () => ({
  ResponseBuilder: {
    success: (code: string, data: any) => ({ success: true, code, data }),
    error: (code: string) => ({ success: false, code }),
  },
  handleApiError: (error: any) => ({ response: { success: false, message: String(error) }, statusCode: 500 }),
  parseProductImages: (images: any) => images,
}));
jest.mock('@rentalshop/utils/server', () => ({ buildCorsHeaders: () => ({}) }));

import { GET } from '../../apps/api/app/api/public/[tenantKey]/products/route';

const CUID = /^c[a-z0-9]{6,}$/;

function collectStrings(value: any, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, out));
  return out;
}

async function fetchProducts() {
  const request: any = { url: 'https://api.anyrent.shop/api/public/lananh/products' };
  const res: any = await GET(request, { params: { tenantKey: 'lananh' } });
  expect(res.status).toBe(200);
  return res.body.data.products as any[];
}

describe('public shop products (#663)', () => {
  it('never returns the cost price', async () => {
    const [product] = await fetchProducts();
    expect(product).not.toHaveProperty('costPrice');
    expect(JSON.stringify(product)).not.toContain('90000');
  });

  it('drops internal fields and CUIDs', async () => {
    const [product] = await fetchProducts();
    expect(product).not.toHaveProperty('embeddingGeneratedAt');
    expect(product).not.toHaveProperty('barcode');
    expect(product).not.toHaveProperty('merchant');
    expect(collectStrings(product).filter((s) => CUID.test(s))).toEqual([]);
  });

  it('keeps what the shop page shows, including the per-day price', async () => {
    const [product] = await fetchProducts();
    expect(product).toMatchObject({
      id: 11,
      name: 'Áo dài cưới đỏ nhung',
      description: 'Nhung đỏ',
      images: ['https://img/1.jpg'],
      rentPrice: 350000,
      salePrice: 1200000,
      deposit: 200000,
      categoryId: 4,
      category: { id: 4, name: 'Áo dài' },
      stock: 3,
      available: 2,
      renting: 1,
      outletStock: [{ stock: 3, available: 2, renting: 1, outlet: { id: 1, name: 'Quận 3', address: '45 Võ Văn Tần' } }],
    });
    expect(product.pricingOptions).toEqual([
      expect.objectContaining({ type: 'FIXED', price: 350000, isDefault: true }),
      expect.objectContaining({ type: 'DAILY', price: 120000, isDefault: false }),
    ]);
  });
});
