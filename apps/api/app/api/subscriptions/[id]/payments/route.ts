import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/subscriptions/[id]/payments
 * Get subscription payments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const subscriptionId = parseInt(resolvedParams.id);
  
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      
      if (isNaN(subscriptionId)) {
        throw new Error('Invalid subscription ID');
      }

      const subscription = await db.subscriptions.findById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Get query parameters
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = parseInt(searchParams.get('offset') || '0');

      // Get payments for this subscription from Payment table
      const paymentsData = await db.payments.findBySubscriptionId(subscriptionId, { limit });

      return NextResponse.json({
        success: true,
        data: paymentsData,
        pagination: {
          total: paymentsData.length,
          limit,
          offset,
          hasMore: paymentsData.length === limit
        }
      });
    } catch (error) {
      console.error('Error fetching subscription payments:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}