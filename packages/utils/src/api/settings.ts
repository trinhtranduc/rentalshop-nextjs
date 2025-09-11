import { authenticatedFetch, parseApiResponse } from '../common';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../common';

// ============================================================================
// TYPES
// ============================================================================

export interface MerchantSettings {
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  businessType?: string;
  taxId?: string;
  website?: string;
  description?: string;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface OutletSettings {
  name: string;
  phone?: string;
  address?: string;
  description?: string;
}

// ============================================================================
// SETTINGS API CLIENT
// ============================================================================

/**
 * Settings API client for user and merchant settings
 */
export const settingsApi = {
  /**
   * Update merchant settings
   */
  async updateMerchantSettings(data: MerchantSettings): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.settings.merchant, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    
    const result = await parseApiResponse<any>(response);
    return result;
  },

  /**
   * Update merchant information (alias for updateMerchantSettings)
   */
  async updateMerchantInfo(data: MerchantSettings): Promise<ApiResponse<any>> {
    return this.updateMerchantSettings(data);
  },

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    const response = await authenticatedFetch(apiUrls.settings.user);
    const result = await parseApiResponse<UserProfile>(response);
    return result;
  },

  /**
   * Update user profile
   */
  async updateUserProfile(data: UserProfile): Promise<ApiResponse<UserProfile>> {
    const response = await authenticatedFetch(apiUrls.settings.user, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const result = await parseApiResponse<UserProfile>(response);
    return result;
  },

  /**
   * Update outlet information
   */
  async updateOutletInfo(data: OutletSettings): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(apiUrls.settings.outlet, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const result = await parseApiResponse<any>(response);
    return result;
  }
};