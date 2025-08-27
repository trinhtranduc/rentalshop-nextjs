import { authenticatedFetch, parseApiResponse } from '../common';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../common';

export interface Notification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  isRead: boolean;
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
  unreadCount: number;
}

/**
 * Notifications API client for notification management
 */
export const notificationsApi = {
  /**
   * Get all notifications
   */
  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/notifications`);
    const result = await parseApiResponse<Notification[]>(response);
    return result;
  },

  /**
   * Get notifications with pagination
   */
  async getNotificationsPaginated(page: number = 1, limit: number = 50): Promise<ApiResponse<NotificationsResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await authenticatedFetch(`${apiUrls.base}/api/notifications?${params.toString()}`);
    return await parseApiResponse<NotificationsResponse>(response);
  },

  /**
   * Search notifications with filters
   */
  async searchNotifications(filters: NotificationFilters): Promise<ApiResponse<Notification[]>> {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.isRead !== undefined) params.append('isRead', filters.isRead.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    
    const response = await authenticatedFetch(`${apiUrls.base}/api/notifications?${params.toString()}`);
    return await parseApiResponse<Notification[]>(response);
  },

  /**
   * Get notification by ID
   */
  async getNotification(notificationId: number): Promise<ApiResponse<Notification>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/notifications/${notificationId}`);
    return await parseApiResponse<Notification>(response);
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Mark notification as unread
   */
  async markAsUnread(notificationId: number): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/notifications/${notificationId}/unread`, {
      method: 'PATCH',
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/notifications/mark-all-read`, {
      method: 'PATCH',
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: number): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/notifications/${notificationId}`, {
      method: 'DELETE',
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Delete all read notifications
   */
  async deleteAllRead(): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/notifications/delete-read`, {
      method: 'DELETE',
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/notifications/unread-count`);
    return await parseApiResponse<{ count: number }>(response);
  },

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/notifications/preferences`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: any): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/notifications/preferences`, {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Send test notification
   */
  async sendTestNotification(): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/notifications/test`, {
      method: 'POST',
    });
    return await parseApiResponse<{ message: string }>(response);
  }
};
