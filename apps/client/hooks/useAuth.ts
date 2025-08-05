import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getStoredUser, logoutUser } from '../lib/auth/auth';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const authStatus = isAuthenticated();
    const currentUser = getStoredUser();
    
    setAuthenticated(authStatus);
    setUser(currentUser);
    setLoading(false);

    if (!authStatus) {
      router.push('/login');
    }
  };

  const logout = () => {
    logoutUser();
    setUser(null);
    setAuthenticated(false);
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