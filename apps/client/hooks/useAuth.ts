import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getStoredUser, logoutUser, isAuthenticatedWithVerification } from '../lib/auth/auth';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  merchant?: {
    id: string;
    name: string;
  } | null;
  outlet?: {
    id: string;
    name: string;
  } | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      
      // First check local authentication
      const localAuth = isAuthenticated();
      if (!localAuth) {
        setAuthenticated(false);
        setUser(null);
        setLoading(false);
        // Don't redirect here, let the component handle it
        return;
      }

      // Verify with server
      const serverAuth = await isAuthenticatedWithVerification();
      const currentUser = getStoredUser();
      
      setAuthenticated(serverAuth);
      if (serverAuth && currentUser) {
        // Convert StoredUser to User, providing defaults for optional fields
        const user: User = {
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name || 'Unknown User',
          role: currentUser.role || 'USER',
          phone: currentUser.phone,
          merchant: currentUser.merchant || null,
          outlet: currentUser.outlet || null,
        };
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);

      // Only redirect if we were authenticated but server verification failed
      if (localAuth && !serverAuth) {
        // Token is invalid or expired, redirect to login
        router.push('/login');
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      setAuthenticated(false);
      setUser(null);
      setLoading(false);
      // Don't redirect on error, let the component handle it
    }
  };

  const logout = () => {
    logoutUser();
    setUser(null);
    setAuthenticated(false);
    router.push('/login');
  };

  const refreshUser = () => {
    const currentUser = getStoredUser();
    if (currentUser) {
      // Convert StoredUser to User, providing defaults for optional fields
      const user: User = {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name || 'Unknown User',
        role: currentUser.role || 'USER',
        phone: currentUser.phone,
        merchant: currentUser.merchant || null,
        outlet: currentUser.outlet || null,
      };
      setUser(user);
    } else {
      setUser(null);
    }
  };

  return {
    user,
    loading,
    authenticated,
    logout,
    refreshUser,
    checkAuth,
  };
} 