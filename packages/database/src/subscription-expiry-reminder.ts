// ============================================================================
// SUBSCRIPTION EXPIRY REMINDER QUERIES
// ============================================================================
// Data access for the daily reminder cron
// (POST /api/cron/subscription-expiry-reminders).

import { prisma } from './client';
import { getCalendarDayRangeInTimeZone } from '@rentalshop/utils';
import { SUBSCRIPTION_STATUS, SUBSCRIPTION_EXPIRY_CONFIG, USER_ROLE } from '@rentalshop/constants';

/**
 * Reminders older than this are irrelevant for the idempotency check: a bucket
 * is at most 3 days before the period end, so nothing further back can collide.
 * Bounding the lookup keeps the query cheap as activity history grows.
 */
const SENT_REMINDER_LOOKBACK_DAYS = 30;

export interface ExpiringSubscription {
  id: number;
  merchantId: number;
  status: string;
  currentPeriodEnd: Date;
  planName: string;
  merchant: {
    id: number;
    name: string;
    email: string;
  };
  /** Active MERCHANT-role users of that merchant, for CC-ing owners */
  merchantUserEmails: string[];
}

/**
 * Unique marker for "this subscription was already reminded about this period
 * end at this bucket". Includes the period end so a renewal (which moves
 * `currentPeriodEnd` forward) naturally starts a fresh reminder cycle.
 */
export function buildExpiryReminderKey(
  subscriptionId: number,
  periodEndDateKey: string,
  daysBefore: number
): string {
  return `${subscriptionId}:${periodEndDateKey}:${daysBefore}`;
}

/**
 * Find TRIAL/ACTIVE subscriptions whose `currentPeriodEnd` falls on the calendar
 * day `daysAhead` days from `reference`, as seen in `timeZone`.
 *
 * @param daysAhead - 3, 2 or 1
 * @param reference - "now" (injectable for tests / manual runs)
 */
export async function findSubscriptionsExpiringInDays(
  daysAhead: number,
  reference: Date = new Date(),
  timeZone: string = SUBSCRIPTION_EXPIRY_CONFIG.REMINDER_TIMEZONE
): Promise<{ dateKey: string; subscriptions: ExpiringSubscription[] }> {
  const { dateKey, start, end } = getCalendarDayRangeInTimeZone(reference, timeZone, daysAhead);

  const rows = await prisma.subscription.findMany({
    where: {
      status: { in: [SUBSCRIPTION_STATUS.TRIAL, SUBSCRIPTION_STATUS.ACTIVE] },
      currentPeriodEnd: { gte: start, lte: end }
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          users: {
            where: { role: USER_ROLE.MERCHANT, isActive: true, deletedAt: null },
            select: { email: true }
          }
        }
      },
      plan: { select: { name: true } }
    },
    orderBy: { currentPeriodEnd: 'asc' }
  });

  const subscriptions: ExpiringSubscription[] = rows.map((row: any) => ({
    id: row.id,
    merchantId: row.merchantId,
    status: row.status,
    currentPeriodEnd: row.currentPeriodEnd,
    planName: row.plan?.name || 'Unknown Plan',
    merchant: {
      id: row.merchant.id,
      name: row.merchant.name,
      email: row.merchant.email
    },
    merchantUserEmails: (row.merchant.users || [])
      .map((user: { email: string }) => user.email)
      .filter(Boolean)
  }));

  return { dateKey, subscriptions };
}

/**
 * Reminder keys already sent for the given subscriptions, so a re-run of the
 * cron on the same day does not email merchants twice.
 */
export async function findSentExpiryReminderKeys(
  subscriptionIds: number[],
  reference: Date = new Date()
): Promise<Set<string>> {
  if (subscriptionIds.length === 0) return new Set();

  const since = new Date(reference.getTime() - SENT_REMINDER_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const activities = await prisma.subscriptionActivity.findMany({
    where: {
      subscriptionId: { in: subscriptionIds },
      type: SUBSCRIPTION_EXPIRY_CONFIG.REMINDER_ACTIVITY_TYPE,
      createdAt: { gte: since }
    },
    select: { reason: true }
  });

  // The reminder key is stored in `reason` (a plain column) rather than inside
  // the JSON `metadata` string, so it stays cheap to read back.
  return new Set(
    activities
      .map((activity: { reason: string | null }) => activity.reason)
      .filter((reason: string | null): reason is string => Boolean(reason))
  );
}

/**
 * Log a sent reminder. Written only after the email succeeds, so a failed send
 * is retried by the next cron run.
 */
export async function recordExpiryReminderSent(params: {
  subscriptionId: number;
  reminderKey: string;
  daysBefore: number;
  periodEnd: Date;
  recipients: string[];
  planName?: string;
  messageId?: string;
}) {
  const { subscriptionId, reminderKey, daysBefore, periodEnd, recipients, planName, messageId } = params;

  return await prisma.subscriptionActivity.create({
    data: {
      subscriptionId,
      type: SUBSCRIPTION_EXPIRY_CONFIG.REMINDER_ACTIVITY_TYPE,
      description: `Expiry reminder sent ${daysBefore} day${daysBefore !== 1 ? 's' : ''} before ${periodEnd.toISOString().split('T')[0]}`,
      reason: reminderKey,
      metadata: JSON.stringify({
        daysBefore,
        periodEnd: periodEnd.toISOString(),
        recipients,
        planName,
        messageId,
        source: 'cron',
        category: 'billing',
        severity: 'info'
      })
    }
  });
}

/**
 * Simplified subscription expiry reminder operations
 */
export const simplifiedSubscriptionExpiryReminders = {
  findExpiringInDays: findSubscriptionsExpiringInDays,
  findSentKeys: findSentExpiryReminderKeys,
  recordSent: recordExpiryReminderSent,
  buildKey: buildExpiryReminderKey
};
