/**
 * Authentication utilities for admin app (reusing shared package)
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

export const isAuthenticatedWithVerification = async (): Promise<boolean> => {
  const { isAuthenticated, verifyTokenWithServer } = await import('@rentalshop/utils');
  if (!isAuthenticated()) return false;
  return await verifyTokenWithServer();
}; 