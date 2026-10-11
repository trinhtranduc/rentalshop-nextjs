/**
 * #779: one formula for renewal and plan-change price and dates (owner rules of 2026-10-11).
 * - Renew expired: new period starts now. Renew early: continues from the current end (days left kept).
 * - Price = plan (+ addons) for the cycle, discounts monthly 0%, quarterly 0%, semi-annual 5%, annual 10%.
 * - Upgrade: credit for unused Vietnam civil days, new period starts now, calendar months.
 * Must give the same answers under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import {
  calculatePlanChangeTotal,
  calculateRenewalTotal,
  renewalIntervalForMonths,
} from '../../../packages/utils/src/core/subscription-billing-calculations';

const iso = (d: Date) => d.toISOString();
const NOW = new Date('2026-10-11T03:00:00Z'); // 11 Oct 10:00 VN

describe('renewalIntervalForMonths', () => {
  it('maps the four renewal durations to the billing cycles', () => {
    expect(renewalIntervalForMonths(1)).toBe('monthly');
    expect(renewalIntervalForMonths(3)).toBe('quarterly');
    expect(renewalIntervalForMonths(6)).toBe('semi_annual');
    expect(renewalIntervalForMonths(12)).toBe('annual');
  });

  it('rejects any other number of months', () => {
    expect(renewalIntervalForMonths(2)).toBeNull();
    expect(renewalIntervalForMonths(0)).toBeNull();
    expect(renewalIntervalForMonths(24)).toBeNull();
  });
});

describe('calculateRenewalTotal: price', () => {
  const notExpiredEnd = new Date('2026-10-21T16:59:59.999Z'); // 21 Oct 23:59 VN

  it.each([
    ['monthly', 29],
    ['quarterly', 87],
    ['semi_annual', 165.3],
    ['annual', 313.2],
  ])('plan 29/month, %s = %d (0/0/5/10%% discount)', (interval, expected) => {
    const r = calculateRenewalTotal({ basePrice: 29, interval, currentPeriodEnd: notExpiredEnd, now: NOW });
    expect(r.planPrice).toBeCloseTo(expected, 2);
    expect(r.totalDue).toBeCloseTo(expected, 2);
  });

  it('uses the plan monthly price, not the stored cycle amount (annual sub renewed 1 month = 29, not 313.2)', () => {
    const r = calculateRenewalTotal({ basePrice: 29, interval: 'monthly', currentPeriodEnd: notExpiredEnd, now: NOW });
    expect(r.totalDue).toBeCloseTo(29, 2);
  });

  it('adds the addons for the same cycle and discount', () => {
    const r = calculateRenewalTotal({
      basePrice: 29,
      addonMonthlyTotal: 5,
      interval: 'annual',
      currentPeriodEnd: notExpiredEnd,
      now: NOW,
    });
    expect(r.planPrice).toBeCloseTo(313.2, 2);
    expect(r.addonPrice).toBeCloseTo(54, 2);
    expect(r.totalDue).toBeCloseTo(367.2, 2);
    expect(r.discountPercent).toBe(10);
    expect(r.months).toBe(12);
  });
});

describe('calculateRenewalTotal: dates', () => {
  it('not expired: continues from the current end, days left are kept', () => {
    const end = new Date('2026-10-21T16:59:59.999Z');
    const r = calculateRenewalTotal({ basePrice: 29, interval: 'monthly', currentPeriodEnd: end, now: NOW });
    expect(r.expired).toBe(false);
    expect(iso(r.periodStart)).toBe('2026-10-21T16:59:59.999Z');
    expect(iso(r.periodEnd)).toBe('2026-11-21T16:59:59.999Z');
  });

  it('expired: the new period starts at renewal time (ended 30/06, renewed 11/10 → 11/10 to 11/11)', () => {
    const end = new Date('2026-06-30T16:59:59.999Z');
    const r = calculateRenewalTotal({ basePrice: 29, interval: 'monthly', currentPeriodEnd: end, now: NOW });
    expect(r.expired).toBe(true);
    expect(iso(r.periodStart)).toBe(iso(NOW));
    expect(iso(r.periodEnd)).toBe('2026-11-11T03:00:00.000Z');
  });

  it('a missing end counts as expired', () => {
    const r = calculateRenewalTotal({ basePrice: 29, interval: 'monthly', currentPeriodEnd: null, now: NOW });
    expect(r.expired).toBe(true);
    expect(iso(r.periodStart)).toBe(iso(NOW));
  });

  it('calendar months on the Vietnam day: 31 Jan + 1 month = 28 Feb', () => {
    const end = new Date('2027-01-31T05:00:00Z'); // 31 Jan 12:00 VN
    const r = calculateRenewalTotal({ basePrice: 29, interval: 'monthly', currentPeriodEnd: end, now: NOW });
    expect(iso(r.periodEnd)).toBe('2027-02-28T05:00:00.000Z');
  });

  it('quarterly from 10/03 ends 10/06 (not 90 × 24h = 08/06)', () => {
    const end = new Date('2027-03-10T03:00:00Z');
    const r = calculateRenewalTotal({ basePrice: 29, interval: 'quarterly', currentPeriodEnd: end, now: NOW });
    expect(iso(r.periodEnd)).toBe('2027-06-10T03:00:00.000Z');
  });
});

describe('calculatePlanChangeTotal: upgrade credit and new period', () => {
  // Period 1 Mar VN → 1 Apr VN (31 civil days), now 10 Mar VN: 9 used, 22 left.
  const subscription = {
    currentPeriodStart: new Date('2026-02-28T17:00:00Z'),
    currentPeriodEnd: new Date('2026-03-31T17:00:00Z'),
    billingInterval: 'monthly',
    plan: { basePrice: 10 },
  } as any;
  const now = new Date('2026-03-10T03:00:00Z');

  it('Basic 10$ → Pro 30$ with 22/31 days left: credit 7.10, due 22.90', () => {
    const r = calculatePlanChangeTotal({ subscription, newPlan: { basePrice: 30 }, selectedInterval: 'monthly', now });
    expect(r.usedDays).toBe(9);
    expect(r.remainingDays).toBe(22);
    expect(r.remainingCreditValue).toBeCloseTo(7.1, 2);
    expect(r.totalDue).toBeCloseTo(22.9, 2);
  });

  it('the new period starts now and lasts one cycle by calendar months', () => {
    const r = calculatePlanChangeTotal({ subscription, newPlan: { basePrice: 30 }, selectedInterval: 'quarterly', now });
    expect(iso(r.newPeriodStart)).toBe(iso(now));
    expect(iso(r.newPeriodEnd)).toBe('2026-06-10T03:00:00.000Z');
    expect(r.newPlanPeriodPrice).toBeCloseTo(90, 2);
  });

  it('expired subscription: no credit, full new price', () => {
    const r = calculatePlanChangeTotal({
      subscription,
      newPlan: { basePrice: 30 },
      selectedInterval: 'monthly',
      now: new Date('2026-05-10T03:00:00Z'),
    });
    expect(r.remainingCreditValue).toBe(0);
    expect(r.totalDue).toBeCloseTo(30, 2);
  });
});
