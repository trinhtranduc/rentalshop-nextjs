/**
 * #827 — GET /api/analytics/period `byOutlet=1` and the `outletIds` narrowing.
 *
 * - byOutlet: one row per outlet in scope, computed with the same rules as the totals (cancelled left out,
 *   Vietnam civil days), so the rows add up to revenue.totalOrderValue / collected / cashCollected / outstanding
 *   and to the orders of orderValueByType. collateralHeldOrders = RENT orders PICKUPED now (as cash.depositsHeld).
 * - narrowAnalyticsOutletFilter: MERCHANT may narrow to its own outlets only (403 otherwise); outlet roles and
 *   ADMIN ignore the param; a malformed list is a 400.
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

import {
  buildAnalyticsPeriodReport,
  narrowAnalyticsOutletFilter,
} from '../../../packages/utils/src/analytics/period-report';

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
    pickupTotalAmount: null,
    pickupPlanAt: null,
    returnPlanAt: null,
    pickedUpAt: null,
    returnedAt: null,
    payments: [],
    createdAt: at('2026-10-06T03:00:00.000Z'),
    ...fields,
    updatedAt: fields.updatedAt ?? fields.createdAt ?? at('2026-10-06T03:00:00.000Z'),
  };
}

const ORDERS = [
  // Outlet 1 — 23:59:59 Vietnam on 6 Oct: counts on 6 Oct
  order(1, { totalAmount: 300000, depositAmount: 100000, pickupPlanAt: at('2026-10-08T03:00:00.000Z'), createdAt: at('2026-10-06T16:59:59.000Z') }),
  order(2, { orderType: 'SALE', status: 'COMPLETED', totalAmount: 120000 }),
  // Created 5 Oct, picked up 6 Oct with collateral 500k: collected on 6 Oct, held now
  order(3, {
    status: 'PICKUPED', totalAmount: 200000, depositAmount: 50000, securityDeposit: 500000,
    createdAt: at('2026-10-05T03:00:00.000Z'), pickupPlanAt: at('2026-10-06T02:00:00.000Z'),
    pickedUpAt: at('2026-10-06T02:00:00.000Z'), returnPlanAt: at('2026-10-09T02:00:00.000Z'),
  }),
  // Cancelled: never counted
  order(4, { status: 'CANCELLED', totalAmount: 900000, depositAmount: 300000 }),
  // Outlet 2 — 00:00 Vietnam on 7 Oct: not on 6 Oct
  order(5, { outletId: 2, totalAmount: 400000, depositAmount: 100000, pickupPlanAt: at('2026-10-09T03:00:00.000Z'), createdAt: at('2026-10-06T17:00:00.000Z') }),
  order(6, { outletId: 2, orderType: 'SALE', status: 'RESERVED', totalAmount: 50000 }),
  order(7, {
    outletId: 2, status: 'PICKUPED', totalAmount: 100000, depositAmount: 100000, securityDeposit: 200000,
    createdAt: at('2026-10-01T03:00:00.000Z'), pickedUpAt: at('2026-10-02T03:00:00.000Z'), returnPlanAt: at('2026-10-10T03:00:00.000Z'),
  }),
  // Outlet 3 (another shop): never in scope
  order(8, { outletId: 3, orderType: 'SALE', status: 'COMPLETED', totalAmount: 999000 }),
];

const OUTLET_NAMES = [
  { id: 1, name: 'Main Branch' },
  { id: 2, name: 'Outlet 2' },
];

function store() {
  const { prisma, db } = createFakeOrderStore(ORDERS);
  prisma.outlet.findMany = async (args: any) => OUTLET_NAMES.filter((o) => args?.where?.id?.in?.includes(o.id));
  return { prisma, db };
}

function run(params: Record<string, any>) {
  const s = store();
  return buildAnalyticsPeriodReport(s.prisma, s.db, {
    limit: 5,
    userRole: 'MERCHANT',
    groupBy: 'day',
    outletFilter: { outletId: { in: [1, 2] } },
    ...params,
  } as any);
}

const sum = (rows: any[], field: string) => rows.reduce((s, r) => s + r[field], 0);

beforeAll(() => {
  jest.useFakeTimers({
    now: NOW,
    doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'queueMicrotask', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'hrtime', 'performance'],
  });
});
afterAll(() => jest.useRealTimers());

describe('byOutlet (#827)', () => {
  it('is left out unless asked for', async () => {
    const report: any = await run({ startDate: '2026-10-06', endDate: '2026-10-06' });
    expect(report).not.toHaveProperty('byOutlet');
  });

  it('one row per outlet, with its name, on Vietnam days, cancelled left out', async () => {
    const report: any = await run({ startDate: '2026-10-06', endDate: '2026-10-06', byOutletIds: [1, 2] });
    expect(report.byOutlet.map((r: any) => [r.outletId, r.outletName])).toEqual([
      [1, 'Main Branch'],
      [2, 'Outlet 2'],
    ]);
    const [one, two] = report.byOutlet;
    // #1 (16:59:59Z = 6 Oct) + #2; #4 cancelled; #3 created 5 Oct
    expect(one.orderValue).toBe(420000);
    expect(one.newOrders).toBe(2);
    // #1 owes 300k − 100k
    expect(one.outstanding).toBe(200000);
    // #6 only: #5 at 17:00Z is 7 Oct
    expect(two.orderValue).toBe(50000);
    expect(two.newOrders).toBe(1);
    expect(two.outstanding).toBe(50000);
    // RENT PICKUPED now: #3 and #7
    expect(one.collateralHeldOrders).toBe(1);
    expect(two.collateralHeldOrders).toBe(1);
  });

  it('rows add up to the totals', async () => {
    for (const [startDate, endDate] of [
      ['2026-10-06', '2026-10-06'],
      ['2026-10-01', '2026-10-07'],
      ['2026-10-01', '2026-10-31'],
    ]) {
      const report: any = await run({ startDate, endDate, byOutletIds: [1, 2] });
      const rows = report.byOutlet;
      expect(sum(rows, 'orderValue')).toBe(report.revenue.totalOrderValue);
      expect(sum(rows, 'outstanding')).toBe(report.revenue.outstanding);
      expect(sum(rows, 'collected')).toBe(report.revenue.collected);
      expect(sum(rows, 'cashCollected')).toBe(report.revenue.cashCollected);
      const byType = report.revenue.orderValueByType;
      expect(sum(rows, 'newOrders')).toBe(byType.rent.orders + byType.sale.orders);
    }
  });

  it('collected and cashCollected follow the events of the day (collateral only in cashCollected)', async () => {
    const report: any = await run({ startDate: '2026-10-06', endDate: '2026-10-06', byOutletIds: [1, 2] });
    const one = report.byOutlet[0];
    expect(one.cashCollected - one.collected).toBe(500000);
    expect(report.byOutlet[1].cashCollected).toBe(report.byOutlet[1].collected);
  });

  it('only the outlets in scope', async () => {
    const report: any = await run({
      startDate: '2026-10-01',
      endDate: '2026-10-07',
      outletFilter: { outletId: { in: [2] } },
      byOutletIds: [2],
    });
    expect(report.byOutlet).toHaveLength(1);
    expect(report.byOutlet[0].orderValue).toBe(report.revenue.totalOrderValue);
    // #5 (7 Oct) + #6 + #7 (1 Oct)
    expect(report.byOutlet[0].orderValue).toBe(550000);
  });
});

describe('narrowAnalyticsOutletFilter (#827)', () => {
  const merchantBase = { outletId: { in: [1, 2, 5] } };

  it('no param: the scope as it was', () => {
    expect(narrowAnalyticsOutletFilter(merchantBase, 'MERCHANT', null)).toEqual({ ok: true, filter: merchantBase, outletIds: [1, 2, 5] });
    expect(narrowAnalyticsOutletFilter(merchantBase, 'MERCHANT', '')).toEqual({ ok: true, filter: merchantBase, outletIds: [1, 2, 5] });
  });

  it('merchant: narrows to its own outlets, each once', () => {
    expect(narrowAnalyticsOutletFilter(merchantBase, 'MERCHANT', '5,1,5')).toEqual({
      ok: true,
      filter: { outletId: { in: [5, 1] } },
      outletIds: [5, 1],
    });
  });

  it("merchant: another shop's outlet is a 403", () => {
    expect(narrowAnalyticsOutletFilter(merchantBase, 'MERCHANT', '1,99')).toEqual({
      ok: false,
      status: 403,
      code: 'CROSS_MERCHANT_ACCESS_DENIED',
    });
  });

  it('merchant: a malformed list is a 400', () => {
    for (const raw of ['a', '1,,2', '1;2', '-1', '0']) {
      expect(narrowAnalyticsOutletFilter(merchantBase, 'MERCHANT', raw)).toEqual({ ok: false, status: 400, code: 'INVALID_QUERY' });
    }
  });

  it('outlet roles stay on their outlet; the param is ignored', () => {
    for (const role of ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY']) {
      expect(narrowAnalyticsOutletFilter({ outletId: 3 }, role, '1,2')).toEqual({ ok: true, filter: { outletId: 3 }, outletIds: [3] });
    }
  });

  it('admin ignores it; a user without scope keeps the empty report', () => {
    expect(narrowAnalyticsOutletFilter({}, 'ADMIN', '1')).toEqual({ ok: true, filter: {}, outletIds: null });
    expect(narrowAnalyticsOutletFilter(null, 'MERCHANT', '1')).toEqual({ ok: true, filter: null, outletIds: null });
  });
});
