/**
 * #1500 — GET /api/analytics/top-outlets: a cancelled order that kept a fee (phụ thu, #1491) counts for its outlet with
 * the fee as revenue; a cancelled order that kept nothing still counts for nothing. Order value of the others unchanged.
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@rentalshop/utils', () => ({
  getOrderRevenueEvents: () => [],
  calculatePeriodRevenueBatch: () => ({}),
  parseProductImages: () => [],
}));

import { computeTopOutletsRanking } from '../../../packages/utils/src/analytics/period-report';

const start = new Date('2026-11-01T00:00:00Z');
const end = new Date('2026-11-30T23:59:59Z');

/** Prisma stand-in: two `order.groupBy` calls (not cancelled / cancelled with a fee), then the outlet names */
function fakePrisma(notCancelled: any[], keptCancelled: any[]) {
  const groupBy = jest.fn(async (args: any) => (args.where.status?.not ? notCancelled : keptCancelled));
  const findMany = jest.fn(async (args: any) =>
    (args.where.id.in as number[]).map((id) => ({ id, name: `Outlet ${id}`, city: null, merchant: { id: 1, name: 'Shop' } })),
  );
  return { order: { groupBy }, outlet: { findMany } } as any;
}
const g = (outletId: number, count: number, sums: Record<string, number>) => ({ outletId, _count: { _all: count }, _sum: sums });

describe('top outlets with a cancelled order that kept a fee (#1500)', () => {
  it('adds the fee to the outlet revenue and counts the order', async () => {
    const prisma = fakePrisma([g(1, 2, { totalAmount: 500_000 })], [g(1, 1, { cancelKeptAmount: 100_000 })]);
    const page = await computeTopOutletsRanking(prisma, { outletFilter: {}, rangeStart: start, rangeEnd: end });
    expect(page.items.map((r: any) => [r.outletId ?? r.id, r.totalRevenue, r.orderCount])).toEqual([[1, 600_000, 3]]);
  });

  it('an outlet with only a cancelled order that kept a fee is listed with that fee', async () => {
    const prisma = fakePrisma([], [g(7, 1, { cancelKeptAmount: 100_000 })]);
    const page = await computeTopOutletsRanking(prisma, { outletFilter: {}, rangeStart: start, rangeEnd: end });
    expect(page.items.map((r: any) => [r.outletId ?? r.id, r.totalRevenue])).toEqual([[7, 100_000]]);
  });

  it('keeps the old ranking when no cancelled order kept anything', async () => {
    const prisma = fakePrisma([g(1, 1, { totalAmount: 300_000 }), g(2, 1, { totalAmount: 400_000 })], []);
    const page = await computeTopOutletsRanking(prisma, { outletFilter: {}, rangeStart: start, rangeEnd: end });
    expect(page.items.map((r: any) => [r.outletId ?? r.id, r.totalRevenue])).toEqual([[2, 400_000], [1, 300_000]]);
  });

  it('asks only for cancelled orders with a fee > 0 in the same date range', async () => {
    const prisma = fakePrisma([], []);
    await computeTopOutletsRanking(prisma, { outletFilter: { outletId: 3 }, rangeStart: start, rangeEnd: end });
    const calls = (prisma.order.groupBy as any).mock.calls.map((c: any[]) => c[0].where);
    const kept = calls.find((w: any) => w.status === 'CANCELLED');
    expect(kept).toMatchObject({ outletId: 3, deletedAt: null, cancelKeptAmount: { gt: 0 }, createdAt: { gte: start, lte: end } });
  });
});
