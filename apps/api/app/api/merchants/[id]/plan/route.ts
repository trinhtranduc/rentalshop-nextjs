import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/plan
 * Get merchant plan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const merchantPublicId = parseInt(params.id);
      if (isNaN(merchantPublicId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid merchant ID' },
          { status: 400 }
        );
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(
          { success: false, message: 'Merchant not found' },
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Get merchant's current plan and subscription
      const plan = merchant.Plan;
      const subscription = merchant.subscription;

      return NextResponse.json({
        success: true,
        data: {
          plan,
          subscription
        }
      });

    } catch (error) {
      console.error('Error fetching merchant plan:', error);
      return NextResponse.json(
        { success: false, message: 'Internal server error' },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * PUT /api/merchants/[id]/plan
 * Update merchant plan
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const merchantPublicId = parseInt(params.id);
      if (isNaN(merchantPublicId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid merchant ID' },
          { status: 400 }
        );
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(
          { success: false, message: 'Merchant not found' },
          { status: API.STATUS.NOT_FOUND }
        );
      }

      const body = await request.json();
      const { planId } = body;

      // Update merchant plan
      const updatedMerchant = await db.merchants.update(merchantPublicId, {
        planId
      });

      return NextResponse.json({
        success: true,
        data: updatedMerchant
      });

    } catch (error) {
      console.error('Error updating merchant plan:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}