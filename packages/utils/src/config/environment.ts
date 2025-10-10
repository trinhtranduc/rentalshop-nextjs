// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

export type Environment = 'development' | 'production' | 'test' | 'local';

/**
 * Get the appropriate client URL based on environment
 */
export const getClientUrl = (): string => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.CLIENT_URL_PROD || process.env.NEXT_PUBLIC_CLIENT_URL || 'https://rentalshop.com';
  }
  
  if (process.env.NODE_ENV === 'development') {
    return process.env.CLIENT_URL_DEV || process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000';
  }
  
  return process.env.CLIENT_URL_LOCAL || process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000';
};

/**
 * Get the appropriate admin URL based on environment
 */
export const getAdminUrl = (): string => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.ADMIN_URL_PROD || process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.rentalshop.com';
  }
  
  if (process.env.NODE_ENV === 'development') {
    return process.env.ADMIN_URL_DEV || process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
  }
  
  return process.env.ADMIN_URL_LOCAL || process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
};



/**
 * Get the appropriate mobile URL based on environment
 */
export const getMobileUrl = (): string => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.MOBILE_URL_PROD || process.env.NEXT_PUBLIC_MOBILE_URL || 'https://mobile.rentalshop.com';
  }
  
  if (process.env.NODE_ENV === 'development') {
    return process.env.MOBILE_URL_DEV || process.env.NEXT_PUBLIC_MOBILE_URL || 'http://localhost:3003';
  }
  
  return process.env.MOBILE_URL_LOCAL || process.env.NEXT_PUBLIC_MOBILE_URL || 'http://localhost:3003';
};

/**
 * Get all URLs for the current environment
 */
export const getEnvironmentUrls = () => ({
  client: getClientUrl(),
  admin: getAdminUrl(),
  mobile: getMobileUrl(),
});

/**
 * Check if running in browser environment
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * Check if running in server environment
 */
export const isServer = (): boolean => {
  return typeof window === 'undefined';
};

/**
 * Check if running in development mode
 */
export const isDev = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Check if running in production mode
 */
export const isProd = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Check if running in test mode
 */
export const isTest = (): boolean => {
  return process.env.NODE_ENV === 'test';
};
