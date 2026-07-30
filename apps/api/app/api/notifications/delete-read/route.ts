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
 * DELETE /api/notifications/delete-read
 * Delete all read notifications for the current user.
 */
export const DELETE = withAuthRoles([...ROLES])(async (_request: NextRequest, { user }) => {
  try {
    const count = await db.notifications.deleteAllRead(user.id);
    return NextResponse.json(
      ResponseBuilder.success('NOTIFICATIONS_READ_DELETED', { count })
    );
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
