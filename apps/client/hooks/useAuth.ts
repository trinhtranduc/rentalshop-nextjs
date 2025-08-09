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
        router.push('/login');
        return;
      }

      // Verify with server
      const serverAuth = await isAuthenticatedWithVerification();
      const currentUser = getStoredUser();
      
      setAuthenticated(serverAuth);
      setUser(serverAuth ? currentUser : null);
      setLoading(false);

      if (!serverAuth) {
        // Token is invalid or expired, redirect to login
        router.push('/login');
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      setAuthenticated(false);
      setUser(null);
      setLoading(false);
      router.push('/login');
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
    setUser(currentUser);
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