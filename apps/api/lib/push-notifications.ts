import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type MulticastMessage } from 'firebase-admin/messaging';
import { ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from '@rentalshop/constants';
import {
  createNotificationsForUsers,
  db,
  deactivateTokensByPushToken,
  findActivePushTokensForOutlet,
  findActiveUserIdsForOutlet,
} from '@rentalshop/database';
import { formatFullName } from '@rentalshop/utils';

export type OrderPushEventType = 'ORDER_CREATED' | 'ORDER_STATUS_CHANGED';

export interface OrderPushPayload {
  type: OrderPushEventType;
  orderId: string;
  orderNumber: string;
  status: string;
  outletId: string;
  orderType?: string;
  previousStatus?: string;
  /** Who created/updated the order — shown in every message as "A" */
  actorName?: string | null;
  /** @deprecated use actorName */
  createdByName?: string | null;
  customerName?: string | null;
  totalAmount?: number | null;
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

/** Compact amount for lock-screen (vi grouping, no currency symbol — shop currency varies). */
function formatPushAmount(amount?: number | null): string | null {
  if (amount == null || !Number.isFinite(Number(amount))) return null;
  const n = Number(amount);
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);
}

function nonEmpty(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isEmailLike(value: string, email?: string | null): boolean {
  if (email && value.trim().toLowerCase() === email.trim().toLowerCase()) return true;
  return value.includes('@');
}

/** Never use email (or email-like strings) as staff display name in push copy. */
function sanitizeActorName(
  value?: string | null,
  email?: string | null
): string | null {
  const name = nonEmpty(value);
  if (!name) return null;
  if (isEmailLike(name, email)) return null;
  return name;
}

/** Prefer actorName; fall back to legacy createdByName — both sanitized. */
function actorOf(payload: OrderPushPayload): string | null {
  return (
    sanitizeActorName(payload.actorName) ??
    sanitizeActorName(payload.createdByName)
  );
}

/**
 * Resolve staff display name for push copy.
 * JWT AuthUser often has empty first/last name and `name === email` — look up DB like order create does.
 * Never returns an email address.
 */
export async function resolveActorDisplayName(user: {
  id: number;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
}): Promise<string | null> {
  const fromAuth = sanitizeActorName(
    formatFullName(user.firstName, user.lastName),
    user.email
  );
  if (fromAuth) return fromAuth;

  const name = sanitizeActorName(user.name, user.email);
  if (name) return name;

  try {
    const dbUser = await db.users.findById(user.id);
    if (dbUser) {
      const fromDb = sanitizeActorName(
        formatFullName(dbUser.firstName, dbUser.lastName),
        dbUser.email ?? user.email
      );
      if (fromDb) return fromDb;
    }
  } catch (error) {
    console.error('❌ resolveActorDisplayName failed:', error);
  }

  return null;
}

/**
 * Banner + inbox copy — natural Vietnamese sentences with actor (A) on every event.
 */
function buildNotificationCopy(payload: OrderPushPayload): { title: string; body: string } {
  const ref = formatOrderRef(payload.orderNumber);
  const type = orderTypeLabel(payload.orderType);
  const status = orderStatusLabel(payload.status);
  const previous = orderStatusLabel(payload.previousStatus);
  const actor = actorOf(payload);

  if (payload.type === 'ORDER_CREATED') {
    const title =
      type === ORDER_TYPE_LABELS.SALE
        ? 'Đơn bán mới'
        : type === ORDER_TYPE_LABELS.RENT
          ? 'Đơn thuê mới'
          : 'Đơn hàng mới';

    // "{A} vừa tạo đơn {B} trị giá {C} cho {khách}"
    const customer = nonEmpty(payload.customerName);
    const amount = formatPushAmount(payload.totalAmount);

    let body: string;
    if (actor && amount && customer) {
      body = `${actor} vừa tạo đơn ${ref} trị giá ${amount} cho ${customer}`;
    } else if (actor && amount) {
      body = `${actor} vừa tạo đơn ${ref} trị giá ${amount}`;
    } else if (actor && customer) {
      body = `${actor} vừa tạo đơn ${ref} cho ${customer}`;
    } else if (amount && customer) {
      body = `Đơn ${ref} trị giá ${amount} cho ${customer}`;
    } else if (actor) {
      body = `${actor} vừa tạo đơn ${ref}`;
    } else if (amount) {
      body = `Đơn ${ref} trị giá ${amount}`;
    } else if (customer) {
      body = `Đơn ${ref} cho ${customer}`;
    } else {
      body = `Đơn ${ref} vừa được tạo`;
    }

    return { title, body };
  }

  // Status updates — always lead with who did it when known
  const withActor = (action: string, detail: string) =>
    actor ? `${actor} ${action} ${detail}` : `${action.charAt(0).toUpperCase()}${action.slice(1)} ${detail}`;

  switch (payload.status.toUpperCase()) {
    case 'PICKUPED':
      return {
        title: 'Đã giao hàng',
        body: withActor('đã giao đơn', `${ref} (${previous} → ${status})`),
      };
    case 'RETURNED':
      return {
        title: 'Đã trả hàng',
        body: withActor('đã nhận trả đơn', `${ref} (${previous} → ${status})`),
      };
    case 'COMPLETED':
      return {
        title: 'Đơn hoàn thành',
        body: withActor('đã hoàn thành đơn', ref),
      };
    case 'CANCELLED':
      return {
        title: 'Đơn đã hủy',
        body: withActor('đã hủy đơn', `${ref} (${previous} → ${status})`),
      };
    default:
      return {
        title: type ? `Cập nhật đơn ${type.toLowerCase()}` : 'Cập nhật đơn hàng',
        body: withActor('đã cập nhật đơn', `${ref}: ${previous} → ${status}`),
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
  const actor = actorOf(payload);
  if (actor) data.actorName = actor;
  if (nonEmpty(payload.customerName)) data.customerName = nonEmpty(payload.customerName)!;
  if (payload.totalAmount != null && Number.isFinite(Number(payload.totalAmount))) {
    data.totalAmount = String(payload.totalAmount);
  }
  return data;
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
    // iOS (APNs via FCM)
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
    // Android — high priority so order alerts wake doze; channel matches POS app
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'order_updates',
        defaultSound: true,
        defaultVibrateTimings: true,
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
 * Pass `actorUser` to resolve employee display name from DB (JWT often only has email).
 */
export function notifyOutletOrderEvent(
  outletId: number,
  payload: OrderPushPayload,
  actorUser?: {
    id: number;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
  }
): void {
  void (async () => {
    // JWT often sets name/actor to email — always resolve from DB when actorUser is provided,
    // and strip any email-like leftover so banners never show addresses.
    let actorName =
      sanitizeActorName(payload.actorName, actorUser?.email) ??
      sanitizeActorName(payload.createdByName, actorUser?.email);

    if (actorUser) {
      const resolved = await resolveActorDisplayName(actorUser);
      if (resolved) {
        actorName = resolved;
      } else if (actorName && isEmailLike(actorName, actorUser.email)) {
        actorName = null;
      }
    }

    actorName = sanitizeActorName(actorName, actorUser?.email);

    return sendOrderPushToOutlet(outletId, {
      ...payload,
      actorName,
    });
  })()
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
