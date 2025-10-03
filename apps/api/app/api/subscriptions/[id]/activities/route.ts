// ============================================================================
// SUBSCRIPTION ACTIVITY LOGS API ENDPOINT
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { API } from '@rentalshop/constants';

/**
 * GET /api/subscriptions/:id/activities
 * Get activity logs for a subscription (audit trail)
 * Auth: ADMIN, MERCHANT (own subscription only)
 */
async function handleGetSubscriptionActivities(
  request: NextRequest,
  { user, userScope, params }: { user: any; userScope: any; params: { id: string } }
) {
  try {
    const subscriptionId = parseInt(params.id);

    // Validate subscription ID
    if (isNaN(subscriptionId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid subscription ID' },
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    // For MERCHANT role, verify they own this subscription
    if (user.role === 'MERCHANT') {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        select: { merchantId: true }
      });

      if (!subscription || subscription.merchantId !== userScope.merchantId) {
        return NextResponse.json(
          { success: false, message: 'Access denied' },
          { status: API.STATUS.FORBIDDEN }
        );
      }
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      action: searchParams.get('action') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    // Build where clause for audit logs
    const where: any = {
      entityType: 'Subscription',
      entityId: subscriptionId.toString()
    };

    if (filters.action) {
      where.action = filters.action.toUpperCase();
    }

    // Get audit logs
    const [total, auditLogs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset
      })
    ]);

    // Transform audit logs
    const activities = auditLogs.map(log => ({
      id: log.id,
      action: log.action,
      description: log.details || `Subscription ${log.action.toLowerCase()}`,
      details: log.details,
      userId: log.userId || undefined,
      user: log.user ? {
        firstName: log.user.firstName,
        lastName: log.user.lastName,
        email: log.user.email,
        role: log.user.role
      } : undefined,
      createdAt: log.createdAt,
      // Parse details JSON to get old/new values if available
      changes: (() => {
        try {
          const details = JSON.parse(log.details || '{}');
          return details.changes || null;
        } catch {
          return null;
        }
      })()
    }));

    const hasMore = filters.offset + filters.limit < total;

    return NextResponse.json({
      success: true,
      data: activities,
      pagination: {
        total,
        hasMore,
        limit: filters.limit,
        offset: filters.offset
      }
    });
  } catch (error) {
    console.error('Error fetching subscription activities:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch activities' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleGetSubscriptionActivities(req, { ...context, params })
  );
  return authenticatedHandler(request);
}

