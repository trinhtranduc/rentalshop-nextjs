import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/users/[userId]
 * Get user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> | { id: string; userId: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  const userPublicId = parseInt(resolvedParams.userId);
  
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
    try {
      
      if (isNaN(merchantPublicId) || isNaN(userPublicId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const foundUser = await db.users.findById(userPublicId);
      if (!foundUser) {
        return NextResponse.json(ResponseBuilder.error('USER_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      return NextResponse.json({ success: true, data: foundUser });
    } catch (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json(
        ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * PUT /api/merchants/[id]/users/[userId]
 * Update user
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> | { id: string; userId: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  const userPublicId = parseInt(resolvedParams.userId);
  
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      
      if (isNaN(merchantPublicId) || isNaN(userPublicId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const existing = await db.users.findById(userPublicId);
      if (!existing) {
        return NextResponse.json(ResponseBuilder.error('USER_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const body = await request.json();
      const updatedUser = await db.users.update(userPublicId, body);

      return NextResponse.json({ success: true, data: updatedUser });
    } catch (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * DELETE /api/merchants/[id]/users/[userId]
 * Delete user (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> | { id: string; userId: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  const userPublicId = parseInt(resolvedParams.userId);
  
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      
      if (isNaN(merchantPublicId) || isNaN(userPublicId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const existing = await db.users.findById(userPublicId);
      if (!existing) {
        return NextResponse.json(ResponseBuilder.error('USER_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      // Soft delete by setting isActive to false
      const deletedUser = await db.users.update(userPublicId, { isActive: false });

      return NextResponse.json({ success: true, data: deletedUser });
    } catch (error) {
      console.error('Error deleting user:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}