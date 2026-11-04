import { calculateExtensionTotal, calculatePlanChangeTotal } from '../packages/utils/src/core/subscription-billing-calculations';

describe('Subscription billing logic (pure, no API)', () => {
  // #1470 (owner 2026-11-03): an upgrade keeps the days left as days (period from the current end), no money credit
  it('Basic (remaining) -> Pro charges the full Pro price and keeps the remaining days', () => {
    const now = new Date('2026-03-10T00:00:00.000Z');
    const periodStart = new Date('2026-03-01T00:00:00.000Z');
    const periodEnd = new Date('2026-04-01T00:00:00.000Z');

    // Basic: 50k/month, Pro: 100k/month
    const result = calculatePlanChangeTotal({
      subscription: {
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        billingInterval: 'monthly',
        plan: { basePrice: 50_000 },
      } as any,
      newPlan: { basePrice: 100_000 },
      selectedInterval: 'monthly',
      now,
    });

    // ~22 days left are kept: the period ends at the current end + 1 month, the full 100k is due
    expect(result.newPlanPeriodPrice).toBeCloseTo(100_000, 5);
    expect(result.oldPlanPeriodPrice).toBeCloseTo(50_000, 5);
    expect(result.remainingCreditValue).toBe(0);
    expect(result.totalDue).toBeCloseTo(100_000, 5);
    expect(result.newPeriodEnd.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('Basic (remaining) -> Basic quarterly charges the full quarter from the current end', () => {
    const now = new Date('2026-03-10T00:00:00.000Z');
    const periodStart = new Date('2026-03-01T00:00:00.000Z');
    const periodEnd = new Date('2026-04-01T00:00:00.000Z');

    const result = calculatePlanChangeTotal({
      subscription: {
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        billingInterval: 'monthly',
        plan: { basePrice: 50_000 },
      } as any,
      newPlan: { basePrice: 50_000 },
      selectedInterval: 'quarterly',
      now,
    });

    expect(result.newPlanPeriodPrice).toBeCloseTo(150_000, 5); // 3 months, 0% discount
    expect(result.totalDue).toBeCloseTo(150_000, 5);
    expect(result.newPeriodEnd.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it('Extend should use selected interval price (quarterly) and interval day-count', () => {
    const oldEnd = new Date('2026-04-01T00:00:00.000Z');
    const newEnd = new Date('2026-05-01T00:00:00.000Z'); // +30 days extension

    const monthly = calculateExtensionTotal({
      oldEndDate: oldEnd,
      newEndDate: newEnd,
      plan: { basePrice: 50_000 },
      selectedInterval: 'monthly',
    });

    const quarterly = calculateExtensionTotal({
      oldEndDate: oldEnd,
      newEndDate: newEnd,
      plan: { basePrice: 50_000 },
      selectedInterval: 'quarterly',
    });

    // Quarterly price is 3x, but day-count is ~3 months; should be similar scale for 1-month extension
    expect(monthly.totalDue).toBeGreaterThan(40_000);
    expect(monthly.totalDue).toBeLessThan(60_000);

    // Quarterly-based proration for 1 month should be near monthly too (not 150k)
    expect(quarterly.totalDue).toBeGreaterThan(40_000);
    expect(quarterly.totalDue).toBeLessThan(60_000);
  });
});

