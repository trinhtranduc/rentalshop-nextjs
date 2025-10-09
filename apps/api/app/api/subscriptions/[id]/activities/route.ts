import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/subscriptions/[id]/activities
 * Get subscription activities
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const subscriptionId = parseInt(params.id);
      
      if (isNaN(subscriptionId)) {
        return NextResponse.json({ success: false, message: 'Invalid subscription ID' }, { status: 400 });
      }

      const subscription = await db.subscriptions.findById(subscriptionId);
      if (!subscription) {
        return NextResponse.json({ success: false, message: 'Subscription not found' }, { status: API.STATUS.NOT_FOUND });
      }

      // Get query parameters
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      // Get activities from database
      const { activities: dbActivities, total } = await db.subscriptionActivities.getBySubscriptionId(
        subscriptionId,
        { limit, offset }
      );

      // Transform database activities to API format
      const activities = dbActivities.map((activity: any) => ({
        id: activity.id,
        type: activity.type,
        description: activity.description,
        timestamp: activity.createdAt.toISOString(),
        metadata: {
          ...activity.metadata,
          reason: activity.reason,
          performedBy: activity.user ? {
            userId: activity.user.id,
            email: activity.user.email,
            role: activity.user.role,
            name: `${activity.user.firstName} ${activity.user.lastName}`.trim()
          } : activity.metadata?.performedBy
        }
      }));

      // Return activities from database
      return NextResponse.json({
        success: true,
        data: activities,
        total,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });

    } catch (error) {
      console.error('Error fetching subscription activities:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}