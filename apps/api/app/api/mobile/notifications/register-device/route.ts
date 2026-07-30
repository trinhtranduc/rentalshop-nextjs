import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';
import { z } from 'zod';

const MOBILE_ROLES = [
  USER_ROLE.ADMIN,
  USER_ROLE.MERCHANT,
  USER_ROLE.OUTLET_ADMIN,
  USER_ROLE.OUTLET_STAFF,
] as const;

const registerDeviceSchema = z.object({
  deviceId: z.string().min(1).max(255),
  pushToken: z.string().min(1).max(512),
  platform: z.enum(['ios', 'android']),
});

const unregisterDeviceSchema = z.object({
  deviceId: z.string().min(1).max(255),
});

/**
 * POST /api/mobile/notifications/register-device
 * Register / refresh FCM token for the authenticated user's device.
 */
export const POST = withAuthRoles([...MOBILE_ROLES])(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const parsed = registerDeviceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(ResponseBuilder.error('DEVICE_INFO_REQUIRED'), { status: 400 });
    }

    const { deviceId, pushToken, platform } = parsed.data;

    const device = await db.deviceTokens.upsert({
      userId: user.id,
      deviceId,
      pushToken,
      platform,
    });

    return NextResponse.json(
      ResponseBuilder.success('DEVICE_REGISTERED_SUCCESS', {
        deviceId: device.deviceId,
        platform: device.platform,
        registeredAt: device.updatedAt.toISOString(),
        userId: device.userId,
      })
    );
  } catch (error) {
    console.error('Device registration error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * DELETE /api/mobile/notifications/register-device
 * Deactivate FCM token for this device (call on logout).
 * Body: { deviceId }
 */
export const DELETE = withAuthRoles([...MOBILE_ROLES], {
  requireActiveSubscription: false,
})(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = unregisterDeviceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(ResponseBuilder.error('DEVICE_INFO_REQUIRED'), { status: 400 });
    }

    await db.deviceTokens.deactivate(user.id, parsed.data.deviceId);

    return NextResponse.json(
      ResponseBuilder.success('DEVICE_UNREGISTERED_SUCCESS', {
        deviceId: parsed.data.deviceId,
        userId: user.id,
      })
    );
  } catch (error) {
    console.error('Device unregister error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
