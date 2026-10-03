/**
 * #359 — editing an order's items must keep the product snapshot (name, barcode, images),
 * as POST /api/orders does. Re-created items had no snapshot, so old orders lost item names.
 */
const mockPrisma = {
  order: { findUnique: jest.fn(), update: jest.fn() },
  product: { findMany: jest.fn() },
  productPricingOption: { findMany: jest.fn().mockResolvedValue([]) },
};
jest.mock('../../../packages/database/src/client', () => ({ prisma: mockPrisma }));
jest.mock('@rentalshop/utils', () => ({
  removeVietnameseDiacritics: (s: string) => s,
  normalizeStartDate: (d: any) => d,
  normalizeEndDate: (d: any) => d,
  formatFullName: (a: string, b: string) => [a, b].filter(Boolean).join(' '),
  parseProductImages: (v: any) => (Array.isArray(v) ? v : []),
}));

import { updateOrder } from '../../../packages/database/src/order';

const oldOrder = {
  orderType: 'RENT',
  status: 'RESERVED',
  outletId: 1,
  orderItems: [
    { productId: 10, quantity: 1, productName: 'Vest đen', productBarcode: '111', productImages: ['vest.jpg'] },
    { productId: 11, quantity: 1, productName: 'Áo dài đỏ', productBarcode: '222', productImages: ['aodai.jpg'] },
  ],
};

function createdItems() {
  return mockPrisma.order.update.mock.calls[0][0].data.orderItems.create;
}

describe('updateOrder keeps the item snapshot (#359)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.order.findUnique.mockResolvedValue(oldOrder);
    mockPrisma.order.update.mockRejectedValue(new Error('stop after capturing the update'));
  });

  it('fills productName, productBarcode and productImages from the product', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 10, name: 'Vest đen slim', barcode: '111', images: ['vest-new.jpg'] },
    ]);

    await updateOrder(5, {
      orderItems: [{ productId: 10, quantity: 2, unitPrice: 150000, totalPrice: 300000 }],
    }).catch(() => undefined);

    expect(createdItems()).toEqual([
      expect.objectContaining({
        productId: 10,
        productName: 'Vest đen slim',
        productBarcode: '111',
        productImages: ['vest-new.jpg'],
      }),
    ]);
  });

  it('keeps the old snapshot when the product cannot be loaded', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);

    await updateOrder(5, {
      orderItems: [{ productId: 11, quantity: 1, unitPrice: 300000, totalPrice: 300000 }],
    }).catch(() => undefined);

    expect(createdItems()).toEqual([
      expect.objectContaining({
        productId: 11,
        productName: 'Áo dài đỏ',
        productBarcode: '222',
        productImages: ['aodai.jpg'],
      }),
    ]);
  });
});
