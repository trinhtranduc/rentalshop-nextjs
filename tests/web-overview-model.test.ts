/**
 * #514 shop web Tổng quan: period ranges, KPIs, today's work and rows.
 * Day logic must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  buildKpis,
  buildMoney,
  buildTodayRows,
  buildTodayWork,
  chartBars,
  chartRange,
  formatDayLabel,
  formatRangeLabel,
  periodRange,
  progressPercent,
  toGrowth,
  type OutletOpsLike,
} from '../apps/client/app/dashboard/overview-model';
import { getLocalDateKey } from '../packages/utils/src/core/date';

const VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

describe('periodRange', () => {
  it('builds today, 7 days and month as Vietnam day keys', () => {
    expect(periodRange('today', '2026-10-06')).toEqual({ startDate: '2026-10-06', endDate: '2026-10-06' });
    expect(periodRange('7d', '2026-10-03')).toEqual({ startDate: '2026-09-27', endDate: '2026-10-03' });
    expect(periodRange('month', '2026-02-14')).toEqual({ startDate: '2026-02-01', endDate: '2026-02-28' });
    expect(periodRange('month', '2028-02-29')).toEqual({ startDate: '2028-02-01', endDate: '2028-02-29' });
    expect(periodRange('month', '2026-12-31')).toEqual({ startDate: '2026-12-01', endDate: '2026-12-31' });
  });

  it('swaps a reversed custom range and ignores broken keys', () => {
    expect(periodRange('custom', '2026-10-06', { from: '2026-10-05', to: '2026-09-01' })).toEqual({
      startDate: '2026-09-01',
      endDate: '2026-10-05',
    });
    expect(periodRange('custom', '2026-10-06', { from: '2026-02-30', to: 'x' })).toEqual({
      startDate: '2026-10-06',
      endDate: '2026-10-06',
    });
    expect(periodRange('custom', '2026-10-06', { from: '2026-10-01' })).toEqual({
      startDate: '2026-10-01',
      endDate: '2026-10-01',
    });
  });

  it('charts 7 days back and 7 days ahead for Hôm nay, so forecasts show (#610)', () => {
    expect(chartRange('today', { startDate: '2026-10-06', endDate: '2026-10-06' })).toEqual({
      startDate: '2026-09-30',
      endDate: '2026-10-13',
    });
    // month and year edges stay on calendar days
    expect(chartRange('today', { startDate: '2026-12-28', endDate: '2026-12-28' })).toEqual({
      startDate: '2026-12-22',
      endDate: '2027-01-04',
    });
  });

  it('charts the last 7 days for a custom single day', () => {
    expect(chartRange('custom', { startDate: '2026-10-06', endDate: '2026-10-06' })).toEqual({
      startDate: '2026-09-30',
      endDate: '2026-10-06',
    });
    const month = { startDate: '2026-10-01', endDate: '2026-10-31' };
    expect(chartRange('month', month)).toBe(month);
  });
});

describe('day labels', () => {
  it('names the weekday of the key, not of the machine clock', () => {
    expect(formatDayLabel('2026-10-06', VI)).toBe('T3 06/10');
    expect(formatDayLabel('2026-09-27', VI)).toBe('CN 27/09');
    expect(formatRangeLabel({ startDate: '2026-09-27', endDate: '2026-10-03' }, VI)).toBe('CN 27/09 – T7 03/10');
  });
});

describe('KPIs', () => {
  const report = {
    operational: { orderCounts: { new: 18 } },
    revenue: {
      totalOrderValue: 15_800_000,
      outstanding: 3_350_000,
      outstandingBreakdown: { atPickup: { amount: 2_650_000, orders: 9 }, overduePickup: { amount: 700_000, orders: 2 } },
      collected: 12_450_000,
      collectedBreakdown: { deposits: 2_100_000, pickupAndSale: 9_650_000, fees: 900_000, refunds: 200_000 },
      collateralFlow: { received: 3_000_000, returned: 1_400_000 },
    },
    growth: { collected: { growth: 5.2 }, orderValue: { growth: -8 } },
  };

  it('maps the period report to the four cards', () => {
    expect(buildKpis(report)).toEqual({
      orderValue: 15_800_000,
      orderValueGrowth: { kind: 'pct', value: 8, up: false },
      newOrders: 18,
      collected: 12_450_000,
      collectedGrowth: { kind: 'pct', value: 5, up: true },
      outstanding: 3_350_000,
      overduePickup: 700_000,
      netReceived: 14_050_000,
    });
  });

  it('keeps missing numbers missing instead of 0', () => {
    const k = buildKpis({ revenue: { collected: 100 } });
    expect(k.orderValue).toBeNull();
    expect(k.netReceived).toBeNull();
    expect(k.overduePickup).toBe(0);
    expect(buildKpis(null).collected).toBeNull();
  });

  it('shows "new" for a jump from an empty period', () => {
    expect(toGrowth(1000)).toEqual({ kind: 'new' });
    expect(toGrowth(0)).toEqual({ kind: 'none' });
    expect(toGrowth(null)).toEqual({ kind: 'none' });
  });

  it('breaks money down with refunds subtracted', () => {
    const money = buildMoney(report);
    expect(money.collected).toEqual({ deposits: 2_100_000, pickupAndSale: 9_650_000, fees: 900_000, refunds: 200_000, total: 12_450_000 });
    expect(money.outstanding?.total).toBe(3_350_000);
    expect(money.collateral).toEqual({ received: 3_000_000, returned: 1_400_000 });
    expect(buildMoney({ revenue: {} })).toEqual({ collected: null, outstanding: null, collateral: null });
  });
});

describe('chartBars', () => {
  it('reads day keys from slashed dates and highlights the last bar', () => {
    const bars = chartBars(
      [
        { date: '2026/10/05', collected: 500, realIncome: 900, orderCount: 3, newOrderCount: 2 },
        { date: '2026/10/06', realIncome: 1000, orderCount: 4 },
      ],
      'collected',
      VI,
    );
    expect(bars.map((b) => [b.key, b.label, b.value, b.ratio, b.current])).toEqual([
      ['2026-10-05', 'T2 05/10', 500, 0.5, false],
      ['2026-10-06', 'T3 06/10', 1000, 1, true],
    ]);
    expect(chartBars([{ month: '09/26', orderCount: 0 }], 'orders', VI)[0]).toMatchObject({ label: '09/26', ratio: 0 });
  });

  it('highlights today inside a month and shortens long-range labels', () => {
    const month = Array.from({ length: 31 }, (_, i) => ({ date: `2026/10/${String(i + 1).padStart(2, '0')}`, collected: i }));
    const bars = chartBars(month, 'collected', VI, '2026-10-06');
    expect(bars.filter((b) => b.current).map((b) => b.key)).toEqual(['2026-10-06']);
    expect(bars[0].label).toBe('01/10');
    expect(chartBars(month.slice(0, 7), 'collected', VI, '2026-12-01').map((b) => b.current)).toEqual([false, false, false, false, false, false, true]);
  });
});

describe('today', () => {
  const order = (id: number, extra: Partial<OutletOpsLike['pickupsToday']['orders'][number]> = {}) => ({
    id,
    orderNumber: String(100000 + id),
    customerName: `Khách ${id}`,
    pickupPlanAt: null,
    returnPlanAt: null,
    isReadyToDeliver: true,
    ...extra,
  });
  const ops: OutletOpsLike = {
    date: '2026-10-06',
    pickupsToday: {
      count: 2,
      orders: [
        // 17:00Z on Oct 5 is 00:00 on Oct 6 in Vietnam
        order(1, { pickupPlanAt: '2026-10-05T17:00:00.000Z', returnPlanAt: '2026-10-08T03:00:00.000Z', amountDue: 300_000 }),
        order(2, { isReadyToDeliver: false, amountDue: 0 }),
      ],
    },
    returnsToday: { count: 1, orders: [order(3, { refundDue: 500_000 })] },
    overdueReturns: {
      count: 2,
      orders: [order(4, { lateDays: 4, amountDue: 320_000, returnPlanAt: '2026-10-02T03:00:00.000Z' }), order(3)],
    },
    noShows: { count: 2, orders: [] },
    doneToday: { pickups: 3, returns: 1 },
    tomorrow: null,
    tomorrowPickups: { count: 4, orders: [] },
    tomorrowReturns: { count: 2, orders: [] },
  };

  it('counts what is left, done and tomorrow', () => {
    expect(buildTodayWork(ops)).toEqual({
      dateKey: '2026-10-06',
      pickups: { left: 2, done: 3, total: 5 },
      returns: { left: 1, done: 1, total: 2 },
      overdueReturns: 2,
      noShows: 2,
      tomorrow: { dateKey: '2026-10-07', pickups: 4, returns: 2 },
    });
    expect(progressPercent(2, 5)).toBe(40);
    expect(progressPercent(0, 0)).toBe(0);
  });

  it('lists pickups, then returns, then late returns, each order once, on Vietnam days', () => {
    const rows = buildTodayRows(ops, getLocalDateKey);
    expect(rows.map((r) => [r.id, r.kind, r.lateDays, r.notPrepared, r.money])).toEqual([
      [1, 'pickup', 0, false, { kind: 'collect', amount: 300_000 }],
      [2, 'pickup', 0, true, null],
      [3, 'return', 0, false, { kind: 'refund', amount: 500_000 }],
      [4, 'return', 4, false, { kind: 'fee', amount: 320_000 }],
    ]);
    expect(rows[0].pickupKey).toBe('2026-10-06');
    expect(rows[0].returnKey).toBe('2026-10-08');
    expect(rows[3].returnKey).toBe('2026-10-02');
  });
});
