import { handleApiError } from '@rentalshop/utils';
import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

/**
 * GET /api/users/profile
 * Get current user's profile
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request: NextRequest, { user, userScope }) => {
  try {
    console.log('🔍 Profile API called');
    
    console.log('✅ Token verification result: Success', { id: user.id, role: user.role });

    // Get user profile with complete merchant and outlet data
    // Note: user.id is the id, we need to find by id
    console.log('🔍 Searching for user with id:', user.id);
    const userProfile = await db.users.findById(user.id);

    if (!userProfile) {
      console.log('❌ User not found with id:', user.id);
      return NextResponse.json(
        { success: false, message: 'User not found' },
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
      hasMerchant: !!userProfile.merchant,
      hasOutlet: !!userProfile.outlet
    });
    
    console.log('🔍 Merchant data from DB:', {
      businessType: userProfile.merchant?.businessType,
      pricingType: userProfile.merchant?.pricingType,
      hasBusinessType: 'businessType' in (userProfile.merchant || {}),
      hasPricingType: 'pricingType' in (userProfile.merchant || {}),
      merchantKeys: Object.keys(userProfile.merchant || {})
    });

    // Transform user data to include complete merchant and outlet information
    const transformedUser = {
      ...userProfile,
      // Direct IDs for quick access
      merchantId: userProfile.merchant?.id,
      outletId: userProfile.outlet?.id,
      // Complete merchant object with all business info including pricingConfig
      merchant: userProfile.merchant ? {
        id: userProfile.merchant.id,
        name: userProfile.merchant.name,
        email: userProfile.merchant.email,
        phone: userProfile.merchant.phone,
        address: userProfile.merchant.address,
        city: userProfile.merchant.city,
        state: userProfile.merchant.state,
        zipCode: userProfile.merchant.zipCode,
        country: userProfile.merchant.country,
        businessType: userProfile.merchant.businessType,
        pricingType: userProfile.merchant.pricingType,
        taxId: userProfile.merchant.taxId,
        website: userProfile.merchant.website,
        description: userProfile.merchant.description,
        isActive: userProfile.merchant.isActive,
        planId: userProfile.merchant.planId,
        subscriptionStatus: userProfile.merchant.subscriptionStatus,
        totalRevenue: userProfile.merchant.totalRevenue,
        createdAt: userProfile.merchant.createdAt,
        lastActiveAt: userProfile.merchant.lastActiveAt,
      } : undefined,
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
        merchant: userProfile.outlet.merchant ? {
          id: userProfile.outlet.merchant.id,
          name: userProfile.outlet.merchant.name,
        } : undefined,
      } : undefined,
    };

    console.log('Profile API - User data:', {
      userId: user.id,
      role: userProfile.role,
      firstName: userProfile.firstName,
      lastName: userProfile.lastName,
      phone: userProfile.phone,
      merchantId: userProfile.merchant?.id,
      outletId: userProfile.outlet?.id,
      hasMerchant: !!userProfile.merchant,
      hasOutlet: !!userProfile.outlet,
      merchantName: userProfile.merchant?.name,
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
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});

/**
 * PUT /api/users/profile
 * Update current user's profile
 */
export const PUT = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request: NextRequest, context: any) => {
  const { user, userScope } = context;
  try {

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
        { 
          success: false, 
          error: 'No valid fields to update' 
        },
        { status: 400 }
      );
    }

    // Validate phone uniqueness if phone is being updated
    if (updateData.phone) {
      // Get the current user's merchant ID from database
      const currentUser = await db.users.findById(user.id);

      // Build the where clause for phone uniqueness check
      const whereClause: any = {
        phone: updateData.phone,
        id: { not: user.id }, // Exclude current user
      };

      // For admin users (merchantId is null), check globally
      // For other users, check within their merchant
      if (currentUser?.merchantId) {
        whereClause.merchantId = currentUser.merchantId;
      } else if (currentUser?.role === 'ADMIN') {
        // Admin users can have unique phone numbers globally
        // No additional filter needed
      } else {
        // For users without merchant, check globally
        whereClause.merchantId = null;
      }

      const existingUserWithPhone = await db.users.findFirst({
        where: whereClause,
      });

      if (existingUserWithPhone) {
        const scopeMessage = currentUser?.role === 'ADMIN' 
          ? 'globally' 
          : 'in your organization';
        return NextResponse.json(
          { 
            success: false, 
            error: `Phone number already exists ${scopeMessage}` 
          },
          { status: 400 }
        );
      }
    }

    // Update user profile using id
    // Note: user.id is already the id (number) from the JWT token
    console.log('🔄 Updating user profile:', {
      userId: user.id,
      updateData,
      userRole: user.role,
      merchantId: user.merchant?.id
    });

    const updatedUser = await db.users.update(user.id, updateData);

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
      merchantId: updatedUser.merchant?.id,
      outletId: updatedUser.outlet?.id,
      // Complete merchant object with all business info
      merchant: updatedUser.merchant ? {
        id: updatedUser.merchant.id,
        name: updatedUser.merchant.name,
      } : undefined,
      // Complete outlet object with all outlet info  
      outlet: updatedUser.outlet ? {
        id: updatedUser.outlet.id,
        name: updatedUser.outlet.name,
      } : undefined,
    };

    return NextResponse.json({
      success: true,
      data: transformedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update user profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}); 