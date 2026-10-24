/**
 * Prisma `where` fragments for admin subscription search (#1180).
 * Dashboard tiles: Trial/Active/Cancelled = DB status; Expiring/Expired = period end.
 */

export const SUBSCRIPTION_SEARCH_STATUSES = [
  'TRIAL',
  'ACTIVE',
  'PAST_DUE',
  'CANCELLED',
  'PAUSED',
  'EXPIRED',
] as const;

export const SUBSCRIPTION_LIST_BUCKETS = ['expiring', 'expired'] as const;

export const SUBSCRIPTION_EXPIRING_MS = 7 * 24 * 60 * 60 * 1000;

export type SubscriptionListBucket = (typeof SUBSCRIPTION_LIST_BUCKETS)[number];

export function normalizeSubscriptionSearchStatus(
  status?: string | null
): (typeof SUBSCRIPTION_SEARCH_STATUSES)[number] | undefined {
  if (!status) return undefined;
  const upper = status.trim().toUpperCase();
  return (SUBSCRIPTION_SEARCH_STATUSES as readonly string[]).includes(upper)
    ? (upper as (typeof SUBSCRIPTION_SEARCH_STATUSES)[number])
    : undefined;
}

export function normalizeSubscriptionListBucket(
  bucket?: string | null
): SubscriptionListBucket | undefined {
  if (!bucket) return undefined;
  const lower = bucket.trim().toLowerCase();
  return (SUBSCRIPTION_LIST_BUCKETS as readonly string[]).includes(lower)
    ? (lower as SubscriptionListBucket)
    : undefined;
}

export function applySubscriptionListWhere(
  where: Record<string, unknown>,
  filters: { status?: string | null; bucket?: string | null },
  now: Date = new Date()
): Record<string, unknown> {
  const status = normalizeSubscriptionSearchStatus(filters.status);
  if (status) {
    where.status = status;
  }

  const bucket = normalizeSubscriptionListBucket(filters.bucket);
  if (bucket === 'expired') {
    where.currentPeriodEnd = { lt: now };
  } else if (bucket === 'expiring') {
    where.currentPeriodEnd = {
      gt: now,
      lte: new Date(now.getTime() + SUBSCRIPTION_EXPIRING_MS),
    };
  }

  return where;
}
