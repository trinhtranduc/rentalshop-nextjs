import { prisma } from './client';

export type DevicePlatform = 'ios' | 'android';

export interface UpsertDeviceTokenInput {
  userId: number;
  deviceId: string;
  pushToken: string;
  platform: DevicePlatform;
}

/**
 * Upsert FCM/APNs device token for a user+device pair.
 * Re-activates token if previously deactivated.
 */
export async function upsertDeviceToken(input: UpsertDeviceTokenInput) {
  const { userId, deviceId, pushToken, platform } = input;
  const now = new Date();

  return prisma.deviceToken.upsert({
    where: {
      userId_deviceId: { userId, deviceId },
    },
    create: {
      userId,
      deviceId,
      pushToken,
      platform,
      isActive: true,
      lastSeenAt: now,
    },
    update: {
      pushToken,
      platform,
      isActive: true,
      lastSeenAt: now,
    },
  });
}

/**
 * Deactivate a single device registration (logout / uninstall).
 */
export async function deactivateDeviceToken(userId: number, deviceId: string) {
  return prisma.deviceToken.updateMany({
    where: { userId, deviceId },
    data: { isActive: false },
  });
}

/**
 * Mark tokens inactive when FCM reports them invalid/unregistered.
 */
export async function deactivateTokensByPushToken(pushTokens: string[]) {
  if (pushTokens.length === 0) return { count: 0 };
  return prisma.deviceToken.updateMany({
    where: { pushToken: { in: pushTokens } },
    data: { isActive: false },
  });
}

/**
 * Active push tokens for all active users assigned to an outlet.
 * Includes OUTLET_ADMIN and OUTLET_STAFF (any role with that outletId).
 */
export async function findActivePushTokensForOutlet(outletId: number): Promise<
  Array<{ id: number; userId: number; pushToken: string; platform: string; deviceId: string }>
> {
  return prisma.deviceToken.findMany({
    where: {
      isActive: true,
      user: {
        outletId,
        isActive: true,
        deletedAt: null,
      },
    },
    select: {
      id: true,
      userId: true,
      pushToken: true,
      platform: true,
      deviceId: true,
    },
  });
}

export const deviceTokens = {
  upsert: upsertDeviceToken,
  deactivate: deactivateDeviceToken,
  deactivateByPushToken: deactivateTokensByPushToken,
  findActiveForOutlet: findActivePushTokensForOutlet,
};
