import { authenticatedFetch, parseApiResponse } from '../common';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../common';
import type { User, UserCreateInput, UserUpdateInput, UserFilters } from '@rentalshop/types';

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Users API client for user management operations
 */
export const usersApi = {
  /**
   * Get all users
   */
  async getUsers(): Promise<ApiResponse<User[]>> {
    const response = await authenticatedFetch(apiUrls.users.list);
    const result = await parseApiResponse<User[]>(response);
    return result;
  },

  /**
   * Get users with pagination
   */
  async getUsersPaginated(page: number = 1, limit: number = 50): Promise<ApiResponse<UsersResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await authenticatedFetch(`${apiUrls.users.list}?${params.toString()}`);
    return await parseApiResponse<UsersResponse>(response);
  },

  /**
   * Search users with filters
   */
  async searchUsers(filters: UserFilters): Promise<ApiResponse<User[]>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
    if (filters.outletId) params.append('outletId', filters.outletId.toString());
    if (filters.status) params.append('status', filters.status);
    
    const response = await authenticatedFetch(`${apiUrls.users.list}?${params.toString()}`);
    return await parseApiResponse<User[]>(response);
  },

  /**
   * Get user by ID
   */
  async getUser(userId: number): Promise<ApiResponse<User>> {
    const response = await authenticatedFetch(apiUrls.users.update(userId));
    return await parseApiResponse<User>(response);
  },

  /**
   * Create a new user
   */
  async createUser(userData: UserCreateInput): Promise<ApiResponse<User>> {
    const response = await authenticatedFetch(apiUrls.users.create, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return await parseApiResponse<User>(response);
  },

  /**
   * Update an existing user
   */
  async updateUser(userId: number, userData: UserUpdateInput): Promise<ApiResponse<User>> {
    const response = await authenticatedFetch(apiUrls.users.update(userId), {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return await parseApiResponse<User>(response);
  },

  /**
   * Delete a user
   */
  async deleteUser(userId: number): Promise<ApiResponse<void>> {
    const response = await authenticatedFetch(apiUrls.users.delete(userId), {
      method: 'DELETE',
    });
    return await parseApiResponse<void>(response);
  },

  /**
   * Get users by merchant
   */
  async getUsersByMerchant(merchantId: number): Promise<ApiResponse<User[]>> {
    const response = await authenticatedFetch(`${apiUrls.users.list}?merchantId=${merchantId}`);
    return await parseApiResponse<User[]>(response);
  },

  /**
   * Get users by outlet
   */
  async getUsersByOutlet(outletId: number): Promise<ApiResponse<User[]>> {
    const response = await authenticatedFetch(`${apiUrls.users.list}?outletId=${outletId}`);
    return await parseApiResponse<User[]>(response);
  },

  /**
   * Get users by role
   */
  async getUsersByRole(role: string): Promise<ApiResponse<User[]>> {
    const response = await authenticatedFetch(`${apiUrls.users.list}?role=${role}`);
    return await parseApiResponse<User[]>(response);
  },

  /**
   * Update user role
   */
  async updateUserRole(userId: number, role: string): Promise<ApiResponse<User>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    return await parseApiResponse<User>(response);
  },

  /**
   * Update user status
   */
  async updateUserStatus(userId: number, status: string): Promise<ApiResponse<User>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return await parseApiResponse<User>(response);
  },

  /**
   * Assign user to outlet
   */
  async assignUserToOutlet(userId: number, outletId: number): Promise<ApiResponse<User>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/users/${userId}/assign-outlet`, {
      method: 'PATCH',
      body: JSON.stringify({ outletId }),
    });
    return await parseApiResponse<User>(response);
  },

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<ApiResponse<any>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/users/stats`);
    return await parseApiResponse<any>(response);
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/users/me`);
    return await parseApiResponse<User>(response);
  },

  /**
   * Update current user profile
   */
  async updateCurrentUser(userData: Partial<UserUpdateInput>): Promise<ApiResponse<User>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/users/me`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return await parseApiResponse<User>(response);
  }
};
