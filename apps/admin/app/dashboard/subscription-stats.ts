/**
 * Admin dashboard subscription tiles (#1190).
 * "In use" = còn hạn đang dùng (period not ended, not cancelled/paused).
 * Basic / Pro / Enterprise chips are among In use only.
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
  const inUseRows = subscriptions.filter((s) => isSubscriptionInUse(s, now));

  return {
    inUse: inUseRows.length,
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
    basic: inUseRows.filter((s) => planKey(s) === 'basic').length,
    pro: inUseRows.filter((s) => planKey(s).includes('pro')).length,
    enterprise: inUseRows.filter((s) => planKey(s).includes('enterprise')).length,
  };
}

export const DASHBOARD_MERCHANT_HREFS = {
  all: '/merchants',
  trial: '/merchants?status=trial',
  inUse: '/merchants?status=current',
  basic: '/merchants?status=current&plan=Basic',
  pro: '/merchants?status=current&plan=Professional',
  enterprise: '/merchants?status=current&plan=Enterprise',
  expiring: '/merchants?status=expiring',
  expired: '/merchants?status=expired',
  cancelled: '/merchants?status=cancelled',
} as const;
