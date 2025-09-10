// ============================================================================
// EXPIRED SUBSCRIPTIONS API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getExpiredSubscriptions,
  markSubscriptionAsExpired,
  extendSubscription
} from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';

// ============================================================================
// GET /api/subscriptions/expired - Get expired subscriptions
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Only ADMIN can view all expired subscriptions
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

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
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/subscriptions/expired - Mark subscription as expired
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Only ADMIN can mark subscriptions as expired
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

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
      { status: 500 }
    );
  }
}
