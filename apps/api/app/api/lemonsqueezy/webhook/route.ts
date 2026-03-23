import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, PAYMENT_STATUS } from '@rentalshop/constants';
import { verifyLemonSqueezyWebhookSignature } from '../../../../lib/lemonsqueezy';

type LemonEventName =
  | 'order_created'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_payment_success'
  | 'subscription_payment_failed'
  | 'subscription_cancelled'
  | 'subscription_resumed'
  | 'subscription_expired'
  | 'subscription_paused'
  | 'subscription_unpaused';

function mapLemonSubscriptionStatus(raw: unknown): string {
  const s = String(raw ?? '').toLowerCase();
  // Keep compatible with existing SubscriptionStatus enum values used elsewhere
  switch (s) {
    case 'trialing':
    case 'on_trial':
      return 'TRIAL';
    case 'active':
      return 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'paused':
      return 'PAUSED';
    case 'cancelled':
    case 'canceled':
      return 'CANCELLED';
    case 'expired':
      return 'EXPIRED';
    default:
      return s ? s.toUpperCase() : 'UNKNOWN';
  }
}

function parseCustomData(payload: any): { merchantId: number | null; planId: number | null; billingInterval?: string } {
  const cd = payload?.meta?.custom_data ?? payload?.meta?.customData ?? null;
  const merchantId = cd?.merchantId != null ? Number(cd.merchantId) : cd?.merchant_id != null ? Number(cd.merchant_id) : null;
  const planId = cd?.planId != null ? Number(cd.planId) : cd?.plan_id != null ? Number(cd.plan_id) : null;
  const billingInterval = cd?.billingInterval ?? cd?.billing_interval ?? undefined;

  return {
    merchantId: Number.isFinite(merchantId) ? merchantId : null,
    planId: Number.isFinite(planId) ? planId : null,
    billingInterval: typeof billingInterval === 'string' ? billingInterval : undefined,
  };
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-signature');
    const rawBody = await request.text();

    const ok = verifyLemonSqueezyWebhookSignature({ rawBody, signature });
    if (!ok) {
      return NextResponse.json(ResponseBuilder.error('LEMON_SQUEEZY_WEBHOOK_SIGNATURE_INVALID'), {
        status: API.STATUS.BAD_REQUEST,
      });
    }

    const eventName = (request.headers.get('x-event-name') || '') as LemonEventName;
    const payload = rawBody ? JSON.parse(rawBody) : null;

    if (!payload) {
      return NextResponse.json(ResponseBuilder.error('INVALID_WEBHOOK_PAYLOAD'), { status: API.STATUS.BAD_REQUEST });
    }

    // Most useful for us: subscription_* events.
    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_cancelled':
      case 'subscription_resumed':
      case 'subscription_expired':
      case 'subscription_paused':
      case 'subscription_unpaused': {
        const custom = parseCustomData(payload);
        const sub = payload?.data;

        const lemonSubscriptionId = sub?.id != null ? String(sub.id) : null;
        if (!lemonSubscriptionId) break;

        const merchantId =
          custom.merchantId ??
          (sub?.attributes?.customer_id != null ? null : null); // fallback resolved below if needed

        if (!merchantId) {
          // If you later persist lemonCustomerId on Merchant, you can resolve merchantId here.
          break;
        }

        const mappedStatus = mapLemonSubscriptionStatus(sub?.attributes?.status);

        // Lemon semantics (official docs):
        // - `renews_at`: end of the current billing cycle + next invoice issue time
        // - `ends_at`: only populated for `expired` / `cancelled` statuses; null for active
        // Our UI + access logic uses `currentPeriodEnd` to decide EXPIRED/ACTIVE,
        // so we must map `currentPeriodEnd` from `renews_at` (fallback to `ends_at`).
        const renewsAt = sub?.attributes?.renews_at ? new Date(sub.attributes.renews_at) : null;
        const endsAt = sub?.attributes?.ends_at ? new Date(sub.attributes.ends_at) : null;
        const currentPeriodEnd = renewsAt ?? endsAt ?? new Date();

        // We don't get a reliable "period start" in Lemon active payloads.
        // For UI purposes only, approximate `currentPeriodStart` by subtracting
        // interval length from `currentPeriodEnd` using our custom billingInterval.
        const billingIntervalRaw = custom.billingInterval ?? 'monthly';
        const months =
          billingIntervalRaw === 'quarterly'
            ? 3
            : billingIntervalRaw === 'semi_annual'
              ? 6
              : billingIntervalRaw === 'annual'
                ? 12
                : 1;
        const currentPeriodStart = new Date(currentPeriodEnd);
        currentPeriodStart.setMonth(currentPeriodStart.getMonth() - months);

        const planId = custom.planId;
        if (!planId) break;

        await db.prisma.subscription.upsert({
          where: { merchantId },
          create: {
            merchantId,
            planId,
            lemonSubscriptionId,
            status: mappedStatus,
            currentPeriodStart,
            currentPeriodEnd,
            trialStart: null,
            trialEnd: null,
            cancelAtPeriodEnd: false,
            amount: 0,
            currency: 'USD',
            interval: billingIntervalRaw === 'monthly' ? 'monthly' : billingIntervalRaw,
            intervalCount: months,
            period: 1,
            discount: 0,
            savings: 0,
          } as any,
          update: {
            planId,
            lemonSubscriptionId,
            status: mappedStatus,
            currentPeriodStart,
            currentPeriodEnd,
            interval: billingIntervalRaw === 'monthly' ? 'monthly' : billingIntervalRaw,
            intervalCount: months,
            updatedAt: new Date(),
          } as any,
        });

        break;
      }

      case 'subscription_payment_success': {
        const custom = parseCustomData(payload);
        if (!custom.merchantId) break;

        const subscriptionRow = await db.prisma.subscription.findUnique({
          where: { merchantId: custom.merchantId },
          select: { id: true },
        });
        if (!subscriptionRow?.id) break;

        // Record a payment row (optional but useful for reporting)
        await db.prisma.payment.create({
          data: {
            amount: 0,
            currency: 'USD',
            method: 'LEMON_SQUEEZY' as any,
            type: 'SUBSCRIPTION_PAYMENT',
            status: PAYMENT_STATUS.COMPLETED,
            subscriptionId: subscriptionRow.id,
            merchantId: custom.merchantId,
            reference: payload?.data?.id != null ? String(payload.data.id) : null,
            metadata: JSON.stringify({ event: eventName }),
            processedAt: new Date(),
          } as any,
        });

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Lemon Squeezy webhook error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

