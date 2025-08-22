/**
 * Authentication utilities for client app (reusing shared package)
 */

// Re-export all auth functions from utils
export {
  getAuthToken,
  getStoredUser,
  storeAuthData,
  clearAuthData,
  authenticatedFetch,
  handleApiResponse,
  isAuthenticated,
  loginUser,
  logoutUser,
  verifyTokenWithServer,
  getCurrentUser,
  type StoredUser,
  type AuthResponse,
} from '@rentalshop/utils';

// Client-specific aliases for compatibility
export { loginUser as loginUserClient } from '@rentalshop/utils';
export { logoutUser as logoutUserClient } from '@rentalshop/utils';
export { getCurrentUser as getCurrentUserClient } from '@rentalshop/utils';

export const isAuthenticatedWithVerification = async (): Promise<boolean> => {
  const { isAuthenticated, verifyTokenWithServer } = await import('@rentalshop/utils');
  if (!isAuthenticated()) return false;
  return await verifyTokenWithServer();
}; 