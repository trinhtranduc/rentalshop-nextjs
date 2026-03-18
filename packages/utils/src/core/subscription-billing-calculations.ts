import type { BillingInterval, Plan, Subscription } from '@rentalshop/types';
import { calculateSubscriptionPrice } from './pricing-calculator';
import { normalizeBillingInterval } from './billing-interval';

export interface PlanChangeCalculation {
  oldPlanPeriodPrice: number;
  oldPlanPeriodDays: number;
  usedDays: number;
  remainingDays: number;
  remainingCreditValue: number;
  newPlanPeriodPrice: number;
  totalDue: number;
}

export interface ExtensionCalculation {
  extensionDays: number;
  selectedIntervalDays: number;
  selectedIntervalPrice: number;
  extensionPrice: number;
  totalDue: number;
}

function daysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function addMonthsPreserveDay(start: Date, months: number): Date {
  const end = new Date(start);
  const originalDay = start.getDate();
  end.setMonth(end.getMonth() + months);
  if (end.getDate() !== originalDay) {
    end.setDate(1);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
  }
  return end;
}

function intervalMonths(interval: BillingInterval): number {
  switch (interval) {
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'semi_annual':
      return 6;
    case 'annual':
      return 12;
    default:
      return 1;
  }
}

/**
 * Calculate total due for changing plan, using the same credit logic as UI:
 * totalDue = max(0, newPlanPriceForSelectedInterval - remainingCreditFromOldPeriod)
 */
export function calculatePlanChangeTotal(params: {
  subscription: Pick<Subscription, 'currentPeriodStart' | 'currentPeriodEnd' | 'billingInterval'> & { plan: Pick<Plan, 'basePrice'> };
  newPlan: Pick<Plan, 'basePrice'>;
  selectedInterval: BillingInterval | string;
  now?: Date;
}): PlanChangeCalculation {
  const now = params.now ?? new Date();
  const selectedInterval = normalizeBillingInterval(params.selectedInterval);

  const currentPeriodStart = new Date(params.subscription.currentPeriodStart as any);
  const currentPeriodEnd = new Date(params.subscription.currentPeriodEnd as any);
  const oldInterval = normalizeBillingInterval(params.subscription.billingInterval);

  const oldPlan: Plan = { basePrice: params.subscription.plan.basePrice } as any;
  const newPlan: Plan = { basePrice: params.newPlan.basePrice } as any;

  const oldPlanPeriodDays = Math.max(1, daysBetween(currentPeriodStart, currentPeriodEnd));
  const usedDays = Math.max(0, Math.min(oldPlanPeriodDays, daysBetween(currentPeriodStart, now)));
  const remainingDays = Math.max(0, Math.min(oldPlanPeriodDays, daysBetween(now, currentPeriodEnd)));

  const oldPlanPeriodPrice = calculateSubscriptionPrice(oldPlan as any, oldInterval as any);
  const remainingCreditValue =
    remainingDays > 0 ? (remainingDays / oldPlanPeriodDays) * oldPlanPeriodPrice : 0;

  const newPlanPeriodPrice = calculateSubscriptionPrice(newPlan as any, selectedInterval as any);
  const totalDue = Math.max(0, newPlanPeriodPrice - remainingCreditValue);

  return {
    oldPlanPeriodPrice,
    oldPlanPeriodDays,
    usedDays,
    remainingDays,
    remainingCreditValue,
    newPlanPeriodPrice,
    totalDue,
  };
}

/**
 * Calculate total due for extending a subscription to a new end date.
 * Uses selected billing interval price + interval day-count:
 * extensionPrice = (extensionDays / selectedIntervalDays) * selectedIntervalPrice
 */
export function calculateExtensionTotal(params: {
  oldEndDate: Date;
  newEndDate: Date;
  plan: Pick<Plan, 'basePrice'>;
  selectedInterval: BillingInterval | string;
}): ExtensionCalculation {
  const selectedInterval = normalizeBillingInterval(params.selectedInterval);

  const extensionDays = Math.max(0, daysBetween(params.oldEndDate, params.newEndDate));
  const selectedIntervalEnd = addMonthsPreserveDay(params.oldEndDate, intervalMonths(selectedInterval));
  const selectedIntervalDays = Math.max(1, daysBetween(params.oldEndDate, selectedIntervalEnd));

  const plan: Plan = { basePrice: params.plan.basePrice } as any;
  const selectedIntervalPrice = calculateSubscriptionPrice(plan as any, selectedInterval as any);

  const extensionPrice = (extensionDays / selectedIntervalDays) * selectedIntervalPrice;
  const totalDue = extensionPrice;

  return {
    extensionDays,
    selectedIntervalDays,
    selectedIntervalPrice,
    extensionPrice,
    totalDue,
  };
}

