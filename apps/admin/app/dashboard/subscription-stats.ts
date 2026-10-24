/**
 * Admin dashboard subscription tiles (#1194 / #1196 / #1198).
 * Merchants chips = total per plan. In use chips = còn hạn. Expired chips = hết hạn.
 */

/** Same window as `SUBSCRIPTION_EXPIRING_MS` in subscription-list-where.ts (client-safe copy). */
export const DASHBOARD_EXPIRING_MS = 7 * 24 * 60 * 60 * 1000;

export type DashboardSubscriptionRow = {
  status?: string | null;
  currentPeriodEnd?: string | Date | null;
  amount?: number | null;
  createdAt?: string | Date | null;
  plan?: { name?: string | null } | null;
};

export type DashboardSubscriptionStats = {
  inUse: number;
  trial: number;
  /** In-use shops whose plan name is Trial (signup default) — not the Trial tile. */
  inUseTrial: number;
  expired: number;
  expiring: number;
  cancelled: number;
  /** In-use (còn hạn) counts. */
  basic: number;
  pro: number;
  enterprise: number;
  /** Every shop on that plan, including hết hạn. */
  basicAll: number;
  proAll: number;
  enterpriseAll: number;
  /** Period already ended. */
  basicExpired: number;
  proExpired: number;
  enterpriseExpired: number;
};

function statusKey(row: DashboardSubscriptionRow): string {
  return String(row.status || '').toLowerCase();
}

function planKey(row: DashboardSubscriptionRow): string {
  return String(row.plan?.name || '').toLowerCase();
}

export function isSubscriptionInUse(row: DashboardSubscriptionRow, now: Date = new Date()): boolean {
  const status = statusKey(row);
  if (status === 'cancelled' || status === 'paused') return false;
  if (!row.currentPeriodEnd) return false;
  return new Date(row.currentPeriodEnd).getTime() > now.getTime();
}

export function computeDashboardSubscriptionStats(
  subscriptions: DashboardSubscriptionRow[],
  now: Date = new Date()
): DashboardSubscriptionStats {
  const nowMs = now.getTime();
  const expiringUntil = nowMs + DASHBOARD_EXPIRING_MS;
  const inUseRows = subscriptions.filter((s) => isSubscriptionInUse(s, now));
  const expiredRows = subscriptions.filter((s) => {
    if (!s.currentPeriodEnd) return false;
    return new Date(s.currentPeriodEnd).getTime() < nowMs;
  });
  const isBasic = (s: DashboardSubscriptionRow) => planKey(s).includes('basic');
  const isPro = (s: DashboardSubscriptionRow) => planKey(s).includes('pro');
  const isEnterprise = (s: DashboardSubscriptionRow) => planKey(s).includes('enterprise');

  return {
    inUse: inUseRows.length,
    trial: subscriptions.filter((s) => statusKey(s) === 'trial').length,
    inUseTrial: inUseRows.filter((s) => planKey(s) === 'trial').length,
    cancelled: subscriptions.filter((s) => statusKey(s) === 'cancelled').length,
    expired: expiredRows.length,
    expiring: subscriptions.filter((s) => {
      if (!s.currentPeriodEnd) return false;
      const end = new Date(s.currentPeriodEnd).getTime();
      return end > nowMs && end <= expiringUntil;
    }).length,
    basic: inUseRows.filter(isBasic).length,
    pro: inUseRows.filter(isPro).length,
    enterprise: inUseRows.filter(isEnterprise).length,
    basicAll: subscriptions.filter(isBasic).length,
    proAll: subscriptions.filter(isPro).length,
    enterpriseAll: subscriptions.filter(isEnterprise).length,
    basicExpired: expiredRows.filter(isBasic).length,
    proExpired: expiredRows.filter(isPro).length,
    enterpriseExpired: expiredRows.filter(isEnterprise).length,
  };
}

export const DASHBOARD_MERCHANT_HREFS = {
  all: '/merchants',
  basicAll: '/merchants?plan=Basic',
  proAll: '/merchants?plan=Professional',
  enterpriseAll: '/merchants?plan=Enterprise',
  basic: '/merchants?status=current&plan=Basic',
  pro: '/merchants?status=current&plan=Professional',
  enterprise: '/merchants?status=current&plan=Enterprise',
  trialPlan: '/merchants?status=current&plan=Trial',
  basicExpired: '/merchants?status=expired&plan=Basic',
  proExpired: '/merchants?status=expired&plan=Professional',
  enterpriseExpired: '/merchants?status=expired&plan=Enterprise',
  inUse: '/merchants?status=current',
  trial: '/merchants?status=trial',
  expiring: '/merchants?status=expiring',
  expired: '/merchants?status=expired',
  cancelled: '/merchants?status=cancelled',
} as const;
