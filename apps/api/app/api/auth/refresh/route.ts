import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { buildSimpleCorsHeaders } from '@rentalshop/utils/server';
import { refreshWithAccessToken, refreshWithRefreshToken } from '../../../../lib/refresh-access-token';

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
  deviceId: z.string().optional(),
});

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
 *
 * Both flows renew only their own session (#343): 401 SESSION_REPLACED when a newer login
 * replaced it, 401 SESSION_EXPIRED when it was logged out or timed out.
 */
export async function POST(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);
  try {
    // Body might be empty (legacy clients sending only Authorization header)
    const parsed = refreshSchema.safeParse(await request.json().catch(() => ({})));
    const body = parsed.success ? parsed.data : {};

    // ========================================================================
    // NEW FLOW: Use refresh token (preferred, works even when access token expired)
    // ========================================================================
    if (body.refreshToken) {
      const result = await refreshWithRefreshToken({
        refreshToken: body.refreshToken,
        deviceId: body.deviceId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });

      if (!result.ok) {
        return NextResponse.json(
          ResponseBuilder.error(result.code),
          { status: result.status, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        ResponseBuilder.success('TOKEN_REFRESHED', {
          token: result.token,
          refreshToken: result.refreshToken,
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
        ResponseBuilder.error('REFRESH_TOKEN_REQUIRED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const result = await refreshWithAccessToken(token);

    if (!result.ok) {
      return NextResponse.json(
        ResponseBuilder.error(result.code),
        { status: result.status, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      ResponseBuilder.success('TOKEN_REFRESHED', {
        token: result.token,
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
