import { NextRequest, NextResponse } from 'next/server';
import { withAnyAuth, withMerchantAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/users/[id]
 * Get user by ID
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAnyAuth(async (request, { user }) => {
    try {
      const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;
      
      const { id } = params;
      console.log('🔍 GET /api/users/[id] - Looking for user with ID:', id);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_USER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const userId = parseInt(id);
      
      // Get user using Prisma
      const foundUser = await db.user.findUnique({
        where: { id: userId },
        include: { outlet: true }
      });

      if (!foundUser) {
        console.log('❌ User not found in database for userId:', userId);
        return NextResponse.json(
          ResponseBuilder.error('USER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      console.log('✅ User found:', foundUser);

      return NextResponse.json({
        success: true,
        data: foundUser,
        code: 'USER_RETRIEVED_SUCCESS',
        message: 'User retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error fetching user:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/users/[id]
 * Update user by ID
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withMerchantAuth(async (request, { user }) => {
    try {
      const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;
      
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_USER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const userId = parseInt(id);

      // Parse and validate request body
      const body = await request.json();
      console.log('🔍 PUT /api/users/[id] - Update request body:', body);

      // Check if user exists
      const existingUser = await db.user.findUnique({
        where: { id: userId }
      });
      if (!existingUser) {
        return NextResponse.json(
          ResponseBuilder.error('USER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Remove merchantId if present
      const { merchantId: _, ...updateData } = body;

      // Update the user using Prisma
      const updatedUser = await db.user.update({
        where: { id: userId },
        data: updateData as any
      });
      console.log('✅ User updated successfully:', updatedUser);

      return NextResponse.json({
        success: true,
        data: updatedUser,
        code: 'USER_UPDATED_SUCCESS',
        message: 'User updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating user:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * DELETE /api/users/[id]
 * Delete user by ID (soft delete)
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withMerchantAuth(async (request, { user }) => {
    try {
      const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;
      
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_USER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const userId = parseInt(id);

      // Check if user exists
      const existingUser = await db.user.findUnique({
        where: { id: userId }
      });
      if (!existingUser) {
        return NextResponse.json(
          ResponseBuilder.error('USER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Prevent deleting yourself
      if (userId === user.id) {
        return NextResponse.json(
          ResponseBuilder.error('CANNOT_DELETE_SELF', 'You cannot delete your own account. Please contact another administrator.'),
          { status: API.STATUS.CONFLICT }
        );
      }

      // Check if this is the last OUTLET_ADMIN
      if (existingUser.role === 'OUTLET_ADMIN') {
        const adminCount = await db.user.count({
          where: {
            role: 'OUTLET_ADMIN',
            isActive: true
          }
        });

        if (adminCount <= 1) {
          return NextResponse.json(
            ResponseBuilder.error('CANNOT_DELETE_LAST_ADMIN', 'Cannot delete the last outlet administrator. Please assign another administrator first.'),
            { status: API.STATUS.CONFLICT }
          );
        }
      }

      // Soft delete by setting isActive to false and deletedAt
      const deletedUser = await db.user.update({
        where: { id: userId },
        data: { 
          isActive: false,
          deletedAt: new Date()
        }
      });
      console.log('✅ User soft deleted successfully:', deletedUser);

      return NextResponse.json({
        success: true,
        data: deletedUser,
        code: 'USER_DELETED_SUCCESS',
        message: 'User deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error deleting user:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}