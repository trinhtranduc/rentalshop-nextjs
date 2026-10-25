/**
 * #1199 PHẦN B: doanh thu của đơn có kế hoạch cọc. Chạy dưới TZ=UTC và TZ=Asia/Ho_Chi_Minh (kết quả như nhau:
 * ngày tính theo giờ Việt Nam).
 *
 * Ví dụ chuẩn: đơn 12.000.000, tạo 25/10, giao 14/11, trả 17/11, thế chân 2.000.000, cọc 30% / 40% / phần còn lại.
 */
import {
  addToCollectedBreakdown,
  calculateOrderRevenueByStatus,
  calculatePeriodRevenue,
  calculatePeriodRevenueBatch,
  collateralByEvent,
  emptyCollectedBreakdown,
  getFutureInstallments,
  getFutureRevenueEvents,
  getOrderRevenueEvents,
  getOrderRevenueForDate,
  shopDayKey,
  withoutCollateral,
} from '../packages/utils/src/core/revenue-calculator';
import { buildEventWhere, toRevenueOrderData, EVENT_WHERE_CIVIL, EVENT_WHERE_PERIOD, EVENT_WHERE_BASIC } from '../packages/utils/src/core/revenue-mapping';

const at = (iso: string) => new Date(iso);
const PLAN = {
  v: 1,
  items: [
    { key: 'i1', label: 'Cọc giữ chỗ', type: 'PERCENT', value: 30, dueRule: { kind: 'ON_CREATE' } },
    { key: 'i2', label: 'Cọc lần 2', type: 'PERCENT', value: 40, dueDateKey: '2026-11-13' },
  ],
};

const pay = (key: string, amount: number, processedAt: string, extra: Record<string, any> = {}) => ({
  amount, status: 'COMPLETED', notes: 'INSTALLMENT', installmentKey: key, type: 'DEPOSIT',
  processedAt: at(processedAt), createdAt: at(processedAt), ...extra,
});
const refund = (amount: number, processedAt: string) => ({
  amount, status: 'REFUNDED', notes: 'CANCEL_REFUND', installmentKey: null, type: 'REFUND',
  processedAt: at(processedAt), createdAt: at(processedAt),
});

/** An Order row as the analytics `select` returns it */
function row(fields: Record<string, any> = {}) {
  return {
    orderType: 'RENT', status: 'RETURNED', totalAmount: 12_000_000, depositAmount: 8_400_000, securityDeposit: 2_000_000,
    damageFee: 0, lateFee: 0, pickupTotalAmount: null,
    createdAt: at('2026-10-25T03:00:00Z'), pickupPlanAt: at('2026-11-14T03:00:00Z'), returnPlanAt: at('2026-11-17T03:00:00Z'),
    pickedUpAt: at('2026-11-14T03:00:00Z'), returnedAt: at('2026-11-17T03:00:00Z'), updatedAt: at('2026-11-17T03:00:00Z'),
    depositPlan: PLAN, cancelKeptAmount: null, cancelledAt: null,
    payments: [pay('i1', 3_600_000, '2026-10-25T03:00:00Z'), pay('i2', 4_800_000, '2026-11-13T03:00:00Z')],
    ...fields,
  };
}

/** Revenue by Vietnam day */
function byDay(events: Array<{ date: Date; revenue: number }>) {
  const days: Record<string, number> = {};
  for (const e of events) days[shopDayKey(e.date)] = (days[shopDayKey(e.date)] || 0) + e.revenue;
  return days;
}
const sum = (events: Array<{ revenue: number }>) => events.reduce((s, e) => s + e.revenue, 0);
const events = (r: Record<string, any>, from?: Date, to?: Date) => getOrderRevenueEvents(toRevenueOrderData(r as any), from, to);

describe('worked example (STAGED 30% / 40% / rest)', () => {
  it('each collected stage is an event on its collection day; the rest is counted at hand-over', () => {
    const e = events(row());
    expect(byDay(e)).toEqual({ '2026-10-25': 3_600_000, '2026-11-13': 4_800_000, '2026-11-14': 5_600_000, '2026-11-17': -2_000_000 });
    expect(sum(e)).toBe(12_000_000);
    expect(e.map((x) => x.revenueType).sort()).toEqual(['RENT_INSTALLMENT', 'RENT_INSTALLMENT', 'RENT_PICKUP', 'RENT_RETURN']);
  });

  it('pickup = 3.600.000 rest + 2.000.000 collateral; without collateral the day is 3.600.000', () => {
    const data = toRevenueOrderData(row() as any);
    expect(byDay(getOrderRevenueEvents(withoutCollateral(data)))['2026-11-14']).toBe(3_600_000);
    const withC = getOrderRevenueEvents(data);
    const plain = getOrderRevenueEvents(withoutCollateral(data));
    const delta = collateralByEvent(withC, plain);
    expect([...delta.values()].filter((v) => v !== 0).sort((a, b) => a - b)).toEqual([-2_000_000, 2_000_000]);
  });

  it('ONE_TIME with a 2.000.000 product deposit is exactly the old formula', () => {
    const e = events(row({ depositPlan: null, payments: [], depositAmount: 2_000_000 }));
    expect(byDay(e)).toEqual({ '2026-10-25': 2_000_000, '2026-11-14': 12_000_000, '2026-11-17': -2_000_000 });
    expect(sum(e)).toBe(12_000_000);
    expect(e.map((x) => x.revenueType)).not.toContain('RENT_INSTALLMENT');
  });

  it('a window only returns the events inside it', () => {
    const e = events(row(), at('2026-11-12T17:00:00Z'), at('2026-11-13T16:59:59.999Z'));
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ revenue: 4_800_000, revenueType: 'RENT_INSTALLMENT' });
  });

  it('a period total adds up over the whole life of the order', () => {
    // the fixed dates are later than the real clock, so events after "now" land in futureIncome: real + future = all
    const { realIncome, futureIncome } = calculatePeriodRevenue(toRevenueOrderData(row() as any), at('2026-10-01T00:00:00Z'), at('2026-12-31T00:00:00Z'));
    expect(realIncome + futureIncome).toBe(12_000_000);
  });

  it('collected breakdown puts stages under deposits', () => {
    const data = withoutCollateral(toRevenueOrderData(row() as any));
    const b = emptyCollectedBreakdown();
    for (const e of getOrderRevenueEvents(data)) addToCollectedBreakdown(b, data, e);
    expect(b).toEqual({ deposits: 8_400_000, pickupAndSale: 3_600_000, fees: 0, refunds: 0 });
  });

  it('same-day pickup and return: stages stay on their days, return carries the rest', () => {
    const e = events(row({ pickedUpAt: at('2026-11-17T01:00:00Z'), payments: [pay('i1', 3_600_000, '2026-10-25T03:00:00Z')], depositAmount: 3_600_000 }));
    expect(sum(e)).toBe(12_000_000);
    expect(byDay(e)).toEqual({ '2026-10-25': 3_600_000, '2026-11-17': 8_400_000 });
  });

  it('a stage collected after hand-over still sums to the total', () => {
    const e = events(row({ payments: [pay('i1', 3_600_000, '2026-10-25T03:00:00Z'), pay('rest', 3_000_000, '2026-11-14T03:30:00Z')] }));
    expect(sum(e)).toBe(12_000_000);
  });
});

describe('collection day boundaries (Vietnam civil day)', () => {
  const dayOf = (iso: string) => events(row({ payments: [pay('i1', 3_600_000, iso)] })).find((x) => x.revenueType === 'RENT_INSTALLMENT')!.date;
  it('16:59:59Z is still the same Vietnam day, 17:00Z is the next one', () => {
    expect(shopDayKey(dayOf('2026-10-25T16:59:59Z'))).toBe('2026-10-25');
    expect(shopDayKey(dayOf('2026-10-25T17:00:00Z'))).toBe('2026-10-26');
  });
  it('month end: 31/10 17:00Z is 1/11 in Vietnam', () => {
    expect(shopDayKey(dayOf('2026-10-31T16:59:59Z'))).toBe('2026-10-31');
    expect(shopDayKey(dayOf('2026-10-31T17:00:00Z'))).toBe('2026-11-01');
  });
});

describe('cancellation', () => {
  const base = { status: 'CANCELLED', pickedUpAt: null, returnedAt: null, securityDeposit: 0, depositAmount: 3_600_000,
    payments: [pay('i1', 3_600_000, '2026-10-25T03:00:00Z')], cancelledAt: at('2026-11-12T03:00:00Z'), updatedAt: at('2026-11-12T03:00:00Z') };

  it('keeps nothing: the refund is a negative event on the cancel day', () => {
    const r = row({ ...base, cancelKeptAmount: 0, payments: [...base.payments, refund(3_600_000, '2026-11-12T03:00:00Z')] });
    const e = events(r);
    expect(byDay(e)).toEqual({ '2026-10-25': 3_600_000, '2026-11-12': -3_600_000 });
    expect(sum(e)).toBe(0);
  });

  it('keeps 1.800.000: only 1.800.000 goes back on 12/11, the kept money stays on 25/10', () => {
    const r = row({ ...base, cancelKeptAmount: 1_800_000, payments: [...base.payments, refund(1_800_000, '2026-11-12T03:00:00Z')] });
    const e = events(r);
    expect(byDay(e)).toEqual({ '2026-10-25': 3_600_000, '2026-11-12': -1_800_000 });
    expect(sum(e)).toBe(1_800_000);
    expect(calculateOrderRevenueByStatus(toRevenueOrderData(r as any))).toBe(1_800_000);
  });

  it('keeps everything: no cancel event', () => {
    const r = row({ ...base, cancelKeptAmount: 3_600_000 });
    const e = events(r);
    expect(byDay(e)).toEqual({ '2026-10-25': 3_600_000 });
    expect(calculateOrderRevenueByStatus(toRevenueOrderData(r as any))).toBe(3_600_000);
  });

  it('old client (no amounts, no refund row): everything goes back as before', () => {
    const r = row({ ...base, cancelKeptAmount: null });
    expect(sum(events(r))).toBe(0);
    expect(calculateOrderRevenueByStatus(toRevenueOrderData(r as any))).toBe(0);
  });

  it('cancel day comes from cancelledAt, not from a later updatedAt', () => {
    const r = row({ ...base, cancelKeptAmount: 0, updatedAt: at('2026-11-20T03:00:00Z'), payments: [...base.payments, refund(3_600_000, '2026-11-12T03:00:00Z')] });
    expect(byDay(events(r))['2026-11-12']).toBe(-3_600_000);
  });

  it('cancelled after hand-over: pickup money and collateral go back too', () => {
    const r = row({ status: 'CANCELLED', returnedAt: null, cancelledAt: at('2026-11-15T03:00:00Z'), updatedAt: at('2026-11-15T03:00:00Z'), cancelKeptAmount: null });
    const e = events(r);
    expect(sum(e)).toBe(0);
    expect(byDay(e)['2026-11-15']).toBe(-12_000_000 - 2_000_000);
  });
});

describe('orders without a plan are untouched', () => {
  const legacy = {
    orderType: 'RENT', status: 'RETURNED', totalAmount: 300000, depositAmount: 100000, securityDeposit: 1000000, damageFee: 20000,
    createdAt: at('2026-10-01T03:00:00Z'), pickedUpAt: at('2026-10-02T03:00:00Z'), returnedAt: at('2026-10-04T04:00:00Z'), updatedAt: at('2026-10-04T04:00:00Z'),
  };
  it('mapping has no plan key when there is no plan and no plan payment', () => {
    for (const extra of [{}, { payments: [] }, { depositPlan: null, payments: [] }, { payments: [{ amount: 5, status: 'COMPLETED', notes: 'PICKUP' }] }]) {
      expect(toRevenueOrderData({ ...legacy, ...extra } as any)).not.toHaveProperty('plan');
    }
  });
  it('events are the old ones', () => {
    expect(byDay(events(legacy))).toEqual({ '2026-10-01': 100000, '2026-10-02': 1200000 - 0, '2026-10-04': 20000 - 1000000 });
  });
});

describe('future income', () => {
  const NOW = at('2026-10-25T05:00:00Z');
  beforeAll(() => jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'queueMicrotask', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'hrtime', 'performance'] }));
  afterAll(() => jest.useRealTimers());
  const reserved = row({ status: 'RESERVED', pickedUpAt: null, returnedAt: null, updatedAt: at('2026-10-25T03:00:00Z'),
    payments: [pay('i1', 3_600_000, '2026-10-25T03:00:00Z')], depositAmount: 3_600_000 });

  it('futureIncome at the planned pickup is only the automatic last stage', () => {
    const data = toRevenueOrderData(reserved as any);
    const f = getFutureRevenueEvents(data, at('2026-11-01T00:00:00Z'), at('2026-11-30T00:00:00Z'));
    expect(f.map((x) => [x.revenueType, x.revenue])).toEqual([['RENT_FUTURE_PICKUP', 3_600_000]]);
    expect(calculatePeriodRevenue(data, at('2026-11-01T00:00:00Z'), at('2026-11-30T00:00:00Z'))).toEqual({ realIncome: 0, futureIncome: 3_600_000 });
    expect(getOrderRevenueForDate(data, at('2026-11-14T03:00:00Z'))).toBe(3_600_000);
  });

  it('an unpaid explicit stage is a futureInstallment by its due day, never in futureIncome', () => {
    const data = toRevenueOrderData(reserved as any);
    expect(getFutureInstallments([data], at('2026-11-01T00:00:00Z'), at('2026-11-30T00:00:00Z'))).toEqual([
      { dueDateKey: '2026-11-13', amount: 4_800_000, count: 1 },
    ]);
    expect(getFutureInstallments([data], at('2026-12-01T00:00:00Z'), at('2026-12-31T00:00:00Z'))).toEqual([]);
    const f = calculatePeriodRevenueBatch([data], at('2026-11-01T00:00:00Z'), at('2026-11-30T00:00:00Z'));
    expect(f.futureIncome).toBe(3_600_000);
  });

  it('orders without a plan keep total - deposit', () => {
    const data = toRevenueOrderData({ ...reserved, depositPlan: null, payments: [], depositAmount: 2_000_000 } as any);
    expect(calculatePeriodRevenue(data, at('2026-11-01T00:00:00Z'), at('2026-11-30T00:00:00Z')).futureIncome).toBe(10_000_000);
    expect(getFutureInstallments([data], at('2026-11-01T00:00:00Z'), at('2026-11-30T00:00:00Z'))).toEqual([]);
  });

  it('status view of a plan order', () => {
    const data = toRevenueOrderData(reserved as any);
    expect(calculateOrderRevenueByStatus(data)).toBe(3_600_000);
  });
});

describe('selecting orders with a collected stage in the period', () => {
  it.each([['civil', EVENT_WHERE_CIVIL], ['period', EVENT_WHERE_PERIOD], ['basic', EVENT_WHERE_BASIC]])('%s: adds one payments clause', (_n, opts) => {
    const range = { start: at('2026-11-12T17:00:00Z'), end: at('2026-11-13T16:59:59.999Z') };
    const or = buildEventWhere(range, opts as any).OR as any[];
    const clauses = or.filter((c) => 'payments' in c);
    expect(clauses).toHaveLength(1);
    expect(clauses[0].payments.some).toEqual({
      status: { in: ['COMPLETED', 'REFUNDED'] },
      notes: { in: ['INSTALLMENT', 'CANCEL_REFUND'] },
      processedAt: { gte: range.start, lte: range.end },
    });
  });
});
