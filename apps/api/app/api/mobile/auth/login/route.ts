import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@rentalshop/auth/server';
import { loginSchema, handleApiError } from '@rentalshop/utils';
import { db } from '@rentalshop/database';
import { API } from '@rentalshop/constants';

/**
 * @swagger
 * /api/mobile/auth/login:
 *   post:
 *     summary: Mobile user login
 *     description: Authenticate mobile user with email and password. Returns access token (7d) and refresh token (30d).
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
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);
    
    // Login user (validates credentials, checks subscription, generates access token)
    const result = await loginUser({
      email: validatedData.email,
      password: validatedData.password,
    });
    
    // Generate a proper refresh token (stored in DB, hashed)
    const deviceId = body.deviceId || null;
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    const refreshToken = await db.refreshTokens.create(result.user.id, {
      deviceId,
      userAgent,
      ipAddress,
    });
    
    return NextResponse.json({
      success: true,
      code: 'MOBILE_LOGIN_SUCCESS',
      message: 'Mobile login successful',
      data: {
        ...result,
        refreshToken,
        expiresIn: '7d',
        refreshExpiresIn: '30d',
        deviceId: deviceId || 'unknown-device',
        pushToken: body.pushToken || null,
      },
    });
    
  } catch (error: any) {
    console.error('Mobile login error:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
