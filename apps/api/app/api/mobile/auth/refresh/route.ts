import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { buildSimpleCorsHeaders } from '@rentalshop/utils/server';
import { refreshWithRefreshToken } from '../../../../../lib/refresh-access-token';

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
  deviceId: z.string().optional(),
});

/**
 * POST /api/mobile/auth/refresh
 * 
 * Refresh access token using refresh token.
 * This does NOT require a valid access token — only the refresh token.
 * 
 * Flow:
 * 1. Mobile gets 401 TOKEN_EXPIRED → calls this endpoint with refresh token
 * 2. Server rotates the refresh token (old revoked, new issued)
 * 3. Returns new access token for the refresh token's own session + new refresh token
 * 
 * Security:
 * - Refresh token rotation: each use creates a new refresh token
 * - Theft detection: if a revoked token is reused, ALL tokens for that device are revoked
 * - Session binding (#343): a session replaced by a newer login answers 401 SESSION_REPLACED;
 *   a logged-out or expired session answers 401 SESSION_EXPIRED
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
    const parsed = refreshSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.error('REFRESH_TOKEN_REQUIRED'),
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await refreshWithRefreshToken({
      refreshToken: parsed.data.refreshToken,
      deviceId: parsed.data.deviceId,
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

  } catch (error: any) {
    console.error('Mobile token refresh error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode, headers: corsHeaders });
  }
}
