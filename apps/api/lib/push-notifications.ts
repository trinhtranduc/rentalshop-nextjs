import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type MulticastMessage } from 'firebase-admin/messaging';
import { deactivateTokensByPushToken, findActivePushTokensForOutlet } from '@rentalshop/database';

export type OrderPushEventType = 'ORDER_CREATED' | 'ORDER_STATUS_CHANGED';

export interface OrderPushPayload {
  type: OrderPushEventType;
  orderId: string;
  orderNumber: string;
  status: string;
  outletId: string;
  orderType?: string;
  previousStatus?: string;
}

function getFirebaseApp(): App | null {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      '⚠️ FCM skipped: missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY'
    );
    return null;
  }

  // Vercel/env often stores newlines as \n
  privateKey = privateKey.replace(/\\n/g, '\n');

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

function buildNotificationCopy(payload: OrderPushPayload): { title: string; body: string } {
  if (payload.type === 'ORDER_CREATED') {
    return {
      title: 'Đơn hàng mới',
      body: `Đơn ${payload.orderNumber} vừa được tạo`,
    };
  }

  return {
    title: 'Cập nhật đơn hàng',
    body: `Đơn ${payload.orderNumber}: ${payload.previousStatus ?? '?'} → ${payload.status}`,
  };
}

/**
 * Send FCM multicast to all active devices of users assigned to the outlet.
 * Fail-open: never throws to callers (log + deactivate bad tokens).
 */
export async function sendOrderPushToOutlet(
  outletId: number,
  payload: OrderPushPayload
): Promise<{ sent: number; failed: number }> {
  const app = getFirebaseApp();
  if (!app) {
    return { sent: 0, failed: 0 };
  }

  const devices = await findActivePushTokensForOutlet(outletId);
  const tokens = [...new Set(devices.map((d) => d.pushToken).filter(Boolean))];

  if (tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const { title, body } = buildNotificationCopy(payload);
  const data: Record<string, string> = {
    type: payload.type,
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    status: payload.status,
    outletId: payload.outletId,
  };
  if (payload.orderType) data.orderType = payload.orderType;
  if (payload.previousStatus) data.previousStatus = payload.previousStatus;

  const message: MulticastMessage = {
    tokens,
    notification: { title, body },
    data,
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await getMessaging(app).sendEachForMulticast(message);
    const invalidTokens: string[] = [];

    response.responses.forEach((res, index) => {
      if (res.success) return;
      const code = res.error?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        invalidTokens.push(tokens[index]!);
      }
    });

    if (invalidTokens.length > 0) {
      await deactivateTokensByPushToken(invalidTokens).catch((err) =>
        console.error('Failed to deactivate invalid FCM tokens:', err)
      );
    }

    return {
      sent: response.successCount,
      failed: response.failureCount,
    };
  } catch (error) {
    console.error('❌ FCM sendEachForMulticast failed:', error);
    return { sent: 0, failed: tokens.length };
  }
}

/**
 * Fire-and-forget outlet order push. Does not block the HTTP response.
 */
export function notifyOutletOrderEvent(
  outletId: number,
  payload: OrderPushPayload
): void {
  void sendOrderPushToOutlet(outletId, payload)
    .then((result) => {
      if (result.sent > 0 || result.failed > 0) {
        console.log('📲 Order push result:', {
          outletId,
          type: payload.type,
          orderNumber: payload.orderNumber,
          ...result,
        });
      }
    })
    .catch((error) => {
      console.error('❌ notifyOutletOrderEvent failed:', error);
    });
}
