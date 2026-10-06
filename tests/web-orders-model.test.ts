/**
 * #516 shop web Đơn hàng + Chi tiết đơn: row schedule / note / money, filters, order page.
 * Day logic must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  buildHistory,
  buildNextStep,
  buildOpsRows,
  buildOrderRow,
  buildPaySummary,
  buildProgress,
  clockDay,
  createdRange,
  opsCounts,
  orderBalance,
  pageWindow,
  parsePage,
  parsePageSize,
  parseSort,
  parseStatus,
  parseTab,
  rangeOf,
} from '../apps/client/app/orders/orders-model';
import { getLocalDateKey } from '../packages/utils/src/core/date';

const TODAY = '2026-10-06';
// 09:00 in Vietnam on a day
const at = (key: string, hour = 9) => new Date(`${key}T${String(hour).padStart(2, '0')}:00:00+07:00`).toISOString();
const row = (extra: Record<string, unknown>) =>
  buildOrderRow({ id: 1, orderNumber: '482063', customerName: 'Mai Quốc Huy', createdAt: at('2026-10-05'), totalAmount: 300_000, ...extra } as any, TODAY, getLocalDateKey);

describe('filters', () => {
  it('reads URL values with safe defaults', () => {
    expect(parseTab('todo')).toBe('todo');
    expect(parseTab('x')).toBe('all');
    expect(parseStatus('PICKUPED')).toBe('PICKUPED');
    expect(parseStatus('pickuped')).toBe('');
    expect(parsePageSize('50')).toBe(50);
    expect(parsePageSize('25')).toBe(10);
    expect(parsePage('3')).toBe(3);
    expect(parsePage('-1')).toBe(1);
    expect(parseSort('nearest')).toBe('nearest');
    expect(parseSort('toString')).toBe('newest');
  });

  it('builds created-day ranges as Vietnam day keys', () => {
    expect(createdRange('any', TODAY)).toBeNull();
    expect(createdRange('7d', TODAY)).toEqual({ startDate: '2026-09-30', endDate: TODAY });
    expect(createdRange('30d', TODAY)).toEqual({ startDate: '2026-09-07', endDate: TODAY });
    expect(createdRange('month', TODAY)).toEqual({ startDate: '2026-10-01', endDate: TODAY });
    expect(createdRange('custom', TODAY, { from: '2026-10-05', to: '2026-09-01' })).toEqual({ startDate: '2026-09-01', endDate: '2026-10-05' });
    expect(createdRange('custom', TODAY, { from: '2026-09-03' })).toEqual({ startDate: '2026-09-03', endDate: '2026-09-03' });
    expect(createdRange('custom', TODAY, { from: '2026-02-30' })).toBeNull();
  });

  it('pages with gaps and a-b ranges', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(6, 13)).toEqual([1, 0, 5, 6, 7, 0, 13]);
    expect(rangeOf(1, 10, 128)).toEqual({ from: 1, to: 10 });
    expect(rangeOf(13, 10, 128)).toEqual({ from: 121, to: 128 });
    expect(rangeOf(1, 10, 0)).toEqual({ from: 0, to: 0 });
  });
});

describe('list rows', () => {
  it('reserved rental: hand-over and return days, money to collect', () => {
    // 17:30Z on Oct 5 is 00:30 on Oct 6 in Vietnam
    const r = row({ orderType: 'RENT', status: 'RESERVED', pickupPlanAt: '2026-10-05T17:30:00.000Z', returnPlanAt: at('2026-10-08'), amountDue: 300_000, isReadyToDeliver: true });
    expect(r.schedule).toEqual({ kind: 'pickupReturn', pickup: '2026-10-06', ret: '2026-10-08' });
    expect(r.note).toBeNull();
    expect(r.pay).toEqual({ kind: 'due', amount: 300_000, urgent: false });
    expect(r.createdKey).toBe('2026-10-05');
    expect(r.name).toBe('Mai Quốc Huy');
  });

  it('reserved rental not prepared, or past its hand-over day', () => {
    expect(row({ orderType: 'RENT', status: 'RESERVED', pickupPlanAt: at(TODAY), isReadyToDeliver: false }).note).toEqual({ kind: 'unprepared' });
    const late = row({ orderType: 'RENT', status: 'RESERVED', pickupPlanAt: at('2026-10-04'), isReadyToDeliver: false, amountDue: 300_000 });
    expect(late.note).toEqual({ kind: 'overduePickup', days: 2 });
    expect(late.pay).toEqual({ kind: 'due', amount: 300_000, urgent: true });
  });

  it('renting: return day, or due day with late days and the late fee', () => {
    const r = row({ orderType: 'RENT', status: 'PICKUPED', returnPlanAt: at(TODAY, 17), refundDue: 500_000 });
    expect(r.schedule).toEqual({ kind: 'return', day: TODAY });
    expect(r.pay).toEqual({ kind: 'refund', amount: 500_000 });
    const late = row({ orderType: 'RENT', status: 'PICKUPED', returnPlanAt: at('2026-10-02'), amountDue: 320_000 });
    expect(late.schedule).toEqual({ kind: 'due', day: '2026-10-02' });
    expect(late.note).toEqual({ kind: 'late', days: 4 });
    expect(late.pay).toEqual({ kind: 'fee', amount: 320_000 });
  });

  it('returned, sale and cancelled', () => {
    expect(row({ orderType: 'RENT', status: 'RETURNED', returnedAt: at('2026-10-02', 20) }).schedule).toEqual({ kind: 'returned', day: '2026-10-02' });
    const sale = row({ orderType: 'SALE', status: 'COMPLETED', createdAt: at('2026-10-03') });
    expect([sale.schedule, sale.note, sale.pay]).toEqual([{ kind: 'sale', day: '2026-10-03' }, { kind: 'sale' }, null]);
    const cancelled = row({ orderType: 'RENT', status: 'CANCELLED', updatedAt: at('2026-09-29'), amountDue: 100 });
    expect([cancelled.schedule, cancelled.pay, cancelled.cancelled]).toEqual([{ kind: 'cancelled', day: '2026-09-29' }, { kind: 'noRevenue' }, true]);
  });

  it('falls back to the customer object for the name', () => {
    expect(row({ customerName: null, customer: { firstName: 'Hà', lastName: 'Gia Bảo' } }).name).toBe('Hà Gia Bảo');
  });
});

describe('work tabs', () => {
  const o = (id: number, extra: Record<string, unknown> = {}) => ({ id, orderNumber: String(482000 + id), customerName: `Khách ${id}`, productNames: 'Áo dài', ...extra });
  const ops = {
    pickupsToday: { count: 2, orders: [o(1, { pickupPlanAt: at(TODAY), amountDue: 300_000 }), o(2, { isReadyToDeliver: false })] },
    returnsToday: { count: 1, orders: [o(3, { returnPlanAt: at(TODAY), refundDue: 500_000 })] },
    overdueReturns: { count: 3, orders: [o(4, { returnPlanAt: at('2026-10-02'), amountDue: 320_000 }), o(3)] },
    noShows: { count: 2, orders: [o(5, { pickupPlanAt: at('2026-10-04') })] },
  };

  it('lists hand-overs, returns and late returns once each, as rentals', () => {
    const rows = buildOpsRows(ops, 'todo', TODAY, getLocalDateKey);
    expect(rows.map((r) => [r.id, r.status, r.note?.kind ?? null, r.pay?.kind ?? null])).toEqual([
      [1, 'RESERVED', null, 'due'],
      [2, 'RESERVED', 'unprepared', null],
      [3, 'PICKUPED', null, 'refund'],
      [4, 'PICKUPED', 'late', 'fee'],
    ]);
    expect(rows[0].detail).toBe('Áo dài');
    expect(buildOpsRows(ops, 'noshow', TODAY, getLocalDateKey).map((r) => [r.id, r.note])).toEqual([[5, { kind: 'overduePickup', days: 2 }]]);
    expect(buildOpsRows(null, 'todo', TODAY, getLocalDateKey)).toEqual([]);
  });

  it('counts the badges without the order sent twice', () => {
    expect(opsCounts(ops)).toEqual({ todo: 5, noshow: 2 });
    expect(opsCounts(null)).toEqual({ todo: 0, noshow: 0 });
  });
});

describe('order page', () => {
  const base = {
    id: 9,
    orderNumber: '482063',
    orderType: 'RENT',
    totalAmount: 300_000,
    depositAmount: 0,
    securityDeposit: 500_000,
    createdAt: '2026-10-05T07:32:00.000Z',
    pickupPlanAt: at(TODAY),
    returnPlanAt: at('2026-10-08'),
    createdBy: { firstName: 'Lan', lastName: null },
  };

  it('matches the API balance rule', () => {
    expect(orderBalance({ ...base, status: 'RESERVED' })).toEqual({ amountDue: 800_000, refundDue: 0 });
    expect(
      orderBalance({ ...base, status: 'RESERVED', payments: [{ amount: 300_000, status: 'COMPLETED', notes: 'PICKUP' }, { amount: 9, status: 'PENDING', notes: 'PICKUP' }] }),
    ).toEqual({ amountDue: 500_000, refundDue: 0 });
    expect(orderBalance({ ...base, status: 'PICKUPED', lateFee: 100_000 })).toEqual({ amountDue: 0, refundDue: 400_000 });
    expect(orderBalance({ ...base, orderType: 'SALE', status: 'COMPLETED', payments: [{ amount: 300_000, status: 'COMPLETED', notes: 'SALE' }] })).toEqual({ amountDue: 0, refundDue: 0 });
    expect(orderBalance({ ...base, status: 'RETURNED' })).toEqual({ amountDue: 0, refundDue: 0 });
  });

  it('shows progress with shop times and today', () => {
    const steps = buildProgress({ ...base, status: 'RESERVED' }, TODAY, getLocalDateKey);
    expect(steps).toEqual([
      { step: 'RESERVED', reached: true, when: { kind: 'done', key: '2026-10-05', clock: '14:32' } },
      { step: 'PICKUP', reached: false, when: { kind: 'plan', key: TODAY, today: true, late: false } },
      { step: 'RETURN', reached: false, when: { kind: 'plan', key: '2026-10-08', today: false, late: false } },
    ]);
    expect(buildProgress({ ...base, status: 'PICKUPED', pickedUpAt: '2026-10-05T18:10:00.000Z' }, TODAY, getLocalDateKey)[1]).toEqual({
      step: 'PICKUP',
      reached: true,
      when: { kind: 'done', key: TODAY, clock: '01:10' },
    });
    expect(buildProgress({ ...base, status: 'CANCELLED' }, TODAY, getLocalDateKey)).toEqual([]);
    expect(buildProgress({ ...base, orderType: 'SALE', status: 'COMPLETED' }, TODAY, getLocalDateKey)).toEqual([]);
    expect(clockDay(base.createdAt, getLocalDateKey)).toBe('14:32 05/10');
  });

  it('names the next step and its money', () => {
    expect(buildNextStep({ ...base, status: 'RESERVED' }, TODAY, getLocalDateKey)).toEqual({ kind: 'pickup', day: TODAY, today: true, lateDays: 0, amount: 800_000 });
    expect(buildNextStep({ ...base, status: 'PICKUPED', returnPlanAt: at('2026-10-02') }, TODAY, getLocalDateKey)).toEqual({
      kind: 'return',
      day: '2026-10-02',
      today: false,
      lateDays: 4,
      amount: 0,
      refund: 500_000,
    });
    expect(buildNextStep({ ...base, status: 'RETURNED' }, TODAY, getLocalDateKey)).toBeNull();
  });

  it('builds the payment card by state', () => {
    const reserved = buildPaySummary({ ...base, status: 'RESERVED', depositAmount: 100_000 });
    expect(reserved.lines.map((l) => l.kind)).toEqual(['rent', 'deposit']);
    expect(reserved.total).toEqual({ kind: 'dueAtPickup', amount: 700_000 });
    expect(reserved.collateral).toBe(500_000);
    const renting = buildPaySummary({ ...base, status: 'PICKUPED', lateFee: 100_000, damageFee: 600_000 });
    expect(renting.lines.map((l) => l.kind)).toEqual(['rent', 'deposit', 'lateFee', 'damageFee', 'collateralHeld']);
    expect(renting.total).toEqual({ kind: 'collectAtReturn', amount: 200_000 });
    expect(buildPaySummary({ ...base, status: 'CANCELLED' })).toMatchObject({ total: { kind: 'noRevenue' }, struck: true });
    expect(buildPaySummary({ ...base, orderType: 'SALE', status: 'COMPLETED' }).total).toEqual({ kind: 'due', amount: 300_000 });
  });

  it('lists history newest first', () => {
    const h = buildHistory({
      ...base,
      status: 'CANCELLED',
      updatedAt: '2026-10-06T02:00:00.000Z',
      payments: [{ amount: 100_000, status: 'COMPLETED', notes: 'PICKUP', createdAt: '2026-10-05T08:00:00.000Z' }, { amount: 5, status: 'FAILED', createdAt: '2026-10-05T09:00:00.000Z' }],
    });
    expect(h).toEqual([
      { kind: 'cancelled', at: '2026-10-06T02:00:00.000Z' },
      { kind: 'payment', at: '2026-10-05T08:00:00.000Z', amount: 100_000, refund: false },
      { kind: 'created', at: '2026-10-05T07:32:00.000Z', by: 'Lan' },
    ]);
  });
});
