import { calculateExtensionTotal, calculatePlanChangeTotal } from '../packages/utils/src/core/subscription-billing-calculations';

describe('Subscription billing logic (pure, no API)', () => {
  it('Basic (remaining) -> Pro should subtract remaining credit', () => {
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

    // Remaining ~22 days out of 31 -> credit ~ (22/31)*50k ≈ 35,483.87
    // New plan price = 100k -> due ≈ 64,516.13
    expect(result.newPlanPeriodPrice).toBeCloseTo(100_000, 5);
    expect(result.oldPlanPeriodPrice).toBeCloseTo(50_000, 5);
    expect(result.totalDue).toBeGreaterThan(60_000);
    expect(result.totalDue).toBeLessThan(70_000);
  });

  it('Basic (remaining) -> Basic quarterly should charge quarterly minus remaining credit', () => {
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
    expect(result.totalDue).toBeGreaterThan(110_000);
    expect(result.totalDue).toBeLessThan(150_000);
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

