// ============================================================================
// COMPREHENSIVE API CONFIGURATION
// ============================================================================

import { Environment } from './environment';

export interface ApiConfig {
  // Server-side configuration
  database: {
    url: string;
    type: 'sqlite' | 'postgresql';
  };
  auth: {
    jwtSecret: string;
    expiresIn: string;
  };
  cors: {
    origins: string[];
  };
  features: {
    emailVerification: boolean;
    analytics: boolean;
    rateLimiting: boolean;
  };
  urls: {
    client: string;
    admin: string;
    api: string;
    mobile?: string;
  };
  logging: {
    level: string;
    format: string;
  };
  security: {
    rateLimitMax: number;
    rateLimitWindow: string;
  };
}

// Client-side API URL configuration
export interface ApiUrls {
  base: string;
  auth: {
    login: string;
    register: string;
    verify: string;
    refresh: string;
    logout: string;
  };
  categories: {
    list: string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
  };
  products: {
    list: string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
  };
  orders: {
    list: string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
  };
  customers: {
    list: string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
  };
  outlets: {
    list: string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
  };
  users: {
    list: string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
  };
  plans: {
    list: string;
    create: string;
    get: (id: number) => string;
    update: (id: number) => string;
    delete: (id: number) => string;
    stats: string;
    public: string;
  };
  planVariants: {
    list: string;
    create: string;
    get: (id: number) => string;
    update: (id: number) => string;
    delete: (id: number) => string;
    bulk: string;
    recycle: string;
    restore: (id: number) => string;
    stats: string;
  };
  billingCycles: {
    list: string;
    create: string;
    get: (id: number) => string;
    update: (id: number) => string;
    delete: (id: number) => string;
  };
  payments: {
    list: string;
    create: string;
    manual: string;
    get: (id: number) => string;
    update: (id: number) => string;
    delete: (id: number) => string;
    process: (id: number) => string;
    refund: (id: number) => string;
    stats: string;
    export: string;
  };
  subscriptions: {
    list: string;
    create: string;
    get: (id: number) => string;
    update: (id: number) => string;
    delete: (id: number) => string;
    extend: (id: number) => string;
    status: string;
    stats: string;
  };
  analytics: {
    dashboard: string;
    system: string;
    revenue: string;
    orders: string;
    income: string;
    topProducts: string;
    topCustomers: string;
    recentOrders: string;
  };
}

/**
 * Get the current environment
 */
function getEnvironment(): Environment {
  // Check for explicit environment variable first
  const explicitEnv = process.env.NEXT_PUBLIC_APP_ENV || process.env.APP_ENV;
  if (explicitEnv === 'local' || explicitEnv === 'development' || explicitEnv === 'production') {
    return explicitEnv;
  }

  // Fallback to NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }

  // Default to local for development
  return 'local';
}

/**
 * Get API base URL for current environment
 */
function getApiBaseUrlInternal(): string {
  const env = getEnvironment();
  
  switch (env) {
    case 'local':
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    
    case 'development':
      return process.env.NEXT_PUBLIC_API_URL || 'https://api.dev.rentalshop.com';
    
    case 'production':
      return process.env.NEXT_PUBLIC_API_URL || 'https://api.rentalshop.com';
    
    default:
      return 'http://localhost:3002';
  }
}

/**
 * Get server-side API configuration
 */
function getApiConfig(): ApiConfig {
  const environment = getEnvironment();
  
  // Base configuration
  const baseConfig: Partial<ApiConfig> = {
    cors: {
      origins: []
    },
    features: {
      emailVerification: false,
      analytics: false,
      rateLimiting: false
    },
    logging: {
      level: 'info',
      format: 'json'
    },
    security: {
      rateLimitMax: 1000,
      rateLimitWindow: '15m'
    }
  };

  // Environment-specific configurations
  switch (environment) {
    case 'local':
      return {
        ...baseConfig,
        database: {
          url: process.env.DATABASE_URL || 'file:./dev.db',
          type: 'sqlite'
        },
        auth: {
          jwtSecret: process.env.JWT_SECRET || 'local-jwt-secret-key-change-this',
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        },
        cors: {
          origins: [
            'http://localhost:3000',  // Client App
            'http://localhost:3001',  // Admin App
            'http://localhost:3002',  // API Server
            'http://localhost:3003'   // Mobile App (Future)
          ]
        },
        features: {
          emailVerification: false,
          analytics: false,
          rateLimiting: false
        },
        urls: {
          client: process.env.CLIENT_URL || 'http://localhost:3000',
          admin: process.env.ADMIN_URL || 'http://localhost:3001',
          api: process.env.API_URL || 'http://localhost:3002',
          mobile: process.env.MOBILE_URL || 'http://localhost:3003'
        },
        logging: {
          level: process.env.LOG_LEVEL || 'debug',
          format: process.env.LOG_FORMAT || 'pretty'
        },
        security: {
          rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
          rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '15m'
        }
      };

    case 'development':
      return {
        ...baseConfig,
        database: {
          url: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/rentalshop_dev',
          type: 'postgresql'
        },
        auth: {
          jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-key-change-this',
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        },
        cors: {
          origins: [
            'https://dev.rentalshop.com',
            'https://admin.dev.rentalshop.com',
            'https://mobile.dev.rentalshop.com'
          ]
        },
        features: {
          emailVerification: true,
          analytics: true,
          rateLimiting: true
        },
        urls: {
          client: process.env.CLIENT_URL || 'https://dev.rentalshop.com',
          admin: process.env.ADMIN_URL || 'https://admin.dev.rentalshop.com',
          api: process.env.API_URL || 'https://api.dev.rentalshop.com',
          mobile: process.env.MOBILE_URL || 'https://mobile.dev.rentalshop.com'
        },
        logging: {
          level: process.env.LOG_LEVEL || 'info',
          format: process.env.LOG_FORMAT || 'json'
        },
        security: {
          rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '500'),
          rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '15m'
        }
      };

    case 'production':
      return {
        ...baseConfig,
        database: {
          url: process.env.DATABASE_URL || 'postgresql://username:password@your-prod-host:5432/rentalshop_prod',
          type: 'postgresql'
        },
        auth: {
          jwtSecret: process.env.JWT_SECRET || 'your-super-secure-jwt-secret-key-here',
          expiresIn: process.env.JWT_EXPIRES_IN || '1d'
        },
        cors: {
          origins: [
            'https://rentalshop.com',
            'https://admin.rentalshop.com',
            'https://mobile.rentalshop.com'
          ]
        },
        features: {
          emailVerification: true,
          analytics: true,
          rateLimiting: true
        },
        urls: {
          client: process.env.CLIENT_URL || 'https://rentalshop.com',
          admin: process.env.ADMIN_URL || 'https://admin.rentalshop.com',
          api: process.env.API_URL || 'https://api.rentalshop.com',
          mobile: process.env.MOBILE_URL || 'https://mobile.rentalshop.com'
        },
        logging: {
          level: process.env.LOG_LEVEL || 'warn',
          format: process.env.LOG_FORMAT || 'json'
        },
        security: {
          rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
          rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '15m'
        }
      };

    default:
      throw new Error(`Unknown environment: ${environment}`);
  }
}

/**
 * Create client-side API URLs configuration
 */
function createApiUrls(): ApiUrls {
  const base = getApiBaseUrlInternal();
  
  return {
    base,
    auth: {
      login: `${base}/api/auth/login`,
      register: `${base}/api/auth/register`,
      verify: `${base}/api/auth/verify`,
      refresh: `${base}/api/auth/refresh`,
      logout: `${base}/api/auth/logout`,
    },
    categories: {
      list: `${base}/api/categories`,
      create: `${base}/api/categories`,
      update: (id: number) => `${base}/api/categories/${id}`,
      delete: (id: number) => `${base}/api/categories/${id}`,
    },
    products: {
      list: `${base}/api/products`,
      create: `${base}/api/products`,
      update: (id: number) => `${base}/api/products/${id}`,
      delete: (id: number) => `${base}/api/products/${id}`,
    },
    orders: {
      list: `${base}/api/orders`,
      create: `${base}/api/orders`,
      update: (id: number) => `${base}/api/orders/${id}`,
      delete: (id: number) => `${base}/api/orders/${id}`,
    },
    customers: {
      list: `${base}/api/customers`,
      create: `${base}/api/customers`,
      update: (id: number) => `${base}/api/customers/${id}`,
      delete: (id: number) => `${base}/api/customers/${id}`,
    },
    outlets: {
      list: `${base}/api/outlets`,
      create: `${base}/api/outlets`,
      update: (id: number) => `${base}/api/outlets?outletId=${id}`,
      delete: (id: number) => `${base}/api/outlets?outletId=${id}`,
    },
    users: {
      list: `${base}/api/users`,
      create: `${base}/api/users`,
      update: (id: number) => `${base}/api/users/${id}`,
      delete: (id: number) => `${base}/api/users/${id}`,
    },
    plans: {
      list: `${base}/api/plans`,
      create: `${base}/api/plans`,
      get: (id: number) => `${base}/api/plans/${id}`,
      update: (id: number) => `${base}/api/plans/${id}`,
      delete: (id: number) => `${base}/api/plans/${id}`,
      stats: `${base}/api/plans/stats`,
      public: `${base}/api/plans/public`,
    },
    planVariants: {
      list: `${base}/api/plan-variants`,
      create: `${base}/api/plan-variants`,
      get: (id: number) => `${base}/api/plan-variants/${id}`,
      update: (id: number) => `${base}/api/plan-variants/${id}`,
      delete: (id: number) => `${base}/api/plan-variants/${id}`,
      bulk: `${base}/api/plan-variants/bulk`,
      recycle: `${base}/api/plan-variants/recycle`,
      restore: (id: number) => `${base}/api/plan-variants/recycle/${id}`,
      stats: `${base}/api/plan-variants/stats`,
    },
    billingCycles: {
      list: `${base}/api/billing-cycles`,
      create: `${base}/api/billing-cycles`,
      get: (id: number) => `${base}/api/billing-cycles/${id}`,
      update: (id: number) => `${base}/api/billing-cycles/${id}`,
      delete: (id: number) => `${base}/api/billing-cycles/${id}`,
    },
    payments: {
      list: `${base}/api/payments`,
      create: `${base}/api/payments`,
      manual: `${base}/api/payments/manual`,
      get: (id: number) => `${base}/api/payments/${id}`,
      update: (id: number) => `${base}/api/payments/${id}`,
      delete: (id: number) => `${base}/api/payments/${id}`,
      process: (id: number) => `${base}/api/payments/${id}/process`,
      refund: (id: number) => `${base}/api/payments/${id}/refund`,
      stats: `${base}/api/payments/stats`,
      export: `${base}/api/payments/export`,
    },
    subscriptions: {
      list: `${base}/api/subscriptions`,
      create: `${base}/api/subscriptions`,
      get: (id: number) => `${base}/api/subscriptions/${id}`,
      update: (id: number) => `${base}/api/subscriptions/${id}`,
      delete: (id: number) => `${base}/api/subscriptions/${id}`,
      extend: (id: number) => `${base}/api/subscriptions/${id}/extend`,
      status: `${base}/api/subscriptions/status`,
      stats: `${base}/api/subscriptions/stats`,
    },
    analytics: {
      dashboard: `${base}/api/analytics/dashboard`,
      system: `${base}/api/analytics/system`,
      revenue: `${base}/api/analytics/revenue`,
      orders: `${base}/api/analytics/orders`,
      income: `${base}/api/analytics/income`,
      topProducts: `${base}/api/analytics/top-products`,
      topCustomers: `${base}/api/analytics/top-customers`,
      recentOrders: `${base}/api/analytics/recent-orders`,
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

// Server-side configuration (for API server)
export const apiConfig = getApiConfig();
export const apiEnvironment = getEnvironment();

// Client-side configuration (for client apps)
export const apiUrls = createApiUrls();

// Environment helpers
export const getCurrentEnvironment = (): Environment => getEnvironment();
export const isLocal = (): boolean => getEnvironment() === 'local';
export const isDevelopment = (): boolean => getEnvironment() === 'development';
export const isProduction = (): boolean => getEnvironment() === 'production';

// API base URL helpers
export const getApiBaseUrl = (): string => getApiBaseUrlInternal();

// Helper function to build custom API endpoints
export const buildApiUrl = (endpoint: string): string => {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${base}/${cleanEndpoint}`;
};

// Get the current API base URL (for swagger docs)
export const getApiUrl = (): string => getApiBaseUrl();

// Export API_BASE_URL for direct use in API clients
export const API_BASE_URL = getApiBaseUrl();

// Legacy exports for backward compatibility
export const getApiDatabaseUrl = () => apiConfig.database.url;
export const getApiJwtSecret = () => apiConfig.auth.jwtSecret;
export const getApiCorsOrigins = () => apiConfig.cors.origins;


