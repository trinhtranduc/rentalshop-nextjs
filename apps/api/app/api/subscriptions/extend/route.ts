// ============================================================================
// SUBSCRIPTION EXTENSION API ENDPOINTS
// ============================================================================
// MULTI-TENANT: Uses subdomain-based tenant DB

import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/subscriptions/extend - Extend subscription
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const POST = withManagementAuth(async (request, { user }) => {
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;

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
        ResponseBuilder.error('SUBSCRIPTION_END_DATE_REQUIRED', 'Subscription ID, end date, and amount are required'),
        { status: 400 }
      );
    }

    // Validate dates
    const endDate = new Date(newEndDate);
    if (isNaN(endDate.getTime())) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_DATE_FORMAT', 'Invalid date format'),
        { status: 400 }
      );
    }

    if (endDate <= new Date()) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_END_DATE', 'End date must be in the future'),
        { status: 400 }
      );
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_AMOUNT', 'Amount must be positive'),
        { status: 400 }
      );
    }

    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId }
    });
    
    if (!subscription) {
      return NextResponse.json(
        ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'),
        { status: API.STATUS.NOT_FOUND }
      );
    }
    
    const extendedSubscription = await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        currentPeriodEnd: endDate,
        updatedAt: new Date()
      },
      include: {
        payments: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return NextResponse.json(
      ResponseBuilder.success('SUBSCRIPTION_EXTENDED_SUCCESS', {
        ...extendedSubscription,
        message: `Subscription extended until ${endDate.toISOString().split('T')[0]}`
      })
    );
  } catch (error) {
    console.error('Error extending subscription:', error);
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
