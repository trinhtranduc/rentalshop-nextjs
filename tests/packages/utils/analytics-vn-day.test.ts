/**
 * #355 — analytics days and months are Vietnam civil days (Asia/Ho_Chi_Minh), not UTC days.
 * Vietnam midnight is 17:00Z the day before: 16:59:59Z and 17:00:00Z are on different days.
 * Must give the same results under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@rentalshop/utils', () => {
  const revenue = jest.requireActual('../../../packages/utils/src/core/revenue-calculator') as any;
  return {
    calculatePeriodRevenueBatch: revenue.calculatePeriodRevenueBatch,
    getOrderRevenueEvents: revenue.getOrderRevenueEvents,
    parseProductImages: () => [],
  };
});

import * as dateRange from '../../../packages/utils/src/core/date-range';
import {
  getOrderRevenueEvents,
  getRevenueByDate,
  getOrderRevenueForDate,
} from '../../../packages/utils/src/core/revenue-calculator';
import { computeIncomePeriodSummary } from '../../../packages/utils/src/analytics/income-period-summary';
import { buildAnalyticsPeriodReport } from '../../../packages/utils/src/analytics/period-report';

const helpers = dateRange as any;

function sale(id: number, createdAt: string, totalAmount: number) {
  return {
    id,
    orderNumber: `ORD-1-${id}`,
    orderType: 'SALE',
    status: 'COMPLETED',
    totalAmount,
    depositAmount: 0,
    securityDeposit: 0,
    damageFee: 0,
    createdAt: new Date(createdAt),
    pickedUpAt: null,
    returnedAt: null,
    pickupPlanAt: null,
    returnPlanAt: null,
    updatedAt: new Date(createdAt),
  };
}

// D: 30 Sep 23:59:59 VN · C: 1 Oct 00:00 VN (month edge) · A: 1 Oct 23:59:59 VN · B: 2 Oct 00:00 VN
const D = sale(4, '2026-09-30T16:59:59Z', 7);
const C = sale(3, '2026-09-30T17:00:00Z', 50);
const A = sale(1, '2026-10-01T16:59:59Z', 100);
const B = sale(2, '2026-10-01T17:00:00Z', 200);
const ORDERS = [A, B, C, D];

/** Prisma stand-in: the main event query gets the orders, the side queries get nothing. */
function fakePrisma(orders: any[] = ORDERS) {
  const findMany = jest.fn(async (args: any) => (args?.select?.orderNumber ? orders : []));
  return {
    findMany,
    prisma: {
      order: { findMany, groupBy: jest.fn(async () => []) },
      outlet: { findMany: jest.fn(async () => []) },
      orderItem: { findMany: jest.fn(async () => []) },
      product: { findMany: jest.fn(async () => []) },
    } as any,
  };
}

function fakeDb() {
  const search = jest.fn(async (_args: any) => ({ total: 0, data: [] }));
  const getStats = jest.fn(async (_args: any) => 0);
  return {
    search,
    getStats,
    db: {
      orders: { search, getStats },
      orderItems: { groupBy: jest.fn(async () => []) },
      products: { findById: jest.fn() },
      customers: { findById: jest.fn() },
      merchants: { findById: jest.fn() },
      outlets: { findById: jest.fn() },
    } as any,
  };
}

describe('getUtcRangeForDateKeys (#355)', () => {
  it('a Vietnam day starts at 17:00Z the day before', () => {
    expect(helpers.getUtcRangeForDateKeys({ from: '2026-10-02' })).toEqual({
      start: new Date('2026-10-01T17:00:00.000Z'),
      end: new Date('2026-10-02T16:59:59.999Z'),
    });
  });

  it('a range of days, and a month', () => {
    expect(helpers.getUtcRangeForDateKeys({ from: '2026-10-01', to: '2026-10-31' })).toEqual({
      start: new Date('2026-09-30T17:00:00.000Z'),
      end: new Date('2026-10-31T16:59:59.999Z'),
    });
  });

  it('another time zone when asked', () => {
    expect(helpers.getUtcRangeForDateKeys({ from: '2026-10-02' }, 'Asia/Tokyo').start).toEqual(
      new Date('2026-10-01T15:00:00.000Z')
    );
  });
});

describe('revenue-calculator uses the Vietnam day (#355)', () => {
  it('created 06:30 and picked up 10:00 the same Vietnam day is a same-day pickup', () => {
    const order = {
      orderType: 'RENT',
      status: 'PICKUPED',
      totalAmount: 300,
      depositAmount: 100,
      securityDeposit: 500,
      damageFee: 0,
      createdAt: '2026-10-01T23:30:00Z', // 2 Oct 06:30 VN (still 1 Oct in UTC)
      pickedUpAt: '2026-10-02T03:00:00Z', // 2 Oct 10:00 VN
      returnedAt: null,
      updatedAt: '2026-10-02T03:00:00Z',
    };
    const events = getOrderRevenueEvents(order);
    expect(events.map((e) => e.revenueType)).toEqual(['RENT_PICKUP']);
    expect(events[0].revenue).toBe(800);
  });

  it('getRevenueByDate takes the Vietnam day of the target instant', () => {
    const target = new Date('2026-10-02T05:00:00Z'); // 2 Oct 12:00 VN
    expect(getRevenueByDate(B, target).map((e) => e.revenue)).toEqual([200]);
    expect(getRevenueByDate(A, target)).toEqual([]);
  });

  it('getOrderRevenueForDate takes the Vietnam day of the target instant', () => {
    const target = new Date('2026-10-02T05:00:00Z');
    expect(getOrderRevenueForDate(B, target)).toBe(200);
    expect(getOrderRevenueForDate(A, target)).toBe(0);
  });
});

describe('computeIncomePeriodSummary buckets by Vietnam day (#355)', () => {
  it('one day: only the order made after Vietnam midnight', async () => {
    const { prisma } = fakePrisma();
    const { summary, periods } = await computeIncomePeriodSummary(prisma, {
      startDate: '2026-10-02',
      endDate: '2026-10-02',
      outletFilter: {},
    });
    expect(summary.orderCounts.new).toBe(1);
    expect(summary.totalRevenue).toBe(200);
    expect(periods).toEqual([
      expect.objectContaining({ date: '2026/10/02', dateISO: '2026-10-02T00:00:00.000Z', newOrderCount: 1 }),
    ]);
  });

  it('the month edge: 17:00Z on 30 Sep is 1 Oct', async () => {
    const { prisma } = fakePrisma();
    const { summary } = await computeIncomePeriodSummary(prisma, {
      startDate: '2026-10-01',
      endDate: '2026-10-01',
      outletFilter: {},
    });
    expect(summary.orderCounts.new).toBe(2); // C and A
    expect(summary.totalRevenue).toBe(150);
  });

  it('queries a window that covers the Vietnam days', async () => {
    const { prisma, findMany } = fakePrisma();
    await computeIncomePeriodSummary(prisma, { startDate: '2026-10-02', endDate: '2026-10-02', outletFilter: {} });
    const where = (findMany.mock.calls[0][0] as any).where;
    const created = where.OR[0].createdAt;
    expect(created.gte.getTime()).toBeLessThanOrEqual(new Date('2026-10-01T17:00:00Z').getTime());
    expect(created.lte.getTime()).toBeGreaterThanOrEqual(new Date('2026-10-02T16:59:59.999Z').getTime());
  });

  it('a long range keeps the total; each order lands on its Vietnam day', async () => {
    const { prisma } = fakePrisma();
    const { summary, periods } = await computeIncomePeriodSummary(prisma, {
      startDate: '2026-09-01',
      endDate: '2026-10-31',
      outletFilter: {},
    });
    expect(summary.totalRevenue).toBe(357);
    expect(summary.orderCounts.new).toBe(4);
    expect(periods!.map((p) => [p.date, p.totalRevenue])).toEqual([
      ['2026/09/30', 7],
      ['2026/10/01', 150],
      ['2026/10/02', 200],
    ]);
    expect(periods!.reduce((s, p) => s + p.totalRevenue, 0)).toBe(summary.totalRevenue);
  });
});

describe('buildAnalyticsPeriodReport uses Vietnam days and months (#355)', () => {
  it('day series starts on startDate and buckets by Vietnam day', async () => {
    const { prisma } = fakePrisma();
    const { db } = fakeDb();
    const report = await buildAnalyticsPeriodReport(prisma, db, {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      groupBy: 'day',
      limit: 5,
      outletFilter: {},
      userRole: 'MERCHANT',
    });
    expect(report.series).toHaveLength(31);
    expect(report.series[0]).toEqual(
      expect.objectContaining({ date: '2026/10/01', dayNumber: 1, realIncome: 150 })
    );
    expect(report.series[1]).toEqual(expect.objectContaining({ date: '2026/10/02', realIncome: 200 }));
    expect(report.series[30].date).toBe('2026/10/31');
  });

  it('range and previous period are Vietnam days', async () => {
    const { prisma } = fakePrisma();
    const { db, search } = fakeDb();
    await buildAnalyticsPeriodReport(prisma, db, {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      groupBy: 'day',
      limit: 5,
      outletFilter: {},
      userRole: 'MERCHANT',
    });
    const countRanges = search.mock.calls
      .filter((call: any[]) => call[0].limit === 1)
      .map((call: any[]) => call[0].where.createdAt);
    expect(countRanges).toEqual([
      { gte: new Date('2026-09-30T17:00:00.000Z'), lte: new Date('2026-10-31T16:59:59.999Z') },
      // previous 31 Vietnam days: 31 Aug .. 30 Sep
      { gte: new Date('2026-08-30T17:00:00.000Z'), lte: new Date('2026-09-30T16:59:59.999Z') },
    ]);
  });

  it('month series windows are Vietnam months; a full year compares with the previous Vietnam year', async () => {
    const { prisma, findMany } = fakePrisma();
    const { db, search } = fakeDb();
    const report = await buildAnalyticsPeriodReport(prisma, db, {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      groupBy: 'month',
      limit: 5,
      outletFilter: {},
      userRole: 'MERCHANT',
    });
    expect(report.series.map((p) => p.month)).toHaveLength(12);
    const monthWindows = findMany.mock.calls
      .map((call: any[]) => call[0]?.where?.OR?.[0]?.createdAt)
      .filter(Boolean)
      .map((w: any) => [w.gte.toISOString(), w.lte.toISOString()]);
    expect(monthWindows).toContainEqual(['2026-09-30T17:00:00.000Z', '2026-10-31T16:59:59.999Z']);
    expect(monthWindows).not.toContainEqual(['2026-10-01T00:00:00.000Z', '2026-10-31T23:59:59.999Z']);

    const prev = search.mock.calls.filter((call: any[]) => call[0].limit === 1)[1][0].where.createdAt;
    expect(prev).toEqual({ gte: new Date('2024-12-31T17:00:00.000Z'), lte: new Date('2025-12-31T16:59:59.999Z') });
  });
});
