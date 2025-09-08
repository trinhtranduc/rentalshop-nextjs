// ============================================================================
// INDIVIDUAL SUBSCRIPTION API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { getSubscriptionByMerchantId, changePlan, pauseSubscription, resumeSubscription } from '@rentalshop/database';

// ============================================================================
// GET /api/subscriptions/[id] - Get subscription by ID
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const subscriptionId = parseInt(params.id);
    if (isNaN(subscriptionId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid subscription ID' },
        { status: 400 }
      );
    }

    // Get subscription by ID (we need to find the merchant ID first)
    // For now, we'll use a different approach - get all subscriptions and filter
    const { searchSubscriptions } = await import('@rentalshop/database');
    const result = await searchSubscriptions({ 
      limit: 1, 
      offset: 0 
    });

    const subscription = result.subscriptions.find(sub => sub.publicId === subscriptionId);
    
    if (!subscription) {
      return NextResponse.json(
        { success: false, message: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Role-based access control
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      if (user.merchantId && subscription.merchantId !== user.merchantId) {
        return NextResponse.json(
          { success: false, message: 'Access denied' },
          { status: 403 }
        );
      }
    } else if (user.role === 'MERCHANT') {
      if (user.merchantId && subscription.merchantId !== user.merchantId) {
        return NextResponse.json(
          { success: false, message: 'Access denied' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/subscriptions/[id] - Update subscription
// ============================================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check permissions - only ADMIN and MERCHANT can update subscriptions
    if (!['ADMIN', 'MERCHANT'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const subscriptionId = parseInt(params.id);
    if (isNaN(subscriptionId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid subscription ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, planId, period, reason } = body;

    let result;
    
    switch (action) {
      case 'changePlan':
        if (!planId) {
          return NextResponse.json(
            { success: false, message: 'Plan ID is required for plan change' },
            { status: 400 }
          );
        }
        result = await changePlan(subscriptionId, planId, period || 1, reason);
        break;
        
      case 'pause':
        result = await pauseSubscription(subscriptionId, reason);
        break;
        
      case 'resume':
        result = await resumeSubscription(subscriptionId);
        break;
        
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Subscription ${action} successful`
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/subscriptions/[id] - Delete subscription (soft delete)
// ============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check permissions - only ADMIN can delete subscriptions
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const subscriptionId = parseInt(params.id);
    if (isNaN(subscriptionId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid subscription ID' },
        { status: 400 }
      );
    }

    // For now, we'll just return a message that deletion is not implemented
    // In a real implementation, you would soft delete the subscription
    return NextResponse.json({
      success: true,
      message: 'Subscription deletion not implemented. Use cancel instead.'
    });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}
