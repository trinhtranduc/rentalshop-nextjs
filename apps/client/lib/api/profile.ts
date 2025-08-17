import { authenticatedFetch, handleApiResponse } from '../auth/auth';
import type { ApiResponse } from './client';

/**
 * Profile API Client - User Profile Management Operations
 * 
 * This file handles all profile operations:
 * - Get current user profile
 * - Update profile information
 * - Change password
 * - Profile preferences
 * - User settings
 */

export interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Profile API client for authenticated profile operations
 */
export const profileApi = {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<ProfileData>> {
    console.log('👤 getProfile called');
    
    const response = await authenticatedFetch('/api/users/profile');
    console.log('📡 Raw profile API response:', response);
    
    const result = handleApiResponse(response);
    console.log('✅ Processed profile API response:', result);
    
    return result;
  },

  /**
   * Update current user profile
   */
  async updateProfile(profileData: ProfileUpdateInput): Promise<ApiResponse<ProfileData>> {
    console.log('✏️ updateProfile called with:', profileData);
    
    const response = await authenticatedFetch('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    
    console.log('📡 Raw update profile API response:', response);
    const result = handleApiResponse(response);
    console.log('✅ Processed update profile API response:', result);
    
    return result;
  },

  /**
   * Change current user password
   */
  async changePassword(passwordData: PasswordChangeInput): Promise<ApiResponse<{ message: string }>> {
    console.log('🔐 changePassword called');
    
    const response = await authenticatedFetch('/api/users/profile/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
    
    console.log('📡 Raw change password API response:', response);
    const result = handleApiResponse(response);
    console.log('✅ Processed change password API response:', result);
    
    return result;
  },

  /**
   * Get user preferences/settings
   */
  async getUserPreferences(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/users/profile/preferences');
    return handleApiResponse(response);
  },

  /**
   * Update user preferences/settings
   */
  async updateUserPreferences(preferences: any): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/users/profile/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
    return handleApiResponse(response);
  },

  /**
   * Get user activity/logs
   */
  async getUserActivity(filters?: {
    startDate?: string;
    endDate?: string;
    action?: string;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await authenticatedFetch(`/api/users/profile/activity?${params.toString()}`);
    return handleApiResponse(response);
  },

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(file: File): Promise<ApiResponse<{ imageUrl: string }>> {
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    const response = await authenticatedFetch('/api/users/profile/picture', {
      method: 'POST',
      body: formData,
    });
    
    return handleApiResponse(response);
  },

  /**
   * Delete profile picture
   */
  async deleteProfilePicture(): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch('/api/users/profile/picture', {
      method: 'DELETE',
    });
    
    return handleApiResponse(response);
  }
};
