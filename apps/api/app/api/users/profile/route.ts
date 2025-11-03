import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { NextRequest, NextResponse } from 'next/server';
import { withAnyAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/users/profile
 * Get current user's profile
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const GET = withAnyAuth(async (request: NextRequest, { user }) => {
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;
    
    console.log('🔍 Profile API called');
    
    console.log('✅ Token verification result: Success', { id: user.id, role: user.role });

    // Get user profile with outlet data (NO merchant - tenant DB is isolated)
    console.log('🔍 Searching for user with id:', user.id);
    const userProfile = await db.user.findUnique({
      where: { id: user.id },
      include: { outlet: true }
    });

    if (!userProfile) {
      console.log('❌ User not found with id:', user.id);
      return NextResponse.json(
        ResponseBuilder.error('USER_NOT_FOUND'),
        { status: API.STATUS.NOT_FOUND }
      );
    }

    console.log('✅ User profile found:', { 
      id: userProfile.id, 
      email: userProfile.email,
      firstName: userProfile.firstName,
      lastName: userProfile.lastName,
      phone: userProfile.phone,
      role: userProfile.role,
      hasOutlet: !!userProfile.outlet
    });

    // Transform user data to include outlet information
    const transformedUser = {
      ...userProfile,
      // Direct IDs for quick access
      outletId: userProfile.outlet?.id,
      // Complete outlet object with all outlet info  
      outlet: userProfile.outlet ? {
        id: userProfile.outlet.id,
        name: userProfile.outlet.name,
        address: userProfile.outlet.address,
        phone: userProfile.outlet.phone,
        description: userProfile.outlet.description,
        isActive: userProfile.outlet.isActive,
        isDefault: userProfile.outlet.isDefault,
        createdAt: userProfile.outlet.createdAt,
      } : undefined,
    };

    console.log('Profile API - User data:', {
      userId: user.id,
      role: userProfile.role,
      firstName: userProfile.firstName,
      lastName: userProfile.lastName,
      phone: userProfile.phone,
      outletId: userProfile.outlet?.id,
      hasOutlet: !!userProfile.outlet,
      outletName: userProfile.outlet?.name
    });
    
    console.log('Profile API - Transformed user data:', {
      id: transformedUser.id,
      email: transformedUser.email,
      firstName: transformedUser.firstName,
      lastName: transformedUser.lastName,
      phone: transformedUser.phone,
      role: transformedUser.role
    });

    console.log('✅ Returning user profile data');
    return NextResponse.json({
      success: true,
      data: transformedUser,
    });
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    return NextResponse.json(
      ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});

/**
 * PUT /api/users/profile
 * Update current user's profile
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const PUT = withAnyAuth(async (request: NextRequest, context: any) => {
  const { user } = context;
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;

    const body = await request.json();
    
    // Validate input - email updates are disabled for security
    const { firstName, lastName, phone } = body;
    
    // Only allow updating certain fields (email is disabled)
    const updateData: any = {};
    if (firstName && firstName.trim()) updateData.firstName = firstName.trim();
    if (lastName && lastName.trim()) updateData.lastName = lastName.trim();
    
    // Only update phone if it has a value (don't overwrite with null)
    if (phone && phone.trim()) {
      updateData.phone = phone.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        ResponseBuilder.error('NO_VALID_FIELDS', 'No valid fields to update'),
        { status: 400 }
      );
    }

    // Validate phone uniqueness if phone is being updated (NO merchantId - tenant DB is isolated)
    if (updateData.phone) {
      const existingUserWithPhone = await db.user.findFirst({
        where: {
          phone: updateData.phone,
          id: { not: user.id } // Exclude current user
        }
      });

      if (existingUserWithPhone) {
        return NextResponse.json(
          ResponseBuilder.error('PHONE_ALREADY_EXISTS', 'Phone number already exists in your organization'),
          { status: 400 }
        );
      }
    }

    // Update user profile using id
    // Note: user.id is already the id (number) from the JWT token
    console.log('🔄 Updating user profile:', {
      userId: user.id,
      updateData,
      userRole: user.role
    });

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: updateData,
      include: { outlet: true }
    });

    console.log('✅ Profile updated successfully:', {
      userId: updatedUser.id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phone: updatedUser.phone
    });

    // Transform user data to match GET profile response format
    const transformedUser = {
      ...updatedUser,
      // Direct IDs for quick access
      outletId: updatedUser.outlet?.id,
      // Complete outlet object with all outlet info  
      outlet: updatedUser.outlet ? {
        id: updatedUser.outlet.id,
        name: updatedUser.outlet.name,
      } : undefined,
    };

    return NextResponse.json(
      ResponseBuilder.success('PROFILE_UPDATED_SUCCESS', transformedUser)
    );
  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    console.error('Error details:', {
      code: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      ResponseBuilder.error('UPDATE_PROFILE_FAILED', error instanceof Error ? error.message : 'Failed to update user profile'),
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}); 