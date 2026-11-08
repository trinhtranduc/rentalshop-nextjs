/**
 * #1486 / #1505: price estimates of a manual extension whose activity stored no amount. Shared by the back-fill script
 * (scripts/lib/manual-extension-backfill.ts) and the admin revenue estimate (apps/api/lib/admin-revenue-estimate.ts).
 * Today's plan price, not the price of that day: an estimate.
 */
import { calculateExtensionTotal } from './subscription-billing-calculations';
import { addMonthsInTimeZone, civilDaysBetween } from './billing-dates';

export function parseMetadata(raw: string | null): Record<string, any> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

/** Interval the admin route writes for `months` (same mapping as the route) */
const intervalOfMonths = (months: number) => (months <= 1 ? 'monthly' : months <= 3 ? 'quarterly' : months <= 6 ? 'semi_annual' : 'annual');

/** Price of an extension from the plan price, as the dialog calculates it; null when the dates or the price are missing. */
export function estimateAmount(meta: Record<string, any>, planBasePrice: number | null | undefined): number | null {
  const previousEnd = meta.previousEnd ? new Date(meta.previousEnd) : null;
  const newEnd = meta.newEnd ? new Date(meta.newEnd) : null;
  const months = Number(meta.months);
  if (!previousEnd || !newEnd || Number.isNaN(previousEnd.getTime()) || Number.isNaN(newEnd.getTime())) return null;
  if (!planBasePrice || planBasePrice <= 0 || !Number.isFinite(months) || months <= 0) return null;
  const { totalDue } = calculateExtensionTotal({
    oldEndDate: previousEnd,
    newEndDate: newEnd,
    plan: { basePrice: planBasePrice },
    selectedInterval: intervalOfMonths(months),
  });
  return Number.isFinite(totalDue) && totalDue > 0 ? Math.round(totalDue) : null;
}

/** Price of an extension from the shop's current Subscription: its cycle price x extension days / cycle days. */
export function estimateFromSubscription(meta: Record<string, any>, amount: number | null | undefined, period: number | null | undefined): number | null {
  const previousEnd = meta.previousEnd ? new Date(meta.previousEnd) : null;
  const newEnd = meta.newEnd ? new Date(meta.newEnd) : null;
  const cycleMonths = Number(period) > 0 ? Number(period) : 1;
  if (!previousEnd || !newEnd || Number.isNaN(previousEnd.getTime()) || Number.isNaN(newEnd.getTime())) return null;
  if (!amount || amount <= 0) return null;
  const days = civilDaysBetween(previousEnd, newEnd);
  const cycleDays = civilDaysBetween(previousEnd, addMonthsInTimeZone(previousEnd, cycleMonths));
  if (days <= 0 || cycleDays <= 0) return null;
  return Math.round((amount * days) / cycleDays);
}
