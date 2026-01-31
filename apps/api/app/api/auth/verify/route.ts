import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles, getUserPermissions } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * GET /api/auth/verify - Verify authentication token and return user information
 * REFACTORED: Now uses unified withAuthRoles pattern
 */
export const GET = withApiLogging(
  withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  try {
    // Get user permissions (required for UI control)
    const permissions = await getUserPermissions(user);

    // Return user information (include permissions, merchant, outlet for role-based UI)
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
          merchantId: user.merchantId || null,
          outletId: user.outletId || null,
          permissions: permissions, // ✅ Include permissions for UI control
          merchant: user.merchant || null,
          outlet: user.outlet || null,
        }
      },
      message: 'Token is valid'
    });

  } catch (error) {
    // Error will be automatically logged by withApiLogging wrapper
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
  })
);
