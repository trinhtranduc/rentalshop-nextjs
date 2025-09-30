import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';

import {API} from '@rentalshop/constants';


/**
 * GET /api/users/[id]
 * Get user by ID (Admin only)
 */
async function handleGetUser(
  request: NextRequest,
  { user: currentUser, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  try {

    // Check authorization based on user role
    let canAccess = false;
    let userScope: { merchantId?: number; outletId?: number } = {};

    if (currentUser.role === 'ADMIN') {
      // Admin can see all users system-wide
      canAccess = true;
      userScope = {};
      console.log('🔐 Admin access granted - can see all users system-wide');
    } else if (currentUser.role === 'MERCHANT') {
      // Merchant can see all users within their organization
      canAccess = true;
      userScope = { merchantId: currentUser.merchantId ? parseInt(currentUser.merchantId) : undefined };
      console.log('🔐 Merchant access granted - scope:', userScope);
    } else if (currentUser.role === 'OUTLET_ADMIN') {
      // Outlet admin can see users within their outlet
      canAccess = true;
      userScope = { 
        merchantId: currentUser.merchantId ? parseInt(currentUser.merchantId) : undefined, 
        outletId: currentUser.outletId ? parseInt(currentUser.outletId) : undefined 
      };
      console.log('🔐 Outlet Admin access granted - scope:', userScope);
    } else if (currentUser.role === 'OUTLET_STAFF') {
      // Outlet staff cannot manage users
      canAccess = false;
      console.log('🔐 Outlet Staff access denied - cannot manage users');
    }

    if (!canAccess) {
      console.log('❌ Access denied for user:', { role: currentUser.role, merchantId: currentUser.merchantId, outletId: currentUser.outletId });
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to view users' }, 
        { status: API.STATUS.FORBIDDEN }
      );
    }

    console.log('✅ Access granted for user:', { role: currentUser.role, scope: userScope });

    const { id } = params;
    console.log('🔍 GET /api/users/[id] - Looking for user with ID:', id);

    // Validate ID format (should be numeric)
    const numericId = parseInt(id);
    if (isNaN(numericId) || numericId <= 0) {
      console.log('❌ Invalid ID format:', id);
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    console.log('🔍 Looking for user with numeric ID:', numericId);

    // Check if user exists by ID
    const user = await prisma.user.findUnique({
      where: { id: numericId },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log('🔍 Database query result:', user);

    if (!user) {
      console.log('❌ User not found in database for ID:', id);
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Validate scope access - ensure user can only view users within their scope
    if (userScope.merchantId && user.merchant?.id && user.merchant.id !== userScope.merchantId) {
      console.log('❌ Scope violation: User trying to access user from different merchant', {
        userMerchantId: user.merchant.id,
        userScopeMerchantId: userScope.merchantId
      });
      return NextResponse.json(
        { success: false, message: 'Access denied: User not in your organization' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    if (userScope.outletId && user.outlet?.id && user.outlet.id !== userScope.outletId) {
      console.log('❌ Scope violation: User trying to access user from different outlet', {
        userOutletId: user.outlet.id,
        userScopeOutletId: userScope.outletId
      });
      return NextResponse.json(
        { success: false, message: 'Access denied: User not in your outlet' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    console.log('✅ Scope validation passed - user can access this user data');

    console.log('✅ User found, transforming data...');

    // Transform the data to match the expected format
    const transformedUser = {
              id: (user as any).id, // Return id as "id" to frontend
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      
      // Add missing fields that UI needs
      firstName: user.firstName,
      lastName: user.lastName,
      merchantId: user.merchantId,
      outletId: user.outletId,
      emailVerified: (user as any).emailVerified || false,
      lastLoginAt: (user as any).lastLoginAt?.toISOString(),
      
      // Include merchant and outlet objects
      merchant: user.merchant ? {
        id: user.merchant.id,
        name: user.merchant.name
      } : undefined,
      
      outlet: (user as any).outlet ? {
        id: (user as any).outlet.id,
        name: (user as any).outlet.name,
        merchant: user.merchant ? {
          id: user.merchant.id,
          name: user.merchant.name
        } : undefined
      } : undefined
    };

    console.log('✅ Transformed user data:', transformedUser);

    return NextResponse.json({
      success: true,
      data: transformedUser,
      message: 'User retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching user:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * PUT /api/users/[id]
 * Update user information by public ID (Admin, Merchant, Outlet Admin only)
 */
async function handleUpdateUser(
  request: NextRequest,
  { user: currentUser, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  try {

    // Check authorization based on user role
    let canAccess = false;
    let userScope: { merchantId?: number; outletId?: number } = {};

    // Normalize role for comparison (handle case sensitivity)
    const normalizedRole = currentUser.role?.toUpperCase() || '';

    if (normalizedRole === 'ADMIN') {
      // Admin can update all users system-wide
      canAccess = true;
      userScope = {};
      console.log('🔐 Admin access granted - can update all users system-wide');
    } else if (normalizedRole === 'MERCHANT') {
      // Merchant can update users within their organization
      canAccess = true;
      userScope = { merchantId: currentUser.merchantId ? parseInt(currentUser.merchantId) : undefined };
      console.log('🔐 Merchant access granted - scope:', userScope);
    } else if (normalizedRole === 'OUTLET_ADMIN') {
      // Outlet admin can update users within their outlet
      canAccess = true;
      userScope = { 
        merchantId: currentUser.merchantId ? parseInt(currentUser.merchantId) : undefined, 
        outletId: currentUser.outletId ? parseInt(currentUser.outletId) : undefined 
      };
      console.log('🔐 Outlet Admin access granted - scope:', userScope);
    } else if (normalizedRole === 'OUTLET_STAFF') {
      // Outlet staff cannot update users
      canAccess = false;
      console.log('🔐 Outlet Staff access denied - cannot update users');
    } else {
      // Unknown role
      canAccess = false;
      console.log('❌ Unknown role:', currentUser.role, 'Normalized:', normalizedRole);
    }

    if (!canAccess) {
      console.log('❌ Access denied for user:', { role: currentUser.role, merchantId: currentUser.merchantId, outletId: currentUser.outletId });
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to update users' }, 
        { status: API.STATUS.FORBIDDEN }
      );
    }

    console.log('✅ Access granted for user:', { role: currentUser.role, scope: userScope });

    const { id } = params;
    const body = await request.json();

    // Validate public ID format (should be numeric)
    const numericId = parseInt(id);
    if (isNaN(numericId) || numericId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: numericId },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Validate scope access - ensure user can only update users within their scope
    if (userScope.merchantId && user.merchantId && user.merchantId !== userScope.merchantId) {
      console.log('❌ Scope violation: User trying to update user from different merchant', {
        userMerchantId: user.merchantId,
        userScopeMerchantId: userScope.merchantId
      });
      return NextResponse.json(
        { success: false, message: 'Access denied: Cannot update user from different organization' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    if (userScope.outletId && user.outletId && user.outletId !== userScope.outletId) {
      console.log('❌ Scope violation: User trying to update user from different outlet', {
        userOutletId: user.outletId,
        userScopeOutletId: userScope.outletId
      });
      return NextResponse.json(
        { success: false, message: 'Access denied: Cannot update user from different outlet' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    console.log('✅ Scope validation passed - user can update this user data');

    // Prevent modifying admin users (unless current user is also admin)
    if (user.role === 'ADMIN' && currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Cannot modify admin users' },
        { status: 400 }
      );
    }

    // Import the update function
    const { updateUser } = await import('@rentalshop/database');

    // Update user
    const updatedUser = await updateUser(numericId, body);

    console.log('✅ User updated successfully:', {
      updatedUserId: numericId,
      updatedBy: currentUser.id,
      updatedUser: updatedUser.id
    });

    // Transform the data to match the expected format
    const transformedUser = {
      id: updatedUser.id, // Return id as "id" to frontend
      name: `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim() || 'Unknown',
      email: updatedUser.email,
      phone: updatedUser.phone || '',
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
      
      // Add missing fields that UI needs
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      merchantId: updatedUser.merchantId,
      outletId: updatedUser.outletId,
      emailVerified: (updatedUser as any).emailVerified || false,
      lastLoginAt: (updatedUser as any).lastLoginAt?.toISOString(),
      
      // Include merchant and outlet objects
      merchant: updatedUser.merchant ? {
        id: updatedUser.merchant.id,
        name: updatedUser.merchant.name
      } : undefined,
      
      outlet: (updatedUser as any).outlet ? {
        id: (updatedUser as any).outlet.id,
        name: (updatedUser as any).outlet.name,
        merchant: updatedUser.merchant ? {
          id: updatedUser.merchant.id,
          name: updatedUser.merchant.name
        } : undefined
      } : undefined
    };

    return NextResponse.json({
      success: true,
      data: transformedUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * PATCH /api/users/[id]
 * Activate/Deactivate user by public ID (Admin only)
 */
async function handlePatchUser(
  request: NextRequest,
  { user: currentUser, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  try {

    // Check authorization based on user role
    let canAccess = false;
    let userScope: { merchantId?: number; outletId?: number } = {};

    // Normalize role for comparison (handle case sensitivity)
    const normalizedRole = currentUser.role?.toUpperCase() || '';

    if (normalizedRole === 'ADMIN') {
      // Admin can activate/deactivate all users system-wide
      canAccess = true;
      userScope = {};
      console.log('🔐 Admin access granted - can activate/deactivate all users system-wide');
    } else if (normalizedRole === 'MERCHANT') {
      // Merchant can activate/deactivate users within their organization
      canAccess = true;
      userScope = { merchantId: currentUser.merchantId ? parseInt(currentUser.merchantId) : undefined };
      console.log('🔐 Merchant access granted - scope:', userScope);
    } else if (normalizedRole === 'OUTLET_ADMIN') {
      // Outlet admin can activate/deactivate users within their outlet
      canAccess = true;
      userScope = { 
        merchantId: currentUser.merchantId ? parseInt(currentUser.merchantId) : undefined, 
        outletId: currentUser.outletId ? parseInt(currentUser.outletId) : undefined 
      };
      console.log('🔐 Outlet Admin access granted - scope:', userScope);
    } else if (normalizedRole === 'OUTLET_STAFF') {
      // Outlet staff cannot activate/deactivate users
      canAccess = false;
      console.log('🔐 Outlet Staff access denied - cannot activate/deactivate users');
    } else {
      // Unknown role
      canAccess = false;
      console.log('❌ Unknown role:', currentUser.role, 'Normalized:', normalizedRole);
    }

    if (!canAccess) {
      console.log('❌ Access denied for user:', { role: currentUser.role, merchantId: currentUser.merchantId, outletId: currentUser.outletId });
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to activate/deactivate users' }, 
        { status: API.STATUS.FORBIDDEN }
      );
    }

    console.log('✅ Access granted for user:', { role: currentUser.role, scope: userScope });

    const { id } = params;
    const body = await request.json();
    const { action } = body; // 'activate' or 'deactivate'

    if (!action || !['activate', 'deactivate'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Must be "activate" or "deactivate"' },
        { status: 400 }
      );
    }

    // Validate public ID format (should be numeric)
    const numericId = parseInt(id);
    if (isNaN(numericId) || numericId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: numericId },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 400 }
      );
    }

    // Validate scope access - ensure user can only activate/deactivate users within their scope
    if (userScope.merchantId && user.merchantId && user.merchantId !== userScope.merchantId) {
      console.log('❌ Scope violation: User trying to activate/deactivate user from different merchant', {
        userMerchantId: user.merchantId,
        userScopeMerchantId: userScope.merchantId
      });
      return NextResponse.json(
        { success: false, message: 'Access denied: Cannot modify user from different organization' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    if (userScope.outletId && user.outletId && user.outletId !== userScope.outletId) {
      console.log('❌ Scope violation: User trying to activate/deactivate user from different outlet', {
        userOutletId: user.outletId,
        userScopeOutletId: userScope.outletId
      });
      return NextResponse.json(
        { success: false, message: 'Access denied: Cannot modify user from different outlet' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    console.log('✅ Scope validation passed - user can activate/deactivate this user data');

    // Prevent modifying admin users
    if (user.role === 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Cannot modify admin users' },
        { status: 400 }
      );
    }

    // Update user status
    const newStatus = action === 'activate';
    
    // If trying to activate an already active user or deactivate an already inactive user
    if (user.isActive === newStatus) {
      return NextResponse.json(
        { 
          success: false, 
          message: `User is already ${action === 'activate' ? 'active' : 'inactive'}` 
        },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: newStatus }
    });

    return NextResponse.json({
      success: true,
      message: `User ${action}d successfully`
    });

  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update user status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * DELETE /api/users/[id]
 * Delete a user permanently (Admin only)
 */
async function handleDeleteUser(
  request: NextRequest,
  { user: currentUser, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  try {

    // Check authorization based on user role
    let canAccess = false;
    let userScope: { merchantId?: number; outletId?: number } = {};

    // Normalize role for comparison (handle case sensitivity)
    const normalizedRole = currentUser.role?.toUpperCase() || '';

    if (normalizedRole === 'ADMIN') {
      // Admin can delete all users system-wide
      canAccess = true;
      userScope = {};
      console.log('🔐 Admin access granted - can delete all users system-wide');
    } else if (normalizedRole === 'MERCHANT') {
      // Merchant can delete users within their organization
      canAccess = true;
      userScope = { merchantId: currentUser.merchantId ? parseInt(currentUser.merchantId) : undefined };
      console.log('🔐 Merchant access granted - scope:', userScope);
    } else if (normalizedRole === 'OUTLET_ADMIN') {
      // Outlet admin can delete users within their outlet
      canAccess = true;
      userScope = { 
        merchantId: currentUser.merchantId ? parseInt(currentUser.merchantId) : undefined, 
        outletId: currentUser.outletId ? parseInt(currentUser.outletId) : undefined 
      };
      console.log('🔐 Outlet Admin access granted - scope:', userScope);
    } else if (normalizedRole === 'OUTLET_STAFF') {
      // Outlet staff cannot delete users
      canAccess = false;
      console.log('🔐 Outlet Staff access denied - cannot delete users');
    } else {
      // Unknown role
      canAccess = false;
      console.log('❌ Unknown role:', currentUser.role, 'Normalized:', normalizedRole);
    }

    if (!canAccess) {
      console.log('❌ Access denied for user:', { role: currentUser.role, merchantId: currentUser.merchantId, outletId: currentUser.outletId });
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to delete users' }, 
        { status: API.STATUS.FORBIDDEN }
      );
    }

    console.log('✅ Access granted for user:', { role: currentUser.role, scope: userScope });

    const { id } = params;

    // Validate public ID format (should be numeric)
    const numericId = parseInt(id);
    if (isNaN(numericId) || numericId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: numericId },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Validate scope access - ensure user can only delete users within their scope
    if (userScope.merchantId && user.merchantId && user.merchantId !== userScope.merchantId) {
      console.log('❌ Scope violation: User trying to delete user from different merchant', {
        userMerchantId: user.merchantId,
        userScopeMerchantId: userScope.merchantId
      });
      return NextResponse.json(
        { success: false, message: 'Access denied: Cannot delete user from different organization' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    if (userScope.outletId && user.outletId && user.outletId !== userScope.outletId) {
      console.log('❌ Scope violation: User trying to delete user from different outlet', {
        userOutletId: user.outletId,
        userScopeOutletId: userScope.outletId
      });
      return NextResponse.json(
        { success: false, message: 'Access denied: Cannot delete user from different outlet' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    console.log('✅ Scope validation passed - user can delete this user data');

    console.log('🔍 DELETE /api/users/[id] - User found:', {
      userId: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId
    });

    // Prevent deleting admin users (but allow admins to delete other admins)
    if (user.role === 'ADMIN') {
      // Check if the current user is trying to delete themselves
      if (currentUser.id === user.id) {
        console.log('❌ Admin user trying to delete themselves:', currentUser.id);
        return NextResponse.json(
          { success: false, message: 'Cannot delete your own admin account' },
          { status: 400 }
        );
      }
      
      // Allow admin users to delete other admin users
      console.log('✅ Admin user deleting another admin user:', { 
        currentUserId: currentUser.id, 
        targetUserId: user.id 
      });
    }

    // Check if user has active orders or other dependencies
    const hasActiveOrders = await prisma.order.findFirst({
      where: { 
        customerId: user.id
      }
    });

    if (hasActiveOrders) {
      console.log('❌ User has active orders, cannot delete:', user.id);
      return NextResponse.json(
        { success: false, message: 'Cannot delete user with active orders' },
        { status: 400 }
      );
    }

    // Check if user is a merchant owner
    if (user.merchantId && user.role === 'MERCHANT') {
      const isMerchantOwner = await prisma.merchant.findFirst({
        where: { 
          id: user.merchantId 
        }
      });

      if (isMerchantOwner) {
        console.log('❌ User is merchant owner, cannot delete:', user.id);
        return NextResponse.json(
          { success: false, message: 'Cannot delete merchant owner account' },
          { status: 400 }
        );
      }
    }

    console.log('✅ All checks passed, proceeding with user deletion:', user.id);

    // Delete user
    await prisma.user.delete({
      where: { id: user.id }
    });

    console.log('✅ User deleted successfully from database:', user.id);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// Export functions with withAuthRoles wrapper
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleGetUser(req, context, params)
  );
  return authenticatedHandler(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleUpdateUser(req, context, params)
  );
  return authenticatedHandler(request);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
  const authenticatedHandler = authWrapper((req, context) => 
    handlePatchUser(req, context, params)
  );
  return authenticatedHandler(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleDeleteUser(req, context, params)
  );
  return authenticatedHandler(request);
}
