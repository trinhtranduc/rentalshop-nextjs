// Browser-side auth utilities for token storage and authenticated requests

import { createApiUrl } from '@rentalshop/utils';

export interface StoredUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  [key: string]: any;
}

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
};

export const getStoredUser = (): StoredUser | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  return userStr ? (JSON.parse(userStr) as StoredUser) : null;
};

export const storeAuthData = (token: string, user: StoredUser): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuthData = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

export const authenticatedFetch = async (
  endpointOrUrl: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAuthToken();
  const isAbsolute = endpointOrUrl.startsWith('http://') || endpointOrUrl.startsWith('https://');
  const isRelativeApi = endpointOrUrl.startsWith('/api/');
  const url = isAbsolute || isRelativeApi ? endpointOrUrl : createApiUrl(endpointOrUrl);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

export const handleApiResponse = async (response: Response) => {
  if (response.status === 401) {
    clearAuthData();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};


