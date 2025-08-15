import { authenticatedFetch, handleApiResponse } from '../auth/auth';
import type { User, UserCreateInput, UserUpdateInput } from '@rentalshop/ui';
import { executeWithDataRefresh } from '@rentalshop/utils';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Users API client for authenticated user management operations
 */
export const usersApi = {
  /**
   * Get all users with optional filters and pagination
   */
  async getUsers(filters?: {
    search?: string;
    role?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ApiResponse<UsersResponse>> {
    const queryParams = new URLSearchParams();
    
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.role) queryParams.append('role', filters.role);
    if (filters?.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.sortBy) queryParams.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
    
    // Add cache busting parameter to prevent stale data
    queryParams.append('_t', Date.now().toString());
    
    console.log('🔄 getUsers called with filters:', filters);
    console.log('📡 API endpoint:', `/api/users?${queryParams.toString()}`);
    
    const response = await authenticatedFetch(`/api/users?${queryParams.toString()}`);
    console.log('📡 Raw API response:', response);
    
    const result = handleApiResponse(response);
    console.log('✅ Processed API response:', result);
    
    return result;
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<ApiResponse<User>> {
    const response = await authenticatedFetch(`/api/users/${userId}`);
    return handleApiResponse(response);
  },

  /**
   * Create a new user
   */
  async createUser(userData: UserCreateInput): Promise<ApiResponse<User>> {
    const response = await authenticatedFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return handleApiResponse(response);
  },

  /**
   * Create a new user and automatically refresh the user list
   * This handles database consistency delays automatically
   */
  async createUserAndRefresh(userData: UserCreateInput, filters?: any): Promise<{
    created: User;
    refreshed: UsersResponse;
  }> {
    console.log('🔄 createUserAndRefresh called with:', { userData, filters });
    
    try {
      // Step 1: Create the user
      console.log('📡 Step 1: Creating user...');
      const createResult = await this.createUser(userData);
      console.log('✅ Create result:', createResult);
      
      if (!createResult.success || !createResult.data) {
        throw new Error(`Create failed: ${createResult.error || 'Unknown error'}`);
      }
      
      // Step 2: Wait a bit for database consistency
      console.log('⏳ Step 2: Waiting 2 seconds for database consistency...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Refresh the user list
      console.log('📡 Step 3: Refreshing user list...');
      const refreshResult = await this.getUsers(filters);
      console.log('✅ Refresh result:', refreshResult);
      
      if (!refreshResult.success || !refreshResult.data) {
        throw new Error(`Refresh failed: ${refreshResult.error || 'Unknown error'}`);
      }
      
      const finalResult = {
        created: createResult.data,
        refreshed: refreshResult.data
      };
      
      console.log('✅ Final result:', finalResult);
      return finalResult;
    } catch (error) {
      console.error('❌ Error in createUserAndRefresh:', error);
      throw error;
    }
  },

  /**
   * Update an existing user
   * Note: The API expects the request body to include the user ID
   */
  async updateUser(userId: string, userData: Partial<UserUpdateInput>): Promise<ApiResponse<User>> {
    // Include the ID in the request body as required by the API
    const requestBody = {
      id: userId,
      ...userData
    };
    
    const response = await authenticatedFetch('/api/users', {
      method: 'PUT',
      body: JSON.stringify(requestBody),
    });
    return handleApiResponse(response);
  },

  /**
   * Update a user and automatically refresh the user list
   * This handles database consistency delays automatically
   */
  async updateUserAndRefresh(userId: string, userData: Partial<UserUpdateInput>, filters?: any): Promise<{
    updated: User;
    refreshed: UsersResponse;
  }> {
    console.log('🔄 updateUserAndRefresh called with:', { userId, userData, filters });
    
    try {
      // Step 1: Update the user
      console.log('📡 Step 1: Updating user...');
      const updateResult = await this.updateUser(userId, userData);
      console.log('✅ Update result:', updateResult);
      
      if (!updateResult.success || !updateResult.data) {
        throw new Error(`Update failed: ${updateResult.error || 'Unknown error'}`);
      }
      
      // Step 2: Wait a bit for database consistency
      console.log('⏳ Step 2: Waiting 2 seconds for database consistency...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Refresh the user list
      console.log('📡 Step 3: Refreshing user list...');
      const refreshResult = await this.getUsers(filters);
      console.log('✅ Refresh result:', refreshResult);
      
      if (!refreshResult.success || !refreshResult.data) {
        throw new Error(`Refresh failed: ${refreshResult.error || 'Unknown error'}`);
      }
      
      const finalResult = {
        updated: updateResult.data,
        refreshed: refreshResult.data
      };
      
      console.log('✅ Final result:', finalResult);
      return finalResult;
    } catch (error) {
      console.error('❌ Error in updateUserAndRefresh:', error);
      throw error;
    }
  },

  /**
   * Deactivate a user
   */
  async deactivateUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`/api/users/${userId}/deactivate`, {
      method: 'PATCH',
    });
    return handleApiResponse(response);
  },

  /**
   * Deactivate a user and automatically refresh the user list
   */
  async deactivateUserAndRefresh(userId: string, filters?: any): Promise<{
    deactivated: boolean;
    refreshed: UsersResponse;
  }> {
    console.log('🔄 deactivateUserAndRefresh called with:', { userId, filters });
    
    try {
      // Step 1: Deactivate the user
      console.log('📡 Step 1: Deactivating user...');
      const deactivateResult = await this.deactivateUser(userId);
      console.log('✅ Deactivate result:', deactivateResult);
      
      if (!deactivateResult.success) {
        throw new Error(`Deactivate failed: ${deactivateResult.error || 'Unknown error'}`);
      }
      
      // Step 2: Wait a bit for database consistency
      console.log('⏳ Step 2: Waiting 2 seconds for database consistency...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Refresh the user list
      console.log('📡 Step 3: Refreshing user list...');
      const refreshResult = await this.getUsers(filters);
      console.log('✅ Refresh result:', refreshResult);
      
      if (!refreshResult.success || !refreshResult.data) {
        throw new Error(`Refresh failed: ${refreshResult.error || 'Unknown error'}`);
      }
      
      const finalResult = {
        deactivated: true,
        refreshed: refreshResult.data
      };
      
      console.log('✅ Final result:', finalResult);
      return finalResult;
    } catch (error) {
      console.error('❌ Error in deactivateUserAndRefresh:', error);
      throw error;
    }
  },

  /**
   * Activate a user
   */
  async activateUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`/api/users/${userId}/activate`, {
      method: 'PATCH',
    });
    return handleApiResponse(response);
  },

  /**
   * Activate a user and automatically refresh the user list
   */
  async activateUserAndRefresh(userId: string, filters?: any): Promise<{
    activated: boolean;
    refreshed: UsersResponse;
  }> {
    console.log('🔄 activateUserAndRefresh called with:', { userId, filters });
    
    try {
      // Step 1: Activate the user
      console.log('📡 Step 1: Activating user...');
      const activateResult = await this.activateUser(userId);
      console.log('✅ Activate result:', activateResult);
      
      if (!activateResult.success) {
        throw new Error(`Activate failed: ${activateResult.error || 'Unknown error'}`);
      }
      
      // Step 2: Wait a bit for database consistency
      console.log('⏳ Step 2: Waiting 2 seconds for database consistency...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Refresh the user list
      console.log('📡 Step 3: Refreshing user list...');
      const refreshResult = await this.getUsers(filters);
      console.log('✅ Refresh result:', refreshResult);
      
      if (!refreshResult.success || !refreshResult.data) {
        throw new Error(`Refresh failed: ${refreshResult.error || 'Unknown error'}`);
      }
      
      const finalResult = {
        activated: true,
        refreshed: refreshResult.data
      };
      
      console.log('✅ Final result:', finalResult);
      return finalResult;
    } catch (error) {
      console.error('❌ Error in activateUserAndRefresh:', error);
      throw error;
    }
  },

  /**
   * Change user password
   */
  async changePassword(userId: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`/api/users/${userId}/change-password`, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword }),
    });
    return handleApiResponse(response);
  },

  /**
   * Delete a user (permanent)
   */
  async deleteUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`/api/users/${userId}`, {
      method: 'DELETE',
    });
    return handleApiResponse(response);
  }
};
