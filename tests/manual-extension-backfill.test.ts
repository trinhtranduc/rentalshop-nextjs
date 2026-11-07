/**
 * #1486: rules of the back-fill of Payments for manual plan extensions (scripts/lib/manual-extension-backfill.ts).
 */
import { approvedRows, parseCsv, planBackfill, toCsv, transactionIdOf, type ActivityRow } from '../scripts/lib/manual-extension-backfill';

const at = (iso: string) => new Date(iso);
const subs = [{ id: 7, merchantId: 70, currency: 'VND', merchantName: 'Shop, "A"' }];
const panel = (id: number, meta: Record<string, unknown>, when = '2026-09-10T03:00:00.000Z'): ActivityRow => ({
  id, subscriptionId: 7, type: 'subscription_extended', metadata: JSON.stringify(meta), createdAt: at(when),
});
const run = (activities: ActivityRow[], payments: any[] = []) => planBackfill({ activities, subscriptions: subs, payments });

describe('planBackfill', () => {
  it('a Manual Extension with an amount is ready and keeps the time of the extension', () => {
    const [c] = run([panel(1, { method: 'MANUAL_EXTENSION', amount: 500000 })]);
    expect(c).toMatchObject({ status: 'ready', amount: 500000, merchantId: 70, currency: 'VND' });
    expect(c.at.toISOString()).toBe('2026-09-10T03:00:00.000Z');
  });

  it('Payment Received made before #785 (no Payment written) is ready too', () => {
    expect(run([panel(2, { method: 'PAYMENT_RECEIVED', amount: 300000 })])[0].status).toBe('ready');
  });

  it('a method left out counts as Manual Extension', () => {
    expect(run([panel(3, { amount: 100000 })])[0]).toMatchObject({ status: 'ready', method: 'MANUAL_EXTENSION' });
  });

  it.each(['ADMIN_EXTENSION', 'COMPENSATION'])('%s is a free grant: skipped', (method) => {
    expect(run([panel(4, { method, amount: 500000 })])[0].status).toBe('skip');
  });

  it('amount 0 or missing is skipped', () => {
    expect(run([panel(5, { method: 'MANUAL_EXTENSION', amount: 0 }), panel(6, { method: 'MANUAL_EXTENSION' })].map((a) => a)).map((c) => c.status)).toEqual(['skip', 'skip']);
  });

  it('the admin route stores no amount: needs an amount', () => {
    const admin: ActivityRow = { id: 8, subscriptionId: 7, type: 'MANUAL_EXTENSION', metadata: JSON.stringify({ months: 1 }), createdAt: at('2026-10-01T00:00:00.000Z') };
    expect(run([admin])[0]).toMatchObject({ status: 'needs-amount', amount: null, source: 'admin' });
  });

  it('an extension that already has a Payment at that time is skipped; a Payment of another day is not', () => {
    const same = { subscriptionId: 7, transactionId: null, processedAt: at('2026-09-10T03:00:30.000Z'), createdAt: at('2026-09-10T03:00:30.000Z') };
    const other = { subscriptionId: 7, transactionId: null, processedAt: at('2026-08-01T03:00:00.000Z'), createdAt: at('2026-08-01T03:00:00.000Z') };
    expect(run([panel(9, { method: 'MANUAL_EXTENSION', amount: 1 })], [same])[0].status).toBe('skip');
    expect(run([panel(9, { method: 'MANUAL_EXTENSION', amount: 1 })], [other])[0].status).toBe('ready');
  });

  it('a second run inserts nothing: the back-filled transaction id is recognised', () => {
    const done = { subscriptionId: 7, transactionId: transactionIdOf(10), processedAt: at('2020-01-01T00:00:00.000Z'), createdAt: at('2020-01-01T00:00:00.000Z') };
    expect(run([panel(10, { method: 'MANUAL_EXTENSION', amount: 5 })], [done])[0]).toMatchObject({ status: 'skip', reason: 'already back-filled' });
  });

  it('other activity types and an unknown subscription are ignored / skipped', () => {
    expect(run([{ id: 11, subscriptionId: 7, type: 'subscription_renewed', metadata: null, createdAt: at('2026-09-01T00:00:00.000Z') }])).toEqual([]);
    expect(planBackfill({ activities: [panel(12, { amount: 5 })], subscriptions: [], payments: [] })[0].status).toBe('skip');
  });
});

describe('csv', () => {
  it('round trips a merchant name with a comma and quotes; skipped rows are not exported', () => {
    const candidates = run([panel(1, { method: 'MANUAL_EXTENSION', amount: 500000 }), panel(2, { method: 'COMPENSATION', amount: 9 })]);
    const rows = parseCsv(toCsv(candidates));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ include: 'yes', activityId: '1', merchant: 'Shop, "A"', dateVN: '2026-09-10 10:00', amount: '500000' });
  });

  it('approvedRows keeps only included rows with a positive amount and reports the rest', () => {
    const { rows, problems } = approvedRows([
      { include: 'yes', activityId: '1', amount: '500,000' },
      { include: '', activityId: '2', amount: '100' },
      { include: 'y', activityId: '3', amount: '' },
      { include: 'yes', activityId: '4', amount: '-5' },
      { include: 'yes', activityId: '1', amount: '7' },
    ]);
    expect(rows).toEqual([{ activityId: 1, amount: 500000 }]);
    expect(problems).toHaveLength(3);
  });
});
