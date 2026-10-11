/**
 * #796: PUT /api/subscriptions/[id] writes only the columns an admin may edit.
 * The edit form sends merchantId, changeReason, autoRenew, startDate, endDate, nextBillingDate, planVariantId...;
 * Prisma refused them and every save answered 422.
 */
import { pickEditableSubscriptionFields } from '../../apps/api/lib/subscription-update';

const formBody = {
  merchantId: 2,
  planId: 3,
  planVariantId: null,
  status: 'ACTIVE',
  currentPeriodStart: '2026-10-11T03:29:39.179Z',
  currentPeriodEnd: '2027-11-11T03:29:39.179Z',
  amount: 199000,
  currency: 'VND',
  interval: 'month',
  intervalCount: 1,
  period: 1,
  discount: 0,
  savings: 0,
  platform: 'web-mobile',
  cancelAtPeriodEnd: false,
  autoRenew: true,
  changeReason: '',
  startDate: '2026-10-11T03:29:39.179Z',
  endDate: '2027-11-11T03:29:39.179Z',
  nextBillingDate: '2027-11-11T03:29:39.179Z',
};

describe('pickEditableSubscriptionFields (#796)', () => {
  it('keeps only the editable columns from what the edit form sends', () => {
    expect(Object.keys(pickEditableSubscriptionFields(formBody)).sort()).toEqual(
      ['amount', 'cancelAtPeriodEnd', 'currency', 'currentPeriodEnd', 'currentPeriodStart', 'status'],
    );
  });

  it('turns the ISO dates into Date objects, keeping the instant', () => {
    const out: any = pickEditableSubscriptionFields(formBody);
    expect(out.currentPeriodStart).toBeInstanceOf(Date);
    expect(out.currentPeriodEnd.toISOString()).toBe('2027-11-11T03:29:39.179Z');
  });

  it('never lets the body move the subscription to another merchant or plan', () => {
    const out: any = pickEditableSubscriptionFields({ merchantId: 9, planId: 4, id: 77 });
    expect(out).toEqual({});
  });

  it('drops a date that is not a date and an amount that is not a number', () => {
    expect(pickEditableSubscriptionFields({ currentPeriodEnd: 'soon', amount: 'x' })).toEqual({});
  });

  it('keeps a cancel reason and status changes made on their own', () => {
    expect(pickEditableSubscriptionFields({ status: 'SUSPENDED', cancelReason: 'asked' })).toEqual({
      status: 'SUSPENDED',
      cancelReason: 'asked',
    });
  });
});
