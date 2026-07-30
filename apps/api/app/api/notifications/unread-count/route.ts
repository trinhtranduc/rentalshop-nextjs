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
 * GET /api/notifications/unread-count
 */
export const GET = withAuthRoles([...ROLES])(async (_request: NextRequest, { user }) => {
  try {
    const count = await db.notifications.unreadCount(user.id);
    return NextResponse.json(
      ResponseBuilder.success('NOTIFICATION_UNREAD_COUNT', { count })
    );
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
