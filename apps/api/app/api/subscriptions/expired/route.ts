// ============================================================================
// EXPIRED SUBSCRIPTIONS API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getExpiredSubscriptions,
  markSubscriptionAsExpired,
  extendSubscription
} from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

/**
 * GET /api/subscriptions/expired - Get expired subscriptions
 * Requires: ADMIN role
 */
async function handleGetExpiredSubscriptions(
  request: NextRequest,
  { user }: { user: any; userScope: any }
) {
  try {

    const expiredSubscriptions = await getExpiredSubscriptions();

    return NextResponse.json({
      success: true,
      data: expiredSubscriptions,
      message: `Found ${expiredSubscriptions.length} expired subscriptions`
    });
  } catch (error) {
    console.error('Error fetching expired subscriptions:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch expired subscriptions' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * POST /api/subscriptions/expired - Mark subscription as expired
 * Requires: ADMIN role
 */
async function handleMarkSubscriptionExpired(
  request: NextRequest,
  { user }: { user: any; userScope: any }
) {
  try {

    const body = await request.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, message: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    await markSubscriptionAsExpired(subscriptionId);

    return NextResponse.json({
      success: true,
      message: 'Subscription marked as expired'
    });
  } catch (error) {
    console.error('Error marking subscription as expired:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to mark subscription as expired' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export const GET = withAuthRoles(['ADMIN'])((req, context) => 
  handleGetExpiredSubscriptions(req, context)
);

export const POST = withAuthRoles(['ADMIN'])((req, context) => 
  handleMarkSubscriptionExpired(req, context)
);
