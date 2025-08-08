/**
 * API Client Utilities
 * Provides environment-aware API URLs and common fetch functions
 */

/**
 * Get the appropriate API URL based on environment
 */
export const getApiUrl = (): string => {
  // Check for environment-specific API URL first
  if (process.env.NODE_ENV === 'production') {
    return process.env.API_URL_PROD || process.env.NEXT_PUBLIC_API_URL || 'https://api.rentalshop.com';
  }
  
  if (process.env.NODE_ENV === 'development') {
    return process.env.API_URL_DEV || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  }
  
  // Local development
  return process.env.API_URL_LOCAL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
};

/**
 * Create a full API URL for a given endpoint
 */
export const createApiUrl = (endpoint: string): string => {
  const baseUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

/**
 * Get authentication token from localStorage
 */
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
};

/**
 * Create authenticated fetch request
 */
export const authenticatedFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = createApiUrl(endpoint);
  const token = getAuthToken();
  
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

/**
 * Handle API response and check for authentication errors
 */
export const handleApiResponse = async (response: Response) => {
  if (response.status === 401) {
    // Token expired or invalid
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error('Authentication required');
  }

  return response;
};

/**
 * Common API request with error handling
 */
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  try {
    const response = await authenticatedFetch(endpoint, options);
    return await handleApiResponse(response);
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};
