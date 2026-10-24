/**
 * Admin dashboard subscription tiles (#1194 / #1196).
 * Merchants = every shop. In use = còn hạn. Plan chips (Trial/Basic/Pro/Enterprise) are among In use only.
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
  basic: number;
  pro: number;
  enterprise: number;
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

  return {
    inUse: inUseRows.length,
    trial: subscriptions.filter((s) => statusKey(s) === 'trial').length,
    inUseTrial: inUseRows.filter((s) => planKey(s) === 'trial').length,
    cancelled: subscriptions.filter((s) => statusKey(s) === 'cancelled').length,
    expired: subscriptions.filter((s) => {
      if (!s.currentPeriodEnd) return false;
      return new Date(s.currentPeriodEnd).getTime() < nowMs;
    }).length,
    expiring: subscriptions.filter((s) => {
      if (!s.currentPeriodEnd) return false;
      const end = new Date(s.currentPeriodEnd).getTime();
      return end > nowMs && end <= expiringUntil;
    }).length,
    basic: inUseRows.filter((s) => planKey(s).includes('basic')).length,
    pro: inUseRows.filter((s) => planKey(s).includes('pro')).length,
    enterprise: inUseRows.filter((s) => planKey(s).includes('enterprise')).length,
  };
}

export const DASHBOARD_MERCHANT_HREFS = {
  all: '/merchants',
  basic: '/merchants?status=current&plan=Basic',
  pro: '/merchants?status=current&plan=Professional',
  enterprise: '/merchants?status=current&plan=Enterprise',
  trialPlan: '/merchants?status=current&plan=Trial',
  inUse: '/merchants?status=current',
  trial: '/merchants?status=trial',
  expiring: '/merchants?status=expiring',
  expired: '/merchants?status=expired',
  cancelled: '/merchants?status=cancelled',
} as const;
