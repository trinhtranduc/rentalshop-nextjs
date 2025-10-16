import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/users
 * Get merchant users
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
    try {
      const merchantPublicId = parseInt(params.id);
      if (isNaN(merchantPublicId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_MERCHANT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Get users for this merchant
      const users = await db.users.search({
        merchantId: merchantPublicId,
        isActive: true
      });

      return NextResponse.json({
        success: true,
        data: users.data || [],
        total: users.total || 0
      });

    } catch (error) {
      console.error('Error fetching merchant users:', error);
      return NextResponse.json(
        ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * POST /api/merchants/[id]/users
 * Create new user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const merchantPublicId = parseInt(params.id);
      if (isNaN(merchantPublicId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_MERCHANT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      const body = await request.json();
      const { firstName, lastName, email, phone, role, outletId } = body;

      // Create new user
      const newUser = await db.users.create({
        firstName,
        lastName,
        email,
        phone,
        role,
        merchantId: merchant.id,
        outletId: outletId || null,
        isActive: true
      });

      return NextResponse.json({
        success: true,
        data: newUser
      });

    } catch (error) {
      console.error('Error creating user:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}