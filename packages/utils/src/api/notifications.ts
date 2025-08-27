import { authenticatedFetch, parseApiResponse } from '../common';
import type { ApiResponse } from "../common";

/**
 * Notifications API Client - Notification Management Operations
 * 
 * This file handles all notification operations:
 * - Fetching notifications
 * - Marking notifications as read/unread
 * - Notification preferences
 * - Push notification management
 */

export interface NotificationsResponse {
  notifications: any[];
  total: number;
  unreadCount: number;
  page?: number;
  totalPages?: number;
  limit?: number;
}

export interface NotificationFilters {
  isRead?: boolean;
  type?: string;
  priority?: 'low' | 'medium' | 'high';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  orderUpdates: boolean;
  systemUpdates: boolean;
  marketing: boolean;
}

/**
 * Notifications API client for authenticated notification operations
 */
export const notificationsApi = {
  /**
   * Get all notifications with optional filters and pagination
   */
  async getNotifications(filters?: NotificationFilters): Promise<ApiResponse<NotificationsResponse>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    console.log('🔔 getNotifications called with filters:', filters);
    console.log('📡 API endpoint:', `/api/notifications?${params.toString()}`);
    
    const response = await authenticatedFetch(`/api/notifications?${params.toString()}`);
    console.log('📡 Raw API response:', response);
    
    const result = await parseApiResponse<NotificationsResponse>(response);
    console.log('✅ Processed API response:', result);
    
    return result;
  },

  /**
   * Get unread notifications count
   */
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    const response = await authenticatedFetch('/api/notifications/unread-count');
    return await parseApiResponse<{ count: number }>(response);
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Mark notification as unread
   */
  async markAsUnread(notificationId: number): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`/api/notifications/${notificationId}/unread`, {
      method: 'PUT',
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch('/api/notifications/mark-all-read', {
      method: 'PUT',
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: number): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Delete all read notifications
   */
  async deleteAllRead(): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch('/api/notifications/delete-all-read', {
      method: 'DELETE',
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<ApiResponse<NotificationPreferences>> {
    const response = await authenticatedFetch('/api/notifications/preferences');
    return await parseApiResponse<NotificationPreferences>(response);
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<ApiResponse<NotificationPreferences>> {
    const response = await authenticatedFetch('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
    return await parseApiResponse<NotificationPreferences>(response);
  },

  /**
   * Register device for push notifications
   */
  async registerDevice(deviceData: {
    token: string;
    platform: 'web' | 'ios' | 'android';
    deviceId?: number;
  }): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch('/api/notifications/register-device', {
      method: 'POST',
      body: JSON.stringify(deviceData),
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Unregister device for push notifications
   */
  async unregisterDevice(deviceId: number): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`/api/notifications/unregister-device/${deviceId}`, {
      method: 'DELETE',
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Test push notification
   */
  async testPushNotification(message: string): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch('/api/notifications/test', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    return await parseApiResponse<{ message: string }>(response);
  }
};
