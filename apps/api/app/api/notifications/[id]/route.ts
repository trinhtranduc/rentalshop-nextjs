import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';

const ROLES = [
  USER_ROLE.ADMIN,
  USER_ROLE.MERCHANT,
  USER_ROLE.OUTLET_ADMIN,
  USER_ROLE.OUTLET_STAFF,
] as const;

/**
 * DELETE /api/notifications/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolved = await Promise.resolve(params);
  const notificationId = parseInt(resolved.id, 10);

  return withAuthRoles([...ROLES])(async (_req, { user }) => {
    try {
      if (!Number.isFinite(notificationId) || notificationId <= 0) {
        return NextResponse.json(ResponseBuilder.error('NOTIFICATION_NOT_FOUND'), { status: 404 });
      }

      const deleted = await db.notifications.delete(user.id, notificationId);
      if (!deleted) {
        return NextResponse.json(ResponseBuilder.error('NOTIFICATION_NOT_FOUND'), { status: 404 });
      }

      return NextResponse.json(
        ResponseBuilder.success('NOTIFICATION_DELETED', { id: notificationId })
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
