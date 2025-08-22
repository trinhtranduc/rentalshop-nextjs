export const formatCurrency = (amount: number, currency: string = 'VND'): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format Vietnamese phone number
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  } else if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  return phone;
};

export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// ============================================================================
// API UTILITIES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Create API URL with proper base URL
 */
export const createApiUrl = (endpoint: string): string => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // Check if it's already a full URL
  if (cleanEndpoint.startsWith('http://') || cleanEndpoint.startsWith('https://')) {
    return cleanEndpoint;
  }
  
  // For relative endpoints, construct full URL
  if (cleanEndpoint.startsWith('api/')) {
    // Use environment-specific API URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    return `${baseUrl}/${cleanEndpoint}`;
  }
  
  // Default to relative API path
  return `/api/${cleanEndpoint}`;
};

/**
 * Authenticated fetch wrapper
 */
export const authenticatedFetch = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('authToken') 
    : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

/**
 * Parse API response
 * 
 * This function handles the nested API response structure:
 * API returns: { success: true, data: { ... }, message: "..." }
 * We extract: { success: true, data: { ... } }
 * 
 * This allows frontend to access user data directly via response.data
 * instead of response.data.data
 */
export const parseApiResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorData = JSON.parse(errorText);
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  }

  try {
    const responseData = await response.json();
    
    // Handle nested API response structure
    // API returns: { success: true, data: { ... }, message: "..." }
    // We extract: { success: true, data: { ... } }
    if (responseData.success && responseData.data !== undefined) {
      return {
        success: true,
        data: responseData.data, // Extract the nested data
      };
    }
    
    // Fallback for non-standard responses
    return {
      success: true,
      data: responseData,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to parse response',
    };
  }
};

/**
 * Execute with data refresh
 */
export const executeWithDataRefresh = async <T>(
  operation: () => Promise<T>,
  refreshCallback?: () => void
): Promise<T> => {
  try {
    const result = await operation();
    if (refreshCallback) {
      refreshCallback();
    }
    return result;
  } catch (error) {
    console.error('Operation failed:', error);
    throw error;
  }
}; 