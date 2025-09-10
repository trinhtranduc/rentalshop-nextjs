import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@rentalshop/auth';

/**
 * GET /api/auth/verify
 * Verify authentication token and return user information
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    const user = authResult.user;

    // Return user information (include outlet for role-based UI)
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: (user as any).firstName,
          lastName: (user as any).lastName,
          name: `${(user as any).firstName ?? ''} ${(user as any).lastName ?? ''}`.trim(),
          role: (user as any).role,
          phone: (user as any).phone,
          merchant: (user as any).merchant,
          outlet: (user as any).outlet || null,
        }
      },
      message: 'Token is valid'
    });

  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json(
      { success: false, message: 'Token verification failed' },
      { status: 401 }
    );
  }
}
