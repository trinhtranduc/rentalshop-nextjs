/**
 * Authentication utilities for admin app (reusing shared package)
 */

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

// Import authentication functions from utils auth API
import { authApi, getCurrentUser } from '@rentalshop/utils';

// Re-export auth API functions with simpler names
export const loginUser = authApi.login;
export const logoutUser = authApi.logout;
export const verifyTokenWithServer = authApi.verifyToken;

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