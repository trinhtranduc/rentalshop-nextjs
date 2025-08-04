import { useState, useEffect } from 'react';
import { 
  isAuthenticated, 
  getStoredUser, 
  logoutUser,
  type User 
} from '../auth/auth';

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => void;
}

/**
 * React hook for authentication state management
 */
export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      const storedUser = getStoredUser();
      
      setUser(authenticated ? storedUser : null);
      setLoading(false);
    };

    checkAuth();
  }, []);

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  return {
    user,
    isAuthenticated: !!user,
    loading,
    logout,
  };
}; 