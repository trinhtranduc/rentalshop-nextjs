import type { BillingInterval, Plan, Subscription } from '@rentalshop/types';
import { calculateSubscriptionPrice, getPricingBreakdown } from './pricing-calculator';
import { normalizeBillingInterval } from './billing-interval';
import { addMonthsInTimeZone, civilDaysBetween } from './billing-dates';

export interface PlanChangeCalculation {
  oldPlanPeriodPrice: number;
  oldPlanPeriodDays: number;
  usedDays: number;
  /** Vietnam days left of the current period: they carry over to the new plan (#1470). */
  remainingDays: number;
  /** Money credit for the days left: always 0 since #1470 (the days are kept instead); kept for old readers. */
  remainingCreditValue: number;
  newPlanPeriodPrice: number;
  /** #870: the shop's renewed add-ons for the new cycle (cycle discount), 0 without add-ons. */
  addonPeriodPrice: number;
  /** Add-on credit for the days left: always 0 since #1470 (the add-ons keep their days); kept for old readers. */
  addonCreditValue: number;
  /** New cycle price + add-ons for the cycle. */
  totalDue: number;
  /** The current period had ended (or had no end) at `now`. */
  expired: boolean;
  /** The new plan applies now. */
  newPeriodStart: Date;
  /** Current end + one cycle while the plan still runs, else now + one cycle; calendar months on the Vietnam day. */
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
  /** The plan part (unchanged meaning). */
  extensionPrice: number;
  /** #870: the add-on part, same formula on the add-on monthly total. */
  addonPrice: number;
  /** extensionPrice + addonPrice. */
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
 * Price and new period of a plan change (#1470, owner 2026-11-03; same rule as the in-app renewal credit A13):
 * - the new plan applies now (`newPeriodStart` = now);
 * - plan still running (end after `now`, a trial included): the period ends at the current end + one cycle, so the days
 *   left become days of the new plan; they are not paid back as money (#779 started every change now and credited them);
 * - expired (end at or before `now`, or no end): the period ends at now + one cycle;
 * - calendar months on the Vietnam day (31 Jan + 1 = 28 Feb);
 * - due = the new plan for the cycle + the shop's add-ons for the cycle (#870: `addonMonthlyTotal`, today's price).
 * `paidAddonMonthlyTotal` and `status` are still accepted; no credit is computed from them any more.
 * The admin change-plan dialog shows this same result, so it matches what changePlan() writes.
 */
export function calculatePlanChangeTotal(params: {
  subscription: Pick<Subscription, 'currentPeriodStart' | 'currentPeriodEnd' | 'billingInterval'> & { plan: Pick<Plan, 'basePrice'>; status?: string | null };
  newPlan: Pick<Plan, 'basePrice'>;
  selectedInterval: BillingInterval | string;
  addonMonthlyTotal?: number;
  paidAddonMonthlyTotal?: number;
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

  const newPlanPeriodPrice = calculateSubscriptionPrice(newPlan as any, selectedInterval as any);
  const addonMonthly = Math.max(0, Number(params.addonMonthlyTotal) || 0);
  const addonPeriodPrice = addonMonthly > 0 ? calculateSubscriptionPrice({ basePrice: addonMonthly } as any, selectedInterval as any) : 0;
  const totalDue = Math.max(0, newPlanPeriodPrice + addonPeriodPrice);

  // Same "still running" test as calculateRenewalTotal: the days left are kept by starting the cycle at the current end
  const expired = Number.isNaN(currentPeriodEnd.getTime()) || currentPeriodEnd.getTime() <= now.getTime();
  const cycleFrom = expired ? now : currentPeriodEnd;

  return {
    oldPlanPeriodPrice,
    oldPlanPeriodDays,
    usedDays,
    remainingDays,
    remainingCreditValue: 0,
    newPlanPeriodPrice,
    addonPeriodPrice,
    addonCreditValue: 0,
    totalDue,
    expired,
    newPeriodStart: now,
    newPeriodEnd: addMonthsInTimeZone(cycleFrom, intervalMonths(selectedInterval)),
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
  /** #870: the shop's renewed add-ons per month; charged for the extra days by the same formula. */
  addonMonthlyTotal?: number;
  selectedInterval: BillingInterval | string;
}): ExtensionCalculation {
  const selectedInterval = normalizeBillingInterval(params.selectedInterval);

  const extensionDays = Math.max(0, daysBetween(params.oldEndDate, params.newEndDate));
  const selectedIntervalEnd = addMonthsInTimeZone(params.oldEndDate, intervalMonths(selectedInterval));
  const selectedIntervalDays = Math.max(1, daysBetween(params.oldEndDate, selectedIntervalEnd));

  const plan: Plan = { basePrice: params.plan.basePrice } as any;
  const selectedIntervalPrice = calculateSubscriptionPrice(plan as any, selectedInterval as any);

  const extensionPrice = (extensionDays / selectedIntervalDays) * selectedIntervalPrice;
  const addonMonthly = Math.max(0, Number(params.addonMonthlyTotal) || 0);
  const addonPrice =
    addonMonthly > 0
      ? (extensionDays / selectedIntervalDays) * calculateSubscriptionPrice({ basePrice: addonMonthly } as any, selectedInterval as any)
      : 0;
  const totalDue = extensionPrice + addonPrice;

  return {
    extensionDays,
    selectedIntervalDays,
    selectedIntervalPrice,
    extensionPrice,
    addonPrice,
    totalDue,
  };
}

