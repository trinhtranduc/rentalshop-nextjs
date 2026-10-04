/**
 * #389 — product soft delete.
 * - DELETE /api/products/:id sets `deletedAt` (and `isActive = false`); the row stays so orders keep the product.
 * - 409 PRODUCT_HAS_OPEN_ORDERS while the product is on a RESERVED or PICKUPED order; nothing changes.
 * - Merchant / outlet scope unchanged (403), unknown or already deleted → 404.
 * - POST /api/products/batch-delete follows the same rule, reporting blocked products in `errors`.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  hasPermission: jest.fn().mockResolvedValue(true),
}));

const mockDb: any = { products: { findById: jest.fn() } };
const mockPrisma: any = {
  orderItem: { findMany: jest.fn() },
  product: { update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: mockPrisma }));
jest.mock('@rentalshop/database/server', () => ({
  getVectorStore: () => ({ deleteProductEmbeddings: jest.fn().mockResolvedValue(undefined) }),
}));

jest.mock('@rentalshop/utils', () => ({
  productUpdateSchema: { parse: (d: any) => d },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
  normalizeImagesInput: (images: any) => images,
  parseProductImages: (images: any) => (Array.isArray(images) ? images : []),
  combineProductImages: (a: any) => a,
  extractStagingKeysFromUrls: () => [],
  mapStagingUrlsToProductionUrls: (a: any) => a,
  generateStagingKey: jest.fn(),
  generateProductImageKey: jest.fn(),
  generateFileName: jest.fn(),
  splitKeyIntoParts: jest.fn(),
}));
const mockDeleteFromS3 = jest.fn();
jest.mock('@rentalshop/utils/server', () => ({
  uploadToS3: jest.fn(),
  commitStagingFiles: jest.fn(),
  deleteFromS3: (...args: any[]) => mockDeleteFromS3(...args),
  getBucketName: jest.fn(),
  extractS3KeyFromUrl: () => 'key',
  createAuditHelper: () => ({ logDelete: () => Promise.resolve() }),
}));
jest.mock('../../apps/api/lib/image-compression', () => ({ compressImageTo1MB: jest.fn() }));

import { DELETE } from '../../apps/api/app/api/products/[id]/route';
import { POST as batchDelete } from '../../apps/api/app/api/products/batch-delete/route';
import { findProductIdsWithOpenOrders } from '../../apps/api/lib/product-soft-delete';

const merchant = { user: { id: 3, role: 'MERCHANT', email: 'm@x' }, userScope: { merchantId: 2 } };
const otherMerchant = { user: { id: 4, role: 'MERCHANT', email: 'o@x' }, userScope: { merchantId: 99 } };
const outletAdmin = { user: { id: 8, role: 'OUTLET_ADMIN', email: 'a@x' }, userScope: { merchantId: 2, outletId: 3 } };

const product = {
  id: 7,
  name: 'Vest đen',
  images: ['https://cdn/x.jpg'],
  merchant: { id: 2, name: 'Shop' },
  outletStock: [{ outlet: { id: 1 } }],
};
const delReq = (): any => ({ url: 'http://localhost/api/products/7', headers: { get: () => null } });
const del = (id = '7') => DELETE(delReq(), { params: { id } });

describe('product soft delete (#389)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = merchant;
    mockDb.products.findById.mockResolvedValue(product);
    mockPrisma.orderItem.findMany.mockResolvedValue([]);
    mockPrisma.product.updateMany.mockResolvedValue({ count: 1 });
  });

  describe('open-order check', () => {
    it('looks for RESERVED / PICKUPED, non-deleted orders of these products', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([{ productId: 7 }]);
      const blocked = await findProductIdsWithOpenOrders(mockPrisma, [7, 8, 7]);
      expect([...blocked]).toEqual([7]);
      expect(mockPrisma.orderItem.findMany).toHaveBeenCalledWith({
        where: {
          productId: { in: [7, 8] },
          order: { status: { in: ['RESERVED', 'PICKUPED'] }, deletedAt: null },
        },
        select: { productId: true },
        distinct: ['productId'],
      });
    });

    it('CANCELLED / RETURNED / COMPLETED orders do not block (they are not asked for)', async () => {
      await findProductIdsWithOpenOrders(mockPrisma, [7]);
      const statuses = mockPrisma.orderItem.findMany.mock.calls[0][0].where.order.status.in;
      expect(statuses).not.toContain('CANCELLED');
      expect(statuses).not.toContain('RETURNED');
      expect(statuses).not.toContain('COMPLETED');
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('soft-deletes: sets deletedAt and isActive=false, keeps the row and its images', async () => {
      const res: any = await del();
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true, code: 'PRODUCT_DELETED_SUCCESS', data: { id: 7, name: 'Vest đen' } });
      expect(mockPrisma.product.updateMany).toHaveBeenCalledTimes(1);
      const args = mockPrisma.product.updateMany.mock.calls[0][0];
      expect(args.where).toEqual({ id: { in: [7] }, deletedAt: null });
      expect(args.data.isActive).toBe(false);
      expect(args.data.deletedAt).toBeInstanceOf(Date);
      expect(mockPrisma.product.delete).not.toHaveBeenCalled();
      expect(mockDeleteFromS3).not.toHaveBeenCalled();
    });

    it('409 PRODUCT_HAS_OPEN_ORDERS when the product is on a reserved or rented order', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([{ productId: 7 }]);
      const res: any = await del();
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ success: false, code: 'PRODUCT_HAS_OPEN_ORDERS' });
      expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.product.delete).not.toHaveBeenCalled();
    });

    it("403 for another merchant's product, without touching it", async () => {
      ctx = otherMerchant;
      const res: any = await del();
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PRODUCT_ACCESS_DENIED');
      expect(mockPrisma.orderItem.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
    });

    it('403 for an outlet admin whose outlet does not stock the product', async () => {
      ctx = outletAdmin;
      const res: any = await del();
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PRODUCT_NOT_AVAILABLE_AT_OUTLET');
      expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
    });

    it('404 PRODUCT_NOT_FOUND for an unknown or already deleted product', async () => {
      mockDb.products.findById.mockResolvedValue(null);
      const res: any = await del();
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('POST /api/products/batch-delete', () => {
    const batchReq = (productIds: number[]): any => ({ json: async () => ({ productIds }) });

    beforeEach(() => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 7, name: 'Vest đen', images: [], merchant: { id: 2 } },
        { id: 8, name: 'Áo dài', images: [], merchant: { id: 2 } },
      ]);
      mockPrisma.orderItem.findMany.mockResolvedValue([{ productId: 8 }]);
    });

    it('soft-deletes free products and reports the ones on open orders', async () => {
      const res: any = await batchDelete(batchReq([7, 8]));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ deleted: 1, failed: 1, total: 2, deletedProducts: [{ id: 7, name: 'Vest đen' }] });
      expect(res.body.data.errors).toEqual([{ id: 8, name: 'Áo dài', error: 'PRODUCT_HAS_OPEN_ORDERS', code: 'PRODUCT_HAS_OPEN_ORDERS' }]);
      expect(mockPrisma.product.updateMany.mock.calls[0][0].where).toEqual({ id: { in: [7] }, deletedAt: null });
      expect(mockPrisma.product.delete).not.toHaveBeenCalled();
      const findWhere = mockPrisma.product.findMany.mock.calls[0][0].where;
      expect(findWhere.deletedAt).toBeNull();
    });

    it('409 when every product is on an open order', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([{ productId: 7 }, { productId: 8 }]);
      const res: any = await batchDelete(batchReq([7, 8]));
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('PRODUCT_HAS_OPEN_ORDERS');
      expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
    });

    it("403 when a product belongs to another merchant", async () => {
      ctx = otherMerchant;
      const res: any = await batchDelete(batchReq([7, 8]));
      expect(res.status).toBe(403);
      expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
    });
  });
});
