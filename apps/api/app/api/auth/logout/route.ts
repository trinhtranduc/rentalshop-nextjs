import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { verifyTokenSimple } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import {API} from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * POST /api/auth/logout
 * Logout user and invalidate their session (implements single session enforcement)
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const POST = withApiLogging(async (request: NextRequest) => {
  try {
    // Extract token from Authorization header
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        ResponseBuilder.error('ACCESS_TOKEN_REQUIRED'),
        { status: 401 }
      );
    }

    // Verify token and get user info including sessionId
    const user = await verifyTokenSimple(token);
    
    if (!user) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_TOKEN'),
        { status: 401 }
      );
    }

    // ✅ Invalidate the session (single session enforcement)
    if (user.sessionId) {
      await db.sessions.invalidateSession(user.sessionId);
    }
    
    return NextResponse.json(
      ResponseBuilder.success('LOGOUT_SUCCESS', {
        message: 'Logged out successfully'
      })
    );
    
  } catch (error: any) {
    // Error will be automatically logged by withApiLogging wrapper
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}); 
