import { authenticatedFetch, parseApiResponse } from '../index';
import { apiUrls } from '../config/api';
import { profileApi } from './profile';
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
   * Uses centralized profileApi for consistency
   */
  async updatePersonalProfile(data: PersonalProfileUpdate): Promise<ApiResponse<any>> {
    console.log('🔍 DEBUG: settingsApi.updatePersonalProfile called');
    console.log('🔍 DEBUG: Request data:', data);
    
    // Use centralized profileApi to avoid duplication
    return await profileApi.updateProfile(data);
  },

  /**
   * Update merchant business information
   */
  async updateMerchantInfo(data: MerchantInfoUpdate): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/settings/merchant`, {
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
    const response = await authenticatedFetch(`${apiUrls.base}/api/settings/outlet`, {
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
    const response = await authenticatedFetch(`${apiUrls.base}/api/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await parseApiResponse<any>(response);
  },
};