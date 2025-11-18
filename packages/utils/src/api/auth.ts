import { authenticatedFetch, publicFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../core';
import type { User, LoginCredentials, RegisterData } from '@rentalshop/types';

// Local type definitions for missing types
export interface AuthResponse {
  token: string;
  user: User;
}

// Register response includes additional fields for email verification
export interface RegisterResponse {
  user: User;
  requiresEmailVerification?: boolean;
  subscription?: {
    planName: string;
    trialEnd: Date;
    daysRemaining: number;
  };
}

/**
 * Authentication API client
 */
export const authApi = {
  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await publicFetch(apiUrls.auth.login, {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      return await parseApiResponse<AuthResponse>(response);
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Failed to login');
    }
  },

  /**
   * Register new user
   */
  async register(userData: RegisterData): Promise<ApiResponse<RegisterResponse>> {
    const response = await publicFetch(apiUrls.auth.register, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return await parseApiResponse<RegisterResponse>(response);
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
    const response = await fetch(apiUrls.auth.forgotPassword, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return await parseApiResponse<void>(response);
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string, confirmPassword: string): Promise<ApiResponse<void>> {
    const response = await fetch(apiUrls.auth.resetPassword, {
      method: 'POST',
      body: JSON.stringify({ token, password, confirmPassword }),
    });
    return await parseApiResponse<void>(response);
  },

  /**
   * Change password (authenticated)
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    const response = await authenticatedFetch(apiUrls.auth.changePassword, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return await parseApiResponse<void>(response);
  },

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await publicFetch(apiUrls.auth.resendVerification, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      return await parseApiResponse<{ message: string }>(response);
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  }
};
