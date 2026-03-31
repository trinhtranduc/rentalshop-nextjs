import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { loginGoogleSchema, ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { buildSimpleCorsHeaders } from '@rentalshop/utils/server';
import { verifyGoogleIdToken } from '../../../../../lib/verify-google-id-token';
import { buildAuthLoginSuccessResponse } from '../../../../../lib/build-auth-login-response';

export async function POST(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);

  try {
    if (!process.env.GOOGLE_CLIENT_ID?.trim()) {
      return NextResponse.json(ResponseBuilder.error('GOOGLE_AUTH_NOT_CONFIGURED'), {
        status: 503,
        headers: corsHeaders,
      });
    }

    const body = await request.json();
    const { idToken } = loginGoogleSchema.parse(body);

    let google;
    try {
      google = await verifyGoogleIdToken(idToken);
    } catch (e: any) {
      console.error('Google token verify failed:', e?.message);
      return NextResponse.json(ResponseBuilder.error('GOOGLE_TOKEN_INVALID'), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const user = await db.users.findByEmail(google.email);
    if (!user) {
      return NextResponse.json(ResponseBuilder.error('INVALID_CREDENTIALS'), {
        status: 401,
        headers: corsHeaders,
      });
    }

    if (!user.isActive) {
      return NextResponse.json(ResponseBuilder.error('ACCOUNT_DEACTIVATED'), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const googleSub = (user as any).googleSub as string | null | undefined;
    if (!googleSub) {
      return NextResponse.json(ResponseBuilder.error('GOOGLE_ACCOUNT_NOT_LINKED'), {
        status: 403,
        headers: corsHeaders,
      });
    }

    if (googleSub !== google.sub) {
      return NextResponse.json(ResponseBuilder.error('GOOGLE_TOKEN_INVALID'), {
        status: 401,
        headers: corsHeaders,
      });
    }

    return await buildAuthLoginSuccessResponse(request, user, corsHeaders);
  } catch (error: any) {
    console.error('login/google error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode, headers: corsHeaders });
  }
}
