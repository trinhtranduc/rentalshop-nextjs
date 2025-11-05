import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/subscriptions/[id]/activities
 * Get subscription activities (from AuditLog)
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withManagementAuth(async (request, { user }) => {
    try {
      const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;

      const subscriptionId = parseInt(params.id);
      
      if (isNaN(subscriptionId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_SUBSCRIPTION_ID'),
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

      // Get query parameters
      const { searchParams } = new URL(request.url);
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

      // Get activities from AuditLog (SubscriptionActivity may not exist, use AuditLog instead)
      const [activities, total] = await Promise.all([
        db.auditLog.findMany({
          where: {
            entityType: 'SUBSCRIPTION',
            entityId: subscriptionId.toString()
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        db.auditLog.count({
          where: {
            entityType: 'SUBSCRIPTION',
            entityId: subscriptionId.toString()
          }
        })
      ]);

      // Transform audit logs to activity format
      const transformedActivities = activities.map((log: any) => {
        const metadata = JSON.parse(log.details || '{}');
        return {
          id: log.id,
          type: log.action.toLowerCase().replace('subscription_', ''),
          description: log.action,
          timestamp: log.createdAt.toISOString(),
          metadata: {
            ...metadata,
            performedBy: log.user ? {
              userId: log.user.id,
              email: log.user.email,
              role: log.user.role,
              name: `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.email
            } : metadata.performedBy
          }
        };
      });

      return NextResponse.json(
        ResponseBuilder.success('SUBSCRIPTION_ACTIVITIES_FETCH_SUCCESS', {
          data: transformedActivities,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total
          }
        })
      );

    } catch (error) {
      console.error('Error fetching subscription activities:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}