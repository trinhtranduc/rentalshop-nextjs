import { NextRequest, NextResponse } from 'next/server';
import { db, prisma } from '@rentalshop/database';
import { sendSubscriptionRenewalEmail } from '@rentalshop/utils';
import { withAuthRoles } from '@rentalshop/auth/server';
import { calculateRenewalTotal, handleApiError, moduleMonthlyTotal, renewalIntervalForMonths, ResponseBuilder } from '@rentalshop/utils';
import { API, PAYMENT_METHOD, PAYMENT_TYPE, PAYMENT_STATUS, SUBSCRIPTION_STATUS, USER_ROLE, PLATFORM_OPS_ROLES } from '@rentalshop/constants';

/**
 * POST /api/subscriptions/[id]/renew
 * Renew subscription with payment tracking
 *
 * requireActiveSubscription: false — Renewal is how users recover after expiry; gate must not block it.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const subscriptionId = parseInt(resolvedParams.id);
  
  return withAuthRoles([...PLATFORM_OPS_ROLES, USER_ROLE.MERCHANT], {
    requireActiveSubscription: false,
  })(async (request, { user, userScope }) => {
    try {
      
      if (isNaN(subscriptionId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_SUBSCRIPTION_ID'), { status: 400 });
      }

      const body = await request.json();
      const { 
        method, 
        duration = 1, 
        transactionId, 
        reference, 
        description, 
        paymentDate 
      } = body;

      // Validate required fields
      if (!method || !transactionId) {
        return NextResponse.json(
          ResponseBuilder.error('PAYMENT_METHOD_AND_TRANSACTION_ID_REQUIRED'),
          { status: 400 }
        );
      }

      if (!['STRIPE', 'TRANSFER'].includes(method)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PAYMENT_METHOD'),
          { status: 400 }
        );
      }

      const existing = await db.subscriptions.findById(subscriptionId);
      if (!existing) {
        return NextResponse.json(ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      // A merchant renews only its own subscription (#779; was: any id)
      if (user.role === USER_ROLE.MERCHANT && existing.merchantId !== userScope.merchantId) {
        return NextResponse.json(ResponseBuilder.error('FORBIDDEN'), { status: API.STATUS.FORBIDDEN });
      }

      // 1 / 3 / 6 / 12 months = the four billing cycles (#779)
      const interval = renewalIntervalForMonths(Number(duration));
      if (!interval) {
        return NextResponse.json(ResponseBuilder.error('INVALID_DURATION'), { status: 400 });
      }

      // Owner rules (#779): plan (+ addons) for the cycle with 0/0/5/10 %; expired → from now,
      // not expired → from the current end; calendar months on the Vietnam day.
      const existingPlan = (existing as { plan?: { basePrice?: number; currency?: string } }).plan;
      // Add-ons and modules of the shop at today's catalog price; those marked for removal are not charged (#782)
      const moduleItems = await db.billingModules.renewalItems(existing.merchantId);
      const renewal = calculateRenewalTotal({
        basePrice: existingPlan?.basePrice ?? 0,
        addonMonthlyTotal: moduleMonthlyTotal(moduleItems),
        interval,
        currentPeriodEnd: existing.currentPeriodEnd,
        now: new Date(),
      });
      const renewalAmount = renewal.totalDue;

      // Use database transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx: any) => {
        // Create payment record
        const payment = await tx.payment.create({
          data: {
            subscriptionId: subscriptionId,
            merchantId: existing.merchantId,
            amount: renewalAmount,
            currency: existing.currency || existingPlan?.currency || 'USD',
            method: method as any,
            type: PAYMENT_TYPE.SUBSCRIPTION_PAYMENT as any,
            status: method === PAYMENT_METHOD.STRIPE ? PAYMENT_STATUS.COMPLETED as any : PAYMENT_STATUS.PENDING as any,
            transactionId: transactionId,
            reference: reference || undefined,
            description: description || `${duration} month${duration > 1 ? 's' : ''} subscription renewal`,
            processedAt: method === PAYMENT_METHOD.STRIPE ? new Date() : (paymentDate ? new Date(paymentDate) : null),
            createdAt: paymentDate ? new Date(paymentDate) : new Date()
          }
        });

        // Items marked for removal end now; the others take today's catalog price (#782)
        await db.billingModules.applyRenewal(tx as any, existing.merchantId);

        // Update subscription period
        const updatedSubscription = await tx.subscription.update({
          where: { id: subscriptionId },
          data: {
            currentPeriodStart: renewal.periodStart,
            currentPeriodEnd: renewal.periodEnd,
            amount: renewal.planPrice,
            interval: renewal.interval,
            intervalCount: renewal.months,
            period: renewal.months,
            discount: renewal.discountPercent,
            status: SUBSCRIPTION_STATUS.ACTIVE as any,
            updatedAt: new Date()
          },
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            plan: true
          }
        });

        return { updatedSubscription, payment };
      });

      // DEBUG: Log merchant email status
      console.log('🔍 [Subscription] DEBUG - renew route email check:', {
        subscriptionId,
        merchantId: result.updatedSubscription.merchantId,
        merchantName: result.updatedSubscription.merchant?.name,
        merchantEmail: result.updatedSubscription.merchant?.email || '❌ NO EMAIL',
        hasEmail: !!result.updatedSubscription.merchant?.email,
        emailProvider: process.env.EMAIL_PROVIDER || 'console'
      });
      
      // Send email notification (non-blocking)
      if (result.updatedSubscription.merchant?.email) {
        console.log('📨 [Subscription] Sending renewal email...', {
          to: result.updatedSubscription.merchant.email,
          merchantName: result.updatedSubscription.merchant.name,
          planName: result.updatedSubscription.plan?.name,
          paymentMethod: method,
          provider: process.env.EMAIL_PROVIDER || 'console'
        });
        
        sendSubscriptionRenewalEmail({
          merchantName: result.updatedSubscription.merchant.name || 'Quý khách',
          email: result.updatedSubscription.merchant.email,
          planName: result.updatedSubscription.plan?.name || 'Unknown Plan',
          amount: renewalAmount,
          currency: result.updatedSubscription.currency || 'VND',
          periodStart: result.updatedSubscription.currentPeriodStart || new Date(),
          periodEnd: result.updatedSubscription.currentPeriodEnd || new Date(),
          paymentMethod: method,
          transactionId: transactionId || undefined
        })
          .then((emailResult) => {
            console.log('📬 [Subscription] Renewal email result:', {
              success: emailResult.success,
              error: emailResult.error,
              messageId: emailResult.messageId,
              provider: process.env.EMAIL_PROVIDER
            });
          })
          .catch((error) => {
            console.error('❌ [Subscription] Failed to send renewal email:', error);
          });
      } else {
        console.warn('⚠️ [Subscription] Cannot send renewal email: merchant email not found');
      }

      return NextResponse.json(
        ResponseBuilder.success('SUBSCRIPTION_RENEWED_SUCCESS', {
          subscription: result.updatedSubscription,
          payment: result.payment,
          renewal,
          modules: moduleItems.map((m) => ({ id: m.id, name: m.name, kind: m.kind, quantity: m.quantity, unitPrice: m.unitPrice }))
        })
      );
    } catch (error) {
      console.error('Error renewing subscription:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}