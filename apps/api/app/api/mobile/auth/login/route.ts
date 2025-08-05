import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@rentalshop/auth';
import { loginSchema } from '@rentalshop/utils';
import { config } from '@rentalshop/utils';

/**
 * @swagger
 * /api/mobile/auth/login:
 *   post:
 *     summary: Mobile user login
 *     description: Authenticate mobile user with email and password
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
 *               - deviceId
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
 *                 description: Mobile device identifier
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
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                         role:
 *                           type: string
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
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
    
    // Login user
    const result = await loginUser({
      email: validatedData.email,
      password: validatedData.password,
    });
    
    // Mobile-specific response with refresh token and device info
    return NextResponse.json({
      success: true,
      message: 'Mobile login successful',
      data: {
        ...result,
        refreshToken: 'mobile-refresh-token-' + Date.now(), // Generate refresh token
        deviceId: body.deviceId || 'unknown-device',
        pushToken: body.pushToken || null
      }
    });
    
  } catch (error: any) {
    console.error('Mobile login error:', error);
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      }, { status: 400 });
    }
    
    // Handle auth errors
    if (error.message === 'Invalid credentials') {
      return NextResponse.json({
        success: false,
        message: 'Invalid email or password'
      }, { status: 401 });
    }
    
    // Generic error
    return NextResponse.json({
      success: false,
      message: 'Mobile login failed',
      error: config.logging.level === 'debug' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
} 