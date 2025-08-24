// ============================================================================
// API CONFIGURATION
// ============================================================================

import { Environment } from './environment';

export interface ApiConfig {
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

function getApiEnvironment(): Environment {
  // Prefer explicit app-level env when provided
  const appEnv = (process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV) as Environment | undefined;
  if (appEnv === 'local' || appEnv === 'development' || appEnv === 'production') {
    return appEnv;
  }

  // Fallback to NODE_ENV
  const nodeEnv = process.env.NODE_ENV; // Typed as 'development' | 'production' | 'test'
  if (nodeEnv === 'production') return 'production';
  // Treat both 'development' and 'test' as development by default
  return 'development';
}

function getApiConfig(): ApiConfig {
  const environment = getApiEnvironment();
  
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

export const apiConfig = getApiConfig();
export const apiEnvironment = getApiEnvironment();

// Helper functions
export const isApiLocal = () => apiEnvironment === 'local';
export const isApiDevelopment = () => apiEnvironment === 'development';
export const isApiProduction = () => apiEnvironment === 'production';

export const getApiDatabaseUrl = () => apiConfig.database.url;
export const getApiJwtSecret = () => apiConfig.auth.jwtSecret;
export const getApiCorsOrigins = () => apiConfig.cors.origins;

// Add missing getApiUrl function
export const getApiUrl = () => apiConfig.urls.api;


