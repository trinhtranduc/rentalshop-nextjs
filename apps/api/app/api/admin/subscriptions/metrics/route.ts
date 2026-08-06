import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/admin/subscriptions/metrics
 * Dashboard metrics for subscription overview.
 * Admin only.
 */
export async function GET(request: NextRequest) {
  return withPermissions(['subscriptions.view'])(async (request, { user }) => {
    try {
      if (user.role !== USER_ROLE.ADMIN) {
        return NextResponse.json(
          ResponseBuilder.error('ADMIN_REQUIRED'),
          { status: 403 }
        );
      }

      const now = new Date();
      const sevenDaysFromNow = new Date(now);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const [
        totalActive,
        totalTrial,
        totalExpired,
        totalCancelled,
        expiringIn7Days,
        totalPastDue,
        recentActivities,
      ] = await Promise.all([
        db.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
        db.prisma.subscription.count({ where: { status: 'TRIAL' } }),
        db.prisma.subscription.count({ where: { status: 'EXPIRED' } }),
        db.prisma.subscription.count({ where: { status: 'CANCELLED' } }),
        db.prisma.subscription.count({
          where: {
            status: 'ACTIVE',
            currentPeriodEnd: { lte: sevenDaysFromNow, gt: now },
          },
        }),
        db.prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
        db.prisma.subscriptionActivity.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            subscription: {
              select: { merchantId: true, merchant: { select: { name: true } } }
            },
            user: { select: { firstName: true, lastName: true } }
          }
        }),
      ]);

      return NextResponse.json(
        ResponseBuilder.success('METRICS_FOUND', {
          metrics: {
            totalActive,
            totalTrial,
            totalExpired,
            totalCancelled,
            totalPastDue,
            expiringIn7Days,
            total: totalActive + totalTrial + totalExpired + totalCancelled + totalPastDue,
          },
          recentActivities: recentActivities.map(a => ({
            id: a.id,
            type: a.type,
            description: a.description,
            merchantName: (a.subscription as any)?.merchant?.name || 'Unknown',
            performedBy: a.user ? `${a.user.firstName} ${a.user.lastName}` : null,
            createdAt: a.createdAt.toISOString(),
          })),
        })
      );
    } catch (error: any) {
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
