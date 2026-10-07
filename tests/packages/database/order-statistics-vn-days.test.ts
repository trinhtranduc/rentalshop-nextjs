/**
 * #594 (timezone batch B of #578, API-8 / API-10) — db.orders.getStatistics and searchWithCursor read
 * Vietnam civil days, and the statistics revenue excludes CANCELLED orders (AGENTS.md revenue rule).
 * Routes pass `new Date('YYYY-MM-DD')` for both ends (orders/statistics, orders/cursor, analytics/overview).
 */
const mockPrisma: any = {
  order: {
    count: jest.fn(async () => 3),
    aggregate: jest.fn(async () => ({ _sum: { totalAmount: 300 } })),
    groupBy: jest.fn(async () => []),
    findMany: jest.fn(async () => []),
  },
};
jest.mock('../../../packages/database/src/client', () => ({ prisma: mockPrisma }));
jest.mock('@rentalshop/utils', () => {
  const dateRange = jest.requireActual('../../../packages/utils/src/core/date-range');
  return {
    normalizeStartDate: dateRange.normalizeStartDate,
    normalizeEndDate: dateRange.normalizeEndDate,
    removeVietnameseDiacritics: (s: string) => s,
    formatFullName: (a: string, b: string) => [a, b].filter(Boolean).join(' '),
    parseProductImages: () => [],
  };
});

import { simplifiedOrders } from '../../../packages/database/src/order';

const vnDay = (from: string, to = from) => ({
  gte: new Date(new Date(`${from}T00:00:00.000Z`).getTime() - 7 * 3600_000),
  lte: new Date(new Date(`${to}T23:59:59.999Z`).getTime() - 7 * 3600_000),
});

beforeEach(() => jest.clearAllMocks());

describe('getStatistics (#594)', () => {
  it('counts orders of the Vietnam days and leaves CANCELLED out of revenue', async () => {
    await simplifiedOrders.getStatistics({
      merchantId: 2,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-31'),
    });
    const countWhere = mockPrisma.order.count.mock.calls[0][0].where;
    expect(countWhere.createdAt).toEqual(vnDay('2026-10-01', '2026-10-31'));
    // Order count and status breakdown keep every status (cancelled orders are still orders)
    expect(countWhere.status).toBeUndefined();
    const revenueWhere = mockPrisma.order.aggregate.mock.calls[0][0].where;
    expect(revenueWhere.createdAt).toEqual(vnDay('2026-10-01', '2026-10-31'));
    expect(revenueWhere.status).toEqual({ not: 'CANCELLED' });
  });
});

describe('searchWithCursor (#594)', () => {
  it('filters createdAt by Vietnam days', async () => {
    await simplifiedOrders.searchWithCursor({
      merchantId: 2,
      startDate: new Date('2026-10-02'),
      endDate: new Date('2026-10-02'),
    });
    const where = mockPrisma.order.findMany.mock.calls[0][0].where;
    expect(where.createdAt).toEqual(vnDay('2026-10-02'));
  });
});
