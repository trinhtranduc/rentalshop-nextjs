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
 * PATCH /api/notifications/mark-all-read
 */
export const PATCH = withAuthRoles([...ROLES])(async (_request: NextRequest, { user }) => {
  try {
    const count = await db.notifications.markAllRead(user.id);
    return NextResponse.json(
      ResponseBuilder.success('NOTIFICATIONS_MARKED_ALL_READ', { count })
    );
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
