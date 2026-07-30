import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type MulticastMessage } from 'firebase-admin/messaging';
import { ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from '@rentalshop/constants';
import {
  createNotificationsForUsers,
  deactivateTokensByPushToken,
  findActivePushTokensForOutlet,
  findActiveUserIdsForOutlet,
} from '@rentalshop/database';

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

function formatOrderRef(orderNumber: string): string {
  const trimmed = orderNumber.trim();
  if (!trimmed) return '—';
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

function orderStatusLabel(status?: string): string {
  if (!status) return '—';
  const key = status.toUpperCase() as keyof typeof ORDER_STATUS_LABELS;
  return ORDER_STATUS_LABELS[key] ?? status;
}

function orderTypeLabel(orderType?: string): string | null {
  if (!orderType) return null;
  const key = orderType.toUpperCase() as keyof typeof ORDER_TYPE_LABELS;
  return ORDER_TYPE_LABELS[key] ?? null;
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

/**
 * Banner + inbox copy — Vietnamese labels aligned with ORDER_STATUS_LABELS / ORDER_TYPE_LABELS.
 * Keep title short (lock-screen friendly); put order # + status detail in body.
 */
function buildNotificationCopy(payload: OrderPushPayload): { title: string; body: string } {
  const ref = formatOrderRef(payload.orderNumber);
  const type = orderTypeLabel(payload.orderType);
  const status = orderStatusLabel(payload.status);
  const previous = orderStatusLabel(payload.previousStatus);

  if (payload.type === 'ORDER_CREATED') {
    const title =
      type === ORDER_TYPE_LABELS.SALE
        ? 'Đơn bán mới'
        : type === ORDER_TYPE_LABELS.RENT
          ? 'Đơn thuê mới'
          : 'Đơn hàng mới';
    return {
      title,
      body: `${ref} · ${status}`,
    };
  }

  // Status-specific titles so staff can act without opening the app
  switch (payload.status.toUpperCase()) {
    case 'PICKUPED':
      return {
        title: 'Đã giao hàng',
        body: `${ref} · ${previous} → ${status}`,
      };
    case 'RETURNED':
      return {
        title: 'Đã trả hàng',
        body: `${ref} · ${previous} → ${status}`,
      };
    case 'COMPLETED':
      return {
        title: 'Đơn hoàn thành',
        body: `${ref} · ${status}`,
      };
    case 'CANCELLED':
      return {
        title: 'Đơn đã hủy',
        body: `${ref} · ${previous} → ${status}`,
      };
    default:
      return {
        title: type ? `Cập nhật đơn ${type.toLowerCase()}` : 'Cập nhật đơn hàng',
        body: `${ref} · ${previous} → ${status}`,
      };
  }
}

function buildNotificationData(payload: OrderPushPayload): Record<string, string> {
  const data: Record<string, string> = {
    type: payload.type,
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    status: payload.status,
    outletId: payload.outletId,
  };
  if (payload.orderType) data.orderType = payload.orderType;
  if (payload.previousStatus) data.previousStatus = payload.previousStatus;
  return data;
}

/**
 * Persist inbox rows for all active outlet users, then send FCM to devices.
 * Fail-open: never throws to callers.
 */
export async function sendOrderPushToOutlet(
  outletId: number,
  payload: OrderPushPayload
): Promise<{ sent: number; failed: number; inbox: number }> {
  const { title, body } = buildNotificationCopy(payload);
  const data = buildNotificationData(payload);

  // 1) Always try to save inbox (even if FCM is not configured / no tokens)
  let inbox = 0;
  try {
    const userIds = await findActiveUserIdsForOutlet(outletId);
    inbox = await createNotificationsForUsers(userIds, {
      type: payload.type,
      title,
      body,
      data,
    });
  } catch (error) {
    console.error('❌ Failed to persist order notifications:', error);
  }

  // 2) FCM push (optional)
  const app = getFirebaseApp();
  if (!app) {
    return { sent: 0, failed: 0, inbox };
  }

  const devices = await findActivePushTokensForOutlet(outletId);
  const tokens = [...new Set(devices.map((d) => d.pushToken).filter(Boolean))];

  if (tokens.length === 0) {
    return { sent: 0, failed: 0, inbox };
  }

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
      const messageText = res.error?.message;
      // Surface why APNs/FCM rejected — e.g. missing APNs key, bad token, wrong bundle
      console.error('❌ FCM send failed for token:', {
        index,
        code,
        message: messageText,
        tokenSuffix: tokens[index]?.slice(-8),
      });
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
      inbox,
    };
  } catch (error) {
    console.error('❌ FCM sendEachForMulticast failed:', error);
    return { sent: 0, failed: tokens.length, inbox };
  }
}

/**
 * Fire-and-forget outlet order push + inbox. Does not block the HTTP response.
 */
export function notifyOutletOrderEvent(
  outletId: number,
  payload: OrderPushPayload
): void {
  void sendOrderPushToOutlet(outletId, payload)
    .then((result) => {
      if (result.sent > 0 || result.failed > 0 || result.inbox > 0) {
        console.log('📲 Order notification result:', {
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
