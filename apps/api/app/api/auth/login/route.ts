import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@rentalshop/utils';
import { buildSimpleCorsHeaders } from '@rentalshop/utils/server';
import { buildAuthLoginSuccessResponse } from '../../../../lib/build-auth-login-response';
import { authenticatePasswordLogin } from '../../../../lib/password-login';

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);
  
  try {
    const body = await request.json();

    const login = await authenticatePasswordLogin(request, body, corsHeaders);
    if ('response' in login) {
      return login.response;
    }

    return await buildAuthLoginSuccessResponse(request, login.user, corsHeaders);
    
  } catch (error: any) {
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { 
      status: statusCode,
      headers: corsHeaders
    });
  }
} 
