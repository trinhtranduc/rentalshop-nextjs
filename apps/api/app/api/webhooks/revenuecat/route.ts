import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { addMonthsInTimeZone, handleApiError } from '@rentalshop/utils';
import {
  channelFromStore,
  planTierFromName,
  storeProduct,
  tierRank,
  type BillingChannel,
  type PlanTier,
} from '../../../../lib/plan-renewal';
import { planHistory } from '../../../../lib/plan-renewal-history';

/**
 * POST /api/webhooks/revenuecat
 *
 * Receives subscription events from RevenueCat (App Store, Google Play). Server to server; no app calls it.
 * Auth: RevenueCat's "Authorization header value" must be the literal `Bearer <REVENUECAT_WEBHOOK_SECRET>`; compared in
 * constant time. Without the env var every event is refused with 503 (and logged), never accepted unauthenticated.
 * App User ID format: "merchant_{merchantId}" (set by PurchasesManager.logInMerchant on iOS and Android).
 *
 * #1459:
 * - the plan follows the store product (Basic or Professional, `apps/api/lib/plan-renewal.ts`) on INITIAL_PURCHASE,
 *   RENEWAL and an upgrading PRODUCT_CHANGE; a RENEWAL of a purchase recorded before #1459 keeps the plan;
 * - refund (CANCELLATION + CUSTOMER_SUPPORT) ends access (status EXPIRED, so the owner can buy again); BILLING_ISSUE is
 *   flagged and keeps access until the period (and the store's grace) ends; the real amount is stored;
 * - each `event.id` runs once (`BillingWebhookEvent`); a processing error or an event not applied (`ignored_*`) releases it;
 *   a processing error and "no plan for this tier" answer 500 so RevenueCat retries;
 * - history rows are plain Vietnamese.
 */

const PROVIDER = 'REVENUECAT';

type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'PRODUCT_CHANGE'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'SUBSCRIBER_ALIAS'
  | string;

interface RevenueCatEvent {
  id?: string;
  type: RevenueCatEventType;
  app_user_id: string; // "merchant_32"
  product_id: string; // "anyrent_merchant_semi_annual" (Play: may carry ":base-plan")
  new_product_id?: string; // PRODUCT_CHANGE
  entitlement_ids?: string[];
  purchased_at_ms?: number;
  expiration_at_ms?: number;
  event_timestamp_ms?: number;
  store?: string;
  environment?: string;
  period_type?: string;
  cancel_reason?: string;
  price?: number;
  price_in_purchased_currency?: number;
  currency?: string;
  renewal_number?: number;
  transaction_id?: string;
  original_transaction_id?: string;
  takehome_percentage?: number;
  /** BILLING_ISSUE with the store's grace period on: access lasts until then */
  grace_period_expiration_at_ms?: number;
  expiration_reason?: string;
}

interface RevenueCatWebhookPayload {
  api_version?: string;
  event?: RevenueCatEvent;
}

type Outcome = string;

export const runtime = 'nodejs';

/** `Authorization: Bearer <secret>`, compared in constant time */
function authorised(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8');
  const received = Buffer.from(header ?? '', 'utf8');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(request: NextRequest) {
  // 1. Authenticity: no secret configured = refuse everything (RevenueCat retries once it is set)
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[RevenueCat Webhook] REVENUECAT_WEBHOOK_SECRET is not set: event refused');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }
  if (!authorised(request.headers.get('authorization'), webhookSecret)) {
    console.error('[RevenueCat Webhook] Invalid authorization header');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let event: RevenueCatEvent | undefined;
  try {
    event = ((await request.json()) as RevenueCatWebhookPayload)?.event;
  } catch {
    event = undefined;
  }
  if (!event || !event.type) {
    return NextResponse.json({ status: 'ignored', reason: 'invalid_payload' }, { status: 400 });
  }

  const merchantId = parseMerchantId(event.app_user_id);
  console.log(`[RevenueCat Webhook] ${event.type}`, {
    id: event.id,
    merchantId,
    product_id: event.product_id,
    new_product_id: event.new_product_id,
    store: event.store,
    environment: event.environment,
  });

  // 2. Once per event id
  const claim = await claimEvent(event, merchantId);
  if (claim === 'duplicate') {
    return NextResponse.json({ status: 'duplicate' });
  }

  // 3. Handle
  try {
    const outcome = merchantId ? await handleEvent(merchantId, event) : 'ignored_invalid_app_user_id';
    // Not applied: give the event id back, so RevenueCat's retry or a manual resend can run it later (A9)
    if (outcome.startsWith('ignored_')) await releaseEvent(claim);
    // No active plan for the product's tier is our configuration problem: 500 makes RevenueCat retry
    if (outcome === 'ignored_no_plan') return NextResponse.json({ status: outcome }, { status: 500 });
    return NextResponse.json({ status: outcome });
  } catch (error) {
    console.error('[RevenueCat Webhook] Error:', (error as Error)?.message, (error as Error)?.stack);
    await releaseEvent(claim);
    // 500 so RevenueCat retries; the released event id lets the retry run once
    const { response } = handleApiError(error);
    return NextResponse.json(response, { status: 500 });
  }
}

// ─── Idempotency ─────────────────────────────────────────────────────────────

/** Records the event id; 'duplicate' when it was already processed, null when the event has no id. */
async function claimEvent(event: RevenueCatEvent, merchantId: number | null): Promise<number | null | 'duplicate'> {
  if (!event.id) return null;
  try {
    const row = await db.prisma.billingWebhookEvent.create({
      data: { provider: PROVIDER, eventId: String(event.id), eventType: String(event.type), merchantId },
    });
    return row.id;
  } catch (error: unknown) {
    if ((error as { code?: string } | null)?.code === 'P2002') return 'duplicate';
    throw error;
  }
}

async function releaseEvent(claim: number | null | 'duplicate') {
  if (typeof claim !== 'number') return;
  try {
    await db.prisma.billingWebhookEvent.delete({ where: { id: claim } });
  } catch (error) {
    console.error('[RevenueCat Webhook] Could not release the event id', error);
  }
}

// ─── Events ──────────────────────────────────────────────────────────────────

async function handleEvent(merchantId: number, event: RevenueCatEvent): Promise<Outcome> {
  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
      return handlePurchaseOrRenewal(merchantId, event);
    case 'PRODUCT_CHANGE':
      return handleProductChange(merchantId, event);
    case 'CANCELLATION':
      return handleCancellation(merchantId, event);
    case 'UNCANCELLATION':
      return handleUncancellation(merchantId, event);
    case 'EXPIRATION':
      return handleExpiration(merchantId, event);
    case 'BILLING_ISSUE':
      return handleBillingIssue(merchantId, event);
    default:
      return `ignored_${String(event.type).toLowerCase()}`;
  }
}

function parseMerchantId(appUserId: string | undefined): number | null {
  // "merchant_32"; anonymous ids ("$RCAnonymousID:…") are skipped
  const match = String(appUserId ?? '').match(/^merchant_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
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

async function findSubscription(merchantId: number) {
  return db.prisma.subscription.findUnique({ where: { merchantId }, include: { plan: true } });
}

/** Same product as the one the shop pays for now (a stored row without a product counts as the same) */
function isCurrentProduct(sub: { storeProductId?: string | null }, productId: string | undefined): boolean {
  if (!sub.storeProductId) return true;
  return storeProduct(productId)?.id === sub.storeProductId;
}

function eventTime(event: RevenueCatEvent): Date {
  return event.event_timestamp_ms ? new Date(event.event_timestamp_ms) : new Date();
}

async function logActivity(subscriptionId: number, type: string, description: string, event: RevenueCatEvent, extra: Record<string, unknown> = {}) {
  await db.prisma.subscriptionActivity.create({
    data: {
      subscriptionId,
      type,
      description,
      metadata: JSON.stringify({
        eventId: event.id ?? null,
        productId: event.product_id,
        newProductId: event.new_product_id ?? null,
        store: event.store ?? null,
        environment: event.environment ?? null,
        transactionId: event.transaction_id ?? null,
        ...extra,
      }),
    },
  });
}

async function handlePurchaseOrRenewal(merchantId: number, event: RevenueCatEvent): Promise<Outcome> {
  const product = storeProduct(event.product_id);
  if (!product) {
    console.warn(`[RevenueCat Webhook] Unknown product_id: ${event.product_id}`);
    return 'ignored_unknown_product';
  }
  const merchant = await db.prisma.merchant.findUnique({ where: { id: merchantId }, select: { id: true } });
  if (!merchant) return 'ignored_unknown_merchant';

  const channel = channelFromStore(event.store);
  const existing = await findSubscription(merchantId);
  const targetPlan = await planForTier(product.tier);
  const isRenewal = event.type === 'RENEWAL';
  // No active plan for the product's tier: never record the purchase on another plan; 500, RevenueCat retries (A9)
  if (!targetPlan) {
    console.error(`[RevenueCat Webhook] No active ${product.tier} plan for merchant ${merchantId}`);
    return 'ignored_no_plan';
  }
  // A renewal of a purchase recorded before #1459 (no product stored) keeps the plan, as the webhook did then
  const keepPlan = !!existing && isRenewal && !existing.storeProductId;
  const planId = keepPlan ? existing!.planId : targetPlan.id;
  const planName = keepPlan ? existing!.plan?.name ?? targetPlan.name : targetPlan.name;

  const purchasedAt = event.purchased_at_ms ? new Date(event.purchased_at_ms) : new Date();
  let expiresAt: Date;
  if (event.environment === 'SANDBOX' || !event.expiration_at_ms) {
    // Sandbox periods are minutes long: keep the real duration (calendar months on the Vietnam day, #588)
    expiresAt = addMonthsInTimeZone(purchasedAt, product.months);
  } else {
    expiresAt = new Date(event.expiration_at_ms);
  }

  const amount = event.price_in_purchased_currency && event.price_in_purchased_currency > 0 ? event.price_in_purchased_currency : 0;
  const currency = event.currency || 'VND';
  const billing = {
    planId,
    status: 'ACTIVE',
    currentPeriodStart: purchasedAt,
    currentPeriodEnd: expiresAt,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    cancelReason: null,
    amount,
    currency,
    interval: product.months === 6 ? 'semi_annual' : 'annual',
    intervalCount: 1,
    billingChannel: channel,
    storeProductId: product.id,
    storeOriginalTransactionId: event.original_transaction_id ?? existing?.storeOriginalTransactionId ?? null,
    autoRenew: true,
    billingIssueAt: null,
  };

  const subscription = existing
    ? await db.prisma.subscription.update({ where: { merchantId }, data: { ...billing, updatedAt: new Date() } })
    : await db.prisma.subscription.create({ data: { merchantId, ...billing } });

  const text = isRenewal
    ? planHistory.renewal(planName, product.months, channel, expiresAt)
    : planHistory.purchase(planName, product.months, channel, expiresAt);
  await logActivity(subscription.id, isRenewal ? 'IAP_RENEWAL' : 'IAP_INITIAL_PURCHASE', text, event, {
    purchasedAt: purchasedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    price: amount || null,
    currency,
    renewal_number: event.renewal_number ?? null,
    period_type: event.period_type ?? null,
  });

  if (amount > 0) {
    await db.prisma.payment.create({
      data: {
        amount,
        currency,
        method: channel === 'PLAY_STORE' ? 'IAP_GOOGLE' : channel === 'APP_STORE' ? 'IAP_APPLE' : 'MANUAL',
        type: 'SUBSCRIPTION_PAYMENT',
        status: 'COMPLETED',
        subscriptionId: subscription.id,
        merchantId,
        reference: event.transaction_id || null,
        transactionId: event.transaction_id || null,
        invoiceNumber: event.transaction_id || null,
        description: planHistory.payment(planName, product.months, channel, isRenewal),
        notes: event.environment === 'SANDBOX' ? 'Sandbox test purchase' : null,
        processedAt: purchasedAt,
        metadata: JSON.stringify({
          store: event.store,
          environment: event.environment,
          productId: product.id,
          renewal_number: event.renewal_number,
          takehome_percentage: event.takehome_percentage,
        }),
      },
    });
  }

  return 'ok';
}

async function handleProductChange(merchantId: number, event: RevenueCatEvent): Promise<Outcome> {
  const target = storeProduct(event.new_product_id);
  const sub = await findSubscription(merchantId);
  if (!target || !sub) return 'ignored_product_change';
  const channel = channelFromStore(event.store);
  const currentTier = planTierFromName(sub.plan?.name);
  const plan = await planForTier(target.tier);
  if (!plan) return 'ignored_no_plan';

  if (tierRank(target.tier) > tierRank(currentTier)) {
    // Upgrades apply at once on the App Store and Google Play; the following RENEWAL brings the new period
    await db.prisma.subscription.update({
      where: { merchantId },
      data: { planId: plan.id, storeProductId: target.id, billingChannel: channel, billingIssueAt: null, updatedAt: new Date() },
    });
    await logActivity(sub.id, 'IAP_PRODUCT_CHANGE', planHistory.upgrade(plan.name, target.months, channel, sub.currentPeriodEnd), event);
    return 'ok';
  }
  // Same or lower tier: the store switches at the next renewal, whose RENEWAL event changes the plan
  if (sub.billingIssueAt) {
    await db.prisma.subscription.update({ where: { merchantId }, data: { billingIssueAt: null, updatedAt: new Date() } });
  }
  await logActivity(sub.id, 'IAP_PRODUCT_CHANGE', planHistory.changeNextPeriod(plan.name, target.months, channel), event);
  return 'ok_next_period';
}

async function handleCancellation(merchantId: number, event: RevenueCatEvent): Promise<Outcome> {
  const sub = await findSubscription(merchantId);
  if (!sub) return 'ignored_no_subscription';
  const channel = channelFromStore(event.store);
  const current = isCurrentProduct(sub, event.product_id);

  if (event.cancel_reason === 'CUSTOMER_SUPPORT') {
    // Refund: the payment is returned and, for the product in use, access ends now
    if (event.transaction_id) {
      await db.prisma.payment.updateMany({
        where: { transactionId: event.transaction_id, merchantId },
        data: { status: 'REFUNDED' },
      });
    }
    if (!current) {
      await logActivity(sub.id, 'IAP_REFUND', planHistory.refundOtherProduct(channel), event);
      return 'ok_other_product';
    }
    const refundedAt = eventTime(event);
    const end = refundedAt < sub.currentPeriodEnd ? refundedAt : sub.currentPeriodEnd;
    // EXPIRED, not CANCELLED: a CANCELLED shop whose period ended gets 403 SUBSCRIPTION_CANCELLED ("contact support")
    // from authenticateRequest; an EXPIRED one gets SUBSCRIPTION_EXPIRED and may buy again in the app
    await db.prisma.subscription.update({
      where: { merchantId },
      data: {
        status: 'EXPIRED',
        currentPeriodEnd: end,
        autoRenew: false,
        cancelAtPeriodEnd: true,
        canceledAt: refundedAt,
        cancelReason: 'REFUND',
        updatedAt: new Date(),
      },
    });
    await logActivity(sub.id, 'IAP_REFUND', planHistory.refund(channel, end), event, { cancelReason: event.cancel_reason });
    return 'ok';
  }

  if (!current) {
    await logActivity(sub.id, 'IAP_CANCELLATION', planHistory.otherProductEvent(channel), event, { cancelReason: event.cancel_reason ?? null });
    return 'ok_other_product';
  }
  await db.prisma.subscription.update({
    where: { merchantId },
    data: {
      autoRenew: false,
      cancelAtPeriodEnd: true,
      canceledAt: eventTime(event),
      cancelReason: event.cancel_reason || 'UNSUBSCRIBE',
      updatedAt: new Date(),
    },
  });
  await logActivity(sub.id, 'IAP_CANCELLATION', planHistory.cancel(channel, sub.currentPeriodEnd), event, { cancelReason: event.cancel_reason ?? null });
  return 'ok';
}

async function handleUncancellation(merchantId: number, event: RevenueCatEvent): Promise<Outcome> {
  const sub = await findSubscription(merchantId);
  if (!sub) return 'ignored_no_subscription';
  const channel = channelFromStore(event.store);
  await db.prisma.subscription.update({
    where: { merchantId },
    data: { autoRenew: true, cancelAtPeriodEnd: false, canceledAt: null, cancelReason: null, billingIssueAt: null, updatedAt: new Date() },
  });
  await logActivity(sub.id, 'IAP_UNCANCELLATION', planHistory.uncancel(channel), event);
  return 'ok';
}

async function handleExpiration(merchantId: number, event: RevenueCatEvent): Promise<Outcome> {
  const sub = await findSubscription(merchantId);
  if (!sub) return 'ignored_no_subscription';
  const channel: BillingChannel = channelFromStore(event.store);
  if (!isCurrentProduct(sub, event.product_id)) {
    await logActivity(sub.id, 'IAP_EXPIRATION_IGNORED', planHistory.otherProductEvent(channel), event, { reason: 'other_product' });
    return 'ok_other_product';
  }
  // Only EXPIRED once our period has really ended (sandbox expirations come after minutes)
  if (sub.currentPeriodEnd > new Date()) {
    await db.prisma.subscription.update({ where: { merchantId }, data: { autoRenew: false, updatedAt: new Date() } });
    await logActivity(sub.id, 'IAP_EXPIRATION_IGNORED', planHistory.expirationIgnored(sub.currentPeriodEnd), event, {
      reason: 'period_not_ended',
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    });
    return 'ok_period_not_ended';
  }
  await db.prisma.subscription.update({
    where: { merchantId },
    data: { status: 'EXPIRED', autoRenew: false, updatedAt: new Date() },
  });
  await logActivity(sub.id, 'IAP_EXPIRATION', planHistory.expired(), event);
  return 'ok';
}

/**
 * "Trừ tiền lỗi: vẫn dùng tới hết kỳ" (owner, 2026-11-02). The store retries the charge; the shop keeps access until
 * the period ends, plus the store's grace period when the owner turned it on (`grace_period_expiration_at_ms`).
 * Store channels never become PAST_DUE here: authenticateRequest blocks PAST_DUE on every route at once. The status stays
 * as it is (a row left PAST_DUE by the old webhook becomes ACTIVE again) and auto-renew stays as it was; the next
 * RENEWAL / UNCANCELLATION / PRODUCT_CHANGE clears the flag, and EXPIRATION ends access when the grace runs out unpaid.
 */
async function handleBillingIssue(merchantId: number, event: RevenueCatEvent): Promise<Outcome> {
  const sub = await findSubscription(merchantId);
  if (!sub) return 'ignored_no_subscription';
  const channel = channelFromStore(event.store);
  const isStore = channel === 'APP_STORE' || channel === 'PLAY_STORE';
  const graceEnd = event.grace_period_expiration_at_ms ? new Date(event.grace_period_expiration_at_ms) : null;
  const extendTo = graceEnd && graceEnd > sub.currentPeriodEnd ? graceEnd : null;
  await db.prisma.subscription.update({
    where: { merchantId },
    data: {
      billingIssueAt: eventTime(event),
      ...(extendTo ? { currentPeriodEnd: extendTo } : {}),
      // Other stores RevenueCat may report keep the old rule (PAST_DUE); phase 2 decides for Lemon / Stripe
      ...(isStore ? (sub.status === 'PAST_DUE' ? { status: 'ACTIVE' } : {}) : { status: 'PAST_DUE' }),
      updatedAt: new Date(),
    },
  });
  await logActivity(
    sub.id,
    'IAP_BILLING_ISSUE',
    planHistory.billingIssue(channel, extendTo ?? (isStore ? sub.currentPeriodEnd : null), !!extendTo),
    event,
    { gracePeriodExpiresAt: graceEnd?.toISOString() ?? null, extendedTo: extendTo?.toISOString() ?? null },
  );
  return 'ok';
}
