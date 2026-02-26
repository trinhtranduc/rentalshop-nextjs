// ============================================================================
// SUBSCRIPTION EXTENSION API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth/server';
import { handleApiError, ResponseBuilder, sendSubscriptionExtensionEmail } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

/**
 * POST /api/subscriptions/[id]/extend - Extend subscription
 * Requires: ADMIN role
 */
async function handleExtendSubscription(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
  { user }: { user: any; userScope: any }
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

    // Calculate extension duration
    const oldEndDate = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : new Date();
    const extensionDays = Math.ceil((endDate.getTime() - oldEndDate.getTime()) / (1000 * 60 * 60 * 24));

    if (extensionDays <= 0) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_EXTENSION_DURATION'),
        { status: 400 }
      );
    }

    // Auto-calculate amount if not provided
    let calculatedAmount = amount;
    if (calculatedAmount === undefined || calculatedAmount === null) {
      // Calculate plan price per day
      const billingInterval = subscription.billingInterval || 'monthly';
      const monthlyPrice = subscription.plan.basePrice || 0;
      const dailyPrice = monthlyPrice / 30; // Assuming 30 days per month
      calculatedAmount = dailyPrice * extensionDays;
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
    
    // Update subscription period end
    // Đơn giản: chỉ update currentPeriodEnd, không cần update trialEnd
    // Bất kể merchant status là trial hay không, chỉ cần currentPeriodEnd
    const updateData: any = {
      currentPeriodEnd: endDate,
      updatedAt: new Date()
    };
    
    const extendedSubscription = await db.subscriptions.update(subscriptionId, updateData);
    
    // Fetch subscription with merchant and plan for email
    const subscriptionWithDetails = await db.subscriptions.findById(subscriptionId);

    // Log activity to database
    await db.subscriptionActivities.create({
      subscriptionId,
      type: 'subscription_extended',
      description: `Subscription extended by ${extensionDays} day${extensionDays !== 1 ? 's' : ''} until ${endDate.toISOString().split('T')[0]}`,
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
          userId: user.userId || user.id,
          email: user.email,
          role: user.role,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
        },
        source: user.role === USER_ROLE.ADMIN ? 'admin_panel' : 'merchant_panel',
        severity: 'success',
        category: 'billing'
      },
      performedBy: user.userId || user.id
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
  return withAuthRoles(['ADMIN'])(async (request, context) => {
    return handleExtendSubscription(request, { params }, context);
  })(request);
}

