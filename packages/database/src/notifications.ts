import { prisma } from './client';

export interface CreateNotificationInput {
  userId: number;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
}

export interface NotificationListFilters {
  userId: number;
  isRead?: boolean;
  type?: string;
  page?: number;
  limit?: number;
}

/**
 * Active users assigned to an outlet (inbox recipients — with or without a device).
 */
export async function findActiveUserIdsForOutlet(outletId: number): Promise<number[]> {
  const users = await prisma.user.findMany({
    where: {
      outletId,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/**
 * Create one inbox row per user (same title/body/data).
 */
export async function createNotificationsForUsers(
  userIds: number[],
  input: Omit<CreateNotificationInput, 'userId'>
): Promise<number> {
  const uniqueIds = [...new Set(userIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (uniqueIds.length === 0) return 0;

  const result = await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      ...(input.data != null ? { data: input.data as object } : {}),
    })),
  });

  return result.count;
}

export async function listNotificationsForUser(filters: NotificationListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: {
    userId: number;
    type?: string;
    readAt?: null | { not: null };
  } = { userId: filters.userId };

  if (filters.type) where.type = filters.type;
  if (filters.isRead === true) where.readAt = { not: null };
  if (filters.isRead === false) where.readAt = null;

  const [rows, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        data: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId: filters.userId, readAt: null },
    }),
  ]);

  return {
    notifications: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.body,
      body: row.body,
      isRead: row.readAt != null,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      data: row.data,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    unreadCount,
  };
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
  return result.count > 0;
}

export async function markNotificationUnread(userId: number, notificationId: number) {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: null },
  });
  return result.count > 0;
}

export async function markAllNotificationsRead(userId: number): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

export async function deleteNotification(userId: number, notificationId: number) {
  const result = await prisma.notification.deleteMany({
    where: { id: notificationId, userId },
  });
  return result.count > 0;
}

export async function deleteAllReadNotifications(userId: number): Promise<number> {
  const result = await prisma.notification.deleteMany({
    where: { userId, readAt: { not: null } },
  });
  return result.count;
}

export const notifications = {
  findActiveUserIdsForOutlet,
  createForUsers: createNotificationsForUsers,
  listForUser: listNotificationsForUser,
  unreadCount: getUnreadNotificationCount,
  markRead: markNotificationRead,
  markUnread: markNotificationUnread,
  markAllRead: markAllNotificationsRead,
  delete: deleteNotification,
  deleteAllRead: deleteAllReadNotifications,
};
