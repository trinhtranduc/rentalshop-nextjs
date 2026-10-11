/**
 * #782: pure price and limit rules for add-ons and modules (owner rules of 2026-10-11).
 * - Mid-period purchase: unitPrice × quantity × remaining Vietnam civil days / days of the period.
 * - Limits: plan + Σ quantity × per-unit limits of the active add-ons.
 * - Renewal: plan + every active item, with the cycle discount (0 / 0 / 5 / 10 %).
 * Must give the same answers under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import {
  calculateModuleQuote,
  moduleMonthlyTotal,
  sumModuleLimits,
} from '../../../packages/utils/src/core/module-pricing';
import { calculateRenewalTotal } from '../../../packages/utils/src/core/subscription-billing-calculations';

// A period of 31 Vietnam days: 1 Mar 00:00 VN → 1 Apr 00:00 VN.
const start = new Date('2026-02-28T17:00:00Z');
const end = new Date('2026-03-31T17:00:00Z');

describe('calculateModuleQuote', () => {
  it('9 days used, 22 left of 31: 2 staff at 30,000 = 60,000 × 22 / 31', () => {
    const q = calculateModuleQuote({ unitPrice: 30000, quantity: 2, periodStart: start, periodEnd: end, now: new Date('2026-03-10T03:00:00Z') });
    expect(q.periodDays).toBe(31);
    expect(q.remainingDays).toBe(22);
    expect(q.monthlyPrice).toBe(60000);
    expect(q.amountDue).toBeCloseTo((60000 * 22) / 31, 2);
  });

  it('first day of the period: the whole period is left, so the full monthly price', () => {
    const q = calculateModuleQuote({ unitPrice: 30000, quantity: 1, periodStart: start, periodEnd: end, now: new Date('2026-03-01T02:00:00Z') });
    expect(q.remainingDays).toBe(31);
    expect(q.amountDue).toBeCloseTo(30000, 2);
  });

  it('the day counts on the Vietnam day, not the UTC day (23:30 UTC on 9 Mar is already 10 Mar in Vietnam)', () => {
    const q = calculateModuleQuote({ unitPrice: 31000, quantity: 1, periodStart: start, periodEnd: end, now: new Date('2026-03-09T23:30:00Z') });
    expect(q.remainingDays).toBe(22);
    expect(q.amountDue).toBeCloseTo((31000 * 22) / 31, 2);
  });

  it('expired period: nothing to charge', () => {
    const q = calculateModuleQuote({ unitPrice: 30000, quantity: 2, periodStart: start, periodEnd: end, now: new Date('2026-05-01T03:00:00Z') });
    expect(q.remainingDays).toBe(0);
    expect(q.amountDue).toBe(0);
  });

  it('a free item (price 0) is free', () => {
    const q = calculateModuleQuote({ unitPrice: 0, quantity: 5, periodStart: start, periodEnd: end, now: new Date('2026-03-10T03:00:00Z') });
    expect(q.amountDue).toBe(0);
  });

  it('rounds to whole VND', () => {
    const q = calculateModuleQuote({ unitPrice: 30000, quantity: 1, periodStart: start, periodEnd: end, now: new Date('2026-03-10T03:00:00Z') });
    expect(Number.isInteger(q.amountDueRounded)).toBe(true);
    expect(q.amountDueRounded).toBe(21290); // 30000 × 22 / 31 = 21290.32
  });
});

describe('sumModuleLimits', () => {
  it('adds quantity × per-unit limits of active add-ons, per entity', () => {
    const total = sumModuleLimits([
      { kind: 'quantity', isActive: true, quantity: 2, limits: { outlets: 1, users: 3 } },
      { kind: 'quantity', isActive: true, quantity: 5, limits: { users: 1 } },
    ]);
    expect(total).toEqual({ outlets: 2, users: 11, products: 0, customers: 0, orders: 0 });
  });

  it('ignores inactive add-ons and feature modules', () => {
    const total = sumModuleLimits([
      { kind: 'quantity', isActive: false, quantity: 4, limits: { users: 1 } },
      { kind: 'feature', isActive: true, quantity: 1, limits: null },
      { kind: 'quantity', isActive: true, quantity: 1, limits: { users: 2 } },
    ]);
    expect(total.users).toBe(2);
  });

  it('a migrated old addon (5 columns, quantity 1) gives exactly its numbers', () => {
    const total = sumModuleLimits([
      { kind: 'quantity', isActive: true, quantity: 1, limits: { outlets: 1, users: 2, products: 100, customers: 200, orders: 300 } },
    ]);
    expect(total).toEqual({ outlets: 1, users: 2, products: 100, customers: 200, orders: 300 });
  });

  it('no items, no limits added', () => {
    expect(sumModuleLimits([])).toEqual({ outlets: 0, users: 0, products: 0, customers: 0, orders: 0 });
  });
});

describe('moduleMonthlyTotal and the renewal total', () => {
  const items = [
    { kind: 'quantity', isActive: true, removeAtPeriodEnd: false, quantity: 3, unitPrice: 30000 },
    { kind: 'feature', isActive: true, removeAtPeriodEnd: false, quantity: 1, unitPrice: 50000 },
    { kind: 'quantity', isActive: true, removeAtPeriodEnd: true, quantity: 2, unitPrice: 30000 }, // ends at renewal
    { kind: 'quantity', isActive: false, removeAtPeriodEnd: false, quantity: 9, unitPrice: 30000 }, // already ended
  ];

  it('sums price × quantity of active items not marked for removal', () => {
    expect(moduleMonthlyTotal(items)).toBe(3 * 30000 + 50000);
  });

  it('renewal = plan + items for the cycle, same discount: annual, plan 100,000 + items 140,000 / month', () => {
    const r = calculateRenewalTotal({
      basePrice: 100000,
      addonMonthlyTotal: moduleMonthlyTotal(items),
      interval: 'annual',
      currentPeriodEnd: new Date('2026-12-01T00:00:00Z'),
      now: new Date('2026-10-11T03:00:00Z'),
    });
    expect(r.planPrice).toBeCloseTo(1080000, 2);
    expect(r.addonPrice).toBeCloseTo(140000 * 12 * 0.9, 2);
    expect(r.totalDue).toBeCloseTo(1080000 + 1512000, 2);
  });

  it('monthly cycle has no discount', () => {
    const r = calculateRenewalTotal({
      basePrice: 100000,
      addonMonthlyTotal: 140000,
      interval: 'monthly',
      currentPeriodEnd: new Date('2026-12-01T00:00:00Z'),
      now: new Date('2026-10-11T03:00:00Z'),
    });
    expect(r.totalDue).toBeCloseTo(240000, 2);
  });
});
