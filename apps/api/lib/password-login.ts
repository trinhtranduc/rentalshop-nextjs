import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { comparePassword } from '@rentalshop/auth/server';
import { loginSchema, ResponseBuilder } from '@rentalshop/utils';
import { authRateLimiter } from '@rentalshop/middleware';

type LoginUserRow = NonNullable<Awaited<ReturnType<typeof db.users.findByEmail>>>;

/**
 * Credential checks shared by /api/auth/login and /api/mobile/auth/login:
 * rate limit, input validation, user lookup, active account, password.
 * Returns the user, or the error response to send.
 */
export async function authenticatePasswordLogin(
  request: NextRequest,
  body: unknown,
  corsHeaders: Record<string, string>
): Promise<{ user: LoginUserRow } | { response: NextResponse }> {
  // Rate limiting - prevent brute force attacks
  const rateLimitResponse = authRateLimiter(request);
  if (rateLimitResponse) {
    return { response: rateLimitResponse };
  }

  // Validate input
  const validatedData = loginSchema.parse(body);

  // Find user in database by email
  const user = await db.users.findByEmail(validatedData.email);

  if (!user) {
    return {
      response: NextResponse.json(ResponseBuilder.error('INVALID_CREDENTIALS'), { status: 401, headers: corsHeaders }),
    };
  }

  // Check if user is active
  if (!user.isActive) {
    return {
      response: NextResponse.json(ResponseBuilder.error('ACCOUNT_DEACTIVATED'), { status: 403, headers: corsHeaders }),
    };
  }

  // Verify password FIRST - only check email verification AFTER password is correct
  const isPasswordValid = await comparePassword(validatedData.password, user.password);
  if (!isPasswordValid) {
    return {
      response: NextResponse.json(ResponseBuilder.error('INVALID_CREDENTIALS'), { status: 401, headers: corsHeaders }),
    };
  }

  return { user };
}
