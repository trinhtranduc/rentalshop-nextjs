/**
 * #429 — Overview "Top Products" showed "1 rentals" for a product sold once in a SALE order.
 * `rentalCount` counts RENT lines only; `saleCount` counts SALE lines; CANCELLED stays excluded.
 * Sources: buildAnalyticsPeriodReport (GET /api/analytics/overview, /period) and
 * computeTopProductsByShop (GET /api/analytics/top-products).
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@rentalshop/utils', () => ({
  calculatePeriodRevenueBatch: async () => { throw new Error('unused'); },
  getOrderRevenueEvents: async () => { throw new Error('unused'); },
  parseProductImages: () => [],
}));
jest.mock('../../packages/utils/src/analytics/income-period-summary', () => ({
  computeIncomePeriodSummary: async () => { throw new Error('unused'); },
}));
import {
  buildAnalyticsPeriodReport,
  computeTopProductsByShop,
} from '../../packages/utils/src/analytics/period-report';

const unused = () => new Proxy({}, { get: () => async () => { throw new Error('unused'); } });

// Order 1 = SALE of product 15; orders 2 and 3 = RENT of product 16.
const orders = [
  { id: 1, orderType: 'SALE', outletId: 1 },
  { id: 2, orderType: 'RENT', outletId: 1 },
  { id: 3, orderType: 'RENT', outletId: 1 },
];
const items = [
  { orderId: 1, productId: 15, quantity: 1, totalPrice: 900 },
  { orderId: 2, productId: 16, quantity: 1, totalPrice: 300 },
  { orderId: 3, productId: 16, quantity: 2, totalPrice: 400 },
];

/** Minimal prisma-like groupBy over `items`, honouring orderId/productId `in` filters. */
async function groupBy(args: any) {
  const orderIn: number[] | undefined = args.where?.orderId?.in;
  const productIn: number[] | undefined = args.where?.productId?.in;
  const rows = items.filter(
    (it) => (!orderIn || orderIn.includes(it.orderId)) && (!productIn || productIn.includes(it.productId))
  );
  const byProduct = new Map<number, { productId: number; _count: { productId: number }; _sum: { totalPrice: number } }>();
  for (const row of rows) {
    const g = byProduct.get(row.productId) ?? { productId: row.productId, _count: { productId: 0 }, _sum: { totalPrice: 0 } };
    g._count.productId += 1;
    g._sum.totalPrice += row.totalPrice;
    byProduct.set(row.productId, g);
  }
  return [...byProduct.values()].sort((a, b) => b._sum.totalPrice - a._sum.totalPrice);
}

describe('top products count rentals from RENT orders only (#429)', () => {
  it('analytics period/overview: rentalCount = RENT lines, saleCount = SALE lines', async () => {
    const search = jest.fn(async (_args: any) => ({ data: orders }));
    const db: any = new Proxy(
      {
        orders: { search },
        orderItems: { groupBy: jest.fn(groupBy) },
        products: { findById: async (id: number) => ({ id, name: `P${id}`, images: [] }) },
      },
      { get: (target: any, key) => target[key] ?? unused() }
    );
    const prisma: any = new Proxy({}, { get: () => unused() });

    const report = await buildAnalyticsPeriodReport(prisma, db, {
      startDate: '2026-09-27',
      endDate: '2026-10-03',
      groupBy: 'day',
      limit: 5,
      outletFilter: { outletId: { in: [1] } },
      userRole: 'MERCHANT',
    });

    const topProductsCall = search.mock.calls.find((call: any[]) => call[0].limit === 10000);
    expect((topProductsCall![0] as any).where.status).toEqual({ not: 'CANCELLED' });

    const byId = new Map(report.topProducts.map((p: any) => [p.id, p]));
    expect(report.topProducts.map((p: any) => p.id)).toEqual([15, 16]); // ranking by revenue unchanged
    expect(byId.get(15)).toMatchObject({ rentalCount: 0, saleCount: 1, totalRevenue: 900 });
    expect(byId.get(16)).toMatchObject({ rentalCount: 2, saleCount: 0, totalRevenue: 700 });
  });

  it('analytics top-products by shop: rentalCount = RENT quantity, saleCount = SALE quantity', async () => {
    const findMany = jest.fn(async (_args: any) =>
      items.map((it) => {
        const order = orders.find((o) => o.id === it.orderId)!;
        return {
          productId: it.productId,
          quantity: it.quantity,
          totalPrice: it.totalPrice,
          order: { outletId: order.outletId, orderType: order.orderType },
        };
      })
    );
    const prisma: any = {
      orderItem: { findMany },
      product: { findMany: async () => [15, 16].map((id) => ({ id, name: `P${id}`, rentPrice: 0, images: [], merchant: { id: 9, name: 'M' } })) },
      outlet: { findMany: async () => [{ id: 1, name: 'Shop', merchant: { id: 9, name: 'M' } }] },
    };

    const page = await computeTopProductsByShop(prisma, {
      outletFilter: { outletId: { in: [1] } },
      rangeStart: new Date('2026-09-26T17:00:00.000Z'),
      rangeEnd: new Date('2026-10-03T16:59:59.999Z'),
    });

    const args: any = findMany.mock.calls[0][0];
    expect(args.where.order.status).toEqual({ not: 'CANCELLED' });
    expect(args.where.order.outletId).toEqual({ in: [1] });
    const byId = new Map(page.items.map((p: any) => [p.id, p]));
    expect(byId.get(15)).toMatchObject({ rentalCount: 0, saleCount: 1, quantity: 1 });
    expect(byId.get(16)).toMatchObject({ rentalCount: 3, saleCount: 0, quantity: 3 });
  });
});
