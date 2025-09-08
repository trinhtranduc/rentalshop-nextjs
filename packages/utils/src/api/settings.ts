import { authenticatedFetch, parseApiResponse, apiUrls } from '../index';
import type { ApiResponse } from '../index';
import type { 
  PersonalProfileUpdate, 
  MerchantInfoUpdate, 
  OutletInfoUpdate, 
  SecurityUpdate 
} from '@rentalshop/types';

// ============================================================================
// SETTINGS API CLIENT
// ============================================================================

/**
 * Settings API client for user settings management
 */
export const settingsApi = {
  /**
   * Update personal profile information
   */
  async updatePersonalProfile(data: PersonalProfileUpdate): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/users/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Update merchant business information
   */
  async updateMerchantInfo(data: MerchantInfoUpdate): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/settings/merchant', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Update outlet information
   */
  async updateOutletInfo(data: OutletInfoUpdate): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/settings/outlet', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await parseApiResponse<any>(response);
  },

  /**
   * Update security settings (password)
   */
  async updateSecurity(data: SecurityUpdate): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch('/api/auth/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await parseApiResponse<any>(response);
  },
};