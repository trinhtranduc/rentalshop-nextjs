/**
 * Map admin merchant-list query params to a Prisma `where` (#1190).
 * Dashboard tiles open `/merchants?status=…&plan=…`; those params must filter
 * in the database so `total` matches the tile (not a post-processed page).
 */
import {
  applySubscriptionListWhere,
  normalizeSubscriptionListBucket,
  normalizeSubscriptionSearchStatus,
} from './subscription-list-where';

export type MerchantListQuery = {
  status?: string | null;
  plan?: string | null;
  isActive?: string | null;
  subscriptionStatus?: string | null;
  bucket?: string | null;
};

export type MerchantListResolved = {
  isActive?: boolean;
  planId?: number;
  /** Nested `Merchant.subscription` Prisma filter (omit when empty). */
  subscription?: Record<string, unknown>;
};

const PLAN_NAME_PRO = /^(pro|professional)$/i;

/** Not "đang dùng": cancelled / paused even if the period date is still in the future. */
export const IN_USE_EXCLUDED_STATUSES = ['CANCELLED', 'PAUSED'] as const;

/** `status=current` (and aliases `active` / `inuse`) = còn hạn, đang dùng. */
export function isInUseListStatus(status?: string | null): boolean {
  if (!status) return false;
  const lower = status.trim().toLowerCase();
  return lower === 'current' || lower === 'inuse' || lower === 'in-use' || lower === 'active';
}

/** Period not ended, and not cancelled/paused. */
export function inUseSubscriptionWhere(now: Date = new Date()): Record<string, unknown> {
  return {
    currentPeriodEnd: { gt: now },
    status: { notIn: [...IN_USE_EXCLUDED_STATUSES] },
  };
}

/** Plan name fragment for `subscription.plan`. Digits stay `planId` on the merchant. */
export function merchantPlanNameWhere(plan?: string | null): Record<string, unknown> | undefined {
  if (!plan) return undefined;
  const raw = plan.trim();
  if (!raw || raw.toLowerCase() === 'all' || /^\d+$/.test(raw)) return undefined;
  if (PLAN_NAME_PRO.test(raw)) {
    return { name: { contains: 'pro', mode: 'insensitive' } };
  }
  return { name: { equals: raw, mode: 'insensitive' } };
}

function listStatusToSubscriptionStatus(status?: string | null): string | undefined {
  if (!status || status === 'all' || isInUseListStatus(status)) return undefined;
  const lower = status.trim().toLowerCase();
  if (lower === 'trial') return 'TRIAL';
  if (lower === 'cancelled' || lower === 'canceled') return 'CANCELLED';
  if (lower === 'expiring' || lower === 'expired' || lower === 'inactive') return undefined;
  return normalizeSubscriptionSearchStatus(status);
}

function listStatusToBucket(status?: string | null): string | undefined {
  if (!status || isInUseListStatus(status)) return undefined;
  const lower = status.trim().toLowerCase();
  if (lower === 'expiring' || lower === 'expired') return lower;
  return undefined;
}

/**
 * Resolve GET `/api/merchants` query params.
 * `status=current` (alias `active`) = còn hạn đang dùng, not DB enum ACTIVE.
 * `status=inactive` = shop isActive false. Period tiles use the #1180 window.
 */
export function resolveMerchantListFilters(
  query: MerchantListQuery,
  now: Date = new Date()
): MerchantListResolved {
  const out: MerchantListResolved = {};

  if (query.isActive === 'true') out.isActive = true;
  else if (query.isActive === 'false') out.isActive = false;
  else if (query.status?.trim().toLowerCase() === 'inactive') out.isActive = false;

  const plan = query.plan?.trim();
  if (plan && plan.toLowerCase() !== 'all' && /^\d+$/.test(plan)) {
    out.planId = parseInt(plan, 10);
  }

  const planWhere = merchantPlanNameWhere(query.plan);
  const inUse = isInUseListStatus(query.status);

  if (inUse) {
    const subscription = inUseSubscriptionWhere(now);
    if (planWhere) subscription.plan = planWhere;
    out.subscription = subscription;
    return out;
  }

  const subscriptionStatus =
    normalizeSubscriptionSearchStatus(query.subscriptionStatus) ||
    listStatusToSubscriptionStatus(query.status);
  const bucket =
    normalizeSubscriptionListBucket(query.bucket) || listStatusToBucket(query.status);

  const subscription = applySubscriptionListWhere(
    {},
    { status: subscriptionStatus, bucket },
    now
  ) as Record<string, unknown>;
  if (planWhere) {
    subscription.plan = planWhere;
  }
  if (Object.keys(subscription).length > 0) {
    out.subscription = subscription;
  }

  return out;
}
