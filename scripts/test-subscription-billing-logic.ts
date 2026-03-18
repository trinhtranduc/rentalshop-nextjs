import assert from 'node:assert/strict';
import { calculateExtensionTotal, calculatePlanChangeTotal } from '../packages/utils/src/core/subscription-billing-calculations';

function near(value: number, expected: number, tolerance: number) {
  assert.ok(
    Math.abs(value - expected) <= tolerance,
    `Expected ${value} to be within ±${tolerance} of ${expected}`
  );
}

function between(value: number, min: number, max: number) {
  assert.ok(value >= min && value <= max, `Expected ${value} to be between ${min} and ${max}`);
}

function scenarioBasicRemainingToProMonthly() {
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
    newPlan: { basePrice: 100_000 },
    selectedInterval: 'monthly',
    now,
  });

  near(result.oldPlanPeriodPrice, 50_000, 0.01);
  near(result.newPlanPeriodPrice, 100_000, 0.01);
  between(result.totalDue, 60_000, 70_000);

  return result;
}

function scenarioBasicRemainingToBasicQuarterly() {
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

  near(result.newPlanPeriodPrice, 150_000, 0.01);
  between(result.totalDue, 110_000, 150_000);

  return result;
}

function scenarioExtendOneMonthCompareMonthlyVsQuarterly() {
  const oldEnd = new Date('2026-04-01T00:00:00.000Z');
  const newEnd = new Date('2026-05-01T00:00:00.000Z');

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

  between(monthly.totalDue, 40_000, 60_000);
  between(quarterly.totalDue, 40_000, 60_000);

  return { monthly, quarterly };
}

function main() {
  console.log('== Subscription billing logic (pure) ==');

  const s1 = scenarioBasicRemainingToProMonthly();
  console.log('1) Basic remaining -> Pro monthly OK:', {
    remainingCreditValue: Math.round(s1.remainingCreditValue),
    totalDue: Math.round(s1.totalDue),
  });

  const s2 = scenarioBasicRemainingToBasicQuarterly();
  console.log('2) Basic remaining -> Basic quarterly OK:', {
    remainingCreditValue: Math.round(s2.remainingCreditValue),
    totalDue: Math.round(s2.totalDue),
  });

  const s3 = scenarioExtendOneMonthCompareMonthlyVsQuarterly();
  console.log('3) Extend 1 month (monthly vs quarterly) OK:', {
    monthly: Math.round(s3.monthly.totalDue),
    quarterly: Math.round(s3.quarterly.totalDue),
  });

  console.log('All scenarios passed.');
}

main();

