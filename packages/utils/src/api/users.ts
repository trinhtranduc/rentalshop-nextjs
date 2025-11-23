import { User, UserCreateInput } from '@rentalshop/types';
import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';

// ============================================================================
// USER API TYPES
// ============================================================================

export interface UserApiResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

// ============================================================================
// USER API (MERGED FUNCTIONALITY)
// ============================================================================

export const usersApi = {
  // ============================================================================
  // USER CRUD OPERATIONS
  // ============================================================================

  /**
   * Get all users
   */
  async getUsers(filters: any = {}, options: any = {}): Promise<UserApiResponse> {
    const params = new URLSearchParams();
    
    // Add filters
    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    
    // Add options
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `${apiUrls.users.list}?${queryString}` : apiUrls.users.list;
    
    const response = await authenticatedFetch(url);
    return await parseApiResponse<UserApiResponse>(response);
  },

  /**
   * Get users with pagination
   */
  async getUsersPaginated(page: number = 1, limit: number = 50): Promise<UserApiResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await authenticatedFetch(`${apiUrls.users.list}?${params.toString()}`);
    return await parseApiResponse<UserApiResponse>(response);
  },

  /**
   * Search users with filters
   */
  async searchUsers(filters: any = {}): Promise<UserApiResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.status) params.append('status', filters.status);
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    
    const queryString = params.toString();
    const url = queryString ? `${apiUrls.users.list}?${queryString}` : apiUrls.users.list;
    
    const response = await authenticatedFetch(url);
    return await parseApiResponse<UserApiResponse>(response);
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: number): Promise<UserApiResponse> {
    const response = await authenticatedFetch(apiUrls.users.update(userId));
    return await parseApiResponse<UserApiResponse>(response);
  },

  /**
   * Create new user
   */
  async createUser(userData: UserCreateInput): Promise<UserApiResponse> {
    const response = await authenticatedFetch(apiUrls.users.create, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return await parseApiResponse<UserApiResponse>(response);
  },

  /**
   * Update user
   */
  async updateUser(userId: number, userData: Partial<User>): Promise<UserApiResponse> {
    const response = await authenticatedFetch(apiUrls.users.update(userId), {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return await parseApiResponse<UserApiResponse>(response);
  },

  /**
   * Delete user
   */
  async deleteUser(userId: number): Promise<UserApiResponse> {
    const response = await authenticatedFetch(apiUrls.users.delete(userId), {
      method: 'DELETE',
    });
    return await parseApiResponse<UserApiResponse>(response);
  },

  // ============================================================================
  // USER MANAGEMENT OPERATIONS
  // ============================================================================

  /**
   * Update user by public ID
   */
  async updateUserByPublicId(userId: number, userData: Partial<User>): Promise<UserApiResponse> {
    const response = await authenticatedFetch(apiUrls.users.updateByPublicId(userId), {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return await parseApiResponse<UserApiResponse>(response);
  },

  /**
   * Activate user by public ID
   */
  async activateUserByPublicId(userId: number): Promise<UserApiResponse> {
    const response = await authenticatedFetch(apiUrls.users.activateByPublicId(userId), {
      method: 'PUT',
    });
    return await parseApiResponse<UserApiResponse>(response);
  },

  /**
   * Deactivate user by public ID
   */
  async deactivateUserByPublicId(userId: number): Promise<UserApiResponse> {
    const response = await authenticatedFetch(apiUrls.users.deactivateByPublicId(userId), {
      method: 'PUT',
    });
    return await parseApiResponse<UserApiResponse>(response);
  },

  /**
   * Activate user
   */
  async activateUser(userId: number): Promise<UserApiResponse> {
    const response = await authenticatedFetch(`${apiUrls.users.update(userId)}/activate`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: true }),
    });
    return await parseApiResponse<UserApiResponse>(response);
  },

  /**
   * Deactivate user
   */
  async deactivateUser(userId: number): Promise<UserApiResponse> {
    const response = await authenticatedFetch(`${apiUrls.users.update(userId)}/deactivate`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: false }),
    });
    return await parseApiResponse<UserApiResponse>(response);
  },

  /**
   * Change user password
   */
  async changePassword(userId: number, newPassword: string): Promise<UserApiResponse> {
    // ✅ CRITICAL DEBUG: This log MUST appear if method is called
    console.log('🚨🚨🚨 changePassword METHOD CALLED 🚨🚨🚨', {
      userId,
      timestamp: new Date().toISOString(),
      'apiUrls.base': apiUrls.base,
      'apiUrls.users.update(1009)': apiUrls.users.update(1009),
      'typeof apiUrls.users.update': typeof apiUrls.users.update,
      stackTrace: new Error().stack
    });
    
    const baseUrl = apiUrls.users.update(userId);
    const fullUrl = `${baseUrl}/change-password`;
    
    console.log('🔍 changePassword URL Construction:', {
      userId,
      baseUrl,
      fullUrl,
      apiUrlsBase: apiUrls.base,
      'baseUrl starts with http': baseUrl.startsWith('http'),
      'baseUrl starts with /': baseUrl.startsWith('/'),
      'baseUrl includes dev.anyrent': baseUrl.includes('dev.anyrent'),
      'baseUrl includes dev-api.anyrent': baseUrl.includes('dev-api.anyrent')
    });
    
    const response = await authenticatedFetch(fullUrl, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword }),
    });
    return await parseApiResponse<UserApiResponse>(response);
  }
};
