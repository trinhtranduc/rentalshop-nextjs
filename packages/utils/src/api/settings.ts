/**
 * Settings API Client
 * 
 * This module provides API client functions for settings operations.
 * All API requests should be made through these functions, not directly in UI components.
 */

import { API_BASE_URL } from '../config/api';

// Types
export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantSetting {
  id: number;
  merchantId: number;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreference {
  id: number;
  userId: number;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsSummary {
  system: {
    total: number;
    categories: { [key: string]: number };
    active: number;
    inactive: number;
  };
  merchant: {
    total: number;
    categories: { [key: string]: number };
    active: number;
    inactive: number;
  };
  user: {
    total: number;
    categories: { [key: string]: number };
    active: number;
    inactive: number;
  };
}

// API Response types
export interface SystemSettingsResponse {
  success: boolean;
  data: SystemSetting[];
}

export interface MerchantSettingsResponse {
  success: boolean;
  data: MerchantSetting[];
}

export interface UserPreferencesResponse {
  success: boolean;
  data: UserPreference[];
}

export interface SettingsSummaryResponse {
  success: boolean;
  data: SettingsSummary;
}

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('authToken') || '';
}

/**
 * Make authenticated API request
 */
async function makeAuthenticatedRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token found. Please login again.');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Request failed with status ${response.status}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // If response is not JSON, use the text as error message
      errorMessage = errorText || errorMessage;
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
}

// System Settings API
export async function getSystemSettings(): Promise<SystemSettingsResponse> {
  return makeAuthenticatedRequest<SystemSettingsResponse>('/api/settings/system');
}

export async function getSystemSetting(id: number): Promise<{ success: boolean; data: SystemSetting }> {
  return makeAuthenticatedRequest<{ success: boolean; data: SystemSetting }>(`/api/settings/system/${id}`);
}

export async function updateSystemSetting(id: number, data: Partial<SystemSetting>): Promise<{ success: boolean; data: SystemSetting }> {
  return makeAuthenticatedRequest<{ success: boolean; data: SystemSetting }>(`/api/settings/system/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function createSystemSetting(data: Omit<SystemSetting, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data: SystemSetting }> {
  return makeAuthenticatedRequest<{ success: boolean; data: SystemSetting }>('/api/settings/system', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Merchant Settings API
export async function getMerchantSettings(): Promise<MerchantSettingsResponse> {
  return makeAuthenticatedRequest<MerchantSettingsResponse>('/api/settings/merchant');
}

export async function getMerchantSetting(id: number): Promise<{ success: boolean; data: MerchantSetting }> {
  return makeAuthenticatedRequest<{ success: boolean; data: MerchantSetting }>(`/api/settings/merchant/${id}`);
}

export async function updateMerchantSetting(id: number, data: Partial<MerchantSetting>): Promise<{ success: boolean; data: MerchantSetting }> {
  return makeAuthenticatedRequest<{ success: boolean; data: MerchantSetting }>(`/api/settings/merchant/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function createMerchantSetting(data: Omit<MerchantSetting, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data: MerchantSetting }> {
  return makeAuthenticatedRequest<{ success: boolean; data: MerchantSetting }>('/api/settings/merchant', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// User Preferences API
export async function getUserPreferences(): Promise<UserPreferencesResponse> {
  return makeAuthenticatedRequest<UserPreferencesResponse>('/api/settings/user');
}

export async function getUserPreference(id: number): Promise<{ success: boolean; data: UserPreference }> {
  return makeAuthenticatedRequest<{ success: boolean; data: UserPreference }>(`/api/settings/user/${id}`);
}

export async function updateUserPreference(id: number, data: Partial<UserPreference>): Promise<{ success: boolean; data: UserPreference }> {
  return makeAuthenticatedRequest<{ success: boolean; data: UserPreference }>(`/api/settings/user/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function createUserPreference(data: Omit<UserPreference, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data: UserPreference }> {
  return makeAuthenticatedRequest<{ success: boolean; data: UserPreference }>('/api/settings/user', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Settings Summary API
export async function getSettingsSummary(): Promise<SettingsSummaryResponse> {
  // This would need to be implemented on the backend
  // For now, we'll fetch all settings and calculate the summary
  const [systemResponse, merchantResponse, userResponse] = await Promise.all([
    getSystemSettings(),
    getMerchantSettings(),
    getUserPreferences()
  ]);

  const calculateSummary = (settings: any[]) => {
    const categories: { [key: string]: number } = {};
    let active = 0;
    let inactive = 0;

    settings.forEach(setting => {
      categories[setting.category] = (categories[setting.category] || 0) + 1;
      if (setting.isActive) active++;
      else inactive++;
    });

    return {
      total: settings.length,
      categories,
      active,
      inactive
    };
  };

  return {
    success: true,
    data: {
      system: calculateSummary(systemResponse.data),
      merchant: calculateSummary(merchantResponse.data),
      user: calculateSummary(userResponse.data)
    }
  };
}
