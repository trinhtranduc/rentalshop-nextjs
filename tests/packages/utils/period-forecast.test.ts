/**
 * #605 — GET /api/analytics/period: expected collections per day, new order value per day, rent/sale split.
 *
 * - series[].expectedCollected: RENT RESERVED orders on the Vietnam civil day of pickupPlanAt, today or later,
 *   amount = total − deposit − completed PICKUP payments (never collateral), never below 0.
 * - series[].newOrderValue: totalAmount of orders created that day, not cancelled (same rows as totalOrderValue).
 * - revenue.orderValueByType: rent / sale split of totalOrderValue.
 * Old fields never change; a failure in the new code leaves the new fields out and nothing else.
 * Runs the same under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { createFakeOrderStore } from '../../helpers/fake-order-store';

jest.mock('@rentalshop/utils', () => {
  const revenue = jest.requireActual('../../../packages/utils/src/core/revenue-calculator') as any;
  return {
    calculatePeriodRevenueBatch: revenue.calculatePeriodRevenueBatch,
    getOrderRevenueEvents: revenue.getOrderRevenueEvents,
    parseProductImages: () => [],
  };
});

import { buildAnalyticsPeriodReport } from '../../../packages/utils/src/analytics/period-report';

/** 6 Oct 2026, 12:00 in Vietnam */
const NOW = new Date('2026-10-06T05:00:00.000Z');
const at = (iso: string) => new Date(iso);

function order(id: number, fields: Record<string, any>) {
  return {
    id,
    outletId: 1,
    customerId: null,
    deletedAt: null,
    orderType: 'RENT',
    status: 'RESERVED',
    totalAmount: 0,
    depositAmount: 0,
    securityDeposit: 0,
    damageFee: 0,
    lateFee: 0,
    pickupPlanAt: null,
    returnPlanAt: null,
    pickedUpAt: null,
    returnedAt: null,
    payments: [],
    createdAt: at('2026-10-01T03:00:00.000Z'),
    ...fields,
    updatedAt: fields.updatedAt ?? fields.createdAt ?? at('2026-10-01T03:00:00.000Z'),
  };
}

const pay = (amount: number, notes: string, status = 'COMPLETED') => ({ amount, notes, status });

const ORDERS = [
  // 23:59:59 Vietnam on 7 Oct → 7 Oct; collateral never counted
  order(1, { totalAmount: 300000, depositAmount: 100000, securityDeposit: 1000000, pickupPlanAt: at('2026-10-07T16:59:59.000Z') }),
  // 00:00 Vietnam on 8 Oct → 8 Oct
  order(2, { totalAmount: 150000, pickupPlanAt: at('2026-10-07T17:00:00.000Z') }),
  // Today, planned earlier this morning (before "now"): still expected today
  order(3, { totalAmount: 500000, depositAmount: 100000, securityDeposit: 300000, pickupPlanAt: at('2026-10-06T01:00:00.000Z'),
    payments: [pay(50000, 'PICKUP'), pay(30000, 'PICKUP', 'PENDING'), pay(20000, 'RETURN_ADJUSTMENT'), pay(70000, 'DEPOSIT')] }),
  // Today, already paid more than the balance at an earlier hand-over attempt: never negative
  order(4, { totalAmount: 200000, depositAmount: 150000, pickupPlanAt: at('2026-10-06T08:00:00.000Z'), payments: [pay(80000, 'PICKUP')] }),
  // No-show: pickup day 5 Oct (yesterday) — not expected money
  order(5, { totalAmount: 400000, pickupPlanAt: at('2026-10-05T16:59:59.000Z') }),
  // Cancelled, picked up, deleted, other outlet, sale: never expected
  order(6, { status: 'CANCELLED', totalAmount: 900000, pickupPlanAt: at('2026-10-08T03:00:00.000Z') }),
  order(7, { status: 'PICKUPED', totalAmount: 900000, pickupPlanAt: at('2026-10-06T03:00:00.000Z'), pickedUpAt: at('2026-10-06T03:00:00.000Z') }),
  order(8, { totalAmount: 900000, pickupPlanAt: at('2026-10-08T03:00:00.000Z'), deletedAt: at('2026-10-02T00:00:00.000Z') }),
  order(9, { outletId: 2, totalAmount: 900000, pickupPlanAt: at('2026-10-08T03:00:00.000Z') }),
  order(10, { orderType: 'SALE', status: 'COMPLETED', totalAmount: 120000, createdAt: at('2026-10-06T16:59:59.000Z') }),
  // Next month (November) for the monthly series
  order(11, { totalAmount: 260000, depositAmount: 60000, pickupPlanAt: at('2026-11-02T03:00:00.000Z'), createdAt: at('2026-09-30T16:59:59.000Z') }),
  // Created 00:00 Vietnam on 7 Oct (17:00Z on the 6th), pickup far ahead
  order(12, { totalAmount: 330000, pickupPlanAt: at('2026-12-01T03:00:00.000Z'), createdAt: at('2026-10-06T17:00:00.000Z') }),
  // Cancelled order created on 7 Oct: not in newOrderValue
  order(13, { status: 'CANCELLED', totalAmount: 777000, createdAt: at('2026-10-07T03:00:00.000Z') }),
];

const outlet1 = { outletId: { in: [1] } };

function store(orders = ORDERS) {
  const { prisma, db } = createFakeOrderStore(orders);
  const findMany = jest.fn(prisma.order.findMany as (args: any) => Promise<any[]>);
  prisma.order.findMany = findMany;
  return { prisma, db, findMany };
}

/** The #605 query: reserved orders with their PICKUP payments (the income summary's own RESERVED query has no payments) */
const isReservedQuery = (args: any) =>
  (args?.where?.status === 'RESERVED' || args?.where?.status?.equals === 'RESERVED') && !!args?.select?.payments;

function run(params: Record<string, any>, s = store()) {
  return buildAnalyticsPeriodReport(s.prisma, s.db, { limit: 5, userRole: 'MERCHANT', outletFilter: outlet1, ...params } as any);
}

const byDate = (report: any, field: string) =>
  Object.fromEntries(report.series.map((p: any) => [p.date ?? `${p.year}-${String(p.monthNumber).padStart(2, '0')}`, p[field]]));

/** The report as an old app reads it: the #605 fields removed */
function oldShape(report: any) {
  const copy = JSON.parse(JSON.stringify(report));
  for (const p of copy.series) {
    delete p.expectedCollected;
    delete p.newOrderValue;
  }
  delete copy.revenue.orderValueByType;
  return copy;
}

beforeAll(() => {
  jest.useFakeTimers({
    now: NOW,
    doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'queueMicrotask', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'hrtime', 'performance'],
  });
});
afterAll(() => jest.useRealTimers());

describe('series[].expectedCollected (daily)', () => {
  it('buckets on the Vietnam day of pickupPlanAt, today or later, without collateral', async () => {
    const report = await run({ startDate: '2026-10-04', endDate: '2026-10-09', groupBy: 'day' });
    expect(byDate(report, 'expectedCollected')).toEqual({
      '2026/10/04': 0,
      // no-show #5 (pickup day passed) is not expected
      '2026/10/05': 0,
      // #3: 500k − deposit 100k − completed PICKUP 50k (pending, return and deposit payments ignored) = 350k;
      // #4: 200k − 150k − 80k < 0 → 0; #7 already picked up
      '2026/10/06': 350000,
      // #1 at 16:59:59Z: 300k − 100k (collateral 1M not counted)
      '2026/10/07': 200000,
      // #2 at 17:00:00Z; #6 cancelled, #8 deleted, #9 other outlet
      '2026/10/08': 150000,
      '2026/10/09': 0,
    });
  });

  it('a range wholly in the past is all zero and does not query reserved orders', async () => {
    const s = store();
    const report = await run({ startDate: '2026-09-28', endDate: '2026-10-05', groupBy: 'day' }, s);
    expect(report.series.every((p: any) => p.expectedCollected === 0)).toBe(true);
    expect(s.findMany.mock.calls.filter(([args]) => isReservedQuery(args))).toHaveLength(0);
  });

  it('a range reaching today queries reserved orders once', async () => {
    const s = store();
    await run({ startDate: '2026-10-01', endDate: '2026-10-07', groupBy: 'day' }, s);
    expect(s.findMany.mock.calls.filter(([args]) => isReservedQuery(args))).toHaveLength(1);
  });

  it('counts every outlet in scope', async () => {
    const report = await run({ startDate: '2026-10-08', endDate: '2026-10-08', groupBy: 'day', outletFilter: {} });
    // #2 150k + #9 (outlet 2) 900k
    expect(report.series[0].expectedCollected).toBe(1050000);
  });
});

describe('series[].newOrderValue', () => {
  it('is the order value created per Vietnam day, cancelled excluded, and sums to totalOrderValue', async () => {
    const report = await run({ startDate: '2026-10-06', endDate: '2026-10-07', groupBy: 'day' });
    // #10 created 16:59:59Z on the 6th → 6 Oct; #12 at 17:00Z → 7 Oct; #13 cancelled
    expect(byDate(report, 'newOrderValue')).toEqual({ '2026/10/06': 120000, '2026/10/07': 330000 });
    const sum = report.series.reduce((s: number, p: any) => s + p.newOrderValue, 0);
    expect(sum).toBe(report.revenue.totalOrderValue);
  });
});

describe('monthly series', () => {
  it('sums expectedCollected and newOrderValue per Vietnam month', async () => {
    const report = await run({ startDate: '2026-09-01', endDate: '2026-12-31', groupBy: 'month' });
    expect(byDate(report, 'expectedCollected')).toEqual({
      '2026-09': 0,
      // 6 Oct 350k + 7 Oct 200k + 8 Oct 150k (no-show #5 out)
      '2026-10': 700000,
      // #11: 260k − 60k
      '2026-11': 200000,
      // #12
      '2026-12': 330000,
    });
    // #11 created 16:59:59Z on 30 Sep → September
    expect(byDate(report, 'newOrderValue')['2026-09']).toBe(260000);
    const sum = report.series.reduce((s: number, p: any) => s + p.newOrderValue, 0);
    expect(sum).toBe(report.revenue.totalOrderValue);
  });
});

describe('revenue.orderValueByType', () => {
  it('splits totalOrderValue into rent and sale', async () => {
    const report = await run({ startDate: '2026-10-01', endDate: '2026-10-07', groupBy: 'day' });
    const byType = (report.revenue as any).orderValueByType;
    // rent: #1..#9 created 1 Oct in outlet 1 except cancelled #6 and deleted #8 → #1,#2,#3,#4,#5,#7 + #12; sale #10
    expect(byType).toEqual({
      rent: { amount: 300000 + 150000 + 500000 + 200000 + 400000 + 900000 + 330000, orders: 7 },
      sale: { amount: 120000, orders: 1 },
    });
    expect(byType.rent.amount + byType.sale.amount).toBe(report.revenue.totalOrderValue);
  });
});

describe('old fields are untouched', () => {
  it('futureIncome stays 0 on daily points', async () => {
    const report = await run({ startDate: '2026-10-04', endDate: '2026-10-09', groupBy: 'day' });
    expect(report.series.map((p: any) => p.futureIncome)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('series points and revenue keep exactly the old keys plus the new ones', async () => {
    const report = await run({ startDate: '2026-10-04', endDate: '2026-10-09', groupBy: 'day' });
    expect(Object.keys(report.series[0]).sort()).toEqual(
      ['collected', 'date', 'dateISO', 'dayNumber', 'expectedCollected', 'futureIncome', 'month', 'newOrderCount', 'newOrderValue', 'orderCount', 'realIncome', 'year'].sort()
    );
    expect(Object.keys(report.revenue).sort()).toEqual(
      ['collateralFlow', 'collected', 'collectedBreakdown', 'orderValueByType', 'outstanding', 'outstandingBreakdown', 'totalActualRevenue', 'totalOrderValue', 'totalOrders', 'totalRevenue'].sort()
    );
  });
});

describe('failure isolation', () => {
  it('a failing reserved-orders query leaves expectedCollected out and every other field as it was', async () => {
    const ok = await run({ startDate: '2026-10-04', endDate: '2026-10-09', groupBy: 'day' });
    const s = store();
    const real = s.findMany.getMockImplementation()!;
    s.findMany.mockImplementation(async (args: any) => {
      if (isReservedQuery(args)) throw new Error('db down');
      return real(args);
    });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const report = await run({ startDate: '2026-10-04', endDate: '2026-10-09', groupBy: 'day' }, s);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    expect(report.series.every((p: any) => !('expectedCollected' in p))).toBe(true);
    expect(report.series.map((p: any) => p.newOrderValue)).toEqual(ok.series.map((p: any) => p.newOrderValue));
    expect(oldShape(report)).toEqual(oldShape(ok));
  });

  it('a failing order-value query leaves newOrderValue and orderValueByType out, like totalOrderValue', async () => {
    const s = store();
    const real = s.findMany.getMockImplementation()!;
    s.findMany.mockImplementation(async (args: any) => {
      // the order-value query (orders created in a period), not the reserved-orders one
      if (!isReservedQuery(args) && args?.where?.createdAt && args?.select?.depositAmount && !args?.select?.securityDeposit) {
        throw new Error('db down');
      }
      return real(args);
    });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const report = await run({ startDate: '2026-10-04', endDate: '2026-10-09', groupBy: 'day' }, s);
    spy.mockRestore();
    expect(report.revenue.totalOrderValue).toBeUndefined();
    expect((report.revenue as any).orderValueByType).toBeUndefined();
    expect(report.series.every((p: any) => !('newOrderValue' in p))).toBe(true);
    expect(report.series.length).toBe(6);
  });
});
