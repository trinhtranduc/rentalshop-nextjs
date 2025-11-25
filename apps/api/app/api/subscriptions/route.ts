// ============================================================================
// SUBSCRIPTION API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { subscriptionCreateSchema, handleApiError } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

// ============================================================================
// GET /api/subscriptions - Search subscriptions
// ============================================================================
export const GET = withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT])(async (request: NextRequest, { user, userScope }) => {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      search: searchParams.get('q') || searchParams.get('search') || undefined,
      merchantId: searchParams.get('merchantId') ? parseInt(searchParams.get('merchantId')!) : undefined,
      planId: searchParams.get('planId') ? parseInt(searchParams.get('planId')!) : undefined,
      status: searchParams.get('status') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    // Apply merchant scoping for non-admin users
    if (user.role !== USER_ROLE.ADMIN) {
      filters.merchantId = userScope.merchantId;
    }

    const result = await db.subscriptions.search(filters);

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        hasMore: result.hasMore,
        limit: filters.limit,
        offset: filters.offset
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

// ============================================================================
// POST /api/subscriptions - Create subscription
// ============================================================================
export const POST = withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT])(async (request: NextRequest, { user, userScope }) => {
  try {
    const body = await request.json();
    const validatedData = subscriptionCreateSchema.parse(body);

    // Role-based restrictions
    if (user.role === USER_ROLE.MERCHANT && userScope.merchantId) {
      // Merchants can only create subscriptions for themselves
      validatedData.merchantId = userScope.merchantId;
    }

    // Convert planId to number if it's a string
    const subscriptionData = {
      ...validatedData,
      planId: typeof validatedData.planId === 'string' ? parseInt(validatedData.planId) : validatedData.planId
    };

    const subscription = await db.subscriptions.create(subscriptionData);

    return NextResponse.json({
      success: true,
      data: subscription,
      code: 'SUBSCRIPTION_CREATED_SUCCESS',
        message: 'Subscription created successfully'
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
