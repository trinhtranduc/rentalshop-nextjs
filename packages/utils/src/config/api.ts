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
    forgotPassword: string;
    resetPassword: string;
    changePassword: string;
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
    updateStock: (id: number) => string;
    bulkUpdate: string;
  };
  orders: {
    list: string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
    getByNumber: (orderNumber: string) => string;
    updateStatus: (id: number) => string;
    stats: string;
  };
  customers: {
    list: string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
    stats: string;
  };
  outlets: {
    list: string;
    create: string;
    get: (id: number) => string;
    update: (id: number) => string;
    delete: (id: number) => string;
    stats: string;
  };
  users: {
    list: string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
    updateRole: (id: number) => string;
    updateStatus: (id: number) => string;
    assignOutlet: (id: number) => string;
    deleteAccount: string;
    updateByPublicId: (id: number) => string;
    activateByPublicId: (id: number) => string;
    deactivateByPublicId: (id: number) => string;
    deleteByPublicId: (id: number) => string;
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
    recentActivities: string;
    inventory: string;
    outletPerformance: string;
    seasonalTrends: string;
    export: string;
    todayMetrics: string;
    growthMetrics: string;
    enhancedDashboard: string;
  };
  merchants: {
    list: string;
    create: string;
    register: string;
    get: (id: number) => string;
    update: (id: number) => string;
    delete: (id: number) => string;
    updatePlan: (id: number) => string;
    getPlan: (id: number) => string;
    extendPlan: (id: number) => string;
    cancelPlan: (id: number) => string;
    pricing: {
      get: (id: number) => string;
      update: (id: number) => string;
    };
    products: {
      list: (merchantId: number) => string;
      get: (merchantId: number, productId: number) => string;
      create: (merchantId: number) => string;
      update: (merchantId: number, productId: number) => string;
      delete: (merchantId: number, productId: number) => string;
    };
    orders: {
      list: (merchantId: number) => string;
      get: (merchantId: number, orderId: number) => string;
      create: (merchantId: number) => string;
      update: (merchantId: number, orderId: number) => string;
      delete: (merchantId: number, orderId: number) => string;
    };
    users: {
      list: (merchantId: number) => string;
      get: (merchantId: number, userId: number) => string;
      create: (merchantId: number) => string;
      update: (merchantId: number, userId: number) => string;
      delete: (merchantId: number, userId: number) => string;
    };
    outlets: {
      list: (merchantId: number) => string;
      get: (merchantId: number, outletId: number) => string;
      create: (merchantId: number) => string;
      update: (merchantId: number, outletId: number) => string;
      delete: (merchantId: number, outletId: number) => string;
    };
  };
  settings: {
    merchant: string;
    user: string;
    outlet: string;
    billing: string;
    changePassword: string;
    uploadPicture: string;
    deletePicture: string;
    preferences: string;
    activityLog: string;
    profileNotifications: string;
    markNotificationRead: (id: number) => string;
    markAllNotificationsRead: string;
  };
  system: {
    backup: string;
    backupSchedule: string;
    backupVerify: string;
    stats: string;
    health: string;
    logs: string;
  };
  notifications: {
    list: string;
    get: (id: number) => string;
    markRead: (id: number) => string;
    markUnread: (id: number) => string;
    markAllRead: string;
    delete: (id: number) => string;
    deleteAllRead: string;
    unreadCount: string;
    preferences: string;
    test: string;
  };
    auditLogs: {
      list: string;
      stats: string;
      export: string;
    };
    calendar: {
      orders: string;
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
  
  // Debug logging
  console.log('🔍 Environment Detection:', {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    APP_ENV: process.env.APP_ENV,
    detectedEnv: env,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
  });
  
  switch (env) {
    case 'local':
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    
    case 'development':
      return process.env.NEXT_PUBLIC_API_URL || 'https://apis-development.up.railway.app';
    
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
          api: process.env.API_URL || 'https://apis-development.up.railway.app',
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
      forgotPassword: `${base}/api/auth/forgot-password`,
      resetPassword: `${base}/api/auth/reset-password`,
      changePassword: `${base}/api/auth/change-password`,
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
      updateStock: (id: number) => `${base}/api/products/${id}/stock`,
      bulkUpdate: `${base}/api/products/bulk-update`,
    },
    orders: {
      list: `${base}/api/orders`,
      create: `${base}/api/orders`,
      update: (id: number) => `${base}/api/orders/${id}`,
      delete: (id: number) => `${base}/api/orders/${id}`,
      getByNumber: (orderNumber: string) => `${base}/api/orders/by-number/${orderNumber}`,
      updateStatus: (id: number) => `${base}/api/orders/${id}/status`,
      stats: `${base}/api/orders/stats`,
    },
    customers: {
      list: `${base}/api/customers`,
      create: `${base}/api/customers`,
      update: (id: number) => `${base}/api/customers/${id}`,
      delete: (id: number) => `${base}/api/customers/${id}`,
      stats: `${base}/api/customers/stats`,
    },
    outlets: {
      list: `${base}/api/outlets`,
      create: `${base}/api/outlets`,
      get: (id: number) => `${base}/api/outlets/${id}`,
      update: (id: number) => `${base}/api/outlets?outletId=${id}`,
      delete: (id: number) => `${base}/api/outlets?outletId=${id}`,
      stats: `${base}/api/outlets/stats`,
    },
    users: {
      list: `${base}/api/users`,
      create: `${base}/api/users`,
      update: (id: number) => `${base}/api/users/${id}`,
      delete: (id: number) => `${base}/api/users/${id}`,
      updateRole: (id: number) => `${base}/api/users/${id}/role`,
      updateStatus: (id: number) => `${base}/api/users/${id}/status`,
      assignOutlet: (id: number) => `${base}/api/users/${id}/assign-outlet`,
      deleteAccount: `${base}/api/users/delete-account`,
      updateByPublicId: (id: number) => `${base}/api/users/${id}`,
      activateByPublicId: (id: number) => `${base}/api/users/${id}`,
      deactivateByPublicId: (id: number) => `${base}/api/users/${id}`,
      deleteByPublicId: (id: number) => `${base}/api/users/${id}`,
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
      recentActivities: `${base}/api/analytics/recent-activities`,
      inventory: `${base}/api/analytics/inventory`,
      outletPerformance: `${base}/api/analytics/outlet-performance`,
      seasonalTrends: `${base}/api/analytics/seasonal-trends`,
      export: `${base}/api/analytics/export`,
      todayMetrics: `${base}/api/analytics/today-metrics`,
      growthMetrics: `${base}/api/analytics/growth-metrics`,
      enhancedDashboard: `${base}/api/analytics/enhanced-dashboard`,
    },
    merchants: {
      list: `${base}/api/merchants`,
      create: `${base}/api/merchants`,
      register: `${base}/api/merchants/register`,
      get: (id: number) => `${base}/api/merchants/${id}`,
      update: (id: number) => `${base}/api/merchants/${id}`,
      delete: (id: number) => `${base}/api/merchants/${id}`,
      updatePlan: (id: number) => `${base}/api/merchants/${id}/plan`,
      getPlan: (id: number) => `${base}/api/merchants/${id}/plan`,
      extendPlan: (id: number) => `${base}/api/merchants/${id}/plan`,
      cancelPlan: (id: number) => `${base}/api/merchants/${id}/plan`,
      pricing: {
        get: (id: number) => `${base}/api/merchants/${id}/pricing`,
        update: (id: number) => `${base}/api/merchants/${id}/pricing`,
      },
      products: {
        list: (merchantId: number) => `${base}/api/merchants/${merchantId}/products`,
        get: (merchantId: number, productId: number) => `${base}/api/merchants/${merchantId}/products/${productId}`,
        create: (merchantId: number) => `${base}/api/merchants/${merchantId}/products`,
        update: (merchantId: number, productId: number) => `${base}/api/merchants/${merchantId}/products/${productId}`,
        delete: (merchantId: number, productId: number) => `${base}/api/merchants/${merchantId}/products/${productId}`,
      },
      orders: {
        list: (merchantId: number) => `${base}/api/merchants/${merchantId}/orders`,
        get: (merchantId: number, orderId: number) => `${base}/api/merchants/${merchantId}/orders/${orderId}`,
        create: (merchantId: number) => `${base}/api/merchants/${merchantId}/orders`,
        update: (merchantId: number, orderId: number) => `${base}/api/merchants/${merchantId}/orders/${orderId}`,
        delete: (merchantId: number, orderId: number) => `${base}/api/merchants/${merchantId}/orders/${orderId}`,
      },
      users: {
        list: (merchantId: number) => `${base}/api/merchants/${merchantId}/users`,
        get: (merchantId: number, userId: number) => `${base}/api/merchants/${merchantId}/users/${userId}`,
        create: (merchantId: number) => `${base}/api/merchants/${merchantId}/users`,
        update: (merchantId: number, userId: number) => `${base}/api/merchants/${merchantId}/users/${userId}`,
        delete: (merchantId: number, userId: number) => `${base}/api/merchants/${merchantId}/users/${userId}`,
      },
      outlets: {
        list: (merchantId: number) => `${base}/api/merchants/${merchantId}/outlets`,
        get: (merchantId: number, outletId: number) => `${base}/api/merchants/${merchantId}/outlets/${outletId}`,
        create: (merchantId: number) => `${base}/api/merchants/${merchantId}/outlets`,
        update: (merchantId: number, outletId: number) => `${base}/api/merchants/${merchantId}/outlets/${outletId}`,
        delete: (merchantId: number, outletId: number) => `${base}/api/merchants/${merchantId}/outlets/${outletId}`,
      },
    },
  settings: {
    merchant: `${base}/api/settings/merchant`,
    user: `${base}/api/users/profile`,
    outlet: `${base}/api/settings/outlet`,
    billing: `${base}/api/settings/billing`,
    changePassword: `${base}/api/profile/change-password`,
    uploadPicture: `${base}/api/profile/upload-picture`,
    deletePicture: `${base}/api/profile/delete-picture`,
    preferences: `${base}/api/profile/preferences`,
    activityLog: `${base}/api/profile/activity-log`,
    profileNotifications: `${base}/api/profile/notifications`,
    markNotificationRead: (id: number) => `${base}/api/profile/notifications/${id}/read`,
    markAllNotificationsRead: `${base}/api/profile/notifications/mark-all-read`,
  },
  system: {
    backup: `${base}/api/system/backup`,
    backupSchedule: `${base}/api/system/backup/schedule`,
    backupVerify: `${base}/api/system/backup/verify`,
    stats: `${base}/api/system/stats`,
    health: `${base}/api/system/health`,
    logs: `${base}/api/system/logs`,
  },
    notifications: {
      list: `${base}/api/notifications`,
      get: (id: number) => `${base}/api/notifications/${id}`,
      markRead: (id: number) => `${base}/api/notifications/${id}/read`,
      markUnread: (id: number) => `${base}/api/notifications/${id}/unread`,
      markAllRead: `${base}/api/notifications/mark-all-read`,
      delete: (id: number) => `${base}/api/notifications/${id}`,
      deleteAllRead: `${base}/api/notifications/delete-read`,
      unreadCount: `${base}/api/notifications/unread-count`,
      preferences: `${base}/api/notifications/preferences`,
      test: `${base}/api/notifications/test`,
    },
    auditLogs: {
      list: `${base}/api/audit-logs`,
      stats: `${base}/api/audit-logs/stats`,
      export: `${base}/api/audit-logs/export`,
    },
    calendar: {
      orders: `${base}/api/calendar/orders`,
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


