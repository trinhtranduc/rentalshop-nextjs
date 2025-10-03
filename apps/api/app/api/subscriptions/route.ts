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
import { withAuthRoles } from '@rentalshop/auth';
import { subscriptionCreateSchema } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

// ============================================================================
// GET /api/subscriptions - Search subscriptions
// ============================================================================
export const GET = withAuthRoles(['ADMIN', 'MERCHANT'])(async (request: NextRequest, { user, userScope }) => {
  try {
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

    // Apply merchant scoping for non-admin users
    if (user.role !== 'ADMIN') {
      filters.merchantId = userScope.merchantId;
    }

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
});

// ============================================================================
// POST /api/subscriptions - Create subscription
// ============================================================================
/**
 * POST /api/subscriptions - Create subscription
 * Requires: ADMIN or MERCHANT role
 */
async function handleCreateSubscription(
  request: NextRequest,
  { user }: { user: any; userScope: any }
) {
  try {

    const body = await request.json();
    const validatedData = subscriptionCreateSchema.parse(body);

    // Role-based restrictions
    if (user.role === 'MERCHANT' && user.merchantId) {
      // Merchants can only create subscriptions for themselves
      validatedData.merchantId = user.merchantId;
    }

    // Convert planId to number if it's a string
    const subscriptionData = {
      ...validatedData,
      planId: typeof validatedData.planId === 'string' ? parseInt(validatedData.planId) : validatedData.planId
    };

    const subscription = await createSubscription(subscriptionData);

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
