// ============================================================================
// EXPIRED SUBSCRIPTIONS API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getExpiredSubscriptions,
  markSubscriptionAsExpired,
  extendSubscription
} from '@rentalshop/database';
import { verifyTokenSimple } from '@rentalshop/auth';

// ============================================================================
// GET /api/subscriptions/expired - Get expired subscriptions
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

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
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

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
