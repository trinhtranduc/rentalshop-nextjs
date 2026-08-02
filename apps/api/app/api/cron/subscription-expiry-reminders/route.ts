// ============================================================================
// SUBSCRIPTION EXPIRY REMINDER CRON JOB
// ============================================================================
// Emails merchants 3, 2 and 1 calendar days before `Subscription.currentPeriodEnd`.
//
// Auth (either one):
//   Authorization: Bearer ${CRON_SECRET}
//   x-cron-secret: ${CRON_SECRET}
//
// Railway cron setup (Settings → Cron Schedule on the API service, or a small
// cron service running curl):
//   Schedule:  0 2 * * *        # 02:00 UTC = 09:00 Asia/Ho_Chi_Minh, daily
//   Command:   curl -fsS -X POST "$API_URL/api/cron/subscription-expiry-reminders" \
//                -H "Authorization: Bearer $CRON_SECRET"
//
// Buckets are computed in Asia/Ho_Chi_Minh (SUBSCRIPTION_EXPIRY_CONFIG.REMINDER_TIMEZONE)
// so "3 days left" matches the merchant's own calendar. Running the job more than
// once a day is safe: every send is recorded as a SubscriptionActivity keyed by
// subscription + period end + bucket, and already-sent buckets are skipped.
//
// Add `?dryRun=1` to list what would be sent without sending or logging anything.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import type { ExpiringSubscription } from '@rentalshop/database';
import {
  ResponseBuilder,
  handleApiError,
  sendSubscriptionExpiryReminderEmail,
  formatDateKeyInTimeZone,
} from '@rentalshop/utils';
import { SUBSCRIPTION_EXPIRY_CONFIG, SUBSCRIPTION_STATUS } from '@rentalshop/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ReminderResult {
  subscriptionId: number;
  merchantId: number;
  daysBefore: number;
  recipients: string[];
  status: 'sent' | 'skipped_already_sent' | 'skipped_no_email' | 'failed' | 'dry_run';
  error?: string;
}

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get('authorization');
  const secretHeader = request.headers.get('x-cron-secret');

  return authHeader === `Bearer ${cronSecret}` || secretHeader === cronSecret;
}

/**
 * Merchant email is the primary recipient; active MERCHANT-role users are added
 * so the owner still hears about it if billing contact and login differ.
 */
function resolveRecipients(subscription: ExpiringSubscription): string[] {
  const emails = [subscription.merchant.email, ...subscription.merchantUserEmails]
    .filter((email): email is string => Boolean(email && email.trim()))
    .map((email) => email.trim());

  return Array.from(new Set(emails.map((email) => email.toLowerCase())));
}

async function processDayBucket(
  daysBefore: number,
  now: Date,
  renewUrl: string | undefined,
  dryRun: boolean
): Promise<ReminderResult[]> {
  const { dateKey, subscriptions } = await db.subscriptionExpiryReminders.findExpiringInDays(
    daysBefore,
    now
  );

  if (subscriptions.length === 0) return [];

  const sentKeys = await db.subscriptionExpiryReminders.findSentKeys(
    subscriptions.map((subscription) => subscription.id),
    now
  );

  const results: ReminderResult[] = [];

  for (const subscription of subscriptions) {
    const reminderKey = db.subscriptionExpiryReminders.buildKey(subscription.id, dateKey, daysBefore);
    const base = {
      subscriptionId: subscription.id,
      merchantId: subscription.merchantId,
      daysBefore,
    };

    if (sentKeys.has(reminderKey)) {
      results.push({ ...base, recipients: [], status: 'skipped_already_sent' });
      continue;
    }

    const recipients = resolveRecipients(subscription);
    if (recipients.length === 0) {
      console.warn('⚠️ [ExpiryReminder] No email address for merchant', {
        merchantId: subscription.merchantId,
        subscriptionId: subscription.id,
      });
      results.push({ ...base, recipients: [], status: 'skipped_no_email' });
      continue;
    }

    if (dryRun) {
      results.push({ ...base, recipients, status: 'dry_run' });
      continue;
    }

    // SES takes one recipient per call, so send individually: the merchant
    // billing address decides success, extra owner addresses are best-effort.
    const [primaryRecipient, ...secondaryRecipients] = recipients;

    try {
      const sendTo = (email: string) =>
        sendSubscriptionExpiryReminderEmail({
          merchantName: subscription.merchant.name || 'Quý khách',
          email,
          planName: subscription.planName,
          periodEnd: subscription.currentPeriodEnd,
          daysRemaining: daysBefore,
          status: subscription.status,
          renewUrl,
        });

      const emailResult = await sendTo(primaryRecipient);

      if (!emailResult.success) {
        results.push({ ...base, recipients, status: 'failed', error: emailResult.error });
        continue;
      }

      for (const secondary of secondaryRecipients) {
        const secondaryResult = await sendTo(secondary);
        if (!secondaryResult.success) {
          console.warn('⚠️ [ExpiryReminder] Secondary recipient failed', {
            subscriptionId: subscription.id,
            email: secondary,
            error: secondaryResult.error,
          });
        }
      }

      // Only recorded after a successful send, so a transient SES failure is
      // retried by tomorrow's run (or an earlier manual re-run).
      await db.subscriptionExpiryReminders.recordSent({
        subscriptionId: subscription.id,
        reminderKey,
        daysBefore,
        periodEnd: subscription.currentPeriodEnd,
        recipients,
        planName: subscription.planName,
        messageId: emailResult.messageId,
      });

      results.push({ ...base, recipients, status: 'sent' });
    } catch (error) {
      console.error('❌ [ExpiryReminder] Failed to process subscription', {
        subscriptionId: subscription.id,
        daysBefore,
        error,
      });
      results.push({
        ...base,
        recipients,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

async function handleExpiryReminders(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(ResponseBuilder.error('UNAUTHORIZED'), { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === '1' || searchParams.get('dryRun') === 'true';

    const now = new Date();
    const timeZone = SUBSCRIPTION_EXPIRY_CONFIG.REMINDER_TIMEZONE;
    const clientUrl = process.env.CLIENT_URL;
    const renewUrl = clientUrl ? `${clientUrl.replace(/\/$/, '')}/subscription` : undefined;

    console.log('🔔 [ExpiryReminder] Starting subscription expiry reminder cron', {
      today: formatDateKeyInTimeZone(now, timeZone),
      timeZone,
      buckets: SUBSCRIPTION_EXPIRY_CONFIG.PERIOD_EXPIRY_NOTIFICATIONS,
      dryRun,
    });

    const results: ReminderResult[] = [];
    for (const daysBefore of SUBSCRIPTION_EXPIRY_CONFIG.PERIOD_EXPIRY_NOTIFICATIONS) {
      results.push(...(await processDayBucket(daysBefore, now, renewUrl, dryRun)));
    }

    const summary = {
      sent: results.filter((result) => result.status === 'sent').length,
      skippedAlreadySent: results.filter((result) => result.status === 'skipped_already_sent').length,
      skippedNoEmail: results.filter((result) => result.status === 'skipped_no_email').length,
      failed: results.filter((result) => result.status === 'failed').length,
      dryRunCandidates: results.filter((result) => result.status === 'dry_run').length,
    };

    console.log('✅ [ExpiryReminder] Completed', summary);

    return NextResponse.json(
      ResponseBuilder.success('SUBSCRIPTION_EXPIRY_REMINDERS_COMPLETED', {
        today: formatDateKeyInTimeZone(now, timeZone),
        timeZone,
        statuses: [SUBSCRIPTION_STATUS.TRIAL, SUBSCRIPTION_STATUS.ACTIVE],
        daysBefore: SUBSCRIPTION_EXPIRY_CONFIG.PERIOD_EXPIRY_NOTIFICATIONS,
        dryRun,
        ...summary,
        results,
      })
    );
  } catch (error) {
    console.error('❌ [ExpiryReminder] Cron job failed:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

/**
 * POST /api/cron/subscription-expiry-reminders - Send due expiry reminder emails
 */
export async function POST(request: NextRequest) {
  return handleExpiryReminders(request);
}

/**
 * GET /api/cron/subscription-expiry-reminders - Same job, for cron runners that
 * can only issue GET requests. Still requires CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  return handleExpiryReminders(request);
}
