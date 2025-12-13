// ============================================================================
// SUBSCRIPTION EXTENSION API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
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
      amount, 
      method = 'MANUAL_EXTENSION',
      description 
    } = body;

    // Validate required fields
    if (!newEndDate || amount === undefined) {
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

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_AMOUNT'),
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
    
    // Update subscription period end
    // Đơn giản: chỉ update currentPeriodEnd, không cần update trialEnd
    // Bất kể merchant status là trial hay không, chỉ cần currentPeriodEnd
    const updateData: any = {
      currentPeriodEnd: endDate,
      updatedAt: new Date()
    };
    
    const extendedSubscription = await db.subscriptions.update(subscriptionId, updateData);

    // Calculate extension duration
    const oldEndDate = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : new Date();
    const extensionDays = Math.ceil((endDate.getTime() - oldEndDate.getTime()) / (1000 * 60 * 60 * 24));

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
        amount,
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

    return NextResponse.json(
      ResponseBuilder.success('SUBSCRIPTION_EXTENDED_SUCCESS', extendedSubscription)
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

