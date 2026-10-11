// ============================================================================
// SUBSCRIPTION EXTENSION API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db, prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth/server';
import type { AuthUser } from '@rentalshop/auth';
import {
  handleApiError,
  ResponseBuilder,
  sendSubscriptionExtensionEmail,
  normalizeBillingInterval,
  calculateExtensionTotal,
  civilDaysBetween,
  formatDateKeyInTimeZone,
  SHOP_TIMEZONE,
} from '@rentalshop/utils';
import { API, PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_TYPE, USER_ROLE } from '@rentalshop/constants';
import { PLATFORM_OPS_ROLES } from '@rentalshop/constants';

/**
 * POST /api/subscriptions/[id]/extend - Extend subscription
 * Requires: ADMIN role
 */
async function handleExtendSubscription(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
  { user }: { user: AuthUser }
) {
  try {
    // Resolve params (handle both Promise and direct object)
    const resolvedParams = await Promise.resolve(params);
    const subscriptionId = parseInt(resolvedParams.id);

    if (isNaN(subscriptionId)) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_SUBSCRIPTION_ID'),
        { status: 400 }
      );
    }

    const body = await request.json();
    const { 
      newEndDate, 
      amount, // Optional: will be auto-calculated if not provided
      method = 'MANUAL_EXTENSION',
      description,
      sendEmail = true // Default to true for backward compatibility
    } = body;

    // Validate required fields
    if (!newEndDate) {
      return NextResponse.json(
        ResponseBuilder.error('SUBSCRIPTION_END_DATE_REQUIRED'),
        { status: 400 }
      );
    }

    // Validate dates
    const endDate = new Date(newEndDate);
    if (isNaN(endDate.getTime())) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_DATE_FORMAT'),
        { status: 400 }
      );
    }

    if (endDate <= new Date()) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_END_DATE'),
        { status: 400 }
      );
    }

    // Get subscription
    const subscription = await db.subscriptions.findById(subscriptionId);
    
    if (!subscription) {
      return NextResponse.json(
        ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'),
        { status: API.STATUS.NOT_FOUND }
      );
    }

    if (!subscription.plan) {
      return NextResponse.json(
        ResponseBuilder.error('PLAN_NOT_FOUND'),
        { status: 400 }
      );
    }

    // db.subscriptions.findById() may return narrowed TS types,
    // but runtime includes full subscription + plan fields. Cast locally.
    const subscriptionAny = subscription as unknown as { billingInterval?: unknown; plan?: unknown };
    const planAny = subscriptionAny.plan as { basePrice?: number } | undefined;

    // Calculate extension duration
    // An expired subscription is extended from now, not from its old end (#779, owner rule).
    const nowForBase = new Date();
    const storedEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
    const oldEndDate = storedEnd && storedEnd.getTime() > nowForBase.getTime() ? storedEnd : nowForBase;
    // Vietnam civil days from the old end day to the new end day (#588). Acceptance stays on the
    // instants as before: any new end after the old end is valid (a same-day move counts 0 days).
    const extensionDays = Math.max(0, civilDaysBetween(oldEndDate, endDate));

    if (endDate.getTime() <= oldEndDate.getTime()) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_EXTENSION_DURATION'),
        { status: 400 }
      );
    }

    // Auto-calculate amount if not provided
    let calculatedAmount = amount;
    if (calculatedAmount === undefined || calculatedAmount === null) {
      // Default: use shared pure calculation (consistent with UI + /extend/calculate).
      // Fallback to a simple monthly proration if anything goes wrong.
      try {
        const { searchParams } = new URL(request.url);
        const requestedIntervalRaw =
          searchParams.get('billingInterval') ||
          (typeof subscriptionAny.billingInterval === 'string' ? subscriptionAny.billingInterval : undefined) ||
          'monthly';
        const selectedInterval = normalizeBillingInterval(requestedIntervalRaw);

        const extensionCalc = calculateExtensionTotal({
          oldEndDate,
          newEndDate: endDate,
          plan: { basePrice: planAny?.basePrice || 0 },
          selectedInterval,
        });

        calculatedAmount = extensionCalc.totalDue;
      } catch {
        const monthlyPrice = planAny?.basePrice || 0;
        const dailyPrice = monthlyPrice / 30;
        calculatedAmount = dailyPrice * extensionDays;
      }
      calculatedAmount = Math.round(calculatedAmount * 100) / 100; // Round to 2 decimals
    }

    // Validate amount (allow 0 for free manual extensions)
    if (calculatedAmount < 0) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_AMOUNT'),
        { status: 400 }
      );
    }

    // Get active addons for merchant
    const addons = await db.planLimitAddons.findActiveByMerchant(subscription.merchantId);
    const totalAddonLimits = await db.planLimitAddons.calculateTotal(subscription.merchantId);
    
    // An extension moves the end date only: the cycle and the price of the plan stay (#785; it used to rewrite
    // `interval` from the number of days, so an annual plan extended by 10 days became "monthly").
    const updateData = {
      currentPeriodEnd: endDate,
      status: 'ACTIVE',
      cancelAtPeriodEnd: false,
      canceledAt: null,
      cancelReason: null,
      updatedAt: new Date()
    };
    
    // Only "Payment Received" is money the shop paid: it leaves a Payment. The other methods (Manual / Admin
    // extension, Compensation) are free grants and leave none (#785).
    const paymentReceived = method === 'PAYMENT_RECEIVED' && calculatedAmount > 0;
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({ where: { id: subscriptionId }, data: updateData });
      if (paymentReceived) {
        await tx.payment.create({
          data: {
            subscriptionId,
            merchantId: subscription.merchantId,
            amount: calculatedAmount,
            currency: subscription.currency || (planAny as any)?.currency || 'VND',
            method: PAYMENT_METHOD.MANUAL as any,
            type: PAYMENT_TYPE.PLAN_EXTENSION as any,
            status: PAYMENT_STATUS.COMPLETED as any,
            transactionId: body.transactionId || undefined,
            description: description || `Extension to ${formatDateKeyInTimeZone(endDate, SHOP_TIMEZONE)}`,
            processedAt: new Date(),
          },
        });
      }
    });
    // Same shape as before for the response (the converted subscription with merchant and plan)
    const extendedSubscription = await db.subscriptions.update(subscriptionId, {});
    
    // Fetch subscription with merchant and plan for email
    const subscriptionWithDetails = await db.subscriptions.findById(subscriptionId);

    // Log activity to database
    await db.subscriptionActivities.create({
      subscriptionId,
      type: 'subscription_extended',
      description: `Subscription extended by ${extensionDays} day${extensionDays !== 1 ? 's' : ''} until ${formatDateKeyInTimeZone(endDate, SHOP_TIMEZONE)}`,
      metadata: {
        planId: subscription.planId,
        planName: subscription.plan?.name,
        previousEndDate: oldEndDate.toISOString(),
        newEndDate: endDate.toISOString(),
        extensionDays,
        amount: calculatedAmount,
        method,
        description: description || 'Manual extension',
        performedBy: {
          userId: user.id,
          email: user.email,
          role: user.role,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
        },
        source: user.role === USER_ROLE.ADMIN ? 'admin_panel' : 'merchant_panel',
        severity: 'success',
        category: 'billing'
      },
      performedBy: user.id
    });

    // DEBUG: Log merchant email status
    console.log('🔍 [Subscription] DEBUG - extend route email check:', {
      subscriptionId,
      merchantId: subscriptionWithDetails?.merchantId,
      merchantName: subscriptionWithDetails?.merchant?.name,
      merchantEmail: subscriptionWithDetails?.merchant?.email || '❌ NO EMAIL',
      hasEmail: !!subscriptionWithDetails?.merchant?.email,
      emailProvider: process.env.EMAIL_PROVIDER || 'console'
    });
    
    // Send email notification (non-blocking) - only if sendEmail is true
    if (sendEmail && subscriptionWithDetails?.merchant?.email) {
      console.log('📨 [Subscription] Sending extension email...', {
        to: subscriptionWithDetails.merchant.email,
        merchantName: subscriptionWithDetails.merchant.name,
        planName: subscriptionWithDetails.plan?.name,
        extensionDays,
        provider: process.env.EMAIL_PROVIDER || 'console'
      });
      
      sendSubscriptionExtensionEmail({
        merchantName: subscriptionWithDetails.merchant.name || 'Quý khách',
        email: subscriptionWithDetails.merchant.email,
        planName: subscriptionWithDetails.plan?.name || 'Unknown Plan',
        oldEndDate: oldEndDate,
        newEndDate: endDate,
        extensionDays,
        method: method || 'MANUAL_EXTENSION',
        description: description || undefined
      })
        .then((emailResult) => {
          console.log('📬 [Subscription] Extension email result:', {
            success: emailResult.success,
            error: emailResult.error,
            messageId: emailResult.messageId,
            provider: process.env.EMAIL_PROVIDER
          });
        })
        .catch((error) => {
          console.error('❌ [Subscription] Failed to send extension email:', error);
        });
    } else if (!sendEmail) {
      console.log('📧 [Subscription] Email notification skipped (sendEmail=false)');
    } else {
      console.warn('⚠️ [Subscription] Cannot send extension email: merchant email not found');
    }

    // Return extended subscription with addon information
    return NextResponse.json(
      ResponseBuilder.success('SUBSCRIPTION_EXTENDED_SUCCESS', {
        ...extendedSubscription,
        extensionDetails: {
          extensionDays,
          calculatedAmount,
          oldEndDate: oldEndDate.toISOString(),
          newEndDate: endDate.toISOString(),
          addons: {
            count: addons.length,
            items: addons.map(addon => ({
              id: addon.id,
              outlets: addon.outlets,
              users: addon.users,
              products: addon.products,
              customers: addon.customers,
              orders: addon.orders,
              notes: addon.notes,
              isActive: addon.isActive
            })),
            totalLimits: totalAddonLimits
          }
        }
      })
    );
  } catch (error) {
    console.error('Error extending subscription:', error);
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  return withAuthRoles([...PLATFORM_OPS_ROLES])(async (request, context) => {
    return handleExtendSubscription(request, { params }, context);
  })(request);
}

