/**
 * #1505 — admin Dashboard "Doanh thu gói dịch vụ": the ESTIMATE of old plan revenue, read from the subscription activity log.
 * Revenue arises at the moment of payment (an extension, a plan change), never spread over the period. No database here.
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh: the results must be identical.
 */
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/date-range'),
  getLocalDateKey: jest.requireActual('../../packages/utils/src/core/date').getLocalDateKey,
}));

import {
  PENDING_COUNTS_BEFORE,
  buildEstimatedRevenue,
  type EstimateActivityRow,
  type EstimatePaymentRow,
  type EstimateSubscriptionRow,
} from '../../apps/api/lib/admin-revenue-estimate';

const at = (iso: string) => new Date(iso);
// Basic 79.000 per month, a one-month cycle; shop 70 / subscription 7
const subs: EstimateSubscriptionRow[] = [
  { id: 7, merchantId: 70, merchantName: 'Shop A', currency: 'VND', amount: 79000, period: 1, planBasePrice: 79000 },
  { id: 8, merchantId: 80, merchantName: 'Shop E', currency: 'VND', amount: 790000, period: 12, planBasePrice: 79000 },
  { id: 9, merchantId: 90, merchantName: 'Shop USD', currency: 'USD', amount: 10, period: 1, planBasePrice: 10 },
];
let seq = 0;
const panel = (subscriptionId: number, meta: Record<string, unknown>, when: string): EstimateActivityRow => ({
  id: ++seq, subscriptionId, type: 'subscription_extended', metadata: JSON.stringify(meta), createdAt: at(when),
});
const admin = (subscriptionId: number, months: number, when: string): EstimateActivityRow => ({
  id: ++seq, subscriptionId, type: 'MANUAL_EXTENSION', createdAt: at(when),
  metadata: JSON.stringify({ months, previousEnd: when, newEnd: when }),
});
const change = (subscriptionId: number, planChange: Record<string, unknown>, when: string, type = 'subscription_plan_changed'): EstimateActivityRow => ({
  id: ++seq, subscriptionId, type, metadata: JSON.stringify({ planChange }), createdAt: at(when),
});
const pay = (over: Partial<EstimatePaymentRow> & { when: string }): EstimatePaymentRow => {
  const { when, ...rest } = over;
  return {
    id: ++seq, subscriptionId: 7, merchantId: 70, merchantName: 'Shop A', type: 'PLAN_EXTENSION', method: 'TRANSFER',
    status: 'PENDING', amount: 300000, currency: 'VND', transactionId: null, processedAt: null, createdAt: at(when), ...rest,
  };
};

const year2026 = { scope: 'year', year: 2026 } as const;
const run = (input: { activities?: EstimateActivityRow[]; payments?: EstimatePaymentRow[]; query?: any }) =>
  buildEstimatedRevenue({ query: input.query ?? year2026, activities: input.activities ?? [], subscriptions: subs, payments: input.payments ?? [] });
const month = (r: ReturnType<typeof run>, m: string) => r.months.find((x) => x.month === m)!;

describe('buildEstimatedRevenue', () => {
  it('Case A: a 3-month manual extension is counted once, on the day it was made (237.000 in August)', () => {
    const r = run({ activities: [admin(7, 3, '2026-08-05T03:00:00.000Z')] });
    expect(r.total).toBe(237000);
    expect(r.count).toBe(1);
    expect(month(r, '2026-08')).toMatchObject({ total: 237000, count: 1 });
    expect(month(r, '2026-09').total).toBe(0);
    expect(month(r, '2026-11').total).toBe(0);
    expect(r.items[0]).toMatchObject({ dateKey: '2026-08-05', kind: 'EXTENSION', amount: 237000, merchant: { id: 70, name: 'Shop A' } });
  });

  it.each(['ADMIN_EXTENSION', 'COMPENSATION'])('Case B: %s is a free grant, 0', (method) => {
    const r = run({ activities: [panel(7, { method, amount: 500000 }, '2026-08-05T03:00:00.000Z')] });
    expect(r.total).toBe(0);
    expect(r.count).toBe(0);
  });

  it('Case C: an extension that already has a real payment is not estimated again', () => {
    const r = run({
      activities: [panel(7, { method: 'PAYMENT_RECEIVED', amount: 79000 }, '2026-10-03T03:00:00.000Z')],
      payments: [pay({ when: '2026-10-03T03:01:00.000Z', status: 'COMPLETED', amount: 79000 })],
    });
    expect(r.total).toBe(0);
  });

  it('a payment of another subscription near the activity does not hide it', () => {
    const r = run({
      activities: [panel(7, { method: 'MANUAL_EXTENSION', amount: 100000 }, '2026-10-03T03:00:00.000Z')],
      payments: [pay({ subscriptionId: 8, when: '2026-10-03T03:01:00.000Z', status: 'COMPLETED' })],
    });
    expect(r.total).toBe(100000);
  });

  it('a payment far from the activity (same subscription) does not hide it', () => {
    const r = run({
      activities: [panel(7, { method: 'MANUAL_EXTENSION', amount: 100000 }, '2026-10-03T03:00:00.000Z')],
      payments: [pay({ when: '2026-10-04T03:00:00.000Z', status: 'COMPLETED' })],
    });
    expect(r.total).toBe(100000);
  });

  it('the payment written by the back-fill script (transactionId of the activity) hides it', () => {
    const a = panel(7, { method: 'MANUAL_EXTENSION', amount: 100000 }, '2026-10-03T03:00:00.000Z');
    const r = run({ activities: [a], payments: [pay({ when: '2026-11-07T03:00:00.000Z', status: 'COMPLETED', transactionId: `backfill-1486-act-${a.id}` })] });
    expect(r.total).toBe(0);
  });

  it('Case E: a 12-month extension of an annual plan is 790.000 in September', () => {
    const r = run({ activities: [admin(8, 12, '2026-09-10T03:00:00.000Z')] });
    expect(month(r, '2026-09')).toMatchObject({ total: 790000, count: 1 });
  });

  it('Case F: two 1-month extensions are 79.000 each, in their own months', () => {
    const r = run({ activities: [admin(7, 1, '2026-10-03T03:00:00.000Z'), admin(7, 1, '2026-11-03T03:00:00.000Z')] });
    expect(month(r, '2026-10').total).toBe(79000);
    expect(month(r, '2026-11').total).toBe(79000);
    expect(r.total).toBe(158000);
  });

  it('Case G: a plan change counts its amountDueRounded on the day of the change', () => {
    const r = run({ activities: [change(7, { amountDue: 149999.6, amountDueRounded: 150000 }, '2026-09-15T03:00:00.000Z')] });
    expect(month(r, '2026-09').total).toBe(150000);
    expect(r.items[0].kind).toBe('PLAN_CHANGE');
  });

  it('a plan change from the merchant plan route (plan_changed) with only amountDue counts it too; 0 counts nothing', () => {
    const r = run({
      activities: [
        change(7, { amountDue: 90000 }, '2026-09-15T03:00:00.000Z', 'plan_changed'),
        change(7, { amountDue: 0, amountDueRounded: 0 }, '2026-09-16T03:00:00.000Z'),
      ],
    });
    expect(r.total).toBe(90000);
    expect(r.count).toBe(1);
  });

  it('Case H: a PENDING transfer created before the hotfix is counted on its created day', () => {
    const r = run({ payments: [pay({ when: '2026-11-02T05:00:00.000Z', amount: 300000 })] });
    expect(month(r, '2026-11').total).toBe(300000);
    expect(r.items[0]).toMatchObject({ kind: 'PENDING_PAYMENT', amount: 300000 });
  });

  it('Case I: a PENDING payment created after the hotfix is a transfer still waiting: not counted', () => {
    const r = run({ payments: [pay({ when: PENDING_COUNTS_BEFORE.toISOString() })] });
    expect(r.total).toBe(0);
  });

  it('PENDING counts only for plan types and TRANSFER / MANUAL / CASH; a COMPLETED row is real money, not an estimate', () => {
    const r = run({
      payments: [
        pay({ when: '2026-11-02T05:00:00.000Z', method: 'STRIPE' }),
        pay({ when: '2026-11-02T05:00:00.000Z', type: 'ORDER_PAYMENT' }),
        pay({ when: '2026-11-02T05:00:00.000Z', status: 'COMPLETED' }),
        pay({ when: '2026-11-02T05:00:00.000Z', status: 'FAILED' }),
      ],
    });
    expect(r.total).toBe(0);
  });

  it('Case D / other currencies: a USD shop is left out; a trial extension without an amount is 0', () => {
    const r = run({
      activities: [panel(9, { method: 'MANUAL_EXTENSION', amount: 10 }, '2026-09-10T03:00:00.000Z'), panel(7, { method: 'MANUAL_EXTENSION' }, '2026-09-11T03:00:00.000Z')],
    });
    expect(r.total).toBe(0);
  });

  it('a payment dated 23:30 UTC is already the next Vietnam day', () => {
    const r = run({ activities: [panel(7, { method: 'MANUAL_EXTENSION', amount: 100000 }, '2026-08-31T20:00:00.000Z')] });
    expect(r.items[0].dateKey).toBe('2026-09-01');
    expect(month(r, '2026-09').total).toBe(100000);
    expect(month(r, '2026-08').total).toBe(0);
  });

  it('a month report totals only that month; the year report keeps the 12 months', () => {
    const activities = [panel(7, { method: 'MANUAL_EXTENSION', amount: 100000 }, '2026-10-03T03:00:00.000Z'), panel(7, { method: 'MANUAL_EXTENSION', amount: 50000 }, '2026-11-03T03:00:00.000Z')];
    const r = run({ activities, query: { scope: 'month', month: '2026-10', year: 2026 } });
    expect(r.total).toBe(100000);
    expect(r.count).toBe(1);
    expect(r.months).toHaveLength(12);
    expect(month(r, '2026-11').total).toBe(50000);
  });

  it('items are the 10 newest of the period', () => {
    const activities = Array.from({ length: 12 }, (_, i) => panel(7, { method: 'MANUAL_EXTENSION', amount: 1000 }, `2026-10-${String(i + 1).padStart(2, '0')}T03:00:00.000Z`));
    const r = run({ activities });
    expect(r.items).toHaveLength(10);
    expect(r.items[0].dateKey).toBe('2026-10-12');
    expect(r.count).toBe(12);
  });
});
