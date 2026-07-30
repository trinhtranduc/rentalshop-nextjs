import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { verifyTokenSimple } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

/**
 * POST /api/auth/logout
 * Logout user and invalidate their session (implements single session enforcement)
 */
export async function POST(request: NextRequest) {
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
      console.log(`Session ${user.sessionId} invalidated for user ${user.id}`);
    }

    // Optional: deactivate push token for this device (mobile logout)
    try {
      const body = await request.clone().json().catch(() => null);
      const deviceId = body?.deviceId;
      if (typeof deviceId === 'string' && deviceId.length > 0 && user.id) {
        await db.deviceTokens.deactivate(user.id, deviceId);
      }
    } catch {
      // Body may be empty — ignore
    }
    
    return NextResponse.json(
      ResponseBuilder.success('LOGOUT_SUCCESS', {
        message: 'Logged out successfully'
      })
    );
    
  } catch (error: any) {
    console.error('Logout error:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
} 
