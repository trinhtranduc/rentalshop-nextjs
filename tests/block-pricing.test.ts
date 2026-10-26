/**
 * #1189 day-block pricing: the pure calculator, its golden numbers (shared with iOS / Android),
 * and the days it is fed by (Vietnam civil days, same-day pickup and return = 1).
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import golden from './fixtures/block-pricing-golden.json';
import {
  calculateBlockRent,
  calculateBlockRentDetail,
  calculateBlockRentForTable,
  currencyMinorUnit,
  isValidBlockTable,
  isCompleteBlockTable,
  roundToMinorUnit,
} from '../packages/utils/src/core/block-pricing';
import { countRentalDays } from '../packages/utils/src/core/rental-days';

type GoldenTable = { tiers: number[]; startDay: number; extraMode: string; extraPrice: number | null; currency: string };
const tables = golden.tables as Record<string, GoldenTable>;

describe('golden numbers (same file on iOS / Android)', () => {
  it.each(golden.cases)('$table, $days day(s) = $total', ({ table, days, total }) => {
    const t = tables[table];
    expect(calculateBlockRent(t.tiers, t.startDay, t.extraMode, t.extraPrice, days, currencyMinorUnit(t.currency))).toBe(total);
  });
});

describe('calculateBlockRent', () => {
  const T = [80000, 100000, 120000];
  it('1, 3 and 5 days with +20.000 per extra day', () => {
    expect(calculateBlockRent(T, 1, 'EXTRA_PER_DAY', 20000, 1)).toBe(80000);
    expect(calculateBlockRent(T, 1, 'EXTRA_PER_DAY', 20000, 3)).toBe(120000);
    expect(calculateBlockRent(T, 1, 'EXTRA_PER_DAY', 20000, 5)).toBe(160000);
  });

  it('beyond the last tier: HOLD_LAST keeps the last tier price', () => {
    expect(calculateBlockRent(T, 1, 'HOLD_LAST', null, 30)).toBe(120000);
  });

  it('EXTRA_PER_DAY with a missing extra price adds nothing', () => {
    expect(calculateBlockRent(T, 1, 'EXTRA_PER_DAY', null, 6)).toBe(120000);
  });

  it('a missing mode and start day mean EXTRA_PER_DAY from day 1', () => {
    expect(calculateBlockRent(T, null, null, 20000, 4)).toBe(140000);
    expect(calculateBlockRent(T, undefined, undefined, 20000, 4)).toBe(140000);
  });

  it('days below 1 or not a number count as 1', () => {
    expect(calculateBlockRent(T, 1, 'HOLD_LAST', null, 0)).toBe(80000);
    expect(calculateBlockRent(T, 1, 'HOLD_LAST', null, -3)).toBe(80000);
    expect(calculateBlockRent(T, 1, 'HOLD_LAST', null, NaN)).toBe(80000);
  });

  it('a table that starts at day 2: fewer days cost the first tier', () => {
    expect(calculateBlockRent([150000, 200000], 2, 'EXTRA_PER_DAY', 50000, 1)).toBe(150000);
  });

  it('a 31-day table is the largest allowed', () => {
    const tiers = Array.from({ length: 31 }, (_, i) => (i + 1) * 1000);
    expect(calculateBlockRent(tiers, 1, 'HOLD_LAST', null, 31)).toBe(31000);
    expect(calculateBlockRent(tiers, 1, 'EXTRA_PER_DAY', 500, 33)).toBe(32000);
  });

  it('a 0đ tier is a price', () => {
    expect(calculateBlockRent([0, 50000], 1, 'HOLD_LAST', null, 1)).toBe(0);
  });

  it('rounds once at the end, not per day (USD)', () => {
    // 3 extra days of 0.004 = 0.012, not 3 x round(0.004) = 0
    expect(calculateBlockRent([10], 1, 'EXTRA_PER_DAY', 0.004, 4, 0.01)).toBe(10.01);
  });

  it('VND is whole, USD has cents', () => {
    expect(currencyMinorUnit('VND')).toBe(1);
    expect(currencyMinorUnit('vnd')).toBe(1);
    expect(currencyMinorUnit('USD')).toBe(0.01);
    expect(currencyMinorUnit(undefined)).toBe(0.01);
    expect(roundToMinorUnit(1.005, 0.01)).toBe(1.01);
    expect(roundToMinorUnit(2.5, 1)).toBe(3);
  });

  it('detail reports the base, the extra days and the extra amount', () => {
    expect(calculateBlockRentDetail(T, 1, 'EXTRA_PER_DAY', 20000, 5)).toEqual({
      total: 160000, days: 5, lastTierDay: 3, extraDays: 2, basePrice: 120000, extraAmount: 40000,
    });
    expect(calculateBlockRentDetail(T, 1, 'HOLD_LAST', null, 5).extraDays).toBe(0);
  });

  it('calculateBlockRentForTable reads a stored table', () => {
    expect(calculateBlockRentForTable({ tiers: T, startDay: 1, extraMode: 'EXTRA_PER_DAY', extraPrice: 20000 }, 5)).toBe(160000);
  });

  it.each([
    ['no tiers', { tiers: [] }],
    ['32 tiers', { tiers: new Array(32).fill(1) }],
    ['negative tier', { tiers: [1, -1] }],
    ['NaN tier', { tiers: [NaN] }],
    ['start day 0', { tiers: [1], startDay: 0 }],
    ['start day 32', { tiers: [1], startDay: 32 }],
    ['fractional start day', { tiers: [1], startDay: 1.5 }],
    ['unknown mode', { tiers: [1], extraMode: 'WEEKLY' }],
    ['negative extra', { tiers: [1], extraPrice: -5 }],
  ])('refuses an invalid table: %s', (_name, table) => {
    expect(isValidBlockTable(table as any)).toBe(false);
    expect(() => calculateBlockRent((table as any).tiers, (table as any).startDay, (table as any).extraMode, (table as any).extraPrice, 2)).toThrow('BLOCK_TABLE_INVALID');
  });

  it('accepts a valid table', () => {
    expect(isValidBlockTable({ tiers: [0, 5], startDay: 31, extraMode: 'HOLD_LAST', extraPrice: null })).toBe(true);
  });
});

describe('days come from Vietnam civil days (countRentalDays)', () => {
  const price = (pickup: string, ret: string) =>
    calculateBlockRent([80000, 100000, 120000], 1, 'EXTRA_PER_DAY', 20000, countRentalDays(pickup, ret));

  it('same-day pickup and return is 1 day', () => {
    expect(price('2026-10-10T02:00:00.000Z', '2026-10-10T09:00:00.000Z')).toBe(80000);
  });

  it('16:59:59Z and 17:00:00Z are two different Vietnam days', () => {
    // 16:59:59Z = 23:59:59 on the 10th in Vietnam, 17:00:00Z = 00:00 on the 11th
    expect(price('2026-10-10T16:59:59.000Z', '2026-10-10T17:00:00.000Z')).toBe(100000);
    expect(price('2026-10-10T00:00:00.000Z', '2026-10-10T16:59:59.000Z')).toBe(80000);
  });

  it('three days across a month end, five days across a year end', () => {
    expect(price('2026-10-30T02:00:00.000Z', '2026-11-01T02:00:00.000Z')).toBe(120000);
    expect(price('2026-12-30T02:00:00.000Z', '2027-01-03T02:00:00.000Z')).toBe(160000);
  });
});

describe('#1223 save-time check: EXTRA_PER_DAY needs its extra price', () => {
  const bad = golden.invalidSaveTables as Record<string, any>;
  it.each(Object.keys(bad).filter((k) => !k.startsWith('_')))('refuses to save %s', (name) => {
    expect(isCompleteBlockTable(bad[name])).toBe(false);
    // a stored table like this is still read (no 500): the calculator keeps +0
    expect(isValidBlockTable(bad[name])).toBe(true);
  });
  it.each(Object.keys(tables))('accepts golden table %s (HOLD_LAST may have no extra price)', (name) => {
    expect(isCompleteBlockTable(tables[name])).toBe(true);
  });
  it('an extra price of 0 is a price', () => {
    expect(isCompleteBlockTable({ tiers: [1], extraMode: 'EXTRA_PER_DAY', extraPrice: 0 })).toBe(true);
  });
  it('still refuses everything isValidBlockTable refuses', () => {
    expect(isCompleteBlockTable({ tiers: [], extraMode: 'HOLD_LAST' })).toBe(false);
    expect(isCompleteBlockTable({ tiers: [1], extraMode: 'HOLD_LAST', extraPrice: -1 })).toBe(false);
  });
});
