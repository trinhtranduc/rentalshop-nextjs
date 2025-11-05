import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';

/**
 * GET /api/auth/verify - Verify authentication token and return user information
 * REFACTORED: Now uses unified withAuthRoles pattern
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  console.log(`🔍 GET /api/auth/verify - User: ${user.email}`);
  
  try {
    // Return user information (include outlet for role-based UI)
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
          role: user.role,
          phone: user.phone || null,
          merchant: user.merchant || null,
          outlet: user.outlet || null,
        }
      },
      message: 'Token is valid'
    });

  } catch (error) {
    console.error('Error verifying token:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
