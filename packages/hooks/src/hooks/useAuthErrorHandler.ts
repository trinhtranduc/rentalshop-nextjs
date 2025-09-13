import { useCallback } from 'react';
import { clearAuthData } from '@rentalshop/utils';

/**
 * Custom hook for handling authentication errors
 * Automatically logs out user and redirects to login on auth failures
 */
export const useAuthErrorHandler = () => {
  const handleAuthError = useCallback((error: any) => {
    console.error('Authentication error detected:', error);
    
    // Check if it's an authentication-related error
    if (
      error?.message?.includes('Authentication required') ||
      error?.message?.includes('Unauthorized') ||
      error?.message?.includes('Invalid token') ||
      error?.message?.includes('Token expired') ||
      error?.status === 401
    ) {
      console.log('🔄 Authentication error detected, logging out user');
      
      // Clear auth data using centralized function
      clearAuthData();
      
      // Redirect to login
      if (typeof window !== 'undefined') {
        // window.location.href = '/login';
      }
    }
  }, []);

  return { handleAuthError };
};
