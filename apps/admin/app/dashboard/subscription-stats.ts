/**
 * Admin dashboard subscription tiles (#1190).
 * Basic/Pro are among ACTIVE only so they can break down the Active number.
 * Expiring/Expired use the same 7×24h window as GET merchants / #1180.
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
  active: number;
  trial: number;
  expired: number;
  expiring: number;
  cancelled: number;
  basic: number;
  pro: number;
};

function statusKey(row: DashboardSubscriptionRow): string {
  return String(row.status || '').toLowerCase();
}

function planKey(row: DashboardSubscriptionRow): string {
  return String(row.plan?.name || '').toLowerCase();
}

export function computeDashboardSubscriptionStats(
  subscriptions: DashboardSubscriptionRow[],
  now: Date = new Date()
): DashboardSubscriptionStats {
  const nowMs = now.getTime();
  const expiringUntil = nowMs + DASHBOARD_EXPIRING_MS;
  const activeRows = subscriptions.filter((s) => statusKey(s) === 'active');

  return {
    active: activeRows.length,
    trial: subscriptions.filter((s) => statusKey(s) === 'trial').length,
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
    basic: activeRows.filter((s) => planKey(s) === 'basic').length,
    pro: activeRows.filter((s) => planKey(s).includes('pro')).length,
  };
}

export const DASHBOARD_MERCHANT_HREFS = {
  all: '/merchants',
  trial: '/merchants?status=trial',
  active: '/merchants?status=active',
  basic: '/merchants?status=active&plan=Basic',
  pro: '/merchants?status=active&plan=Professional',
  expiring: '/merchants?status=expiring',
  expired: '/merchants?status=expired',
  cancelled: '/merchants?status=cancelled',
} as const;
