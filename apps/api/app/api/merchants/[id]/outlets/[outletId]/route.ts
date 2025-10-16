import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/outlets/[outletId]
 * Get outlet by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; outletId: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
    try {
      const merchantPublicId = parseInt(params.id);
      const outletPublicId = parseInt(params.outletId);
      
      if (isNaN(merchantPublicId) || isNaN(outletPublicId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const outlet = await db.outlets.findById(outletPublicId);
      if (!outlet) {
        return NextResponse.json(ResponseBuilder.error('OUTLET_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

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
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; outletId: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
    try {
      const merchantPublicId = parseInt(params.id);
      const outletPublicId = parseInt(params.outletId);
      
      if (isNaN(merchantPublicId) || isNaN(outletPublicId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const existing = await db.outlets.findById(outletPublicId);
      if (!existing) {
        return NextResponse.json(ResponseBuilder.error('OUTLET_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const body = await request.json();
      const { name, address, phone, description } = body;

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
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; outletId: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const merchantPublicId = parseInt(params.id);
      const outletPublicId = parseInt(params.outletId);
      
      if (isNaN(merchantPublicId) || isNaN(outletPublicId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const existing = await db.outlets.findById(outletPublicId);
      if (!existing) {
        return NextResponse.json(ResponseBuilder.error('OUTLET_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
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