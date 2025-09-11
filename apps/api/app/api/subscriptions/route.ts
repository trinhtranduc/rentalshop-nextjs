// ============================================================================
// SUBSCRIPTION API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  searchSubscriptions, 
  createSubscription,
  getExpiredSubscriptions,
  markSubscriptionAsExpired,
  extendSubscription
} from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
import { subscriptionCreateSchema } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

// ============================================================================
// GET /api/subscriptions - Search subscriptions
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      merchantId: searchParams.get('merchantId') ? parseInt(searchParams.get('merchantId')!) : undefined,
      planId: searchParams.get('planId') ? parseInt(searchParams.get('planId')!) : undefined,
      status: searchParams.get('status') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    // Role-based filtering
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      // Outlet users can only see their merchant's subscriptions
      if (user.merchantId) {
        filters.merchantId = user.merchantId;
      } else {
        return NextResponse.json(
          { success: false, message: 'No merchant access' },
          { status: API.STATUS.FORBIDDEN }
        );
      }
    } else if (user.role === 'MERCHANT') {
      // Merchant users can only see their own subscriptions
      if (user.merchantId) {
        filters.merchantId = user.merchantId;
      } else {
        return NextResponse.json(
          { success: false, message: 'No merchant access' },
          { status: API.STATUS.FORBIDDEN }
        );
      }
    }
    // ADMIN users can see all subscriptions (no filtering)

    const result = await searchSubscriptions(filters);

    return NextResponse.json({
      success: true,
      data: result.subscriptions,
      pagination: {
        total: result.total,
        hasMore: result.hasMore,
        limit: filters.limit,
        offset: filters.offset
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch subscriptions' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// ============================================================================
// POST /api/subscriptions - Create subscription
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Check permissions - only ADMIN and MERCHANT can create subscriptions
    if (!['ADMIN', 'MERCHANT'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const body = await request.json();
    const validatedData = subscriptionCreateSchema.parse(body);

    // Role-based restrictions
    if (user.role === 'MERCHANT' && user.merchantId) {
      // Merchants can only create subscriptions for themselves
      validatedData.merchantId = user.merchantId;
    }

    const subscription = await createSubscription(validatedData);

    return NextResponse.json({
      success: true,
      data: subscription,
      message: 'Subscription created successfully'
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create subscription' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
