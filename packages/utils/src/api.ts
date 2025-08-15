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

/**
 * Retry configuration for API calls
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 8000,  // 8 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504] // Retry on these status codes
};

/**
 * Calculate delay for retry attempts with exponential backoff
 */
export function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

/**
 * Check if a response should trigger a retry
 */
export function shouldRetry(status: number, config: RetryConfig): boolean {
  return config.retryableStatusCodes.includes(status);
}

/**
 * Execute an API call with automatic retry logic
 */
export async function executeWithRetry<T>(
  apiCall: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  
  for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const result = await apiCall();
      return result;
    } catch (error: any) {
      const isLastAttempt = attempt === finalConfig.maxRetries;
      
      // Don't retry on last attempt
      if (isLastAttempt) {
        throw error;
      }
      
      // Check if error is retryable
      const status = error.status || error.statusCode || 0;
      if (!shouldRetry(status, finalConfig)) {
        throw error;
      }
      
      // Calculate delay and wait
      const delay = calculateRetryDelay(attempt, finalConfig);
      console.log(`API call failed, retrying in ${delay}ms (attempt ${attempt}/${finalConfig.maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw new Error('Max retries exceeded');
}

/**
 * Execute a data fetch operation with retry logic for database consistency
 * This is specifically for operations that might have read-after-write delays
 */
export async function executeDataFetchWithRetry<T>(
  fetchCall: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { 
    ...DEFAULT_RETRY_CONFIG, 
    ...config,
    // Use longer delays for database consistency issues
    baseDelay: 2000,  // 2 seconds
    maxDelay: 10000   // 10 seconds
  };
  
  for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const result = await fetchCall();
      return result;
    } catch (error: any) {
      const isLastAttempt = attempt === finalConfig.maxRetries;
      
      if (isLastAttempt) {
        console.error('Data fetch failed after all retries:', error);
        throw error;
      }
      
      // Calculate delay and wait
      const delay = calculateRetryDelay(attempt, finalConfig);
      console.log(`Data fetch attempt ${attempt} failed, retrying in ${delay}ms for database consistency`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

/**
 * Higher-order function that handles the common create-update-fetch pattern
 * with automatic retry logic for database consistency
 */
export async function executeWithDataRefresh<T, R>(
  operation: () => Promise<T>,
  refreshOperation: () => Promise<R>,
  options: {
    retryConfig?: Partial<RetryConfig>;
    refreshDelay?: number;
    maxRefreshAttempts?: number;
  } = {}
): Promise<{ operationResult: T; refreshResult: R }> {
  const {
    retryConfig = {},
    refreshDelay = 1000, // 1 second delay before first refresh attempt
    maxRefreshAttempts = 3
  } = options;

  try {
    // Execute the main operation (create, update, delete, etc.)
    console.log('Executing main operation...');
    const operationResult = await executeWithRetry(operation, retryConfig);
    console.log('Main operation completed successfully');

    // Wait a bit for database consistency
    if (refreshDelay > 0) {
      console.log(`Waiting ${refreshDelay}ms for database consistency...`);
      await new Promise(resolve => setTimeout(resolve, refreshDelay));
    }

    // Execute the refresh operation with retry logic
    console.log('Executing refresh operation...');
    const refreshResult = await executeDataFetchWithRetry(refreshOperation, {
      ...retryConfig,
      maxRetries: maxRefreshAttempts
    });
    console.log('Refresh operation completed successfully');

    return { operationResult, refreshResult };
  } catch (error) {
    console.error('Error in executeWithDataRefresh:', error);
    throw error;
  }
}

/**
 * Utility function for common CRUD operations with automatic refresh
 */
export class CrudOperations<T> {
  constructor(
    private createFn: (data: any) => Promise<T>,
    private updateFn: (id: string, data: any) => Promise<T>,
    private deleteFn: (id: string) => Promise<boolean>,
    private fetchFn: (filters?: any) => Promise<T[]>,
    private retryConfig: Partial<RetryConfig> = {}
  ) {}

  /**
   * Create a new item and refresh the list
   */
  async createAndRefresh(data: any, filters?: any): Promise<{ created: T; refreshed: T[] }> {
    return executeWithDataRefresh(
      () => this.createFn(data),
      () => this.fetchFn(filters),
      { retryConfig: this.retryConfig }
    ).then(result => ({
      created: result.operationResult,
      refreshed: result.refreshResult
    }));
  }

  /**
   * Update an item and refresh the list
   */
  async updateAndRefresh(id: string, data: any, filters?: any): Promise<{ updated: T; refreshed: T[] }> {
    return executeWithDataRefresh(
      () => this.updateFn(id, data),
      () => this.fetchFn(filters),
      { retryConfig: this.retryConfig }
    ).then(result => ({
      updated: result.operationResult,
      refreshed: result.refreshResult
    }));
  }

  /**
   * Delete an item and refresh the list
   */
  async deleteAndRefresh(id: string, filters?: any): Promise<{ deleted: boolean; refreshed: T[] }> {
    return executeWithDataRefresh(
      () => this.deleteFn(id),
      () => this.fetchFn(filters),
      { retryConfig: this.retryConfig }
    ).then(result => ({
      deleted: result.operationResult,
      refreshed: result.refreshResult
    }));
  }
}
