/**
 * #1180: admin dashboard tiles must produce a Prisma where that matches the tile
 * (Trial / Active / Cancelled by DB status; Expiring Soon / Expired by period end).
 */
import { applySubscriptionListWhere } from '../packages/database/src/subscription-list-where';

const NOW = new Date('2026-10-24T03:53:00.000Z');
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe('subscription list where (#1180)', () => {
  it('uppercases a known status so dashboard ?status=trial matches TRIAL', () => {
    expect(applySubscriptionListWhere({}, { status: 'trial' }, NOW)).toEqual({ status: 'TRIAL' });
  });

  it('keeps an already-uppercase enum status', () => {
    expect(applySubscriptionListWhere({}, { status: 'ACTIVE' }, NOW)).toEqual({ status: 'ACTIVE' });
  });

  it('ignores an unknown status instead of querying a non-enum value', () => {
    expect(applySubscriptionListWhere({}, { status: 'soon' }, NOW)).toEqual({});
  });

  it('expiring = currentPeriodEnd in (now, now+7d]', () => {
    const where = applySubscriptionListWhere({}, { bucket: 'expiring' }, NOW);
    expect(where.currentPeriodEnd.gt).toEqual(NOW);
    expect((where.currentPeriodEnd.lte as Date).getTime()).toBe(NOW.getTime() + SEVEN_DAYS_MS);
  });

  it('expired = currentPeriodEnd < now', () => {
    expect(applySubscriptionListWhere({}, { bucket: 'expired' }, NOW).currentPeriodEnd).toEqual({
      lt: NOW,
    });
  });

  it('omitting bucket and status leaves the where unchanged (old callers)', () => {
    const base = { merchantId: 1 };
    expect(applySubscriptionListWhere({ ...base }, {}, NOW)).toEqual(base);
  });

  it('unknown bucket is ignored', () => {
    expect(applySubscriptionListWhere({}, { bucket: 'soon' }, NOW)).toEqual({});
  });

  it('status and bucket can combine (AND)', () => {
    const where = applySubscriptionListWhere({}, { status: 'ACTIVE', bucket: 'expiring' }, NOW);
    expect(where.status).toBe('ACTIVE');
    expect(where.currentPeriodEnd.gt).toEqual(NOW);
  });
});
