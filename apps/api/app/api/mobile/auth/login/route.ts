import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@rentalshop/utils';
import { buildSimpleCorsHeaders } from '@rentalshop/utils/server';
import { buildAuthLoginSuccessResponse } from '../../../../../lib/build-auth-login-response';
import { authenticatePasswordLogin } from '../../../../../lib/password-login';

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

const deviceSchema = z.object({ deviceId: z.string().max(255).optional() }).passthrough();

/**
 * @swagger
 * /api/mobile/auth/login:
 *   post:
 *     summary: Mobile user login
 *     description: Authenticate mobile user with email and password. Same checks and session as /api/auth/login (a newer login signs out older devices). Returns a 1-hour access token and a refresh token (30d, rotated) bound to the session.
 *     tags: [Mobile, Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: User's password
 *                 example: "password123"
 *               deviceId:
 *                 type: string
 *                 description: Mobile device identifier (used for refresh token binding)
 *                 example: "device-123456"
 *               pushToken:
 *                 type: string
 *                 description: Push notification token
 *                 example: "fcm-token-123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mobile login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     token:
 *                       type: string
 *                       description: Access token (expires in 7 days)
 *                     refreshToken:
 *                       type: string
 *                       description: Refresh token (expires in 30 days, use to get new access token)
 *                     expiresIn:
 *                       type: string
 *                       example: "7d"
 *                     refreshExpiresIn:
 *                       type: string
 *                       example: "30d"
 *                     deviceId:
 *                       type: string
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);

  try {
    const body = await request.json();

    const login = await authenticatePasswordLogin(request, body, corsHeaders);
    if ('response' in login) {
      return login.response;
    }

    const { deviceId } = deviceSchema.parse(body);

    // Same response as /api/auth/login plus refreshToken, expiresIn, refreshExpiresIn (#344)
    return await buildAuthLoginSuccessResponse(request, login.user, corsHeaders, {
      issueRefreshToken: { deviceId },
    });
  } catch (error: unknown) {
    console.error('Mobile login error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode, headers: corsHeaders });
  }
}
