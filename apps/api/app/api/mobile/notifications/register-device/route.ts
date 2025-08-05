import { NextRequest, NextResponse } from 'next/server';
import { config } from '@rentalshop/utils';

/**
 * @swagger
 * /api/mobile/notifications/register-device:
 *   post:
 *     summary: Register mobile device for push notifications
 *     description: Register a mobile device to receive push notifications
 *     tags: [Mobile, Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - pushToken
 *               - platform
 *             properties:
 *               deviceId:
 *                 type: string
 *                 description: Mobile device identifier
 *                 example: "device-123456"
 *               pushToken:
 *                 type: string
 *                 description: Push notification token
 *                 example: "fcm-token-123"
 *               platform:
 *                 type: string
 *                 enum: [ios, android]
 *                 description: Mobile platform
 *                 example: "ios"
 *               userId:
 *                 type: string
 *                 description: User ID (optional)
 *                 example: "user-123"
 *     responses:
 *       200:
 *         description: Device registered successfully
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
 *                   example: "Device registered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     deviceId:
 *                       type: string
 *                     registeredAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.deviceId || !body.pushToken || !body.platform) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: deviceId, pushToken, platform'
      }, { status: 400 });
    }
    
    // Validate platform
    if (!['ios', 'android'].includes(body.platform)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid platform. Must be "ios" or "android"'
      }, { status: 400 });
    }
    
    // TODO: Store device registration in database
    // This would typically involve:
    // 1. Storing device info in a devices table
    // 2. Linking device to user if userId is provided
    // 3. Storing push token securely
    
    return NextResponse.json({
      success: true,
      message: 'Device registered successfully',
      data: {
        deviceId: body.deviceId,
        platform: body.platform,
        registeredAt: new Date().toISOString(),
        userId: body.userId || null
      }
    });
    
  } catch (error: any) {
    console.error('Device registration error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Device registration failed',
      error: config.logging.level === 'debug' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
} 