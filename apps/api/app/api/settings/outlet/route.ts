import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

/**
 * PUT /api/settings/outlet
 * Update current user's outlet information
 * Only accessible by users with outlet access (OUTLET_ADMIN, OUTLET_STAFF) or admin
 */
export const PUT = withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.OUTLET_ADMIN, USER_ROLE.OUTLET_STAFF])(async (request: NextRequest, { user, userScope }) => {
  try {
    console.log('🔍 DEBUG: Settings outlet PUT API called');
    
    console.log('🔍 DEBUG: User authenticated:', {
      id: user.id,
      role: user.role,
      merchantId: userScope.merchantId,
      outletId: user.outletId
    });

    // Check if user has outlet access
    // Admin users can access any outlet, others need specific outlet access
    if (!user.outletId && user.role !== USER_ROLE.ADMIN) {
      console.error('❌ DEBUG: User does not have outlet access:', {
        outletId: user.outletId,
        role: user.role
      });
      return NextResponse.json(
        ResponseBuilder.error('NO_OUTLET_ACCESS'),
        { status: API.STATUS.FORBIDDEN }
      );
    }
    
    console.log('🔍 DEBUG: User has outlet access, proceeding with update');

    const body = await request.json();
    const { name, address, phone, description } = body;

    // Validate required fields
    if (!name || !address) {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_NAME_ADDRESS_REQUIRED'),
        { status: 400 }
      );
    }

    // Update outlet
    // For admin users, we need to get the outlet ID from the request or use a default
    let outletId = user.outletId;
    
    // If admin user doesn't have outletId, we need to handle this differently
    if (!outletId && user.role === USER_ROLE.ADMIN) {
      console.log('🔍 DEBUG: Admin user without outletId, need to specify outlet');
      return NextResponse.json(
        ResponseBuilder.error('ADMIN_OUTLET_ID_REQUIRED'),
        { status: 400 }
      );
    }
    
    console.log('🔍 DEBUG: Updating outlet with ID:', outletId);
    
    // Only update fields that have values to avoid overwriting existing data with null
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

    const updatedOutlet = await db.outlets.update(outletId, updateData);

    return NextResponse.json(
      ResponseBuilder.success('OUTLET_INFO_UPDATED_SUCCESS', {
        id: updatedOutlet.id,
        name: updatedOutlet.name,
        address: updatedOutlet.address,
        phone: updatedOutlet.phone,
        description: updatedOutlet.description,
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
