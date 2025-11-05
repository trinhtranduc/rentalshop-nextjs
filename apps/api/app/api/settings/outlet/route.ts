import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils/api';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import {API} from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PUT /api/settings/outlet
 * Update current user's outlet information
 * MULTI-TENANT: Uses subdomain-based tenant DB
 * Only accessible by users with outlet access (OUTLET_ADMIN, OUTLET_STAFF)
 */
export const PUT = withManagementAuth(async (request: NextRequest, { user }) => {
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;

    // Check if user has outlet access
    if (!user.outletId) {
      return NextResponse.json(
        ResponseBuilder.error('NO_OUTLET_ACCESS', 'User does not have outlet access'),
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const body = await request.json();
    const { name, address, phone, description } = body;

    // Validate required fields
    if (!name || !address) {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_NAME_ADDRESS_REQUIRED'),
        { status: 400 }
      );
    }
    
    // Only update fields that have values
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

    const updatedOutlet = await db.outlet.update({
      where: { id: user.outletId },
      data: updateData
    });

    return NextResponse.json(
      ResponseBuilder.success('OUTLET_INFO_UPDATED_SUCCESS', {
        id: updatedOutlet.id,
        name: updatedOutlet.name,
        address: updatedOutlet.address,
        phone: updatedOutlet.phone || null,
        description: updatedOutlet.description || null,
        isActive: updatedOutlet.isActive,
        isDefault: updatedOutlet.isDefault,
        createdAt: updatedOutlet.createdAt,
        updatedAt: updatedOutlet.updatedAt
      })
    );

  } catch (error) {
    console.error('Error updating outlet information:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
