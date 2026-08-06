import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';

/**
 * POST /api/webhooks/revenuecat
 * 
 * Receives webhook events from RevenueCat when subscription status changes.
 * Events: INITIAL_PURCHASE, RENEWAL, EXPIRATION, CANCELLATION, etc.
 * 
 * Auth: RevenueCat sends a shared secret in the Authorization header.
 * Configure REVENUECAT_WEBHOOK_SECRET in env.
 * 
 * App User ID format: "merchant_{merchantId}" (set by PurchasesManager.logInMerchant)
 */

// Product ID → plan duration mapping
const PRODUCT_DURATION: Record<string, { months: number; planName: string }> = {
  'anyrent_merchant_semi_annual': { months: 6, planName: 'basic' },
  'anyrent_merchant_annual': { months: 12, planName: 'basic' },
};

/** Plain-language activity text for merchant history (no product ids / SDK names). */
function userFacingActivityDescription(
  kind: 'subscribe' | 'renew' | 'expire' | 'cancel' | 'uncancel' | 'billing_issue',
  productId: string,
  extra?: string,
): string {
  const months = PRODUCT_DURATION[productId]?.months;
  const planLabel =
    months === 6 ? 'Basic — 6 months' : months === 12 ? 'Basic — 12 months' : 'Basic';

  switch (kind) {
    case 'subscribe':
      return `Subscribed to ${planLabel}`;
    case 'renew':
      return `Renewed ${planLabel}`;
    case 'expire':
      return 'Subscription expired';
    case 'cancel':
      return extra ? `Cancellation scheduled: ${extra}` : 'Cancellation scheduled';
    case 'uncancel':
      return 'Cancellation withdrawn — subscription stays active';
    case 'billing_issue':
      return 'Payment issue detected — please update payment method';
    default:
      return 'Subscription updated';
  }
}

// RevenueCat event types we handle
type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'PRODUCT_CHANGE'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'SUBSCRIBER_ALIAS';

interface RevenueCatEvent {
  type: RevenueCatEventType;
  app_user_id: string; // "merchant_32"
  product_id: string; // "anyrent_merchant_semi_annual"
  entitlement_ids?: string[];
  purchased_at_ms?: number;
  expiration_at_ms?: number;
  event_timestamp_ms?: number;
  store?: string;
  environment?: string;
  is_family_share?: boolean;
  original_app_user_id?: string;
  aliases?: string[];
  period_type?: string; // "NORMAL" | "TRIAL" | "INTRO"
  cancel_reason?: string;
  // Payment info
  price?: number;
  price_in_purchased_currency?: number;
  currency?: string;
  renewal_number?: number;
  transaction_id?: string;
  takehome_percentage?: number;
}

interface RevenueCatWebhookPayload {
  api_version: string;
  event: RevenueCatEvent;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook authenticity
    const authHeader = request.headers.get('authorization');
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
    
    if (webhookSecret) {
      const expectedAuth = `Bearer ${webhookSecret}`;
      if (authHeader !== expectedAuth) {
        console.error('[RevenueCat Webhook] Invalid authorization header');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 2. Parse payload
    const payload: RevenueCatWebhookPayload = await request.json();
    const { event } = payload;
    
    console.log(`[RevenueCat Webhook] Received event: ${event.type}`, {
      app_user_id: event.app_user_id,
      product_id: event.product_id,
      environment: event.environment,
      expiration_at_ms: event.expiration_at_ms,
    });

    // Skip sandbox events in production (optional)
    // if (event.environment === 'SANDBOX' && process.env.NODE_ENV === 'production') {
    //   return NextResponse.json({ status: 'skipped_sandbox' });
    // }

    // 3. Extract merchantId from app_user_id ("merchant_32" → 32)
    const merchantId = parseMerchantId(event.app_user_id);
    if (!merchantId) {
      console.error(`[RevenueCat Webhook] Cannot parse merchantId from: ${event.app_user_id}`);
      return NextResponse.json({ status: 'ignored', reason: 'invalid_app_user_id' });
    }

    // 4. Handle event
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        await handlePurchaseOrRenewal(merchantId, event);
        break;

      case 'EXPIRATION':
        await handleExpiration(merchantId, event);
        break;

      case 'CANCELLATION':
        await handleCancellation(merchantId, event);
        break;

      case 'UNCANCELLATION':
        await handleUncancellation(merchantId, event);
        break;

      case 'BILLING_ISSUE':
        await handleBillingIssue(merchantId, event);
        break;

      default:
        console.log(`[RevenueCat Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error: any) {
    console.error('[RevenueCat Webhook] Error:', error.message, error.stack);
    // Return 200 to prevent RevenueCat from retrying (we log the error)
    return NextResponse.json({ status: 'error', message: error.message }, { status: 200 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMerchantId(appUserId: string): number | null {
  // Format: "merchant_32" or "$RCAnonymousID:..." (skip anonymous)
  const match = appUserId.match(/^merchant_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

async function handlePurchaseOrRenewal(merchantId: number, event: RevenueCatEvent) {
  const productConfig = PRODUCT_DURATION[event.product_id];
  if (!productConfig) {
    console.warn(`[RevenueCat Webhook] Unknown product_id: ${event.product_id}`);
    return;
  }

  const now = new Date();
  const purchasedAt = event.purchased_at_ms ? new Date(event.purchased_at_ms) : now;
  let expiresAt: Date;
  if (event.environment === 'SANDBOX') {
    // SANDBOX: Always use real duration (sandbox expiration is accelerated: 6mo = 30min)
    expiresAt = addMonths(purchasedAt, productConfig.months);
    console.log(`[RevenueCat Webhook] SANDBOX: Using real duration ${productConfig.months} months (ignoring sandbox expiration)`);
  } else if (event.expiration_at_ms) {
    // PRODUCTION: Use actual expiration from Apple/Google
    expiresAt = new Date(event.expiration_at_ms);
  } else {
    // Fallback: calculate from purchase date
    expiresAt = addMonths(purchasedAt, productConfig.months);
  }

  console.log(`[RevenueCat Webhook] Purchase/Renewal for merchant ${merchantId}:`, {
    productId: event.product_id,
    purchasedAt: purchasedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    months: productConfig.months,
    environment: event.environment,
    purchased_at_ms: event.purchased_at_ms,
    expiration_at_ms: event.expiration_at_ms,
  });

  // Find or create subscription
  const subscription = await db.prisma.subscription.findUnique({
    where: { merchantId },
  });

  if (subscription) {
    // Update existing subscription
    await db.prisma.subscription.update({
      where: { merchantId },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: purchasedAt,
        currentPeriodEnd: expiresAt,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        cancelReason: null,
        // Update billing info from IAP event
        amount: event.price_in_purchased_currency || 0,
        currency: event.currency || 'VND',
        interval: productConfig.months === 6 ? 'semi_annual' : 'annual',
        intervalCount: 1,
        updatedAt: now,
      },
    });

    // Log activity
    await db.prisma.subscriptionActivity.create({
      data: {
        subscriptionId: subscription.id,
        type: event.type === 'INITIAL_PURCHASE' ? 'IAP_INITIAL_PURCHASE' : 'IAP_RENEWAL',
        description: userFacingActivityDescription(
          event.type === 'INITIAL_PURCHASE' ? 'subscribe' : 'renew',
          event.product_id,
        ),
        metadata: JSON.stringify({
          productId: event.product_id,
          store: event.store,
          environment: event.environment,
          purchasedAt: purchasedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          raw_purchased_at_ms: event.purchased_at_ms || null,
          raw_expiration_at_ms: event.expiration_at_ms || null,
          period_type: event.period_type || null,
          price: event.price_in_purchased_currency || null,
          currency: event.currency || null,
          renewal_number: event.renewal_number || null,
          transaction_id: event.transaction_id || null,
          takehome_percentage: event.takehome_percentage || null,
        }),
      },
    });
  } else {
    // Find basic plan
    const plan = await db.prisma.plan.findFirst({
      where: { name: { contains: 'basic', mode: 'insensitive' } },
    });

    if (!plan) {
      console.error(`[RevenueCat Webhook] No basic plan found for merchant ${merchantId}`);
      return;
    }

    // Create new subscription
    const newSub = await db.prisma.subscription.create({
      data: {
        merchantId,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: purchasedAt,
        currentPeriodEnd: expiresAt,
        amount: 0, // Apple handles payment
        currency: 'VND',
        interval: productConfig.months === 6 ? 'semi_annual' : 'annual',
        intervalCount: 1,
      },
    });

    await db.prisma.subscriptionActivity.create({
      data: {
        subscriptionId: newSub.id,
        type: 'IAP_INITIAL_PURCHASE',
        description: userFacingActivityDescription('subscribe', event.product_id),
        metadata: JSON.stringify({
          productId: event.product_id,
          store: event.store,
          environment: event.environment,
        }),
      },
    });
  }

  console.log(`[RevenueCat Webhook] ✅ Subscription updated for merchant ${merchantId}: ACTIVE until ${expiresAt.toISOString()}`);

  // Create Payment record for tracking revenue
  const subId = subscription?.id || (await db.prisma.subscription.findUnique({ where: { merchantId } }))?.id;
  if (subId && event.price_in_purchased_currency && event.price_in_purchased_currency > 0) {
    const paymentMethod = event.store === 'APP_STORE' ? 'IAP_APPLE' : event.store === 'PLAY_STORE' ? 'IAP_GOOGLE' : 'MANUAL';
    const planTitle = productConfig.months === 6 ? 'Basic — 6 months' : 'Basic — 12 months';
    const storeLabel = event.store === 'APP_STORE' ? 'App Store' : event.store === 'PLAY_STORE' ? 'Google Play' : 'in-app';
    await db.prisma.payment.create({
      data: {
        amount: event.price_in_purchased_currency,
        currency: event.currency || 'VND',
        method: paymentMethod as any,
        type: 'SUBSCRIPTION_PAYMENT' as any,
        status: 'COMPLETED' as any,
        subscriptionId: subId,
        merchantId,
        reference: event.transaction_id || null,
        transactionId: event.transaction_id || null,
        invoiceNumber: event.transaction_id || null,
        description: `${planTitle} — ${event.type === 'INITIAL_PURCHASE' ? 'new subscription' : 'renewal'} (${storeLabel})`,
        notes: event.environment === 'SANDBOX' ? 'Sandbox test purchase' : null,
        processedAt: purchasedAt,
        metadata: JSON.stringify({
          store: event.store,
          environment: event.environment,
          renewal_number: event.renewal_number,
          takehome_percentage: event.takehome_percentage,
          product_display_name: (event as any).product_display_name,
        }),
      },
    });
    console.log(`[RevenueCat Webhook] 💰 Payment record created: ${event.price_in_purchased_currency} ${event.currency} via ${paymentMethod}`);
  }
}

async function handleExpiration(merchantId: number, event: RevenueCatEvent) {
  const subscription = await db.prisma.subscription.findUnique({
    where: { merchantId },
  });

  if (!subscription) return;

  // Only mark EXPIRED if currentPeriodEnd has actually passed.
  // In sandbox, EXPIRATION events fire immediately after cancel but the period
  // we set (6 months from purchase) hasn't ended yet.
  const now = new Date();
  if (subscription.currentPeriodEnd > now) {
    console.log(`[RevenueCat Webhook] ⚠️ EXPIRATION event for merchant ${merchantId} ignored: period end ${subscription.currentPeriodEnd.toISOString()} > now. Subscription still active.`);
    // Log activity but don't change status
    await db.prisma.subscriptionActivity.create({
      data: {
        subscriptionId: subscription.id,
        type: 'IAP_EXPIRATION_IGNORED',
        description: `Period still active — expiration ignored until ${subscription.currentPeriodEnd.toISOString()}`,
        metadata: JSON.stringify({
          productId: event.product_id,
          expirationAtMs: event.expiration_at_ms,
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
          reason: 'period_not_ended',
        }),
      },
    });
    return;
  }

  await db.prisma.subscription.update({
    where: { merchantId },
    data: {
      status: 'EXPIRED',
      updatedAt: now,
    },
  });

  await db.prisma.subscriptionActivity.create({
    data: {
      subscriptionId: subscription.id,
      type: 'IAP_EXPIRATION',
      description: userFacingActivityDescription('expire', event.product_id),
      metadata: JSON.stringify({
        productId: event.product_id,
        expirationAtMs: event.expiration_at_ms,
      }),
    },
  });

  console.log(`[RevenueCat Webhook] ⚠️ Subscription expired for merchant ${merchantId}`);
}

async function handleCancellation(merchantId: number, event: RevenueCatEvent) {
  const subscription = await db.prisma.subscription.findUnique({
    where: { merchantId },
  });

  if (!subscription) return;

  await db.prisma.subscription.update({
    where: { merchantId },
    data: {
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
      cancelReason: event.cancel_reason || 'User cancelled via App Store',
      updatedAt: new Date(),
    },
  });

  await db.prisma.subscriptionActivity.create({
    data: {
      subscriptionId: subscription.id,
      type: 'IAP_CANCELLATION',
      description: userFacingActivityDescription(
        'cancel',
        event.product_id,
        event.cancel_reason || undefined,
      ),
      metadata: JSON.stringify({
        productId: event.product_id,
        cancelReason: event.cancel_reason,
      }),
    },
  });

  console.log(`[RevenueCat Webhook] ⚠️ Subscription cancelled for merchant ${merchantId} (will expire at period end)`);
}

async function handleUncancellation(merchantId: number, event: RevenueCatEvent) {
  const subscription = await db.prisma.subscription.findUnique({
    where: { merchantId },
  });

  if (!subscription) return;

  await db.prisma.subscription.update({
    where: { merchantId },
    data: {
      cancelAtPeriodEnd: false,
      canceledAt: null,
      cancelReason: null,
      updatedAt: new Date(),
    },
  });

  await db.prisma.subscriptionActivity.create({
    data: {
      subscriptionId: subscription.id,
      type: 'IAP_UNCANCELLATION',
      description: userFacingActivityDescription('uncancel', event.product_id),
    },
  });

  console.log(`[RevenueCat Webhook] ✅ Subscription uncancelled for merchant ${merchantId}`);
}

async function handleBillingIssue(merchantId: number, event: RevenueCatEvent) {
  const subscription = await db.prisma.subscription.findUnique({
    where: { merchantId },
  });

  if (!subscription) return;

  // Don't expire immediately — Apple retries billing for ~16 days
  await db.prisma.subscription.update({
    where: { merchantId },
    data: {
      status: 'PAST_DUE',
      updatedAt: new Date(),
    },
  });

  await db.prisma.subscriptionActivity.create({
    data: {
      subscriptionId: subscription.id,
      type: 'IAP_BILLING_ISSUE',
      description: userFacingActivityDescription('billing_issue', event.product_id),
      metadata: JSON.stringify({
        productId: event.product_id,
        store: event.store,
      }),
    },
  });

  console.log(`[RevenueCat Webhook] ⚠️ Billing issue for merchant ${merchantId}`);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
