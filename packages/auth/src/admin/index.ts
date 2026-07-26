/**
 * Authentication utilities for admin app (reusing shared package)
 */

import type { LoginCredentials, User } from '@rentalshop/types';
import { authApi, getCurrentUser, type ApiResponse, type AuthResponse } from '@rentalshop/utils';

type LoginUserFn = (credentials: LoginCredentials) => Promise<ApiResponse<AuthResponse>>;
type LogoutUserFn = () => Promise<ApiResponse<void>>;
type VerifyTokenWithServerFn = () => Promise<ApiResponse<User>>;

// Import storage utilities from utils
export {
  getAuthToken,
  getStoredUser,
  storeAuthData,
  clearAuthData,
  authenticatedFetch,
  handleApiResponse,
  isAuthenticated,
  getCurrentUser,
  type StoredUser,
} from '@rentalshop/utils';

// Re-export auth API functions with simpler names
export const loginUser: LoginUserFn = (credentials) => authApi.login(credentials);
export const logoutUser: LogoutUserFn = () => authApi.logout();
export const verifyTokenWithServer: VerifyTokenWithServerFn = () => authApi.verifyToken();

export const isAuthenticatedWithVerification = async (): Promise<boolean> => {
  const { isAuthenticated } = await import('@rentalshop/utils');
  if (!isAuthenticated()) return false;
  
  try {
    const result = await authApi.verifyToken();
    return result.success === true;
  } catch (error) {
    return false;
  }
}; 
