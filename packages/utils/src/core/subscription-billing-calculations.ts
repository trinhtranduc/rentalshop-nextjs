import type { BillingInterval, Plan, Subscription } from '@rentalshop/types';
import { calculateSubscriptionPrice, getPricingBreakdown } from './pricing-calculator';
import { normalizeBillingInterval } from './billing-interval';
import { addMonthsInTimeZone, civilDaysBetween } from './billing-dates';

export interface PlanChangeCalculation {
  oldPlanPeriodPrice: number;
  oldPlanPeriodDays: number;
  usedDays: number;
  remainingDays: number;
  remainingCreditValue: number;
  newPlanPeriodPrice: number;
  totalDue: number;
  /** New period: starts now, one cycle of calendar months on the Vietnam day (#779). */
  newPeriodStart: Date;
  newPeriodEnd: Date;
}

export interface RenewalCalculation {
  interval: BillingInterval;
  months: number;
  /** Cycle discount in percent (monthly 0, quarterly 0, semi-annual 5, annual 10). */
  discountPercent: number;
  /** The current period had ended (or had no end) at `now`. */
  expired: boolean;
  periodStart: Date;
  periodEnd: Date;
  planPrice: number;
  addonPrice: number;
  totalDue: number;
}

export interface ExtensionCalculation {
  extensionDays: number;
  selectedIntervalDays: number;
  selectedIntervalPrice: number;
  extensionPrice: number;
  totalDue: number;
}

/** Vietnam civil days from the day of `start` to the day of `end` (#588). */
function daysBetween(start: Date, end: Date): number {
  return civilDaysBetween(start, end);
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
    newPeriodStart: now,
    newPeriodEnd: addMonthsInTimeZone(now, intervalMonths(selectedInterval)),
  };
}

const RENEWAL_INTERVALS: Record<number, BillingInterval> = {
  1: 'monthly',
  3: 'quarterly',
  6: 'semi_annual',
  12: 'annual',
};

/** Renewal durations the API accepts (1, 3, 6, 12 months) as billing cycles; anything else is null (#779). */
export function renewalIntervalForMonths(months: number): BillingInterval | null {
  return RENEWAL_INTERVALS[months] ?? null;
}

/**
 * Price and new period of a renewal (owner rules, #779):
 * - price = plan + addons for the chosen cycle, with the cycle discount (0 / 0 / 5 / 10 %);
 * - expired (end <= now, or no end): the new period starts now;
 * - not expired: it continues from the current end, so the days left are kept;
 * - the end is one cycle of calendar months on the Vietnam day (31 Jan + 1 = 28 Feb).
 * `basePrice` and `addonMonthlyTotal` are monthly prices.
 */
export function calculateRenewalTotal(params: {
  basePrice: number;
  addonMonthlyTotal?: number;
  interval: BillingInterval | string;
  currentPeriodEnd: Date | string | null | undefined;
  now?: Date;
}): RenewalCalculation {
  const now = params.now ?? new Date();
  const interval = normalizeBillingInterval(params.interval);
  const months = intervalMonths(interval);

  const end = params.currentPeriodEnd ? new Date(params.currentPeriodEnd as any) : null;
  const expired = !end || Number.isNaN(end.getTime()) || end.getTime() <= now.getTime();
  const periodStart = expired ? now : (end as Date);
  const periodEnd = addMonthsInTimeZone(periodStart, months);

  const plan = getPricingBreakdown({ basePrice: params.basePrice || 0 } as Plan, interval);
  const addonPrice = calculateSubscriptionPrice({ basePrice: params.addonMonthlyTotal || 0 } as Plan, interval);

  return {
    interval,
    months,
    discountPercent: plan.discount,
    expired,
    periodStart,
    periodEnd,
    planPrice: plan.finalPrice,
    addonPrice,
    totalDue: plan.finalPrice + addonPrice,
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
  const selectedIntervalEnd = addMonthsInTimeZone(params.oldEndDate, intervalMonths(selectedInterval));
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

