import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import { planTierFromName, type PlanTier } from '../../../../lib/plan-renewal';
import { planHistory } from '../../../../lib/plan-renewal-history';
import { merchantIdFromExternal, polarConfig, verifyPolarSignature } from '../../../../lib/polar';
import {
  isFullRefund,
  polarOrderPayment,
  polarRefundPatch,
  polarSubscriptionPatch,
  type PolarOrderLike,
  type PolarSubscriptionLike,
} from '../../../../lib/polar-billing';

/**
 * POST /api/webhooks/polar (#1631) — Polar subscription and order events for web card payments.
 *
 * Public route (`/api/webhooks` in middleware); authenticity is the Standard Webhooks signature with POLAR_WEBHOOK_SECRET
 * (unset → 503, Polar retries once it is set). The rules are in lib/polar-billing.ts (the store rules of #1459 with Polar
 * as one more auto-billed channel):
 * - `subscription.*`: the full subscription in `data` decides (purchase, renewal, plan switch, cancel, uncancel, past
 *   due, ended); events of another Polar subscription change nothing unless it is active;
 * - `order.paid`: one COMPLETED payment (method POLAR, the real amount) per order id;
 * - `order.refunded`: the payment REFUNDED; a full refund of the period in use goes back to the end before it.
 * Each `webhook-id` runs once (`BillingWebhookEvent`, provider POLAR); an event older than the last applied one is
 * skipped; an event not applied answers 200 and releases its id (Polar disables an endpoint after 10 failures in a row);
 * a processing error answers 500 so Polar retries.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROVIDER = 'POLAR';

interface PolarEvent {
  type?: string;
  timestamp?: string;
  data?: Record<string, unknown>;
}

type Outcome = string;

export async function POST(request: NextRequest) {
  const config = polarConfig();
  if (!config.webhookSecret) {
    console.error('[Polar Webhook] POLAR_WEBHOOK_SECRET is not set: event refused');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const body = await request.text();
  const webhookId = request.headers.get('webhook-id');
  const check = verifyPolarSignature({
    body,
    id: webhookId,
    timestamp: request.headers.get('webhook-timestamp'),
    signature: request.headers.get('webhook-signature'),
    secret: config.webhookSecret,
  });
  if (!check.ok) {
    console.error(`[Polar Webhook] Signature refused: ${check.reason}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: PolarEvent | null = null;
  try {
    event = JSON.parse(body) as PolarEvent;
  } catch {
    event = null;
  }
  if (!event?.type || !event.data || !webhookId) {
    return NextResponse.json({ status: 'ignored', reason: 'invalid_payload' });
  }

  const type = event.type;
  const handled = type.startsWith('subscription.') || type === 'order.paid' || type === 'order.refunded';
  if (!handled) return NextResponse.json({ status: 'ignored', reason: 'event_type' });

  const merchantId = resolveMerchantId(event.data);
  console.log(`[Polar Webhook] ${type}`, { webhookId, merchantId, id: event.data.id, status: event.data.status });

  const claim = await claimEvent(webhookId, type, merchantId);
  if (claim === 'duplicate') return NextResponse.json({ status: 'duplicate' });

  try {
    let outcome: Outcome;
    const at = eventTime(event);
    if (!merchantId) {
      outcome = 'ignored_no_merchant';
    } else if (!(await db.prisma.merchant.findUnique({ where: { id: merchantId }, select: { id: true } }))) {
      outcome = 'ignored_unknown_merchant';
    } else if (type.startsWith('subscription.') && (await isStale(merchantId, at))) {
      outcome = 'stale';
    } else if (type.startsWith('subscription.')) {
      outcome = await handleSubscription(merchantId, type, event.data as unknown as PolarSubscriptionLike, at);
      if (outcome.startsWith('ok')) await markApplied(merchantId, at);
    } else if (type === 'order.paid') {
      outcome = await handleOrderPaid(merchantId, event.data as unknown as PolarOrderLike);
    } else {
      outcome = await handleOrderRefunded(merchantId, event.data as unknown as PolarOrderLike, at);
    }
    if (outcome.startsWith('ignored_')) await releaseEvent(claim);
    return NextResponse.json({ status: outcome });
  } catch (error) {
    console.error('[Polar Webhook] Error:', (error as Error)?.message, (error as Error)?.stack);
    await releaseEvent(claim);
    const { response } = handleApiError(error);
    return NextResponse.json(response, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** The shop: the customer's external id (`merchant_<id>`, set at checkout), then the checkout metadata */
function resolveMerchantId(data: Record<string, unknown>): number | null {
  const customer = data.customer as { external_id?: string | null } | undefined;
  const fromCustomer = merchantIdFromExternal(customer?.external_id ?? null);
  if (fromCustomer) return fromCustomer;
  const meta = (data.metadata ?? {}) as Record<string, unknown>;
  const raw = meta.merchantId ?? meta.merchant_id;
  return typeof raw === 'string' || typeof raw === 'number' ? (/^\d+$/.test(String(raw)) ? parseInt(String(raw), 10) : null) : null;
}

function eventTime(event: PolarEvent): Date {
  const t = event.timestamp ? new Date(event.timestamp) : null;
  return t && !Number.isNaN(t.getTime()) ? t : new Date();
}

async function claimEvent(eventId: string, eventType: string, merchantId: number | null): Promise<number | 'duplicate'> {
  try {
    const row = await db.prisma.billingWebhookEvent.create({ data: { provider: PROVIDER, eventId, eventType, merchantId } });
    return row.id;
  } catch (error: unknown) {
    if ((error as { code?: string } | null)?.code === 'P2002') return 'duplicate';
    throw error;
  }
}

async function releaseEvent(claim: number | 'duplicate') {
  if (typeof claim !== 'number') return;
  try {
    await db.prisma.billingWebhookEvent.delete({ where: { id: claim } });
  } catch (error) {
    console.error('[Polar Webhook] Could not release the event id', error);
  }
}

async function isStale(merchantId: number, at: Date): Promise<boolean> {
  const row = await db.prisma.subscription.findUnique({ where: { merchantId }, select: { lastStoreEventAt: true } });
  const last = row?.lastStoreEventAt ? new Date(row.lastStoreEventAt).getTime() : null;
  return last !== null && at.getTime() < last;
}

async function markApplied(merchantId: number, at: Date) {
  const row = await db.prisma.subscription.findUnique({ where: { merchantId }, select: { lastStoreEventAt: true } });
  if (!row) return;
  const last = row.lastStoreEventAt ? new Date(row.lastStoreEventAt).getTime() : null;
  if (last === null || at.getTime() >= last) {
    await db.prisma.subscription.update({ where: { merchantId }, data: { lastStoreEventAt: at } });
  }
}

/** Active, not deleted plan of a tier ("Basic", "Professional") */
async function planForTier(tier: PlanTier): Promise<{ id: number; name: string } | null> {
  const plans = await db.prisma.plan.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });
  return plans.find((p: { name: string }) => planTierFromName(p.name) === tier) ?? null;
}

async function logActivity(subscriptionId: number, type: string, description: string, extra: Record<string, unknown>) {
  await db.prisma.subscriptionActivity.create({
    data: { subscriptionId, type, description, metadata: JSON.stringify({ provider: PROVIDER, ...extra }) },
  });
}

// ─── Subscription events ─────────────────────────────────────────────────────

async function handleSubscription(merchantId: number, type: string, sub: PolarSubscriptionLike, at: Date): Promise<Outcome> {
  if (!sub?.id) return 'ignored_invalid_subscription';
  const config = polarConfig();
  const ref = config.products.find((p) => p.productId === sub.product_id) ?? null;
  const plan = ref ? await planForTier(ref.tier) : null;
  if (ref && !plan) console.error(`[Polar Webhook] No active ${ref.tier} plan for merchant ${merchantId}`);

  const existing = await db.prisma.subscription.findUnique({ where: { merchantId }, include: { plan: true } });
  const patch = polarSubscriptionPatch(existing, sub, ref, plan?.id ?? null, new Date());
  if (patch.kind === 'ignore') {
    if (patch.reason === 'unknown_product') console.error(`[Polar Webhook] Product ${sub.product_id} is not in POLAR_PRODUCTS`);
    // A known outcome that changes nothing keeps the id and the event order (`skipped_`); a missing product or plan is our
    // configuration: release the id so a resend from the Polar dashboard runs it once fixed (`ignored_`)
    return patch.reason === 'other_subscription' || patch.reason === 'not_active' || patch.reason === 'paused'
      ? `skipped_${patch.reason}`
      : `ignored_${patch.reason}`;
  }

  const data = { ...patch.data, updatedAt: new Date() };
  const saved = existing
    ? await db.prisma.subscription.update({ where: { merchantId }, data })
    : await db.prisma.subscription.create({ data: { merchantId, amount: 0, ...patch.data } as never });

  const planName = plan?.name ?? existing?.plan?.name ?? 'AnyRent';
  const months = ref?.months ?? (existing?.interval === 'semi_annual' ? 6 : 12);
  const end = (patch.data.currentPeriodEnd as Date | undefined) ?? (existing?.currentPeriodEnd ? new Date(existing.currentPeriodEnd) : new Date());
  const texts: Record<string, () => string> = {
    purchase: () => planHistory.purchase(planName, months, 'POLAR', end),
    renewal: () => planHistory.renewal(planName, months, 'POLAR', end),
    change: () => planHistory.change(planName, months, 'POLAR', end),
    cancel: () => planHistory.cancel('POLAR', end),
    uncancel: () => planHistory.uncancel('POLAR'),
    billing_issue: () => planHistory.billingIssue('POLAR', end),
    ended: () => planHistory.ended('POLAR', end),
  };
  const text = texts[patch.kind];
  if (text) {
    await logActivity(saved.id, `POLAR_${patch.kind.toUpperCase()}`, text(), {
      planName,
      expiresAt: end.toISOString(),
      eventType: type,
      eventAt: at.toISOString(),
      subscriptionId: sub.id,
      productId: sub.product_id ?? null,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end ?? null,
      creditMs: patch.data.storeBonusMs ?? existing?.storeBonusMs ?? null,
    });
  }
  return `ok_${patch.kind}`;
}

// ─── Order events ────────────────────────────────────────────────────────────

async function handleOrderPaid(merchantId: number, order: PolarOrderLike): Promise<Outcome> {
  const payment = polarOrderPayment(order);
  if (!payment) return 'ok_nothing_paid';
  const already = await db.prisma.payment.findFirst({ where: { transactionId: payment.transactionId, merchantId }, select: { id: true } });
  if (already) return 'ok_already_recorded';
  const subscription = await db.prisma.subscription.findUnique({ where: { merchantId }, include: { plan: true } });
  if (!subscription) return 'ignored_no_subscription';

  const ref = polarConfig().products.find((p) => p.productId === payment.productId) ?? null;
  const months = ref?.months ?? (subscription.interval === 'semi_annual' ? 6 : 12);
  const plan = ref ? await planForTier(ref.tier) : null;
  const planName = plan?.name ?? subscription.plan?.name ?? 'AnyRent';
  await db.prisma.payment.create({
    data: {
      amount: payment.amount,
      currency: payment.currency,
      method: 'POLAR',
      type: 'SUBSCRIPTION_PAYMENT',
      status: 'COMPLETED',
      subscriptionId: subscription.id,
      merchantId,
      reference: payment.transactionId,
      transactionId: payment.transactionId,
      invoiceNumber: payment.invoiceNumber ?? payment.transactionId,
      description: planHistory.payment(planName, months, 'POLAR', payment.renewal),
      processedAt: payment.processedAt,
      metadata: JSON.stringify({ provider: PROVIDER, subscriptionId: payment.subscriptionId, productId: payment.productId }),
    },
  });
  return 'ok_payment';
}

async function handleOrderRefunded(merchantId: number, order: PolarOrderLike, at: Date): Promise<Outcome> {
  if (!order?.id) return 'ignored_invalid_order';
  const refundedAt = order.modified_at ? new Date(order.modified_at) : at;
  if (!isFullRefund(order)) {
    await db.prisma.payment.updateMany({
      where: { transactionId: order.id, merchantId },
      data: { notes: `Polar hoàn một phần: ${order.refunded_amount ?? 0} / ${order.total_amount ?? 0} (${String(order.currency ?? '').toUpperCase()})` },
    });
    return 'ok_partial_refund';
  }
  // #1482: dated refund; a repeated event keeps the first date
  await db.prisma.payment.updateMany({
    where: { transactionId: order.id, merchantId, status: { not: 'REFUNDED' } },
    data: { status: 'REFUNDED', refundedAt },
  });
  const sub = await db.prisma.subscription.findUnique({ where: { merchantId } });
  const patch = polarRefundPatch(sub, order, refundedAt);
  if (patch.kind === 'refund_other') {
    if (sub) await logActivity(sub.id, 'POLAR_REFUND', planHistory.refundOtherProduct('POLAR'), { orderId: order.id });
    return 'ok_refund_other';
  }
  await db.prisma.subscription.update({ where: { merchantId }, data: { ...patch.data, updatedAt: new Date() } });
  const end = patch.data.currentPeriodEnd as Date;
  const text = patch.kind === 'refund_kept_days' ? planHistory.refundKeepsDays('POLAR', end) : planHistory.refund('POLAR', end);
  await logActivity(sub!.id, 'POLAR_REFUND', text, { orderId: order.id, refundedAt: refundedAt.toISOString(), expiresAt: end.toISOString() });
  return `ok_${patch.kind}`;
}
