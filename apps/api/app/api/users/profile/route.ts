import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { NextRequest, NextResponse } from 'next/server';
import { withAnyAuth } from '@rentalshop/auth';
import { db, getDefaultBankAccount } from '@rentalshop/database';
import {API, USER_ROLE} from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * GET /api/users/profile
 * Get current user's profile
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const GET = withApiLogging(
  withAnyAuth(async (request: NextRequest, { user, userScope }) => {
    try {
      // Get user profile with complete merchant and outlet data
      // Note: user.id is the id, we need to find by id
      const userProfile = await db.users.findById(user.id);

      if (!userProfile) {
        return NextResponse.json(
          ResponseBuilder.error('USER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

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
        tenantKey: userProfile.merchant.tenantKey, // Include tenantKey for referral code
        isActive: userProfile.merchant.isActive,
        planId: userProfile.merchant.planId,
        totalRevenue: userProfile.merchant.totalRevenue,
        createdAt: userProfile.merchant.createdAt?.toISOString() || null,
        lastActiveAt: userProfile.merchant.lastActiveAt?.toISOString() || null,
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
        createdAt: userProfile.outlet.createdAt?.toISOString() || null,
        merchant: userProfile.outlet.merchant ? {
          id: userProfile.outlet.merchant.id,
          name: userProfile.outlet.merchant.name,
        } : undefined,
        // Get default bank account for outlet
        defaultBankAccount: userProfile.outlet.id ? await getDefaultBankAccount(userProfile.outlet.id) : undefined,
      } : undefined,
    };

    return NextResponse.json({
      success: true,
      data: transformedUser,
    });
    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      return NextResponse.json(
        ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })
);

/**
 * PUT /api/users/profile
 * Update current user's profile
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const PUT = withApiLogging(
  withAnyAuth(async (request: NextRequest, context: any) => {
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
        ResponseBuilder.error('NO_VALID_FIELDS'),
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
      } else if (currentUser?.role === USER_ROLE.ADMIN) {
        // Admin users can have unique phone numbers globally
        // No additional filter needed
      } else {
        // For users without merchant, check globally
        whereClause.merchantId = null;
      }

      const existingUserWithPhone = await db.users.findFirst(whereClause);

      if (existingUserWithPhone) {
        const scopeMessage = currentUser?.role === USER_ROLE.ADMIN 
          ? 'globally' 
          : 'in your organization';
        return NextResponse.json(
          ResponseBuilder.error('PHONE_EXISTS'),
          { status: 400 }
        );
      }
    }

    // Update user profile using id
    // Note: user.id is already the id (number) from the JWT token
    const updatedUser = await db.users.update(user.id, updateData);

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

    return NextResponse.json(
      ResponseBuilder.success('PROFILE_UPDATED_SUCCESS', transformedUser)
    );
    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      return NextResponse.json(
        ResponseBuilder.error('UPDATE_PROFILE_FAILED'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })
); 
