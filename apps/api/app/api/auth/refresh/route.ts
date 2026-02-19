import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple, generateToken } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { buildSimpleCorsHeaders } from '@rentalshop/utils';

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * POST /api/auth/refresh
 * Refresh JWT token using existing valid token
 * 
 * This endpoint allows users to get a new token without logging in again
 * as long as their current token is still valid (not expired)
 */
export async function POST(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);
  try {
    // Extract token from Authorization header
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        ResponseBuilder.error('ACCESS_TOKEN_REQUIRED'),
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify token and get user info
    const user = await verifyTokenSimple(token);
    
    if (!user) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_TOKEN'),
        { status: 401, headers: corsHeaders }
      );
    }

    // Get full user data from database to ensure user still exists and is active
    const dbUser = await db.users.findById(user.id);
    
    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json(
        ResponseBuilder.error('USER_NOT_FOUND_OR_INACTIVE'),
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if user's password or permissions changed (would invalidate token)
    // This is handled in verifyTokenSimple, but we double-check here for safety
    const passwordChangedAt = (dbUser as any).passwordChangedAt 
      ? Math.floor(new Date((dbUser as any).passwordChangedAt).getTime() / 1000)
      : null;

    // Get permissionsChangedAt from database
    const dbPermissionsChangedAt = (dbUser as any).permissionsChangedAt
      ? Math.floor(new Date((dbUser as any).permissionsChangedAt).getTime() / 1000)
      : null;

    // Get these from the current token payload
    const tokenPasswordChangedAt = (user as any).passwordChangedAt;
    const tokenPermissionsChangedAt = (user as any).permissionsChangedAt;

    // Check if password was changed after token was issued
    if (passwordChangedAt !== null && tokenPasswordChangedAt !== null) {
      if (passwordChangedAt > tokenPasswordChangedAt) {
        return NextResponse.json(
          ResponseBuilder.error('TOKEN_INVALIDATED_PASSWORD_CHANGED'),
          { status: 401, headers: corsHeaders }
        );
      }
    }

    // Check if permissions were changed after token was issued
    if (dbPermissionsChangedAt !== null && tokenPermissionsChangedAt !== null) {
      const tolerance = 0.5; // 500ms tolerance for timing differences
      if (tokenPermissionsChangedAt < (dbPermissionsChangedAt - tolerance)) {
        return NextResponse.json(
          ResponseBuilder.error('TOKEN_INVALIDATED_PERMISSIONS_CHANGED'),
          { status: 401, headers: corsHeaders }
        );
      }
    }

    // Get session ID from token (for single session enforcement)
    // Reuse existing sessionId from token - don't create new session during refresh
    // Session is managed separately and should persist across token refreshes
    const sessionId = (user as any).sessionId || undefined;
    
    // Optionally validate session if sessionId exists
    // Note: We allow refresh even if session validation fails, as session might be managed separately
    if (sessionId) {
      const isSessionValid = await db.sessions.validateSession(sessionId);
      if (!isSessionValid) {
        // Session invalidated, but allow refresh to proceed
        // This allows token refresh even if session check fails
        // The session will be properly validated on next login
        console.warn('Session invalidated during refresh, but allowing token refresh to proceed');
      }
    }

    // Generate new token with same user data but new expiration time
    const newToken = generateToken({
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      merchantId: dbUser.merchantId,
      outletId: dbUser.outletId,
      sessionId: sessionId,
      passwordChangedAt: passwordChangedAt,
      permissionsChangedAt: dbPermissionsChangedAt,
    } as any);

    return NextResponse.json(
      ResponseBuilder.success('TOKEN_REFRESHED', {
        token: newToken,
        expiresIn: '7d', // Same as login
      }),
      { headers: corsHeaders }
    );
    
  } catch (error: any) {
    console.error('Token refresh error:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode, headers: corsHeaders });
  }
}
