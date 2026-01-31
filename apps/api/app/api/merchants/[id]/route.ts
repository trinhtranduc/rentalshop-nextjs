import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles, validateMerchantAccess } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { SUBSCRIPTION_STATUS, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * GET /api/merchants/[id]
 * Get merchant by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  return withApiLogging(
    withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT])(async (request, { user, userScope }) => {
      try {
        const merchantId = parseInt(id);
        
        // Validate merchant access (format, exists, association, scope)
        // For MERCHANT role, this ensures they can only access their own merchant
        const validation = await validateMerchantAccess(merchantId, user, userScope);
        if (!validation.valid) {
          return validation.error!;
        }
        const merchant = validation.merchant!;

        return NextResponse.json({
        success: true,
        data: merchant,
        code: 'MERCHANT_RETRIEVED_SUCCESS',
        message: 'Merchant retrieved successfully'
        });

      } catch (error) {
        // Error will be automatically logged by withApiLogging wrapper
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to fetch merchant',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: API.STATUS.INTERNAL_SERVER_ERROR }
        );
      }
    })
  )(request);
}

/**
 * PUT /api/merchants/[id]
 * Update merchant by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  return withApiLogging(
    withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT])(async (request, { user, userScope }) => {
      try {
        const merchantId = parseInt(id);

        // Validate merchant access (format, exists, association, scope)
        // For MERCHANT role, this ensures they can only update their own merchant
        const validation = await validateMerchantAccess(merchantId, user, userScope);
        if (!validation.valid) {
          return validation.error!;
        }
        const existingMerchant = validation.merchant!;

        // Parse and validate request body
        const body = await request.json();

      // Check for duplicate phone or email if being updated
      if (body.phone || body.email) {
        const emailToCheck = (body.email && body.email !== existingMerchant.email) ? body.email : undefined;
        const phoneToCheck = (body.phone && body.phone !== existingMerchant.phone) ? body.phone : undefined;

        if (emailToCheck || phoneToCheck) {
          const duplicateMerchant = await db.merchants.checkDuplicate(emailToCheck, phoneToCheck, merchantId);

          if (duplicateMerchant) {
            const duplicateField = duplicateMerchant.email === emailToCheck ? 'email' : 'phone number';
            const duplicateValue = duplicateMerchant.email === emailToCheck ? emailToCheck : phoneToCheck;
            
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

      return NextResponse.json({
        success: true,
        data: updatedMerchant,
        code: 'MERCHANT_UPDATED_SUCCESS',
        message: 'Merchant updated successfully'
      });

      } catch (error) {
        // Error will be automatically logged by withApiLogging wrapper
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to update merchant',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: API.STATUS.INTERNAL_SERVER_ERROR }
        );
      }
    })
  )(request);
}

/**
 * DELETE /api/merchants/[id]
 * Delete merchant by ID (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  return withApiLogging(
    withAuthRoles([USER_ROLE.ADMIN])(async (request, { user, userScope }) => {
      try {
        const merchantId = parseInt(id);

        // Validate merchant access (format, exists, association, scope)
        // Only ADMIN can delete merchants, but we still validate merchant exists
        const validation = await validateMerchantAccess(merchantId, user, userScope);
        if (!validation.valid) {
          return validation.error!;
        }
        const existingMerchant = validation.merchant!;

        // Check if merchant has active subscription
        const activeSubscription = await db.subscriptions.findFirst({
          merchantId: merchantId,
          status: { in: [SUBSCRIPTION_STATUS.ACTIVE as any, SUBSCRIPTION_STATUS.TRIAL as any] }
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

        return NextResponse.json({
        success: true,
        data: deletedMerchant,
        code: 'MERCHANT_DELETED_SUCCESS',
        message: 'Merchant deleted successfully'
        });

      } catch (error) {
        // Error will be automatically logged by withApiLogging wrapper
        // Use unified error handling system
        const { response, statusCode } = handleApiError(error);
        return NextResponse.json(response, { status: statusCode });
      }
    })
  )(request);
}