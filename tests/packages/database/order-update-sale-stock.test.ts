/**
 * Khách báo "bán nhưng kho vẫn không giảm": creating a sale takes stock, but editing the lines of a
 * COMPLETED sale (PUT /api/orders/{id} with orderItems; web, iOS and Android all offer Sửa) moved nothing,
 * and cancelling it afterwards gave back the edited lines, so stock went up.
 *
 * Runs the real updateOrder and updateOutletStockForOrder on an in-memory OutletStock / Product store.
 */
type Row = { id: number; productId: number; outletId: number; stock: number; renting: number; available: number };

const store = {
  rows: [] as Row[],
  products: new Map<number, { id: number; totalStock: number }>(),
  order: null as null | {
    orderType: string;
    status: string;
    outletId: number;
    orderItems: Array<{ productId: number; quantity: number }>;
  },
};

function applyIncrement(value: number, change: any): number {
  if (change === undefined) return value;
  if (typeof change === 'object' && change !== null && 'increment' in change) return value + change.increment;
  return change;
}

const mockPrisma = {
  order: {
    findUnique: jest.fn(async () => store.order && { ...store.order, totalAmount: 0, pickedUpAt: null, returnedAt: null }),
    update: jest.fn(async ({ data }: any) => {
      const order = store.order!;
      if (data.status) order.status = data.status;
      if (data.outlet?.connect?.id) order.outletId = data.outlet.connect.id;
      if (data.orderItems?.create) {
        order.orderItems = data.orderItems.create.map((item: any) => ({ productId: item.productId, quantity: item.quantity }));
      }
      return { id: 122, orderNumber: '386959', orderType: order.orderType, status: order.status, outletId: order.outletId, orderItems: [], payments: [] };
    }),
  },
  product: {
    findMany: jest.fn(async () => []),
    findUnique: jest.fn(async ({ where }: any) => (store.products.has(where.id) ? { id: where.id } : null)),
    update: jest.fn(async ({ where, data }: any) => {
      const product = store.products.get(where.id)!;
      product.totalStock = data.totalStock;
      return product;
    }),
  },
  productPricingOption: { findMany: jest.fn(async () => []) },
  outlet: { findUnique: jest.fn(async ({ where }: any) => ({ id: where.id })) },
  outletStock: {
    findUnique: jest.fn(async ({ where }: any) => {
      const key = where.productId_outletId;
      const row = store.rows.find((r) => r.productId === key.productId && r.outletId === key.outletId);
      return row ? { ...row } : null;
    }),
    findMany: jest.fn(async ({ where }: any) => store.rows.filter((r) => r.productId === where.productId).map((r) => ({ ...r }))),
    create: jest.fn(async ({ data }: any) => {
      const row: Row = { id: store.rows.length + 1, renting: 0, available: 0, stock: 0, ...data };
      store.rows.push(row);
      return { ...row };
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const row = store.rows.find((r) => r.id === where.id)!;
      row.stock = applyIncrement(row.stock, data.stock);
      row.renting = applyIncrement(row.renting, data.renting);
      row.available = applyIncrement(row.available, data.available);
      return { ...row };
    }),
  },
};
jest.mock('../../../packages/database/src/client', () => ({ prisma: mockPrisma }));
jest.mock('@rentalshop/utils', () => ({
  removeVietnameseDiacritics: (s: string) => s,
  normalizeStartDate: (d: any) => d,
  normalizeEndDate: (d: any) => d,
  formatFullName: (a: string, b: string) => [a, b].filter(Boolean).join(' '),
  parseProductImages: (v: any) => (Array.isArray(v) ? v : []),
  REVENUE_PLAN_SELECT: {},
}));

import { updateOrder } from '../../../packages/database/src/order';

function stockAt(productId: number, outletId: number) {
  const row = store.rows.find((r) => r.productId === productId && r.outletId === outletId);
  return row ? { stock: row.stock, available: row.available } : null;
}

/** The local reproduction: product 1 had 17 and sold 1 (now 16), product 2 has 24; 4 of each are out on rentals. */
function soldOneOfProductOne() {
  store.rows = [
    { id: 1, productId: 1, outletId: 1, stock: 16, renting: 4, available: 12 },
    { id: 2, productId: 2, outletId: 1, stock: 24, renting: 4, available: 20 },
    { id: 3, productId: 1, outletId: 2, stock: 5, renting: 0, available: 5 },
  ];
  store.products = new Map([
    [1, { id: 1, totalStock: 21 }],
    [2, { id: 2, totalStock: 24 }],
  ]);
  store.order = { orderType: 'SALE', status: 'COMPLETED', outletId: 1, orderItems: [{ productId: 1, quantity: 1 }] };
}

const editedLines = [
  { productId: 1, quantity: 3, unitPrice: 216, totalPrice: 648 },
  { productId: 2, quantity: 1, unitPrice: 116, totalPrice: 116 },
];

describe('editing a completed sale moves stock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    soldOneOfProductOne();
  });

  it('takes the added units and the new product (1 x 1 -> 1 x 3 + 2 x 1)', async () => {
    await updateOrder(122, { orderItems: editedLines } as any);

    expect(stockAt(1, 1)).toEqual({ stock: 14, available: 10 });
    expect(stockAt(2, 1)).toEqual({ stock: 23, available: 19 });
    expect(store.products.get(1)!.totalStock).toBe(19);
    expect(store.products.get(2)!.totalStock).toBe(23);
  });

  it('gives back a removed line and a lower quantity', async () => {
    store.order!.orderItems = [{ productId: 1, quantity: 3 }, { productId: 2, quantity: 1 }];
    await updateOrder(122, { orderItems: [{ productId: 1, quantity: 1, unitPrice: 216, totalPrice: 216 }] } as any);

    expect(stockAt(1, 1)).toEqual({ stock: 18, available: 14 });
    expect(stockAt(2, 1)).toEqual({ stock: 25, available: 21 });
  });

  it('moves nothing when the lines are the same', async () => {
    await updateOrder(122, { orderItems: [{ productId: 1, quantity: 1, unitPrice: 216, totalPrice: 216 }] } as any);

    expect(stockAt(1, 1)).toEqual({ stock: 16, available: 12 });
    expect(mockPrisma.outletStock.update).not.toHaveBeenCalled();
  });

  it('cancelling after the edit gives back what was taken, no more', async () => {
    await updateOrder(122, { orderItems: editedLines } as any);
    await updateOrder(122, { status: 'CANCELLED' } as any);

    // Back to the numbers before the sale: 17 and 24
    expect(stockAt(1, 1)).toEqual({ stock: 17, available: 13 });
    expect(stockAt(2, 1)).toEqual({ stock: 24, available: 20 });
  });

  it('moving the sale to another branch gives the units back there and takes them at the new branch', async () => {
    await updateOrder(122, { outletId: 2 } as any);

    expect(stockAt(1, 1)).toEqual({ stock: 17, available: 13 });
    expect(stockAt(1, 2)).toEqual({ stock: 4, available: 4 });
  });
});
