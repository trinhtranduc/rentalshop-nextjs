/**
 * Date filter for order queries. Kept free of heavy imports so it can be unit tested.
 * - `exact`: the caller already sent Vietnam civil-day bounds (orders route, YYYY-MM-DD input); use them as is.
 * - otherwise: whole UTC days (previous behaviour, still used by other callers).
 */
// pickupPlanAt / returnPlanAt: planned-date ranges for the mobile filter sheet (#389)
export const ORDER_DATE_FILTER_FIELDS = ['createdAt', 'pickedUpAt', 'returnedAt', 'updatedAt', 'pickupPlanAt', 'returnPlanAt'] as const;
type OrderDateFilterField = (typeof ORDER_DATE_FILTER_FIELDS)[number];

const utcDayStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
const utcDayEnd = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));

export function applyOrderDateRange(
  where: Record<string, unknown>,
  startDate?: Date,
  endDate?: Date,
  dateField?: string,
  exact = false
) {
  if (!startDate && !endDate) return;
  const field: OrderDateFilterField = (ORDER_DATE_FILTER_FIELDS as readonly string[]).includes(dateField as string)
    ? (dateField as OrderDateFilterField)
    : 'createdAt';
  const range: Record<string, unknown> = {};
  if (startDate && !Number.isNaN(startDate.getTime())) range.gte = exact ? startDate : utcDayStart(startDate);
  if (endDate && !Number.isNaN(endDate.getTime())) range.lte = exact ? endDate : utcDayEnd(endDate);
  if (field !== 'createdAt' && field !== 'updatedAt') range.not = null;
  where[field] = range;
}
