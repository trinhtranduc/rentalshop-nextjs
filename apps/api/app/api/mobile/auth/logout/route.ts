import { NextRequest, NextResponse } from 'next/server';
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
 * POST /api/mobile/auth/logout
 * 
 * Revoke the refresh token and end the session it belongs to.
 * Public route (no JWT): the refresh token is the credential, so only its own session ends.
 * A client-supplied x-user-id header is ignored; it used to sign out every session of any user (#344).
 * 
 * Request body:
 * {
 *   "refreshToken": "abc123..."  // Required - the refresh token to revoke
 * }
 */
export async function POST(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);
  try {
    const body = await request.json().catch(() => ({}));
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : null;

    if (refreshToken) {
      const sessionId = await db.refreshTokens.findSessionId(refreshToken);
      await db.refreshTokens.revoke(refreshToken);
      if (sessionId) {
        await db.sessions.invalidateSession(sessionId);
      }
    }

    return NextResponse.json(
      ResponseBuilder.success('LOGOUT_SUCCESS', { message: 'Logged out successfully' }),
      { headers: corsHeaders }
    );

  } catch (error: unknown) {
    console.error('Mobile logout error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode, headers: corsHeaders });
  }
}
