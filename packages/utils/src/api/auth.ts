import { authenticatedFetch, parseApiResponse } from '../common';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../common';
import type { User, LoginCredentials, RegisterData } from '@rentalshop/types';

// Local type definitions for missing types
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * Authentication API client
 */
export const authApi = {
  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    const response = await fetch(apiUrls.auth.login, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    return await parseApiResponse<AuthResponse>(response);
  },

  /**
   * Register new user
   */
  async register(userData: RegisterData): Promise<ApiResponse<AuthResponse>> {
    const response = await fetch(apiUrls.auth.register, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    return await parseApiResponse<AuthResponse>(response);
  },

  /**
   * Verify authentication token
   */
  async verifyToken(): Promise<ApiResponse<User>> {
    const response = await authenticatedFetch(apiUrls.auth.verify);
    return await parseApiResponse<User>(response);
  },

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    const response = await authenticatedFetch(apiUrls.auth.refresh);
    return await parseApiResponse<{ token: string }>(response);
  },

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse<void>> {
    const response = await authenticatedFetch(apiUrls.auth.logout, {
      method: 'POST',
    });
    return await parseApiResponse<void>(response);
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${apiUrls.base}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    return await parseApiResponse<void>(response);
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${apiUrls.base}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, newPassword }),
    });
    return await parseApiResponse<void>(response);
  },

  /**
   * Change password (authenticated)
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    const response = await authenticatedFetch(`${apiUrls.base}/api/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return await parseApiResponse<void>(response);
  }
};
