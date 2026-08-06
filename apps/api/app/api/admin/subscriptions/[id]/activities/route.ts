import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/admin/subscriptions/[id]/activities
 * Get subscription activity log (IAP events, manual actions, etc.)
 * Admin only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  return withPermissions(['subscriptions.view'])(async (request, { user }) => {
    try {
      if (user.role !== USER_ROLE.ADMIN) {
        return NextResponse.json(
          ResponseBuilder.error('ADMIN_REQUIRED'),
          { status: 403 }
        );
      }

      const subscriptionId = parseInt(id);
      if (isNaN(subscriptionId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_ID'),
          { status: 400 }
        );
      }

      const activities = await db.prisma.subscriptionActivity.findMany({
        where: { subscriptionId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      return NextResponse.json(
        ResponseBuilder.success('ACTIVITIES_FOUND', { activities })
      );
    } catch (error: any) {
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
