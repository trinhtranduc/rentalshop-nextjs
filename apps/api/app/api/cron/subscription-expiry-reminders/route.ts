// ============================================================================
// SUBSCRIPTION EXPIRY REMINDER CRON JOB
// ============================================================================
// Emails merchants 3 calendar days before and on the expiry date
// (`Subscription.currentPeriodEnd`).
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
// so reminder dates match the merchant's own calendar. Running the job more than
// once a day is safe: every send is recorded as a SubscriptionActivity keyed by
// subscription + period end + bucket, and already-sent buckets are skipped.
//
// Add `?dryRun=1` to list what would be sent without sending or logging anything.

import { NextRequest, NextResponse } from 'next/server';
import {
  buildExpiryReminderKey,
  findSentExpiryReminderKeys,
  findSubscriptionsExpiringInDays,
  recordExpiryReminderSent,
  type ExpiringSubscription,
} from '../../../../../../packages/database/src/subscription-expiry-reminder';
import { sendSubscriptionExpiryReminderEmail } from '../../../../../../packages/utils/src/services/email';
import {
  formatDateKeyInTimeZone,
} from '../../../../../../packages/utils/src/core/date-range';
import {
  ResponseBuilder,
} from '../../../../../../packages/utils/src/api/response-builder';
import {
  handleApiError,
} from '../../../../../../packages/utils/src/core/errors';
import {
  SUBSCRIPTION_EXPIRY_CONFIG,
} from '../../../../../../packages/constants/src/subscription';
import {
  SUBSCRIPTION_STATUS,
} from '../../../../../../packages/constants/src/status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ReminderResult {
  subscriptionId: number;
  merchantId: number;
  daysBefore: number;
  queryDaysOffset: number;
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
  queryDaysOffset: number,
  now: Date,
  renewUrl: string | undefined,
  dryRun: boolean,
  reminderDaysBefore: number = queryDaysOffset
): Promise<ReminderResult[]> {
  const { dateKey, subscriptions } = await findSubscriptionsExpiringInDays(
    queryDaysOffset,
    now
  );

  if (subscriptions.length === 0) return [];

  const sentKeys = await findSentExpiryReminderKeys(
    subscriptions.map((subscription) => subscription.id),
    now
  );

  const results: ReminderResult[] = [];

  for (const subscription of subscriptions) {
    // Recovery uses the same expiry-day key as the regular day-zero run, so it
    // never creates a third successful email for the same billing period.
    const reminderKey = buildExpiryReminderKey(
      subscription.id,
      dateKey,
      reminderDaysBefore
    );
    const base = {
      subscriptionId: subscription.id,
      merchantId: subscription.merchantId,
      daysBefore: reminderDaysBefore,
      queryDaysOffset,
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
          daysRemaining: reminderDaysBefore,
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

      // Only recorded after a successful send. Manual re-runs are safe, and
      // expiry-day failures also get the one-day recovery pass below.
      await recordExpiryReminderSent({
        subscriptionId: subscription.id,
        reminderKey,
        daysBefore: reminderDaysBefore,
        periodEnd: subscription.currentPeriodEnd,
        recipients,
        planName: subscription.planName,
        messageId: emailResult.messageId,
      });

      results.push({ ...base, recipients, status: 'sent' });
    } catch (error) {
      console.error('❌ [ExpiryReminder] Failed to process subscription', {
        subscriptionId: subscription.id,
        daysBefore: reminderDaysBefore,
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

    // Console mode intentionally reports success without delivering a message.
    // Never allow production cron to record those logs as real sent emails.
    if (
      !dryRun &&
      process.env.NODE_ENV === 'production' &&
      process.env.EMAIL_PROVIDER !== 'ses'
    ) {
      console.error('❌ [ExpiryReminder] Production email provider is not SES');
      return NextResponse.json(
        {
          success: false,
          code: 'EMAIL_PROVIDER_NOT_CONFIGURED',
          message: 'EMAIL_PROVIDER must be set to ses for production expiry reminders',
        },
        { status: 503 }
      );
    }

    const now = new Date();
    const timeZone = SUBSCRIPTION_EXPIRY_CONFIG.REMINDER_TIMEZONE;
    const renewUrl =
      process.env.SUBSCRIPTION_RENEWAL_CONTACT_URL ||
      'https://anyrent.shop/#contact';

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

    // One-day recovery for a missed/failed expiry-day execution. It reuses the
    // day-zero idempotency key, so merchants who already received the expiry
    // email are skipped and successful email volume remains at most two.
    results.push(...(await processDayBucket(-1, now, renewUrl, dryRun, 0)));

    const summary = {
      sent: results.filter((result) => result.status === 'sent').length,
      skippedAlreadySent: results.filter((result) => result.status === 'skipped_already_sent').length,
      skippedNoEmail: results.filter((result) => result.status === 'skipped_no_email').length,
      failed: results.filter((result) => result.status === 'failed').length,
      dryRunCandidates: results.filter((result) => result.status === 'dry_run').length,
    };

    console.log('✅ [ExpiryReminder] Completed', summary);

    const responseData = {
      today: formatDateKeyInTimeZone(now, timeZone),
      timeZone,
      statuses: [
        SUBSCRIPTION_STATUS.TRIAL,
        SUBSCRIPTION_STATUS.ACTIVE,
        SUBSCRIPTION_STATUS.EXPIRED,
      ],
      daysBefore: SUBSCRIPTION_EXPIRY_CONFIG.PERIOD_EXPIRY_NOTIFICATIONS,
      recoveryDaysOffset: -1,
      dryRun,
      ...summary,
      results,
    };

    // Surface primary delivery failures to the scheduler. A retry is safe:
    // successful buckets have already been recorded and will be skipped.
    if (summary.failed > 0) {
      return NextResponse.json(
        {
          success: false,
          code: 'SUBSCRIPTION_EXPIRY_REMINDERS_PARTIAL_FAILURE',
          message: `${summary.failed} expiry reminder email(s) failed`,
          data: responseData,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      ResponseBuilder.success('SUBSCRIPTION_EXPIRY_REMINDERS_COMPLETED', responseData)
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
