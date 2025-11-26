import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';
import { z } from 'zod';

/**
 * Bulk permission update schema
 */
const bulkUpdatePermissionsSchema = z.object({
  userIds: z.array(z.number()).min(1, 'At least one user ID is required'),
  permissions: z.array(z.object({
    permission: z.string(),
    enabled: z.boolean(),
  })),
});

/**
 * POST /api/users/permissions/bulk
 * Update permissions for multiple users
 * Only OUTLET_ADMIN, MERCHANT, and ADMIN can bulk update permissions
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(
  async (request, { user, userScope }) => {
    try {
      const body = await request.json();

      // Validate input
      const parsed = bulkUpdatePermissionsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      const { userIds, permissions } = parsed.data;

      // Get all users to check authorization
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
        include: {
          outlet: true,
          merchant: true,
        },
      });

      if (users.length !== userIds.length) {
        return NextResponse.json(
          ResponseBuilder.error('SOME_USERS_NOT_FOUND'),
          { status: 404 }
        );
      }

      // Authorization check: OUTLET_ADMIN can only manage permissions of OUTLET_STAFF in their outlet
      if (user.role === USER_ROLE.OUTLET_ADMIN) {
        const invalidUsers = users.filter(
          (u) => u.outletId !== userScope.outletId || u.role !== USER_ROLE.OUTLET_STAFF
        );
        if (invalidUsers.length > 0) {
          return NextResponse.json(
            ResponseBuilder.error('FORBIDDEN', 'Cannot manage permissions for users outside your outlet or non-staff users'),
            { status: API.STATUS.FORBIDDEN }
          );
        }
      }

      // MERCHANT can only manage permissions of users in their merchant
      if (user.role === USER_ROLE.MERCHANT) {
        const invalidUsers = users.filter((u) => u.merchantId !== userScope.merchantId);
        if (invalidUsers.length > 0) {
          return NextResponse.json(
            ResponseBuilder.error('FORBIDDEN', 'Cannot manage permissions for users outside your merchant'),
            { status: API.STATUS.FORBIDDEN }
          );
        }
      }

      // Update permissions for all users using transaction
      const results = await prisma.$transaction(
        userIds.flatMap((userId) =>
          permissions.map((perm) =>
            prisma.userPermission.upsert({
              where: {
                userId_permission: {
                  userId: userId,
                  permission: perm.permission,
                },
              },
              update: {
                enabled: perm.enabled,
              },
              create: {
                userId: userId,
                permission: perm.permission,
                enabled: perm.enabled,
              },
            })
          )
        )
      );

      return NextResponse.json(
        ResponseBuilder.success('PERMISSIONS_BULK_UPDATED_SUCCESS', {
          updatedUsers: userIds.length,
          updatedPermissions: results.length,
          userIds,
        })
      );
    } catch (error) {
      console.error('Error bulk updating user permissions:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);

