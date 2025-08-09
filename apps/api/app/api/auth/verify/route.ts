import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';

/**
 * GET /api/auth/verify
 * Verify authentication token and return user information
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    // Verify token
    const user = await verifyTokenSimple(token);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

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
