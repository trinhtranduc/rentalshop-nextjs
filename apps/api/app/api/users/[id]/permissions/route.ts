import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';
import { z } from 'zod';

/**
 * Permission update schema
 */
const updatePermissionsSchema = z.object({
  permissions: z.array(z.object({
    permission: z.string(),
    enabled: z.boolean(),
  })),
});

/**
 * GET /api/users/[id]/permissions
 * Get user permissions
 * 
 * Authorization: All roles with 'users.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - OUTLET_STAFF cannot access (does not have 'users.manage' permission)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const GET = withPermissions(['users.manage'])(
  async (request, { user, userScope, params }) => {
    try {
      const resolvedParams = await Promise.resolve(params);
      const { id } = resolvedParams;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_USER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const userId = parseInt(id);

      // Get user with permissions
      const foundUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          permissions: true,
          outlet: true,
          merchant: true,
        },
      });

      if (!foundUser) {
        return NextResponse.json(
          ResponseBuilder.error('USER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Authorization check: OUTLET_ADMIN can only view permissions of users in their outlet
      if (user.role === USER_ROLE.OUTLET_ADMIN) {
        if (foundUser.outletId !== userScope.outletId) {
          return NextResponse.json(
            ResponseBuilder.error('FORBIDDEN'),
            { status: API.STATUS.FORBIDDEN }
          );
        }
        // OUTLET_ADMIN can only manage OUTLET_STAFF
        if (foundUser.role !== USER_ROLE.OUTLET_STAFF) {
          return NextResponse.json(
            ResponseBuilder.error('FORBIDDEN'),
            { status: API.STATUS.FORBIDDEN }
          );
        }
      }

      // MERCHANT can only view permissions of users in their merchant
      if (user.role === USER_ROLE.MERCHANT) {
        if (foundUser.merchantId !== userScope.merchantId) {
          return NextResponse.json(
            ResponseBuilder.error('FORBIDDEN'),
            { status: API.STATUS.FORBIDDEN }
          );
        }
      }

      return NextResponse.json(
        ResponseBuilder.success('PERMISSIONS_RETRIEVED_SUCCESS', {
          userId: foundUser.id,
          permissions: foundUser.permissions,
        })
      );
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);

/**
 * PUT /api/users/[id]/permissions
 * Update user permissions
 * 
 * Authorization: All roles with 'users.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - OUTLET_STAFF cannot access (does not have 'users.manage' permission)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * 
 * Note: OUTLET_ADMIN can only manage permissions of OUTLET_STAFF in their outlet
 * MERCHANT and ADMIN can manage permissions of any user in their scope
 */
export const PUT = withPermissions(['users.manage'])(
  async (request, { user, userScope, params }) => {
    try {
      const resolvedParams = await Promise.resolve(params);
      const { id } = resolvedParams;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_USER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const userId = parseInt(id);
      const body = await request.json();

      // Validate input
      const parsed = updatePermissionsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      // Get user to check authorization
      const foundUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          outlet: true,
          merchant: true,
        },
      });

      if (!foundUser) {
        return NextResponse.json(
          ResponseBuilder.error('USER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Authorization check: OUTLET_ADMIN can only manage permissions of OUTLET_STAFF in their outlet
      if (user.role === USER_ROLE.OUTLET_ADMIN) {
        if (foundUser.outletId !== userScope.outletId) {
          return NextResponse.json(
            ResponseBuilder.error('FORBIDDEN'),
            { status: API.STATUS.FORBIDDEN }
          );
        }
        // OUTLET_ADMIN can only manage OUTLET_STAFF
        if (foundUser.role !== USER_ROLE.OUTLET_STAFF) {
          return NextResponse.json(
            ResponseBuilder.error('FORBIDDEN'),
            { status: API.STATUS.FORBIDDEN }
          );
        }
      }

      // MERCHANT can only manage permissions of users in their merchant
      if (user.role === USER_ROLE.MERCHANT) {
        if (foundUser.merchantId !== userScope.merchantId) {
          return NextResponse.json(
            ResponseBuilder.error('FORBIDDEN'),
            { status: API.STATUS.FORBIDDEN }
          );
        }
      }

      // Update permissions using upsert
      const permissionUpdates = parsed.data.permissions.map((perm) =>
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
      );

      await Promise.all(permissionUpdates);

      // Get updated permissions
      const updatedPermissions = await prisma.userPermission.findMany({
        where: { userId: userId },
      });

      return NextResponse.json(
        ResponseBuilder.success('PERMISSIONS_UPDATED_SUCCESS', {
          userId: userId,
          permissions: updatedPermissions,
        })
      );
    } catch (error) {
      console.error('Error updating user permissions:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);

