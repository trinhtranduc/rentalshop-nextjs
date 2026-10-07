/**
 * #604 shop web Tổng quan redesign: tiles, chips, sparklines, drawer kinds and drawer rows.
 * Pure mapping; must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  buildMoney,
  buildTiles,
  chartBars,
  collateralRows,
  forecastBar,
  futureQuickRanges,
  growthChip,
  initials,
  outstandingSplit,
  parseDetail,
  sparkPoints,
  topBars,
  toGrowth,
  waterfallRows,
  type PeriodReportLike,
} from '../apps/client/app/dashboard/overview-model';

const report: PeriodReportLike = {
  operational: { orderCounts: { new: 11 } },
  revenue: {
    totalOrderValue: 18_650_000,
    outstanding: 11_590_000,
    outstandingBreakdown: { atPickup: { amount: 10_740_000, orders: 3 }, overduePickup: { amount: 850_000, orders: 1 } },
    collected: 12_420_000,
    collectedBreakdown: { deposits: 2_810_000, pickupAndSale: 10_360_000, fees: 450_000, refunds: 1_200_000 },
    collateralFlow: { received: 7_670_000, returned: 1_280_000 },
  },
  growth: { collected: { growth: 8.4 }, orderValue: { growth: -12.6 } },
};
const cash = {
  depositsHeld: { securityDeposit: 5_000_000, orders: 11 },
  collateralToCollect: { securityDeposit: 7_670_000, orders: 8 },
  collateralToReturn: { securityDeposit: 1_280_000, orders: 3 },
};

describe('parseDetail', () => {
  it('accepts the four kinds and nothing else', () => {
    expect(parseDetail('collected')).toBe('collected');
    expect(parseDetail('orderValue')).toBe('orderValue');
    expect(parseDetail('outstanding')).toBe('outstanding');
    expect(parseDetail('collateral')).toBe('collateral');
    expect(parseDetail('')).toBeNull();
    expect(parseDetail(null)).toBeNull();
    expect(parseDetail('toString')).toBeNull();
    expect(parseDetail('Collected')).toBeNull();
  });
});

describe('buildTiles', () => {
  it('orders the tiles and fills value and chip from the report and cash', () => {
    const tiles = buildTiles(report, cash);
    expect(tiles.map((t) => t.kind)).toEqual(['orderValue', 'collected', 'outstanding', 'collateral']);
    expect(tiles[0]).toEqual({ kind: 'orderValue', value: 18_650_000, signed: false, chip: { tone: 'down', key: 'home.tiles.down', values: { value: 13 } } });
    expect(tiles[1].chip).toEqual({ tone: 'up', key: 'home.tiles.up', values: { value: 8 } });
    expect(tiles[2]).toMatchObject({ value: 11_590_000, chip: { tone: 'warn', key: 'home.tiles.overdue', values: { count: 1 } } });
    // Thế chân = received − returned, signed
    expect(tiles[3]).toEqual({ kind: 'collateral', value: 6_390_000, signed: true, chip: { tone: 'info', key: 'home.tiles.held', values: { count: 11 } } });
  });

  it('says how many orders wait for pickup when none is overdue', () => {
    const r = { ...report, revenue: { ...report.revenue, outstandingBreakdown: { atPickup: { amount: 500, orders: 2 }, overduePickup: { amount: 0, orders: 0 } } } };
    expect(buildTiles(r, null)[2].chip).toEqual({ tone: 'info', key: 'home.tiles.waiting', values: { count: 2 } });
  });

  it('invents nothing without data', () => {
    const tiles = buildTiles(null, null);
    expect(tiles.map((t) => t.value)).toEqual([null, null, null, null]);
    expect(tiles.map((t) => t.chip)).toEqual([null, null, null, null]);
    expect(buildTiles(report, { depositsHeld: { orders: 0 } })[3].chip).toBeNull();
  });

  it('can go negative on collateral when more was returned than received', () => {
    const r = { ...report, revenue: { ...report.revenue, collateralFlow: { received: 447, returned: 674 } } };
    expect(buildTiles(r)[3].value).toBe(-227);
  });
});

describe('growthChip', () => {
  it('maps growth to a chip', () => {
    expect(growthChip(toGrowth(null))).toBeNull();
    expect(growthChip(toGrowth(0))).toBeNull();
    expect(growthChip(toGrowth(5000))).toEqual({ tone: 'up', key: 'home.kpi.new' });
    expect(growthChip(toGrowth(-40))).toEqual({ tone: 'down', key: 'home.tiles.down', values: { value: 40 } });
  });
});

describe('sparkPoints', () => {
  it('scales to the box with a 2 px inset, oldest on the left', () => {
    expect(sparkPoints([0, 10, 5], 96, 28)).toBe('0.0,26.0 48.0,2.0 96.0,14.0');
  });
  it('needs two points; a flat series sits in the middle', () => {
    expect(sparkPoints([])).toBeNull();
    expect(sparkPoints([7])).toBeNull();
    expect(sparkPoints([3, 3], 10, 20)).toBe('0.0,10.0 10.0,10.0');
  });
  it('drops non-finite values', () => {
    expect(sparkPoints([NaN, 1, Infinity, 2], 10, 8)).toBe('0.0,6.0 10.0,2.0');
  });
});

describe('waterfallRows', () => {
  it('steps up three times, down for refunds, then the total from zero', () => {
    const rows = waterfallRows(buildMoney(report).collected);
    const max = 2_810_000 + 10_360_000 + 450_000;
    const pct = (v: number) => (v / max) * 100;
    expect(rows.map((r) => r.key)).toEqual(['deposits', 'pickupAndSale', 'fees', 'refunds', 'total']);
    expect(rows[0]).toMatchObject({ amount: 2_810_000, negative: false, total: false });
    expect(rows[0].left).toBeCloseTo(0);
    expect(rows[1].left).toBeCloseTo(pct(2_810_000));
    expect(rows[1].width).toBeCloseTo(pct(10_360_000));
    expect(rows[3]).toMatchObject({ amount: -1_200_000, negative: true });
    expect(rows[3].left).toBeCloseTo(pct(12_420_000));
    expect(rows[3].width).toBeCloseTo(pct(1_200_000));
    expect(rows[4]).toMatchObject({ amount: 12_420_000, total: true });
    expect(rows[4].left).toBeCloseTo(0);
    expect(rows[4].width).toBeCloseTo(pct(12_420_000));
  });

  it('keeps every bar inside the track when refunds exceed takings', () => {
    const rows = waterfallRows({ deposits: 953, pickupAndSale: 6003, fees: 0, refunds: 3_603_799, total: -3_596_843 });
    for (const r of rows) {
      expect(r.left).toBeGreaterThanOrEqual(-1e-9);
      expect(r.left + r.width).toBeLessThanOrEqual(100 + 1e-9);
    }
    expect(rows[4]).toMatchObject({ negative: true, total: true });
    expect(rows[4].left).toBeCloseTo(0);
  });

  it('is empty without a breakdown', () => {
    expect(waterfallRows(null)).toEqual([]);
  });
});

describe('outstandingSplit', () => {
  it('splits the bar by amount and keeps the order counts', () => {
    const s = outstandingSplit(buildMoney(report).outstanding)!;
    expect(s.atPickup).toMatchObject({ amount: 10_740_000, orders: 3 });
    expect(s.atPickup.pct).toBeCloseTo(92.67, 1);
    expect(s.overdue).toMatchObject({ amount: 850_000, orders: 1 });
    expect(s.atPickup.pct + s.overdue.pct).toBeCloseTo(100);
  });
  it('handles zero and missing', () => {
    expect(outstandingSplit(null)).toBeNull();
    const z = outstandingSplit({ atPickup: { amount: 0, orders: 0 }, overduePickup: { amount: 0, orders: 0 }, total: 0 })!;
    expect([z.atPickup.pct, z.overdue.pct]).toEqual([0, 0]);
  });
});

describe('collateralRows', () => {
  it('lists received, returned, then the hatched upcoming rows with counts', () => {
    const rows = collateralRows(buildMoney(report).collateral, cash);
    expect(rows.map((r) => [r.key, r.amount, r.orders, r.upcoming])).toEqual([
      ['received', 7_670_000, null, false],
      ['returned', 1_280_000, null, false],
      ['toCollect', 7_670_000, 8, true],
      ['toReturn', 1_280_000, 3, true],
    ]);
    expect(rows[0].width).toBe(100);
    expect(rows[1].width).toBeCloseTo((1_280_000 / 7_670_000) * 100);
  });
  it('leaves out what is unknown', () => {
    expect(collateralRows(null, null)).toEqual([]);
    expect(collateralRows({ received: 0, returned: 0 }, null).map((r) => r.width)).toEqual([0, 0]);
  });
});

describe('initials', () => {
  it('takes first and last word letters', () => {
    expect(initials('Nguyễn Thị Lan')).toBe('NL');
    expect(initials('  lê   hoàng ')).toBe('LH');
    expect(initials('Đức')).toBe('Đ');
    expect(initials('')).toBe('#');
    expect(initials(null)).toBe('#');
  });
});

describe('forecast (optional, fed by a later API change)', () => {
  const VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const series = [
    { date: '2026/10/06', collected: 100 },
    { date: '2026/10/07', collected: 300, forecast: 100 },
    { date: '2026/10/08', collected: 0, forecast: 200 },
  ];

  it('stacks forecast on collected bars, scales by the sum and marks today', () => {
    const bars = chartBars(series, 'collected', VI, '2026-10-07');
    expect(bars.map((b) => [b.key, b.value, b.forecast, b.ratio, b.forecastRatio, b.isToday])).toEqual([
      ['2026-10-06', 100, 0, 0.25, 0, false],
      ['2026-10-07', 300, 100, 1, 0.25, true],
      ['2026-10-08', 0, 200, 0.5, 0.5, false],
    ]);
  });

  it('is zero everywhere when the API sends none, and never in the orders view', () => {
    const plain = chartBars([{ date: '2026/10/07', collected: 5 }], 'collected', VI, '2026-10-07');
    expect(plain[0]).toMatchObject({ forecast: 0, forecastRatio: 0, ratio: 1, isToday: true });
    expect(chartBars(series, 'orders', VI, '2026-10-07').every((b) => b.forecast === 0)).toBe(true);
    expect(chartBars(series, 'collected', VI, '2026-12-01').some((b) => b.isToday)).toBe(false);
  });

  it('sums the forecast of every day in the range from today on (#612)', () => {
    expect(forecastBar(300, series, '2026-10-07')).toEqual({ collected: 300, forecast: 300, pct: 50, until: '2026-10-08' });
    // a range that ends today: only today
    expect(forecastBar(300, series.slice(0, 2), '2026-10-07')).toEqual({ collected: 300, forecast: 100, pct: 75, until: '2026-10-07' });
    // past days never count, even if the API sent something for them
    expect(forecastBar(300, series, '2026-10-08')).toEqual({ collected: 300, forecast: 200, pct: 60, until: '2026-10-08' });
    expect(forecastBar(null, series, '2026-10-07')).toBeNull();
    expect(forecastBar(300, [{ date: '2026/10/07', collected: 300 }], '2026-10-07')).toBeNull();
  });

  it('offers future quick ranges for the custom picker (#612)', () => {
    expect(futureQuickRanges('2026-10-07')).toEqual([
      { key: 'next7', from: '2026-10-07', to: '2026-10-13' },
      { key: 'next30', from: '2026-10-07', to: '2026-11-05' },
      { key: 'nextMonth', from: '2026-11-01', to: '2026-11-30' },
    ]);
    expect(futureQuickRanges('2026-12-31')[2]).toEqual({ key: 'nextMonth', from: '2027-01-01', to: '2027-01-31' });
    expect(futureQuickRanges('2028-01-31')[2]).toEqual({ key: 'nextMonth', from: '2028-02-01', to: '2028-02-29' });
  });

  it('reads the API field series[].expectedCollected (#605) as the forecast', () => {
    const api = [
      { date: '2026/10/07', collected: 300, expectedCollected: 100 },
      { date: '2026/10/08', collected: 0, expectedCollected: 200 },
    ];
    expect(chartBars(api, 'collected', VI, '2026-10-07').map((b) => b.forecast)).toEqual([100, 200]);
    // #612: the tile sums the range from today on (was today only)
    expect(forecastBar(300, api, '2026-10-07')).toEqual({ collected: 300, forecast: 300, pct: 50, until: '2026-10-08' });
  });
});

describe('topBars', () => {
  it('keeps the API order, max 5, widths against the highest value', () => {
    const products = [
      { id: 1, name: 'A', rentalCount: 3, totalRevenue: 1000 },
      { id: 2, name: 'B', rentalCount: 9, totalRevenue: 500 },
      { id: 3, name: 'C', totalRevenue: null },
      { id: 4, name: 'D', rentalCount: 1, totalRevenue: 250 },
      { id: 5, name: 'E', rentalCount: 1, totalRevenue: 100 },
      { id: 6, name: 'F', rentalCount: 1, totalRevenue: 50 },
    ];
    const bars = topBars(products);
    expect(bars.map((b) => [b.name, b.rentals, b.value, b.width])).toEqual([
      ['A', 3, 1000, 100],
      ['B', 9, 500, 50],
      ['C', 0, 0, 0],
      ['D', 1, 250, 25],
      ['E', 1, 100, 10],
    ]);
    expect(topBars(null)).toEqual([]);
  });
});
