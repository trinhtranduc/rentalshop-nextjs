import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, handleSubscriptionError } from '@rentalshop/auth';
import { findUserById, updateUser, prisma } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

/**
 * GET /api/users/profile
 * Get current user's profile
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Profile API called');
    
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      console.log('❌ Authentication failed');
      return authResult.response;
    }

    const user = authResult.user;
    console.log('✅ Token verification result: Success', { id: user.id, role: user.role });

    // Get user profile with complete merchant and outlet data
    // Note: user.id is the id, we need to find by id
    console.log('🔍 Searching for user with id:', user.id);
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        merchant: {
          select: {
            id: true,
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            businessType: true,
            taxId: true,
            website: true,
            description: true,
            isActive: true,
            planId: true,
            subscriptionStatus: true,
            totalRevenue: true,
            createdAt: true,
            lastActiveAt: true,
          }
        },
        outlet: {
          select: {
            id: true,
            id: true,
            name: true,
            address: true,
            phone: true,
            description: true,
            isActive: true,
            isDefault: true,
            createdAt: true,
            merchant: {
              select: {
                id: true,
                id: true,
                name: true,
              }
            }
          }
        },
      },
    });

    if (!userProfile) {
      console.log('❌ User not found with id:', user.id);
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    console.log('✅ User profile found:', { 
      id: userProfile.id, 
      id: userProfile.id, 
      email: userProfile.email,
      hasMerchant: !!userProfile.merchant,
      hasOutlet: !!userProfile.outlet
    });

    // Transform user data to include complete merchant and outlet information
    const transformedUser = {
      ...userProfile,
      // Direct IDs for quick access
      merchantId: userProfile.merchant?.id,
      outletId: userProfile.outlet?.id,
      // Complete merchant object with all business info
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
      merchantId: userProfile.merchant?.id,
      outletId: userProfile.outlet?.id,
      hasMerchant: !!userProfile.merchant,
      hasOutlet: !!userProfile.outlet,
      merchantName: userProfile.merchant?.name,
      outletName: userProfile.outlet?.name
    });

    console.log('✅ Returning user profile data');
    return NextResponse.json({
      success: true,
      data: transformedUser,
    });
  } catch (error) {
    console.error('💥 Error fetching user profile:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Handle subscription errors consistently
    const errorResponse = handleSubscriptionError(error);
    return NextResponse.json(
      { 
        success: errorResponse.success, 
        error: errorResponse.error
      },
      { status: errorResponse.status }
    );
  }
}

/**
 * PUT /api/users/profile
 * Update current user's profile
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    const body = await request.json();
    
    // Validate input - email updates are disabled for security
    const { firstName, lastName, phone } = body;
    
    // Only allow updating certain fields (email is disabled)
    const updateData: any = {};
    if (firstName && firstName.trim()) updateData.firstName = firstName.trim();
    if (lastName && lastName.trim()) updateData.lastName = lastName.trim();
    if (phone !== undefined) updateData.phone = phone?.trim() || null;

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
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { merchantId: true, role: true }
      });

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

      const existingUserWithPhone = await prisma.user.findFirst({
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

    const updatedUser = await updateUser(user.id, updateData);

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
        email: updatedUser.merchant.email,
        phone: updatedUser.merchant.phone,
        address: updatedUser.merchant.address,
        city: updatedUser.merchant.city,
        state: updatedUser.merchant.state,
        zipCode: updatedUser.merchant.zipCode,
        country: updatedUser.merchant.country,
        businessType: updatedUser.merchant.businessType,
        taxId: updatedUser.merchant.taxId,
        website: updatedUser.merchant.website,
        description: updatedUser.merchant.description,
        isActive: updatedUser.merchant.isActive,
        planId: updatedUser.merchant.planId,
        subscriptionStatus: updatedUser.merchant.subscriptionStatus,
        totalRevenue: updatedUser.merchant.totalRevenue,
        createdAt: updatedUser.merchant.createdAt,
        lastActiveAt: updatedUser.merchant.lastActiveAt,
      } : undefined,
      // Complete outlet object with all outlet info  
      outlet: updatedUser.outlet ? {
        id: updatedUser.outlet.id,
        name: updatedUser.outlet.name,
        address: updatedUser.outlet.address,
        phone: updatedUser.outlet.phone,
        description: updatedUser.outlet.description,
        isActive: updatedUser.outlet.isActive,
        isDefault: updatedUser.outlet.isDefault,
        createdAt: updatedUser.outlet.createdAt,
        merchant: updatedUser.outlet.merchant ? {
          id: updatedUser.outlet.merchant.id,
          name: updatedUser.outlet.merchant.name,
        } : undefined,
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
} 