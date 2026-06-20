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
 * Revoke refresh token on logout.
 * This ensures the refresh token cannot be used after user logs out.
 * 
 * Request body:
 * {
 *   "refreshToken": "abc123..."  // Required - the refresh token to revoke
 * }
 */
export async function POST(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (refreshToken) {
      await db.refreshTokens.revoke(refreshToken);
    }

    // Also invalidate session if user has an active one
    const userId = request.headers.get('x-user-id');
    if (userId) {
      const userIdNum = parseInt(userId, 10);
      if (!isNaN(userIdNum)) {
        await db.sessions.invalidateAllUserSessions(userIdNum);
      }
    }

    return NextResponse.json(
      ResponseBuilder.success('LOGOUT_SUCCESS', { message: 'Logged out successfully' }),
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Mobile logout error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode, headers: corsHeaders });
  }
}
