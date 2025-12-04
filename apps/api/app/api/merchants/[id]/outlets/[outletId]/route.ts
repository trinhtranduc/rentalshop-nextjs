import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withPermissions, validateMerchantAccess } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/outlets/[outletId]
 * Get outlet by ID
 * Authorization: Roles with 'outlet.view' permission can access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; outletId: string }> | { id: string; outletId: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  const outletPublicId = parseInt(resolvedParams.outletId);
  
  return withPermissions(['outlet.view'])(async (request, { user, userScope }) => {
    try {
      // Validate merchant and outlet access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope, outletPublicId);
      if (!validation.valid) {
        return validation.error!;
      }
      const { merchant, outlet } = validation;

      return NextResponse.json({ success: true, data: outlet });
    } catch (error) {
      console.error('Error fetching outlet:', error);
      return NextResponse.json(
        ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * PUT /api/merchants/[id]/outlets/[outletId]
 * Update outlet
 * Authorization: Roles with 'outlet.manage' permission can update outlets
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; outletId: string }> | { id: string; outletId: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  const outletPublicId = parseInt(resolvedParams.outletId);
  
  return withPermissions(['outlet.manage'])(async (request, { user, userScope }) => {
    try {
      // Validate merchant and outlet access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope, outletPublicId);
      if (!validation.valid) {
        return validation.error!;
      }
      const { merchant, outlet: existing } = validation;

      const body = await request.json();
      const { name, address, phone, description, isActive } = body;

      // Check if trying to deactivate default outlet
      if (isActive === false && existing.isDefault) {
        return NextResponse.json(
          ResponseBuilder.error('CANNOT_DELETE_DEFAULT_OUTLET'),
          { status: API.STATUS.CONFLICT }
        );
      }

      // Update outlet with proper data handling
      const updateData: any = {
        name,
        address,
        updatedAt: new Date()
      };

      // Only include optional fields if they have values
      if (phone && phone.trim()) {
        updateData.phone = phone.trim();
      }

      if (description && description.trim()) {
        updateData.description = description.trim();
      }

      // Only update isActive if it's not the default outlet
      if (typeof isActive === 'boolean' && !existing.isDefault) {
        updateData.isActive = isActive;
      }

      const updatedOutlet = await db.outlets.update(outletPublicId, updateData);

      if (!updatedOutlet) {
        return NextResponse.json(
          ResponseBuilder.error('OUTLET_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      return NextResponse.json({ success: true, data: updatedOutlet });
    } catch (error) {
      console.error('Error updating outlet:', error);
      return NextResponse.json(
        ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * DELETE /api/merchants/[id]/outlets/[outletId]
 * Delete outlet (soft delete)
 * Authorization: Roles with 'outlet.manage' permission can delete outlets
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; outletId: string }> | { id: string; outletId: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  const outletPublicId = parseInt(resolvedParams.outletId);
  
  return withPermissions(['outlet.manage'])(async (request, { user, userScope }) => {
    try {
      // Validate merchant and outlet access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope, outletPublicId);
      if (!validation.valid) {
        return validation.error!;
      }
      const { merchant, outlet: existing } = validation;

      // Check if this is the default outlet - cannot be deleted
      if (existing.isDefault) {
        return NextResponse.json(
          ResponseBuilder.error('CANNOT_DELETE_DEFAULT_OUTLET'),
          { status: API.STATUS.CONFLICT }
        );
      }

      // Soft delete by setting isActive to false
      const deletedOutlet = await db.outlets.update(outletPublicId, { isActive: false });

      return NextResponse.json({ success: true, data: deletedOutlet });
    } catch (error) {
      console.error('Error deleting outlet:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}