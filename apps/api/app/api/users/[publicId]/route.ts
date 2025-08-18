import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { assertAnyRole } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { findUserByPublicId } from '@rentalshop/database';


/**
 * GET /api/users/[publicId]
 * Get user by public ID (Admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { publicId: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const currentUser = await verifyTokenSimple(token);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    try {
      assertAnyRole(currentUser as any, ['ADMIN']);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { publicId } = params;
    console.log('🔍 GET /api/users/[publicId] - Looking for user with public ID:', publicId);

    // Validate public ID format (should be numeric)
    const numericId = parseInt(publicId);
    if (isNaN(numericId) || numericId <= 0) {
      console.log('❌ Invalid public ID format:', publicId);
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    console.log('🔍 Looking for user with numeric ID:', numericId);

    // Check if user exists by public ID
    const user = await findUserByPublicId(numericId);

    console.log('🔍 Database query result:', user);

    if (!user) {
      console.log('❌ User not found in database for public ID:', publicId);
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    console.log('✅ User found, transforming data...');

    // Transform the data to match the expected format
    const transformedUser = {
      id: (user as any).publicId, // Client sees publicId as "id"
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
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
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[publicId]
 * Activate/Deactivate user by public ID (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { publicId: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const currentUser = await verifyTokenSimple(token);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    try {
      assertAnyRole(currentUser as any, ['ADMIN']);
    } catch {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const { publicId } = params;
    const body = await request.json();
    const { action } = body; // 'activate' or 'deactivate'

    if (!action || !['activate', 'deactivate'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Must be "activate" or "deactivate"' },
        { status: 400 }
      );
    }

    // Validate public ID format (should be numeric)
    const numericId = parseInt(publicId);
    if (isNaN(numericId) || numericId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await findUserByPublicId(numericId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 400 }
      );
    }

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
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[publicId]
 * Delete a user permanently (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { publicId: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const currentUser = await verifyTokenSimple(token);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    try {
      assertAnyRole(currentUser as any, ['ADMIN']);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { publicId } = params;

    // Validate public ID format (should be numeric)
    const numericId = parseInt(publicId);
    if (isNaN(numericId) || numericId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await findUserByPublicId(numericId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    console.log('🔍 DELETE /api/users/[publicId] - User found:', {
      userId: user.id,
      publicId: user.publicId,
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
      { status: 500 }
    );
  }
}
