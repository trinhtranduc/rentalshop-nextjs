import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { buildSimpleCorsHeaders } from '@rentalshop/utils/server';

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * POST /api/mobile/auth/refresh
 * 
 * Refresh access token using refresh token.
 * This does NOT require a valid access token — only the refresh token.
 * 
 * Flow:
 * 1. Mobile sends expired access token situation → calls this endpoint with refresh token
 * 2. Server validates refresh token, rotates it (old revoked, new issued)
 * 3. Returns new access token + new refresh token
 * 
 * Security:
 * - Refresh token rotation: each use creates a new refresh token
 * - Theft detection: if a revoked token is reused, ALL tokens for that device are revoked
 * - Device binding: refresh tokens are bound to deviceId
 * 
 * Request body:
 * {
 *   "refreshToken": "abc123...",   // Required
 *   "deviceId": "device-xyz"       // Optional but recommended for device binding
 * }
 */
export async function POST(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);
  try {
    const body = await request.json();
    const { refreshToken, deviceId } = body;

    if (!refreshToken) {
      return NextResponse.json(
        ResponseBuilder.error('REFRESH_TOKEN_REQUIRED', 'Refresh token is required'),
        { status: 400, headers: corsHeaders }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Rotate the refresh token (validates + revokes old + creates new)
    const rotationResult = await db.refreshTokens.rotate(refreshToken, {
      deviceId: deviceId || undefined,
      userAgent,
      ipAddress,
    });

    if (!rotationResult) {
      return NextResponse.json(
        ResponseBuilder.error('REFRESH_TOKEN_INVALID', 'Refresh token is invalid, expired, or revoked. Please login again.'),
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user from database to ensure they're still active
    const dbUser = await db.users.findById(rotationResult.userId);

    if (!dbUser || !dbUser.isActive) {
      // Revoke the new token since user is inactive
      await db.refreshTokens.revoke(rotationResult.newToken);
      return NextResponse.json(
        ResponseBuilder.error('USER_NOT_FOUND_OR_INACTIVE', 'User account is inactive or not found'),
        { status: 401, headers: corsHeaders }
      );
    }

    // Build token payload with latest user data
    const passwordChangedAt = (dbUser as any).passwordChangedAt
      ? Math.floor(new Date((dbUser as any).passwordChangedAt).getTime() / 1000)
      : null;
    const permissionsChangedAt = (dbUser as any).permissionsChangedAt
      ? Math.floor(new Date((dbUser as any).permissionsChangedAt).getTime() / 1000)
      : null;

    // Get active session
    const activeSessions = await db.sessions.getUserActiveSessions(dbUser.id);
    const sessionId = activeSessions.length > 0 ? activeSessions[0].sessionId : undefined;

    // Generate new access token (7 days)
    const newAccessToken = generateToken({
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      merchantId: dbUser.merchantId,
      outletId: dbUser.outletId,
      sessionId,
      passwordChangedAt,
      permissionsChangedAt,
    } as any);

    return NextResponse.json(
      ResponseBuilder.success('TOKEN_REFRESHED', {
        token: newAccessToken,
        refreshToken: rotationResult.newToken,
        expiresIn: '7d',
        refreshExpiresIn: '30d',
      }),
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Mobile token refresh error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode, headers: corsHeaders });
  }
}
