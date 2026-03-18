import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { env } from '@rentalshop/env';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_TYPE } from '@rentalshop/constants';
import { getStripe } from '../../../../lib/stripe';

function mapStripeSubscriptionStatus(status: string | null | undefined) {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'trialing':
      return 'TRIAL';
    case 'active':
      return 'ACTIVE';
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE';
    case 'canceled':
      return 'CANCELLED';
    case 'paused':
      return 'PAUSED';
    default:
      // Keep raw-ish but normalized (helps debugging without blocking)
      return s ? s.toUpperCase() : 'UNKNOWN';
  }
}

async function resolveMerchantId(params: {
  merchantIdFromMetadata?: string | null;
  customerId?: string | null;
}) {
  if (params.merchantIdFromMetadata) {
    const parsed = Number(params.merchantIdFromMetadata);
    if (Number.isFinite(parsed)) return parsed;
  }

  if (params.customerId) {
    const merchant = await db.prisma.merchant.findFirst({
      where: { stripeCustomerId: params.customerId } as any,
      select: { id: true },
    });
    if (merchant) return merchant.id;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(ResponseBuilder.error('STRIPE_WEBHOOK_SECRET_NOT_SET'), {
        status: 500,
      });
    }

    const stripe = getStripe();
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json(ResponseBuilder.error('STRIPE_SIGNATURE_REQUIRED'), { status: 400 });
    }

    const payload = await request.text();
    let event: any;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err);
      return NextResponse.json(ResponseBuilder.error('STRIPE_WEBHOOK_SIGNATURE_INVALID'), { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const customerId = session.customer as string | null;
        const stripeSubscriptionId = session.subscription as string | null;

        const merchantId = await resolveMerchantId({
          merchantIdFromMetadata: session.metadata?.merchantId ?? session.client_reference_id ?? null,
          customerId,
        });

        if (!merchantId) break;

        if (customerId) {
          await db.prisma.merchant.update({
            where: { id: merchantId },
            data: { stripeCustomerId: customerId } as any,
          });
        }

        if (stripeSubscriptionId) {
          const subscriptionRow = await db.prisma.subscription.findUnique({
            where: { merchantId },
            select: { id: true },
          });

          if (subscriptionRow?.id) {
            await db.subscriptionActivities.create({
              subscriptionId: subscriptionRow.id,
              type: 'stripe_checkout_completed',
              description: 'Stripe Checkout completed',
              metadata: {
                stripeSubscriptionId,
                customerId,
                eventId: event.id,
              },
            });
          }
        }

        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        const stripeSubscriptionId = sub.id as string;
        const customerId = sub.customer as string | null;
        const merchantId = await resolveMerchantId({
          merchantIdFromMetadata: sub.metadata?.merchantId ?? null,
          customerId,
        });

        if (!merchantId) break;

        // Keep customerId in sync on merchant
        if (customerId) {
          await db.prisma.merchant.update({
            where: { id: merchantId },
            data: { stripeCustomerId: customerId } as any,
          });
        }

        const mappedStatus = mapStripeSubscriptionStatus(sub.status);
        const currentPeriodStart = sub.current_period_start
          ? new Date(sub.current_period_start * 1000)
          : new Date();
        const currentPeriodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : new Date();

        const planIdFromMetadata = sub.metadata?.planId ? Number(sub.metadata.planId) : null;

        // Upsert subscription by merchantId (unique in schema)
        const existing = await db.prisma.subscription.findUnique({
          where: { merchantId },
          select: { id: true, planId: true },
        });

        const planIdToUse =
          planIdFromMetadata && Number.isFinite(planIdFromMetadata)
            ? planIdFromMetadata
            : existing?.planId;

        if (!planIdToUse) {
          console.warn('Stripe webhook: missing planId for merchant', merchantId);
          break;
        }

        const updated = await db.prisma.subscription.upsert({
          where: { merchantId },
          create: {
            merchantId,
            planId: planIdToUse,
            stripeSubscriptionId,
            status: mappedStatus,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
            canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
            amount: 0,
            currency: sub.currency?.toUpperCase?.() || 'USD',
            interval: sub.items?.data?.[0]?.price?.recurring?.interval || 'month',
            intervalCount: sub.items?.data?.[0]?.price?.recurring?.interval_count || 1,
          } as any,
          update: {
            stripeSubscriptionId,
            status: mappedStatus,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
            canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
            interval: sub.items?.data?.[0]?.price?.recurring?.interval || undefined,
            intervalCount: sub.items?.data?.[0]?.price?.recurring?.interval_count || undefined,
          } as any,
          select: { id: true, merchantId: true, status: true, currentPeriodEnd: true },
        });

        await db.subscriptionActivities.create({
          subscriptionId: updated.id,
          type: `stripe_subscription_${event.type.split('.').pop()}`,
          description: `Stripe subscription ${event.type.split('.').pop()}`,
          metadata: {
            stripeSubscriptionId,
            customerId,
            status: sub.status,
            mappedStatus,
            eventId: event.id,
          },
        });

        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string | null;
        const stripeSubscriptionId = invoice.subscription as string | null;

        const merchantId = await resolveMerchantId({
          merchantIdFromMetadata: invoice.metadata?.merchantId ?? null,
          customerId,
        });
        if (!merchantId) break;

        // Resolve subscription row (prefer stripeSubscriptionId if present)
        const subscriptionRow = stripeSubscriptionId
          ? await db.prisma.subscription.findFirst({
              where: { stripeSubscriptionId } as any,
              select: { id: true },
            })
          : await db.prisma.subscription.findUnique({
              where: { merchantId },
              select: { id: true },
            });

        if (!subscriptionRow?.id) break;

        const amountPaid = Number(invoice.amount_paid || invoice.amount_due || 0) / 100;
        const currency = (invoice.currency || 'usd').toUpperCase();
        const status =
          event.type === 'invoice.paid' ? PAYMENT_STATUS.COMPLETED : PAYMENT_STATUS.FAILED;

        await db.prisma.payment.create({
          data: {
            subscriptionId: subscriptionRow.id,
            merchantId,
            amount: amountPaid,
            currency,
            method: PAYMENT_METHOD.STRIPE,
            type: PAYMENT_TYPE.SUBSCRIPTION_PAYMENT,
            status,
            transactionId: invoice.id,
            reference: invoice.number ?? null,
            description:
              event.type === 'invoice.paid' ? 'Stripe invoice paid' : 'Stripe invoice payment failed',
            failureReason: invoice.last_payment_error?.message ?? null,
            processedAt: event.type === 'invoice.paid' ? new Date() : null,
          } as any,
        });

        await db.subscriptionActivities.create({
          subscriptionId: subscriptionRow.id,
          type: event.type === 'invoice.paid' ? 'stripe_invoice_paid' : 'stripe_invoice_payment_failed',
          description: event.type === 'invoice.paid' ? 'Invoice paid' : 'Invoice payment failed',
          metadata: {
            invoiceId: invoice.id,
            stripeSubscriptionId,
            amountPaid,
            currency,
            eventId: event.id,
          },
        });

        break;
      }

      default:
        // Intentionally ignore other events
        break;
    }

    return NextResponse.json(ResponseBuilder.success('STRIPE_WEBHOOK_RECEIVED', { received: true }));
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

