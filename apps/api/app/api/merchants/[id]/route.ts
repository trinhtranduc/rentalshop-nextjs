import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]
 * Get merchant by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const { id } = params;
      console.log('🔍 GET /api/merchants/[id] - Looking for merchant with ID:', id);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_MERCHANT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const merchantId = parseInt(id);
      
      // Get merchant using the simplified database API
      const merchant = await db.merchants.findById(merchantId);

      if (!merchant) {
        console.log('❌ Merchant not found in database for merchantId:', merchantId);
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      console.log('✅ Merchant found:', merchant);

      return NextResponse.json({
        success: true,
        data: merchant,
        code: 'MERCHANT_RETRIEVED_SUCCESS', message: 'Merchant retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error fetching merchant:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch merchant',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * PUT /api/merchants/[id]
 * Update merchant by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_MERCHANT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const merchantId = parseInt(id);

      // Parse and validate request body
      const body = await request.json();
      console.log('🔍 PUT /api/merchants/[id] - Update request body:', body);

      // Check if merchant exists
      const existingMerchant = await db.merchants.findById(merchantId);
      if (!existingMerchant) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Check for duplicate phone or email if being updated
      if (body.phone || body.email) {
        const emailToCheck = (body.email && body.email !== existingMerchant.email) ? body.email : undefined;
        const phoneToCheck = (body.phone && body.phone !== existingMerchant.phone) ? body.phone : undefined;

        if (emailToCheck || phoneToCheck) {
          const duplicateMerchant = await db.merchants.checkDuplicate(emailToCheck, phoneToCheck, merchantId);

          if (duplicateMerchant) {
            const duplicateField = duplicateMerchant.email === emailToCheck ? 'email' : 'phone number';
            const duplicateValue = duplicateMerchant.email === emailToCheck ? emailToCheck : phoneToCheck;
            
            console.log('❌ Merchant duplicate found:', { field: duplicateField, value: duplicateValue });
            return NextResponse.json(
              {
                success: false,
                code: 'MERCHANT_DUPLICATE',
                message: `A merchant with this ${duplicateField} (${duplicateValue}) already exists. Please use a different ${duplicateField}.`
              },
              { status: 409 }
            );
          }
        }
      }

      // Update the merchant using the simplified database API
      const updatedMerchant = await db.merchants.update(merchantId, body);
      console.log('✅ Merchant updated successfully:', updatedMerchant);

      return NextResponse.json({
        success: true,
        data: updatedMerchant,
        code: 'MERCHANT_UPDATED_SUCCESS', message: 'Merchant updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating merchant:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update merchant',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * DELETE /api/merchants/[id]
 * Delete merchant by ID (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
    try {
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_MERCHANT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const merchantId = parseInt(id);

      // Check if merchant exists
      const existingMerchant = await db.merchants.findById(merchantId);
      if (!existingMerchant) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Check if merchant has active subscription
      const activeSubscription = await db.subscriptions.findFirst({
        merchantId: merchantId,
        status: { in: ['ACTIVE', 'TRIAL'] }
      });

      if (activeSubscription) {
        return NextResponse.json(
          {
            success: false,
            code: 'MERCHANT_HAS_ACTIVE_SUBSCRIPTION',
            message: 'Cannot delete merchant with active subscription. Please cancel the subscription first.'
          },
          { status: API.STATUS.CONFLICT }
        );
      }

      // Soft delete by setting isActive to false
      // Note: This will cascade to outlets, users, products via Prisma schema
      const deletedMerchant = await db.merchants.update(merchantId, { isActive: false });
      console.log('✅ Merchant soft deleted successfully:', deletedMerchant);

      return NextResponse.json({
        success: true,
        data: deletedMerchant,
        code: 'MERCHANT_DELETED_SUCCESS', message: 'Merchant deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error deleting merchant:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}