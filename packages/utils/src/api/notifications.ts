import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../core';

export interface Notification {
  id: number;
  type: string;
  title: string;
  /** Alias of body for older clients */
  message: string;
  body: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  data?: any;
}

export interface NotificationFilters {
  type?: string;
  isRead?: boolean;
  page?: number;
  limit?: number;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  unreadCount: number;
}

/**
 * Notifications API client for in-app inbox (read / unread)
 */
export const notificationsApi = {
  /**
   * Get notifications with pagination + filters
   */
  async getNotificationsPaginated(
    page: number = 1,
    limit: number = 20,
    filters: Omit<NotificationFilters, 'page' | 'limit'> = {}
  ): Promise<ApiResponse<NotificationsResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (filters.type) params.append('type', filters.type);
    if (filters.isRead !== undefined) params.append('isRead', String(filters.isRead));

    const response = await authenticatedFetch(`${apiUrls.notifications.list}?${params.toString()}`);
    return await parseApiResponse<NotificationsResponse>(response);
  },

  /**
   * Search / list notifications (paginated envelope in data)
   */
  async searchNotifications(
    filters: NotificationFilters = {}
  ): Promise<ApiResponse<NotificationsResponse>> {
    return this.getNotificationsPaginated(filters.page ?? 1, filters.limit ?? 20, {
      type: filters.type,
      isRead: filters.isRead,
    });
  },

  /**
   * Get all notifications (first page convenience)
   */
  async getNotifications(): Promise<ApiResponse<NotificationsResponse>> {
    return this.getNotificationsPaginated(1, 50);
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<ApiResponse<{ id: number }>> {
    const response = await authenticatedFetch(apiUrls.notifications.markRead(notificationId), {
      method: 'PATCH',
    });
    return await parseApiResponse<{ id: number }>(response);
  },

  /**
   * Mark notification as unread
   */
  async markAsUnread(notificationId: number): Promise<ApiResponse<{ id: number }>> {
    const response = await authenticatedFetch(apiUrls.notifications.markUnread(notificationId), {
      method: 'PATCH',
    });
    return await parseApiResponse<{ id: number }>(response);
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<ApiResponse<{ count: number }>> {
    const response = await authenticatedFetch(apiUrls.notifications.markAllRead, {
      method: 'PATCH',
    });
    return await parseApiResponse<{ count: number }>(response);
  },

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: number): Promise<ApiResponse<{ id: number }>> {
    const response = await authenticatedFetch(apiUrls.notifications.delete(notificationId), {
      method: 'DELETE',
    });
    return await parseApiResponse<{ id: number }>(response);
  },

  /**
   * Delete all read notifications
   */
  async deleteAllRead(): Promise<ApiResponse<{ count: number }>> {
    const response = await authenticatedFetch(apiUrls.notifications.deleteAllRead, {
      method: 'DELETE',
    });
    return await parseApiResponse<{ count: number }>(response);
  },

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    const response = await authenticatedFetch(apiUrls.notifications.unreadCount);
    return await parseApiResponse<{ count: number }>(response);
  },
};
