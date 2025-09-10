import { authenticatedFetch, parseApiResponse } from '../common';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../common';
import type { User, ProfileUpdateInput } from '@rentalshop/types';

/**
 * Profile API client for user profile management
 */
export const profileApi = {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<User>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/users/profile`);
    return await parseApiResponse<User>(response);
  },

  /**
   * Update current user profile
   */
  async updateProfile(profileData: ProfileUpdateInput): Promise<ApiResponse<User>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/users/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    return await parseApiResponse<User>(response);
  },

  /**
   * Change current user password
   */
  async changePassword(passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/profile/change-password`, {
      method: 'PATCH',
      body: JSON.stringify(passwordData),
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(file: File): Promise<ApiResponse<{ imageUrl: string }>> {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const response = await authenticatedFetch(`${apiUrls.base}/api/profile/upload-picture`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header for FormData
    });
    return await parseApiResponse<{ imageUrl: string }>(response);
  },

  /**
   * Delete profile picture
   */
  async deleteProfilePicture(): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/profile/delete-picture`, {
      method: 'DELETE',
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/profile/preferences`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: any): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/profile/preferences`, {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Get user activity log
   */
  async getActivityLog(page: number = 1, limit: number = 20): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await authenticatedFetch(`${apiUrls.base}/api/profile/activity-log?${params.toString()}`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get user notifications
   */
  async getNotifications(page: number = 1, limit: number = 20): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await authenticatedFetch(`${apiUrls.base}/api/profile/notifications?${params.toString()}`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: number): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/profile/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/profile/notifications/mark-all-read`, {
      method: 'PATCH',
    });
    return await parseApiResponse<{ message: string }>(response);
  }
};
