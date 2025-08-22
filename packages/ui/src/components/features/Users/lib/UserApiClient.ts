import { User } from '@rentalshop/types';

export interface UserApiResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

export class UserApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get auth token from localStorage or wherever it's stored
    const token = localStorage.getItem('authToken') || '';
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getUsers(filters: any = {}, options: any = {}): Promise<UserApiResponse> {
    const params = new URLSearchParams();
    
    // Add filters
    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    
    // Add options
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);

    const queryString = params.toString();
    const endpoint = `/users${queryString ? `?${queryString}` : ''}`;
    
    return this.request<UserApiResponse>(endpoint);
  }

  async getUserById(userId: string): Promise<UserApiResponse> {
    return this.request<UserApiResponse>(`/users/${userId}`);
  }

  async createUser(userData: Partial<User>): Promise<UserApiResponse> {
    return this.request<UserApiResponse>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<UserApiResponse> {
    return this.request<UserApiResponse>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deactivateUser(userId: string): Promise<UserApiResponse> {
    return this.request<UserApiResponse>(`/users/${userId}/deactivate`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: false }),
    });
  }

  async activateUser(userId: string): Promise<UserApiResponse> {
    return this.request<UserApiResponse>(`/users/${userId}/activate`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: true }),
    });
  }

  async changePassword(userId: string, newPassword: string): Promise<UserApiResponse> {
    return this.request<UserApiResponse>(`/users/${userId}/change-password`, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword }),
    });
  }

  async deleteUser(userId: string): Promise<UserApiResponse> {
    return this.request<UserApiResponse>(`/users/${userId}`, {
      method: 'DELETE',
    });
  }
}

// Export a default instance
export const userApiClient = new UserApiClient();
