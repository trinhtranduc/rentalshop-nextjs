import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { comparePassword } from '@rentalshop/auth/server';
import { loginSchema, ResponseBuilder } from '@rentalshop/utils';
import { handleApiError } from '@rentalshop/utils';
import { buildSimpleCorsHeaders } from '@rentalshop/utils/server';
import { authRateLimiter } from '@rentalshop/middleware';
import { buildAuthLoginSuccessResponse } from '../../../../lib/build-auth-login-response';

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
    // Rate limiting - prevent brute force attacks
    const rateLimitResponse = authRateLimiter(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);
    
    // Find user in database by email
    const user = await db.users.findByEmail(validatedData.email);

    if (!user) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_CREDENTIALS'),
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        ResponseBuilder.error('ACCOUNT_DEACTIVATED'),
        { 
          status: 403,
          headers: corsHeaders
        }
      );
    }

    // Verify password FIRST - only check email verification AFTER password is correct
    const isPasswordValid = await comparePassword(validatedData.password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_CREDENTIALS'),
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    return await buildAuthLoginSuccessResponse(request, user, corsHeaders);
    
  } catch (error: any) {
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { 
      status: statusCode,
      headers: corsHeaders
    });
  }
} 
