/**
 * The columns `PUT /api/subscriptions/[id]` may write (#796).
 * The admin edit form sends more than the table holds (merchantId, changeReason, autoRenew, startDate, endDate,
 * nextBillingDate, planVariantId, ...), and Prisma refused the whole update. The plan goes through `changePlan`,
 * the merchant never moves, the cycle (interval, discount, ...) is set by renew / change-plan / extend.
 */
const DATE_FIELDS = ['currentPeriodStart', 'currentPeriodEnd'] as const;

export function pickEditableSubscriptionFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if (typeof body.status === 'string' && body.status) out.status = body.status;
  if (typeof body.currency === 'string' && body.currency) out.currency = body.currency;
  if (typeof body.cancelReason === 'string') out.cancelReason = body.cancelReason;
  if (typeof body.cancelAtPeriodEnd === 'boolean') out.cancelAtPeriodEnd = body.cancelAtPeriodEnd;
  if (typeof body.amount === 'number' && Number.isFinite(body.amount)) out.amount = body.amount;
  for (const key of DATE_FIELDS) {
    const raw = body[key];
    if (typeof raw !== 'string' && !(raw instanceof Date)) continue;
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) out[key] = date;
  }
  return out;
}
