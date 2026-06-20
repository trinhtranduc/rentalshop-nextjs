import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { buildSimpleCorsHeaders } from '@rentalshop/utils/server';

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * POST /api/auth/refresh
 * Refresh JWT token using a refresh token
 * 
 * This endpoint accepts a refresh token and returns a new access token + rotated refresh token.
 * The old refresh token is invalidated (rotation pattern for security).
 * 
 * IMPORTANT: This does NOT require a valid access token — the refresh token itself is the credential.
 * This allows mobile clients to get a new access token even after the old one has expired.
 * 
 * Request body:
 * - refreshToken: string (required) - The refresh token from login
 * 
 * Legacy support:
 * - If no body/refreshToken is provided but a valid Bearer token exists in headers,
 *   falls back to the old behavior (re-issue from valid access token)
 */
export async function POST(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);
  try {
    // Try to parse request body for refresh token
    let refreshToken: string | null = null;
    let deviceId: string | null = null;
    
    try {
      const body = await request.json();
      refreshToken = body.refreshToken || null;
      deviceId = body.deviceId || null;
    } catch {
      // Body might be empty (legacy clients sending only Authorization header)
    }

    // ========================================================================
    // NEW FLOW: Use refresh token (preferred, works even when access token expired)
    // ========================================================================
    if (refreshToken) {
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
      const userAgent = request.headers.get('user-agent') || undefined;

      // Rotate the refresh token (revokes old one, creates new one)
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

      // Get user from database
      const dbUser = await db.users.findById(rotationResult.userId);

      if (!dbUser || !dbUser.isActive) {
        // Revoke the new token since user is inactive
        await db.refreshTokens.revoke(rotationResult.newToken);
        return NextResponse.json(
          ResponseBuilder.error('USER_NOT_FOUND_OR_INACTIVE'),
          { status: 401, headers: corsHeaders }
        );
      }

      // Get password/permissions timestamps for token
      const passwordChangedAt = (dbUser as any).passwordChangedAt
        ? Math.floor(new Date((dbUser as any).passwordChangedAt).getTime() / 1000)
        : null;
      const permissionsChangedAt = (dbUser as any).permissionsChangedAt
        ? Math.floor(new Date((dbUser as any).permissionsChangedAt).getTime() / 1000)
        : null;

      // Get active session for this user (if any)
      const activeSessions = await db.sessions.getUserActiveSessions(dbUser.id);
      const sessionId = activeSessions.length > 0 ? activeSessions[0].sessionId : undefined;

      // Generate new access token
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
    }

    // ========================================================================
    // LEGACY FLOW: Use existing valid access token (backward compatible for web)
    // ========================================================================
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        ResponseBuilder.error('REFRESH_TOKEN_REQUIRED', 'Refresh token is required. Send { "refreshToken": "..." } in request body.'),
        { status: 401, headers: corsHeaders }
      );
    }

    // Import verifyTokenSimple for legacy flow
    const { verifyTokenSimple } = await import('@rentalshop/auth/server');

    // Verify current access token
    const user = await verifyTokenSimple(token);

    if (!user) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_TOKEN', 'Access token is invalid or expired. Use refresh token instead.'),
        { status: 401, headers: corsHeaders }
      );
    }

    // Get full user data from database
    const dbUser = await db.users.findById(user.id);

    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json(
        ResponseBuilder.error('USER_NOT_FOUND_OR_INACTIVE'),
        { status: 401, headers: corsHeaders }
      );
    }

    const passwordChangedAt = (dbUser as any).passwordChangedAt
      ? Math.floor(new Date((dbUser as any).passwordChangedAt).getTime() / 1000)
      : null;
    const dbPermissionsChangedAt = (dbUser as any).permissionsChangedAt
      ? Math.floor(new Date((dbUser as any).permissionsChangedAt).getTime() / 1000)
      : null;

    // Check if password was changed after token was issued
    const tokenPasswordChangedAt = (user as any).passwordChangedAt;
    if (passwordChangedAt !== null && tokenPasswordChangedAt !== null) {
      if (passwordChangedAt > tokenPasswordChangedAt) {
        return NextResponse.json(
          ResponseBuilder.error('TOKEN_INVALIDATED_PASSWORD_CHANGED'),
          { status: 401, headers: corsHeaders }
        );
      }
    }

    // Check if permissions were changed after token was issued
    const tokenPermissionsChangedAt = (user as any).permissionsChangedAt;
    if (dbPermissionsChangedAt !== null && tokenPermissionsChangedAt !== null) {
      const tolerance = 0.5;
      if (tokenPermissionsChangedAt < (dbPermissionsChangedAt - tolerance)) {
        return NextResponse.json(
          ResponseBuilder.error('TOKEN_INVALIDATED_PERMISSIONS_CHANGED'),
          { status: 401, headers: corsHeaders }
        );
      }
    }

    const sessionId = (user as any).sessionId || undefined;

    // Generate new token
    const newToken = generateToken({
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      merchantId: dbUser.merchantId,
      outletId: dbUser.outletId,
      sessionId,
      passwordChangedAt,
      permissionsChangedAt: dbPermissionsChangedAt,
    } as any);

    return NextResponse.json(
      ResponseBuilder.success('TOKEN_REFRESHED', {
        token: newToken,
        expiresIn: '7d',
      }),
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Token refresh error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode, headers: corsHeaders });
  }
}
