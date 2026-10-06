/**
 * #527 shop web Lịch giao trả + Kiểm tra còn hàng: month grid, day counts, day panel rows,
 * the availability day strip and the orders holding a product.
 * Day logic must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  buildDayRow,
  cellLabel,
  dayCounts,
  mergeReturns,
  monthGrid,
  mondayFirst,
  mondayIndex,
  parseMonth,
  shiftMonth,
} from '../apps/client/app/calendar/calendar-model';
import {
  barColumns,
  barText,
  dayLevel,
  freeByDay,
  parsePeriod,
  parseQty,
  quickPeriods,
  similarFree,
  stripDays,
  toHolders,
  verdictOf,
  type RawOrderLike,
} from '../apps/client/app/availability/availability-model';
import { getLocalDateKey } from '../packages/utils/src/core/date';

/** Vietnam midnight of a day key as the API stores it. */
const vnMidnight = (key: string) => new Date(`${key}T00:00:00+07:00`).toISOString();
const toDayKey = (iso: string) => getLocalDateKey(iso);

describe('calendar month grid', () => {
  it('starts on Monday and covers whole weeks (Oct 2026: 28/9 → 1/11)', () => {
    const cells = monthGrid({ year: 2026, month: 10 }, '2026-10-06');
    expect(cells).toHaveLength(35);
    expect(cells[0]).toMatchObject({ key: '2026-09-28', day: 28, inMonth: false });
    expect(cells[3]).toMatchObject({ key: '2026-10-01', day: 1, inMonth: true });
    expect(cells[34]).toMatchObject({ key: '2026-11-01', inMonth: false });
    expect(cells.filter((c) => c.isToday).map((c) => c.key)).toEqual(['2026-10-06']);
  });

  it('uses six weeks when the month needs them and handles leap February', () => {
    expect(monthGrid({ year: 2026, month: 8 }, '2026-10-06')).toHaveLength(42); // Aug 1 2026 is a Saturday
    const feb = monthGrid({ year: 2028, month: 2 }, '2026-10-06');
    expect(feb.filter((c) => c.inMonth)).toHaveLength(29);
    expect(feb[0].key).toBe('2028-01-31');
  });

  it('weekday index is the civil day, not the machine day', () => {
    expect(mondayIndex('2026-10-05')).toBe(0); // Monday
    expect(mondayIndex('2026-10-11')).toBe(6); // Sunday
    expect(mondayFirst(['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'])).toEqual(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);
  });

  it('reads and shifts the month', () => {
    expect(parseMonth('10', '2026', '2026-01-15')).toEqual({ year: 2026, month: 10 });
    expect(parseMonth(null, null, '2026-10-06')).toEqual({ year: 2026, month: 10 });
    expect(parseMonth('13', '2026', '2026-10-06')).toEqual({ year: 2026, month: 10 });
    expect(parseMonth('3', null, '2026-10-06')).toEqual({ year: 2026, month: 3 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe('calendar day counts', () => {
  it('reads hand-overs and returns per day and puts late returns on today', () => {
    const map = dayCounts(
      { countByDate: { '2026-10-06': 3 }, byDate: { '2026-10-06': { pickups: 3, returns: 2 }, '2026-10-07': { pickups: 0, returns: 1 } }, lateReturns: 2 },
      '2026-10-06',
    );
    expect(map.get('2026-10-06')).toEqual({ pickups: 3, returns: 2, late: 2 });
    expect(map.get('2026-10-07')).toEqual({ pickups: 0, returns: 1, late: 0 });
  });

  it('falls back to countByDate (hand-overs) on an older API', () => {
    const map = dayCounts({ countByDate: { '2026-10-08': 4, bad: 1 } }, '2026-10-06');
    expect(map.get('2026-10-08')).toEqual({ pickups: 4, returns: 0, late: 0 });
    expect(map.has('bad')).toBe(false);
    expect(dayCounts(null, '2026-10-06').size).toBe(0);
  });

  it('labels a cell for screen readers', () => {
    const cell = monthGrid({ year: 2026, month: 10 }, '2026-10-06').find((c) => c.key === '2026-10-06')!;
    expect(cellLabel(cell, { pickups: 3, returns: 0, late: 2 }, { pickups: 'giao', returns: 'trả', late: 'trễ' })).toBe('6/10, giao 3, trễ 2');
  });
});

describe('calendar day rows', () => {
  it('a pickup at Vietnam midnight belongs to that Vietnam day (17:00Z the day before)', () => {
    expect(toDayKey(vnMidnight('2026-10-07'))).toBe('2026-10-07');
    expect(vnMidnight('2026-10-07')).toBe('2026-10-06T17:00:00.000Z');
  });

  it('hand-over row: return day, not prepared, money to collect', () => {
    const row = buildDayRow(
      { id: 1, orderNumber: '482063', customerName: 'Mai Quốc Huy', pickupPlanAt: vnMidnight('2026-10-06'), returnPlanAt: vnMidnight('2026-10-08'), isReadyToDeliver: false, amountDue: 300000, orderItems: [{ productName: 'Áo dài lụa đỏ', quantity: 2 }] },
      'pickup',
      '2026-10-06',
      toDayKey,
    );
    expect(row.sub).toEqual({ kind: 'returnOn', day: '2026-10-08' });
    expect(row.notPrepared).toBe(true);
    expect(row.money).toEqual({ kind: 'collect', amount: 300000 });
    expect(row.products).toBe('Áo dài lụa đỏ ×2');
  });

  it('a same-day pickup and return still occupies that day', () => {
    const row = buildDayRow({ id: 2, orderNumber: '1', pickupPlanAt: '2026-10-06T02:00:00.000Z', returnPlanAt: '2026-10-06T12:00:00.000Z' }, 'pickup', '2026-10-06', toDayKey);
    expect(row.sub).toEqual({ kind: 'sameDay' });
  });

  it('return rows: picked-up day, refund, or days late with the fee', () => {
    const onTime = buildDayRow({ id: 3, orderNumber: '2', pickupPlanAt: vnMidnight('2026-10-02'), returnPlanAt: vnMidnight('2026-10-06'), refundDue: 500000 }, 'return', '2026-10-06', toDayKey);
    expect(onTime.sub).toEqual({ kind: 'pickedOn', day: '2026-10-02' });
    expect(onTime.money).toEqual({ kind: 'refund', amount: 500000 });
    const late = buildDayRow({ id: 4, orderNumber: '3', returnPlanAt: vnMidnight('2026-10-02'), amountDue: 80000 }, 'return', '2026-10-06', toDayKey);
    expect(late.sub).toEqual({ kind: 'late', day: '2026-10-02', days: 4 });
    expect(late.money).toEqual({ kind: 'fee', amount: 80000 });
    expect(mergeReturns([onTime], [late, onTime]).map((r) => r.id)).toEqual([3, 4]);
  });
});

describe('availability day strip', () => {
  const holders = (orders: RawOrderLike[], from = '2026-10-07', to = '2026-10-09') => toHolders(orders, 11, { from, to }, toDayKey);
  const order = (id: number, status: string, pickup: string, ret: string, qty = 1, orderType = 'RENT'): RawOrderLike => ({
    id,
    orderNumber: String(480000 + id),
    status,
    orderType,
    pickupPlanAt: vnMidnight(pickup),
    returnPlanAt: vnMidnight(ret),
    customer: { firstName: 'Mai Quốc', lastName: 'Huy' },
    orderItems: [
      { productId: 11, quantity: qty },
      { productId: 99, quantity: 5 },
    ],
  });

  it('reads the period and quantity from the URL', () => {
    expect(parsePeriod('2026-10-07', '2026-10-09', '2026-10-06')).toEqual({ from: '2026-10-07', to: '2026-10-09' });
    expect(parsePeriod('2026-10-09', '2026-10-07', '2026-10-06')).toEqual({ from: '2026-10-06', to: '2026-10-08' });
    expect(parsePeriod('2026-10-07', null, '2026-10-06')).toEqual({ from: '2026-10-07', to: '2026-10-07' });
    expect(parseQty('3')).toBe(3);
    expect(parseQty('0')).toBe(1);
    expect(parseQty('abc')).toBe(1);
  });

  it('quick periods from a Tuesday', () => {
    const q = quickPeriods('2026-10-06');
    expect(q.tomorrow).toEqual({ from: '2026-10-07', to: '2026-10-07' });
    expect(q.weekend).toEqual({ from: '2026-10-10', to: '2026-10-11' });
    expect(q.threeDays).toEqual({ from: '2026-10-06', to: '2026-10-08' });
    expect(quickPeriods('2026-10-11').weekend).toEqual({ from: '2026-10-11', to: '2026-10-11' });
  });

  it('strip starts two days before the pickup, 14 days or more', () => {
    const days = stripDays('2026-10-07', '2026-10-09');
    expect(days[0]).toBe('2026-10-05');
    expect(days).toHaveLength(14);
    expect(stripDays('2026-10-07', '2026-10-30')).toHaveLength(28);
    expect(stripDays('2026-10-01', '2027-03-01')).toHaveLength(42);
  });

  it('keeps active orders, counts only this product, marks the ones in the period', () => {
    const list = holders([
      order(3, 'RESERVED', '2026-10-12', '2026-10-14'),
      order(1, 'PICKUPED', '2026-10-02', '2026-10-05'),
      order(2, 'RESERVED', '2026-10-06', '2026-10-08', 2),
      order(4, 'RETURNED', '2026-10-07', '2026-10-08'),
    ]);
    expect(list.map((h) => h.id)).toEqual([1, 2, 3]);
    expect(list[1]).toMatchObject({ quantity: 2, pickupKey: '2026-10-06', returnKey: '2026-10-08', inPeriod: true, name: 'Mai Quốc Huy' });
    expect(list[0].inPeriod).toBe(false);
  });

  it('free units per day count both ends, also a same-day pickup and return; sales hold nothing', () => {
    const list = holders([
      order(1, 'PICKUPED', '2026-10-02', '2026-10-05'),
      order(2, 'RESERVED', '2026-10-06', '2026-10-08'),
      order(3, 'RESERVED', '2026-10-08', '2026-10-08'),
      order(4, 'RESERVED', '2026-10-07', '2026-10-07', 1, 'SALE'),
    ]);
    const days = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'];
    expect(freeByDay(3, list, days)).toEqual([2, 2, 2, 1, 3]);
    expect(freeByDay(1, list, days)).toEqual([0, 0, 0, 0, 1]);
  });

  it('bar columns are clipped to the strip; text follows the status', () => {
    const days = stripDays('2026-10-07', '2026-10-09'); // 05 … 18
    const [out, booked, far] = holders([order(1, 'PICKUPED', '2026-10-02', '2026-10-05'), order(2, 'RESERVED', '2026-10-06', '2026-10-08'), order(3, 'RESERVED', '2026-11-20', '2026-11-21')]);
    expect(barColumns(out, days)).toEqual({ start: 0, end: 0 });
    expect(barColumns(booked, days)).toEqual({ start: 1, end: 3 });
    expect(barColumns(far, days)).toBeNull();
    expect(barText(out)).toEqual({ kind: 'returnOn', day: '2026-10-05' });
    expect(barText(booked)).toEqual({ kind: 'range', from: '2026-10-06', to: '2026-10-08' });
  });

  it('verdict, day level and similar products', () => {
    expect(verdictOf({ free: 1, total: 3 }, 1)).toEqual({ kind: 'ok', free: 1, total: 3 });
    expect(verdictOf({ free: 1, total: 3 }, 2)).toEqual({ kind: 'short', missing: 1, free: 1, total: 3 });
    expect(verdictOf({ free: 0, total: 3 }, 1)).toEqual({ kind: 'none', total: 3 });
    expect([dayLevel(0, 1), dayLevel(1, 1), dayLevel(2, 1), dayLevel(1, 2)]).toEqual(['none', 'tight', 'ok', 'none']);
    const stock = new Map([
      [12, { free: 2, total: 3 }],
      [13, { free: 0, total: 1 }],
      [14, { free: 6, total: 8 }],
    ]);
    const rows = similarFree([{ id: 11 }, { id: 12 }, { id: 13 }, { id: 14 }, { id: 15 }], 11, (id) => stock.get(id), 1);
    expect(rows.map((r) => [r.product.id, r.free])).toEqual([
      [14, 6],
      [12, 2],
    ]);
  });
});
