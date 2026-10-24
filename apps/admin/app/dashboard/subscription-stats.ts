/**
 * Admin dashboard subscription tiles (#1192).
 * Merchants = every shop. In use = còn hạn. Plan chips are among all shops.
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

  return {
    inUse: subscriptions.filter((s) => isSubscriptionInUse(s, now)).length,
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
    basic: subscriptions.filter((s) => planKey(s) === 'basic').length,
    pro: subscriptions.filter((s) => planKey(s).includes('pro')).length,
    enterprise: subscriptions.filter((s) => planKey(s).includes('enterprise')).length,
  };
}

export const DASHBOARD_MERCHANT_HREFS = {
  all: '/merchants',
  basic: '/merchants?plan=Basic',
  pro: '/merchants?plan=Professional',
  enterprise: '/merchants?plan=Enterprise',
  inUse: '/merchants?status=current',
  trial: '/merchants?status=trial',
  expiring: '/merchants?status=expiring',
  expired: '/merchants?status=expired',
  cancelled: '/merchants?status=cancelled',
} as const;
