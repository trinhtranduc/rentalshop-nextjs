import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';
import { z } from 'zod';

const ROLES = [
  USER_ROLE.ADMIN,
  USER_ROLE.MERCHANT,
  USER_ROLE.OUTLET_ADMIN,
  USER_ROLE.OUTLET_STAFF,
] as const;

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  isRead: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  type: z.string().min(1).max(64).optional(),
});

/**
 * GET /api/notifications
 * List current user's inbox notifications (paginated, read/unread filter).
 */
export const GET = withAuthRoles([...ROLES])(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    const result = await db.notifications.listForUser({
      userId: user.id,
      page: parsed.data.page,
      limit: parsed.data.limit,
      isRead: parsed.data.isRead,
      type: parsed.data.type,
    });

    return NextResponse.json(ResponseBuilder.success('NOTIFICATIONS_FOUND', result));
  } catch (error) {
    console.error('Error listing notifications:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
