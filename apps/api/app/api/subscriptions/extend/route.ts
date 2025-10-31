// ============================================================================
// SUBSCRIPTION EXTENSION API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

/**
 * POST /api/subscriptions/extend - Extend subscription
 * Requires: ADMIN role
 */
async function handleExtendSubscription(
  request: NextRequest,
  { user }: { user: any; userScope: any }
) {
  try {

    const body = await request.json();
    const { 
      subscriptionId, 
      newEndDate, 
      amount, 
      method = 'MANUAL_EXTENSION',
      description 
    } = body;

    // Validate required fields
    if (!subscriptionId || !newEndDate || amount === undefined) {
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

    // TODO: Implement subscription extension using simplified database API
    const subscription = await db.subscriptions.findById(subscriptionId);
    
    if (!subscription) {
      return NextResponse.json(
        ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'),
        { status: API.STATUS.NOT_FOUND }
      );
    }
    
    const extendedSubscription = await db.subscriptions.update(subscriptionId, {
      currentPeriodEnd: endDate,
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      data: extendedSubscription,
      code: 'SUBSCRIPTION_EXTENDED_SUCCESS',
      message: `Subscription extended until ${endDate.toISOString().split('T')[0]}`
    });
  } catch (error) {
    console.error('Error extending subscription:', error);
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

export const POST = withAuthRoles(['ADMIN'])((req, context) => 
  handleExtendSubscription(req, context)
);
